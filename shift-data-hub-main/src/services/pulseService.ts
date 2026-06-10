// ============================================================
// Pulse Service — powers GET /api/pulse/snapshot
// ============================================================
// Computes the Pulse-tab payload for the Data Hub:
//   - 6 hero KPIs with 24h deltas
//   - 30-day AUM sparkline
//   - top-5 + "other" signup sources for last 24h
//   - last-24h whale events (≥ $1k position size)
//   - 0-3 anomaly flags derived from the above
//
// Backed by an in-memory cache (60s TTL) keyed by 'pulse'.
// Frontend polls every 60s — sub-second freshness is not needed.
//
// Reads from production tables: user_profiles, positions,
// identity_links, airdrop_config. All queries are parametrised
// even though this endpoint takes no user input — pattern-
// consistency over micro-optimisation.
// ============================================================

import { query, queryOne } from '../db/pool';
import type {
  PulseSnapshot,
  PulseKpi,
  PulseTrendPoint,
  PulseSignupSource,
  PulseWhaleActivity,
  PulseAnomaly,
} from '../types/pulse';

// ────────────────────────────────────────────────────────────
// Thresholds & tunables (centralised for audit / config)
// ────────────────────────────────────────────────────────────

/** Cache TTL — frontend polls every 60s. */
const CACHE_TTL_MS = 60_000;

/** USD threshold for a position to count as a "whale" event. */
const WHALE_USD_THRESHOLD = 1_000;

/** Hard cap on whale events returned. */
const WHALE_FEED_LIMIT = 20;

/** Top-N source rows returned before the "other" rollup. */
const TOP_SIGNUP_SOURCES = 5;

/** Sources below this share-of-total get rolled into "other". */
const OTHER_SOURCE_SHARE = 0.05;

/** Fallback baseline if airdrop_config.pulse_stitch_baseline missing. */
const STITCH_BASELINE_FALLBACK_PCT = 24;

/** Stitch drop pp threshold that fires the anomaly. */
const STITCH_DROP_PP_THRESHOLD = 2;

/** Whale-event count that fires the surge anomaly. */
const WHALE_SURGE_COUNT_THRESHOLD = 10;

/** Direct-attribution share that fires the UTM-outage anomaly. */
const DIRECT_SURGE_SHARE_THRESHOLD = 0.8;

// ────────────────────────────────────────────────────────────
// In-memory cache (module-level — single Pulse view, key='pulse')
// ────────────────────────────────────────────────────────────

interface CacheEntry {
  expiresAt: number;
  data: PulseSnapshot;
}

const cache = new Map<string, CacheEntry>();

/** Exposed for tests — clears the module-level cache. */
export function _clearPulseCache(): void {
  cache.clear();
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pctChange(delta: number, prior: number, decimals = 2): number | null {
  if (!Number.isFinite(prior) || prior === 0) return null;
  const raw = (delta / prior) * 100;
  if (!Number.isFinite(raw)) return null;
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ────────────────────────────────────────────────────────────
// KPI computations
// ────────────────────────────────────────────────────────────

/**
 * kpis.registeredUsers — non-merged user_profiles, with 24h Δ.
 */
async function computeRegisteredUsers(): Promise<PulseKpi> {
  const row = await queryOne<{ total: string; new_24h: string }>(
    `SELECT
       COUNT(*)::bigint AS total,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::bigint AS new_24h
     FROM user_profiles
     WHERE merged_into_profile_id IS NULL`
  );
  const total = toNumber(row?.total);
  const delta24h = toNumber(row?.new_24h);
  const prior = total - delta24h;
  return {
    value: total,
    delta24h,
    delta24hPct: pctChange(delta24h, prior),
  };
}

/**
 * kpis.activeHolders — distinct wallets with status='open' positions.
 * Δ24h approximation: new first-time-holders in last 24h minus wallets
 * whose most-recent close happened in last 24h and currently have 0 open
 * positions. See SQL comments — both halves are computed in a single CTE
 * pass for cost reasons.
 */
async function computeActiveHolders(): Promise<PulseKpi> {
  const row = await queryOne<{ total: string; new_holders: string; churned: string }>(
    `WITH open_wallets AS (
       SELECT DISTINCT wallet FROM positions WHERE status = 'open'
     ),
     first_position_per_wallet AS (
       SELECT wallet, MIN(opened_at) AS first_opened_at
       FROM positions
       GROUP BY wallet
     ),
     last_close_per_wallet AS (
       SELECT wallet, MAX(closed_at) AS last_closed_at
       FROM positions
       WHERE closed_at IS NOT NULL
       GROUP BY wallet
     )
     SELECT
       (SELECT COUNT(*)::bigint FROM open_wallets) AS total,
       (SELECT COUNT(*)::bigint FROM first_position_per_wallet
         WHERE first_opened_at > NOW() - INTERVAL '24 hours') AS new_holders,
       (SELECT COUNT(*)::bigint FROM last_close_per_wallet lc
         WHERE lc.last_closed_at > NOW() - INTERVAL '24 hours'
           AND NOT EXISTS (SELECT 1 FROM open_wallets ow WHERE ow.wallet = lc.wallet)
       ) AS churned`
  );
  const total = toNumber(row?.total);
  const newHolders = toNumber(row?.new_holders);
  const churned = toNumber(row?.churned);
  const delta24h = newHolders - churned;
  const prior = total - delta24h;
  return {
    value: total,
    delta24h,
    delta24hPct: pctChange(delta24h, prior),
  };
}

/**
 * kpis.aumUSD — sum of open-position USD. Δ24h = opens in last 24h
 * minus closes in last 24h (net flow). Rounded to nearest int.
 */
async function computeAumUSD(): Promise<PulseKpi> {
  const row = await queryOne<{ total: string; opens_24h: string; closes_24h: string }>(
    `SELECT
       COALESCE((SELECT SUM(position_size_usd) FROM positions WHERE status = 'open'), 0)::numeric AS total,
       COALESCE((SELECT SUM(position_size_usd) FROM positions
                 WHERE opened_at > NOW() - INTERVAL '24 hours'), 0)::numeric AS opens_24h,
       COALESCE((SELECT SUM(position_size_usd) FROM positions
                 WHERE closed_at  > NOW() - INTERVAL '24 hours'), 0)::numeric AS closes_24h`
  );
  const total = Math.round(toNumber(row?.total));
  const opens = toNumber(row?.opens_24h);
  const closes = toNumber(row?.closes_24h);
  const delta24h = Math.round(opens - closes);
  const prior = total - delta24h;
  return {
    value: total,
    delta24h,
    delta24hPct: pctChange(delta24h, prior),
  };
}

/**
 * kpis.stitchPct — % of non-merged profiles that have ≥2 distinct
 * identity_types linked (excluding unlinked rows).
 *
 * NOTE: delta24h is null — computing the Δ requires a snapshot table
 * we don't have yet. Shipping v1 without Δ; the anomaly check
 * compares against airdrop_config.pulse_stitch_baseline instead.
 */
async function computeStitchPct(): Promise<PulseKpi> {
  const row = await queryOne<{ pct: string | null }>(
    `SELECT (
       (SELECT COUNT(*) FROM (
          SELECT profile_id
            FROM identity_links
           WHERE unlinked_at IS NULL
           GROUP BY profile_id
          HAVING COUNT(DISTINCT identity_type) >= 2
        ) t) * 100.0
       / NULLIF((SELECT COUNT(*) FROM user_profiles WHERE merged_into_profile_id IS NULL), 0)
     )::numeric(5,1) AS pct`
  );
  const pct = row?.pct === null || row?.pct === undefined ? 0 : round1(toNumber(row.pct));
  return {
    value: pct,
    delta24h: null,
    delta24hPct: null,
  };
}

/**
 * kpis.activations24h — distinct wallets that opened their first-ever
 * position in the last 24h. This IS itself a Δ-style metric, so no Δ-of-Δ.
 */
async function computeActivations24h(): Promise<PulseKpi> {
  const row = await queryOne<{ activations: string }>(
    `SELECT COUNT(*)::bigint AS activations
       FROM (
         SELECT wallet, MIN(opened_at) AS first_opened_at
           FROM positions
          GROUP BY wallet
       ) f
      WHERE f.first_opened_at > NOW() - INTERVAL '24 hours'`
  );
  return {
    value: toNumber(row?.activations),
    delta24h: null,
    delta24hPct: null,
  };
}

/**
 * kpis.openWhalesCount — distinct wallets with an open position ≥ $1k.
 * Δ24h = whales-opened-in-24h − whales-closed-in-24h.
 */
async function computeOpenWhalesCount(): Promise<PulseKpi> {
  const row = await queryOne<{ total: string; opens: string; closes: string }>(
    `SELECT
       (SELECT COUNT(DISTINCT wallet) FROM positions
         WHERE status = 'open' AND position_size_usd >= $1)::bigint AS total,
       (SELECT COUNT(*) FROM positions
         WHERE opened_at > NOW() - INTERVAL '24 hours'
           AND position_size_usd >= $1)::bigint AS opens,
       (SELECT COUNT(*) FROM positions
         WHERE closed_at  > NOW() - INTERVAL '24 hours'
           AND position_size_usd >= $1)::bigint AS closes`,
    [WHALE_USD_THRESHOLD]
  );
  const total = toNumber(row?.total);
  const delta24h = toNumber(row?.opens) - toNumber(row?.closes);
  const prior = total - delta24h;
  return {
    value: total,
    delta24h,
    delta24hPct: pctChange(delta24h, prior),
  };
}

// ────────────────────────────────────────────────────────────
// Trends
// ────────────────────────────────────────────────────────────

/**
 * trends.aum30d — 30 daily end-of-day AUM values.
 *
 * Strategy: generate_series of the last 30 days; for each day, sum
 * position_size_usd of positions that were open at the END of that day,
 * i.e. opened_at <= day_end AND (closed_at IS NULL OR closed_at > day_end).
 * Day-end is interpreted as the start of the NEXT day (exclusive upper bound).
 */
async function computeAum30d(): Promise<PulseTrendPoint[]> {
  const rows = await query<{ date: string; value: string }>(
    `WITH days AS (
       SELECT generate_series(
         (CURRENT_DATE - INTERVAL '29 days')::date,
         CURRENT_DATE::date,
         INTERVAL '1 day'
       )::date AS day
     )
     SELECT
       to_char(d.day, 'YYYY-MM-DD') AS date,
       COALESCE(SUM(p.position_size_usd), 0)::numeric AS value
       FROM days d
       LEFT JOIN positions p
         ON p.opened_at <= (d.day + INTERVAL '1 day')
        AND (p.closed_at IS NULL OR p.closed_at > (d.day + INTERVAL '1 day'))
      GROUP BY d.day
      ORDER BY d.day ASC`
  );
  return rows.map(r => ({
    date: r.date,
    value: Math.round(toNumber(r.value)),
  }));
}

/**
 * trends.signupsBySource24h — top 5 sources + "other" rollup.
 *
 * Aggregate non-merged profiles created in last 24h by COALESCE'd
 * first_utm_source. Roll any source below OTHER_SOURCE_SHARE (5%) of
 * total into "other", then cap top sources at TOP_SIGNUP_SOURCES.
 */
async function computeSignupsBySource24h(): Promise<PulseSignupSource[]> {
  const rows = await query<{ source: string; count: string }>(
    `SELECT COALESCE(first_utm_source, 'direct') AS source,
            COUNT(*)::bigint AS count
       FROM user_profiles
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND merged_into_profile_id IS NULL
      GROUP BY source
      ORDER BY count DESC`
  );
  const sources = rows.map(r => ({ source: r.source, count: toNumber(r.count) }));
  const total = sources.reduce((s, r) => s + r.count, 0);
  if (total === 0) return [];

  // Bucket: top N + "other" rollup, then merge anything below the share
  // threshold inside the top N as well.
  const top = sources.slice(0, TOP_SIGNUP_SOURCES);
  const tail = sources.slice(TOP_SIGNUP_SOURCES);

  const kept: PulseSignupSource[] = [];
  let otherCount = tail.reduce((s, r) => s + r.count, 0);

  for (const row of top) {
    const share = row.count / total;
    if (share < OTHER_SOURCE_SHARE) {
      otherCount += row.count;
    } else {
      kept.push(row);
    }
  }

  if (otherCount > 0) kept.push({ source: 'other', count: otherCount });
  kept.sort((a, b) => b.count - a.count);
  return kept;
}

// ────────────────────────────────────────────────────────────
// Whale activity feed
// ────────────────────────────────────────────────────────────

/**
 * whaleActivity24h — union of open + close events ≥ $1k in last 24h,
 * most recent first, cap WHALE_FEED_LIMIT.
 */
async function computeWhaleActivity24h(): Promise<PulseWhaleActivity[]> {
  const rows = await query<{
    occurred_at: Date | string;
    wallet: string;
    asset: string;
    size_usd: string;
    event: 'open' | 'close';
  }>(
    `(SELECT opened_at AS occurred_at, wallet, asset,
             position_size_usd AS size_usd, 'open'::text AS event
        FROM positions
       WHERE opened_at > NOW() - INTERVAL '24 hours'
         AND position_size_usd >= $1)
     UNION ALL
     (SELECT closed_at AS occurred_at, wallet, asset,
             position_size_usd AS size_usd, 'close'::text AS event
        FROM positions
       WHERE closed_at IS NOT NULL
         AND closed_at > NOW() - INTERVAL '24 hours'
         AND position_size_usd >= $1)
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [WHALE_USD_THRESHOLD, WHALE_FEED_LIMIT]
  );
  return rows.map(r => ({
    occurredAt: r.occurred_at instanceof Date
      ? r.occurred_at.toISOString()
      : new Date(r.occurred_at).toISOString(),
    wallet: r.wallet,
    asset: r.asset,
    sizeUSD: Math.round(toNumber(r.size_usd)),
    event: r.event,
  }));
}

// ────────────────────────────────────────────────────────────
// Anomalies
// ────────────────────────────────────────────────────────────

/**
 * Read the stitch-rate baseline from airdrop_config.
 * Stored as JSONB number (e.g. `24`). Returns fallback if missing.
 */
async function getStitchBaseline(): Promise<number> {
  try {
    const row = await queryOne<{ setting_value: unknown }>(
      `SELECT setting_value FROM airdrop_config WHERE setting_key = $1`,
      ['pulse_stitch_baseline']
    );
    if (!row) return STITCH_BASELINE_FALLBACK_PCT;
    const raw = row.setting_value;
    // setting_value is JSONB → pg returns it parsed (number) or sometimes as string
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
      try {
        const j = JSON.parse(raw);
        if (typeof j === 'number') return j;
      } catch {/* swallow */}
    }
    return STITCH_BASELINE_FALLBACK_PCT;
  } catch {
    return STITCH_BASELINE_FALLBACK_PCT;
  }
}

/**
 * Compute the three documented anomaly checks.
 *
 * 1. Stitch drop — current stitchPct vs baseline > STITCH_DROP_PP_THRESHOLD pp.
 * 2. Whale surge — whaleActivity24h.length >= WHALE_SURGE_COUNT_THRESHOLD.
 * 3. Direct surge — first signup source is "direct" and >= 80% of total.
 */
async function computeAnomalies(
  stitchPct: number | null,
  whaleCount: number,
  signups: PulseSignupSource[],
): Promise<PulseAnomaly[]> {
  const out: PulseAnomaly[] = [];

  // 1. Stitch drop
  if (stitchPct !== null && Number.isFinite(stitchPct) && stitchPct > 0) {
    const baseline = await getStitchBaseline();
    const drop = baseline - stitchPct;
    if (drop > STITCH_DROP_PP_THRESHOLD) {
      out.push({
        severity: 'warn',
        message: `Stitch rate dropped ${round1(drop)}% in the last 24h — investigate?`,
        actionView: 'users',
      });
    }
  }

  // 2. Whale surge
  if (whaleCount >= WHALE_SURGE_COUNT_THRESHOLD) {
    out.push({
      severity: 'info',
      message: `Unusual whale activity: ${whaleCount} events in the last 24h`,
      actionView: 'attribution',
    });
  }

  // 3. Direct attribution surge
  if (signups.length > 0) {
    const total = signups.reduce((s, r) => s + r.count, 0);
    const first = signups[0];
    if (total > 0 && first.source === 'direct' && first.count / total > DIRECT_SURGE_SHARE_THRESHOLD) {
      const sharePct = Math.round((first.count / total) * 100);
      out.push({
        severity: 'warn',
        message: `${sharePct}% of last-24h signups are unattributed — possible UTM tracker outage`,
        actionView: 'attribution',
      });
    }
  }

  return out;
}

// ────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────

/**
 * Returns the full Pulse snapshot. Cached for CACHE_TTL_MS in-memory.
 *
 * Cache key is constant ('pulse') — the endpoint accepts no inputs.
 */
export async function getPulseSnapshot(): Promise<PulseSnapshot> {
  const now = Date.now();
  const cached = cache.get('pulse');
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // Run all 8 queries in parallel — they're independent reads.
  const [
    registeredUsers,
    activeHolders,
    aumUSD,
    stitchPct,
    activations24h,
    openWhalesCount,
    aum30d,
    signupsBySource24h,
    whaleActivity24h,
  ] = await Promise.all([
    computeRegisteredUsers(),
    computeActiveHolders(),
    computeAumUSD(),
    computeStitchPct(),
    computeActivations24h(),
    computeOpenWhalesCount(),
    computeAum30d(),
    computeSignupsBySource24h(),
    computeWhaleActivity24h(),
  ]);

  const anomalies = await computeAnomalies(
    stitchPct.value,
    whaleActivity24h.length,
    signupsBySource24h,
  );

  const snapshot: PulseSnapshot = {
    computedAt: new Date().toISOString(),
    kpis: {
      registeredUsers,
      activeHolders,
      aumUSD,
      stitchPct,
      activations24h,
      openWhalesCount,
    },
    trends: {
      aum30d,
      signupsBySource24h,
    },
    whaleActivity24h,
    anomalies,
  };

  cache.set('pulse', {
    expiresAt: now + CACHE_TTL_MS,
    data: snapshot,
  });

  return snapshot;
}
