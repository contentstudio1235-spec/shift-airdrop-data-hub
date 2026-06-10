// src/services/cohortService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { CohortDim, CohortMatrix, FunnelQueryParams } from '../types/funnel';
import type {
  CohortEntry,
  CohortsSnapshot,
  CohortSummary,
} from '../types/cohort';

const COHORT_TTL_SECONDS = 300;
const cache = new FunnelCache({ ttlSeconds: COHORT_TTL_SECONDS, maxEntries: 100 });

const ALLOWED_DIMS: CohortDim[] = ['day', 'week', 'month'];

const DATE_TRUNC: Record<CohortDim, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

const INTERVAL: Record<CohortDim, string> = {
  day: '1 day',
  week: '1 week',
  month: '1 month',
};

// SQL injection safety: values come from lookup maps keyed by allowlist-validated `dim`
// (checked at the top of computeCohortMatrix via ALLOWED_DIMS). The interpolation is safe.
const LABEL_FMT: Record<CohortDim, string> = {
  day: 'YYYY-MM-DD',
  week: 'IYYY-"W"IW',
  month: 'YYYY-MM',
};

export async function computeCohortMatrix(
  dim: CohortDim,
  params: FunnelQueryParams,
): Promise<CohortMatrix> {
  if (!ALLOWED_DIMS.includes(dim)) {
    throw new Error(`Invalid cohort dim: ${dim}`);
  }

  const cacheKey = `cohort_${dim}|${buildCacheKey('cohort', params as Record<string, unknown>)}`;
  const cached = cache.get<CohortMatrix>(cacheKey);
  if (cached) return cached;

  // SQL injection safety: DATE_TRUNC and INTERVAL values come from lookup maps
  // keyed by the allowlist-validated `dim`. The string interpolation below is
  // safe BECAUSE `dim` is validated against ALLOWED_DIMS at the top of this fn.
  const trunc = DATE_TRUNC[dim];
  const interval = INTERVAL[dim];
  const labelFmt = LABEL_FMT[dim];

  const rows = await query<{
    cohort: string;
    size_at_start: string;
    retention: number[];
  }>(
    `
    WITH user_cohorts AS (
      SELECT
        wallet,
        DATE_TRUNC('${trunc}', created_at) AS cohort_date
      FROM users
      WHERE ($1::timestamp IS NULL OR created_at >= $1)
        AND ($2::timestamp IS NULL OR created_at <= $2)
    ),
    cohort_sizes AS (
      SELECT cohort_date, COUNT(*) AS size FROM user_cohorts GROUP BY cohort_date
    ),
    activity AS (
      SELECT
        uc.cohort_date,
        FLOOR(EXTRACT(EPOCH FROM (p.opened_at - uc.cohort_date)) / EXTRACT(EPOCH FROM INTERVAL '${interval}'))::int AS period_offset,
        COUNT(DISTINCT p.wallet) AS active_users
      FROM user_cohorts uc
      LEFT JOIN positions p ON p.wallet = uc.wallet AND p.opened_at IS NOT NULL
      GROUP BY uc.cohort_date, period_offset
    ),
    matrix AS (
      SELECT
        cs.cohort_date,
        cs.size,
        ARRAY_AGG(
          COALESCE(a.active_users, 0)::float * 100.0 / NULLIF(cs.size, 0)
          ORDER BY a.period_offset
        ) AS retention
      FROM cohort_sizes cs
      LEFT JOIN activity a ON a.cohort_date = cs.cohort_date
      WHERE a.period_offset BETWEEN 0 AND 12
      GROUP BY cs.cohort_date, cs.size
    )
    SELECT
      TO_CHAR(cohort_date, '${labelFmt}') AS cohort,
      size::text AS size_at_start,
      retention
    FROM matrix
    ORDER BY cohort_date DESC
    LIMIT 12
    `,
    [params.from ?? null, params.to ?? null],
  );

  const result: CohortMatrix = {
    dim,
    cohorts: rows.map(r => ({
      cohort: r.cohort,
      sizeAtStart: Number(r.size_at_start),
      retention: r.retention.map(v => Math.round(v * 10) / 10),
    })),
  };

  cache.set(cacheKey, result);
  return result;
}

export function invalidateCohortCache(): void {
  cache.invalidate(() => true);
}

// ============================================================
// Weekly cohort snapshot — GET /api/cohorts/snapshot
// ============================================================
// 12 most recent weekly cohorts with activation/retention/AUM/
// whale/stitch metrics + summary trend. 60-second in-memory cache
// (same TTL pattern as pulseService).
//
// One SQL round-trip pulls per-row metrics with CTEs; the summary
// is computed in JS over the 12-row result set.
// ============================================================

const SNAPSHOT_CACHE_TTL_MS = 60_000;
const SNAPSHOT_CACHE_KEY = 'cohorts_snapshot_v1';
const SNAPSHOT_COHORT_COUNT = 12;
const WHALE_USD_THRESHOLD = 1_000;
const TREND_DELTA_THRESHOLD_PP = 3;

interface SnapshotCacheEntry {
  expiresAt: number;
  data: CohortsSnapshot;
}

const snapshotCache = new Map<string, SnapshotCacheEntry>();

/** Exposed for tests — clears the snapshot cache. */
export function _clearCohortSnapshotCache(): void {
  snapshotCache.clear();
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface CohortRow {
  cohort_key: string;
  week_start: string | Date;
  size: string;
  activated: string;
  lifetime_volume: string | null;
  whales: string;
  stitch_count: string;
  retained_w1: string;
  retained_w4: string;
  /** age in days from cohort week-start to NOW(). Used to null-out young retention. */
  age_days: string;
}

/**
 * Single SQL round-trip that computes all per-row cohort metrics for the
 * 12 most recent weekly signup cohorts.
 *
 * Strategy:
 *   1. `cohort_users`        — pick non-merged profiles created in the
 *                              last 12 weeks; bucket by date_trunc('week').
 *   2. `cohort_positions`    — left-join positions on primary_wallet,
 *                              aggregating size, whale flag, retention
 *                              windows (week-1 and week-4) in one pass.
 *   3. `cohort_stitch`       — count distinct identity_types per profile
 *                              (active only) to derive stitched profiles.
 *   4. Final SELECT          — roll up into one row per cohort with the
 *                              shape the JS layer expects.
 *
 * Retention windows are computed against the cohort week-start, not the
 * individual profile's created_at — this matches the spec.
 */
async function fetchCohortRows(): Promise<CohortRow[]> {
  return query<CohortRow>(
    `
    WITH cohort_users AS (
      SELECT
        profile_id,
        primary_wallet,
        date_trunc('week', created_at) AS cohort_start
      FROM user_profiles
      WHERE merged_into_profile_id IS NULL
        AND created_at > NOW() - INTERVAL '12 weeks'
    ),
    cohort_with_stitch AS (
      SELECT
        cu.profile_id,
        cu.primary_wallet,
        cu.cohort_start,
        (
          SELECT COUNT(DISTINCT il.identity_type)
            FROM identity_links il
           WHERE il.profile_id = cu.profile_id
             AND il.unlinked_at IS NULL
        ) AS active_link_types
      FROM cohort_users cu
    ),
    cohort_positions AS (
      SELECT
        cws.cohort_start,
        cws.profile_id,
        cws.primary_wallet,
        cws.active_link_types,
        COUNT(p.id) FILTER (WHERE p.opened_at IS NOT NULL) AS positions_opened,
        COALESCE(SUM(p.position_size_usd) FILTER (WHERE p.opened_at IS NOT NULL), 0) AS lifetime_volume,
        BOOL_OR(p.position_size_usd >= $1) AS is_whale,
        BOOL_OR(
          p.opened_at >= cws.cohort_start + INTERVAL '1 week'
          AND p.opened_at <  cws.cohort_start + INTERVAL '2 weeks'
        ) AS active_w1,
        BOOL_OR(
          p.opened_at >= cws.cohort_start + INTERVAL '4 weeks'
          AND p.opened_at <  cws.cohort_start + INTERVAL '5 weeks'
        ) AS active_w4
      FROM cohort_with_stitch cws
      LEFT JOIN positions p
        ON p.wallet = cws.primary_wallet
      GROUP BY cws.cohort_start, cws.profile_id, cws.primary_wallet, cws.active_link_types
    )
    SELECT
      to_char(cohort_start, 'IYYY-"W"IW') AS cohort_key,
      cohort_start::date AS week_start,
      COUNT(*)::bigint AS size,
      COUNT(*) FILTER (WHERE positions_opened > 0)::bigint AS activated,
      COALESCE(SUM(lifetime_volume), 0)::numeric AS lifetime_volume,
      COUNT(*) FILTER (WHERE is_whale)::bigint AS whales,
      COUNT(*) FILTER (WHERE active_link_types >= 2)::bigint AS stitch_count,
      COUNT(*) FILTER (WHERE active_w1)::bigint AS retained_w1,
      COUNT(*) FILTER (WHERE active_w4)::bigint AS retained_w4,
      FLOOR(EXTRACT(EPOCH FROM (NOW() - cohort_start)) / 86400)::bigint AS age_days
    FROM cohort_positions
    GROUP BY cohort_start
    ORDER BY cohort_start DESC
    LIMIT $2
    `,
    [WHALE_USD_THRESHOLD, SNAPSHOT_COHORT_COUNT],
  );
}

/**
 * Maps raw SQL rows into the typed CohortEntry contract.
 *
 * Retention is set to `null` when the cohort is too young to have a
 * complete week-1 or week-4 observation window. We use a conservative
 * cutoff: week-1 needs ≥14 days (cohort week itself + 7 days observed),
 * week-4 needs ≥35 days.
 */
function mapCohortEntry(row: CohortRow): CohortEntry {
  const size = toNumber(row.size);
  const activated = toNumber(row.activated);
  const lifetimeVolumeUSD = Math.round(toNumber(row.lifetime_volume));
  const whales = toNumber(row.whales);
  const stitchCount = toNumber(row.stitch_count);
  const ageDays = toNumber(row.age_days);
  const retainedW1 = toNumber(row.retained_w1);
  const retainedW4 = toNumber(row.retained_w4);

  const activationPct = size === 0 ? 0 : round1((activated / size) * 100);
  const stitchPct = size === 0 ? 0 : round1((stitchCount / size) * 100);
  const avgVolumePerUser = size === 0 ? 0 : Math.round(lifetimeVolumeUSD / size);

  // Week-1 window is the 7 days starting at cohort_start + 1 week.
  // We need at least 14 days of observability (cohort week + full week-1)
  // before we can report a non-null retention. Same for week-4 at 35 days.
  const retentionWeek1 =
    ageDays >= 14 ? (size === 0 ? 0 : round1((retainedW1 / size) * 100)) : null;
  const retentionWeek4 =
    ageDays >= 35 ? (size === 0 ? 0 : round1((retainedW4 / size) * 100)) : null;

  const weekStartIso =
    row.week_start instanceof Date
      ? row.week_start.toISOString().slice(0, 10)
      : String(row.week_start).slice(0, 10);

  return {
    cohortKey: row.cohort_key,
    weekStart: weekStartIso,
    size,
    activated,
    activationPct,
    retentionWeek1,
    retentionWeek4,
    lifetimeVolumeUSD,
    avgVolumePerUser,
    whales,
    stitchPct,
  };
}

/**
 * Compute summary trend block over the 12-row cohort array.
 *
 * Recent = avg(activationPct) for cohorts 1–4 (most recent first).
 * Historical = avg(activationPct) for cohorts 5–12.
 * Trend:
 *   - delta > +3pp → improving
 *   - delta < -3pp → declining
 *   - else stable
 *
 * Edge cases:
 *   - empty cohorts → zeros & 'stable'
 *   - fewer than 5 cohorts → historical avg is 0, delta = recent − 0, trend follows the band
 */
function buildSummary(cohorts: CohortEntry[]): CohortSummary {
  if (cohorts.length === 0) {
    return {
      trend: 'stable',
      recentAvgActivation: 0,
      historicalAvgActivation: 0,
      deltaPP: 0,
      bestCohort: { cohortKey: '—', activationPct: 0 },
      worstCohort: { cohortKey: '—', activationPct: 0 },
    };
  }

  const recent = cohorts.slice(0, 4);
  const historical = cohorts.slice(4, 12);

  const avg = (rows: CohortEntry[]): number => {
    if (rows.length === 0) return 0;
    const total = rows.reduce((s, r) => s + r.activationPct, 0);
    return round1(total / rows.length);
  };

  const recentAvgActivation = avg(recent);
  const historicalAvgActivation = avg(historical);
  const deltaPP = round1(recentAvgActivation - historicalAvgActivation);

  let trend: CohortSummary['trend'];
  if (deltaPP > TREND_DELTA_THRESHOLD_PP) trend = 'improving';
  else if (deltaPP < -TREND_DELTA_THRESHOLD_PP) trend = 'declining';
  else trend = 'stable';

  // Best/worst across all cohorts. On ties, the first encountered wins
  // (which biases toward the most-recent cohort on ties — desirable).
  let best = cohorts[0];
  let worst = cohorts[0];
  for (const c of cohorts) {
    if (c.activationPct > best.activationPct) best = c;
    if (c.activationPct < worst.activationPct) worst = c;
  }

  return {
    trend,
    recentAvgActivation,
    historicalAvgActivation,
    deltaPP,
    bestCohort: { cohortKey: best.cohortKey, activationPct: best.activationPct },
    worstCohort: { cohortKey: worst.cohortKey, activationPct: worst.activationPct },
  };
}

/**
 * Returns the full weekly-cohort snapshot. Cached in-memory for
 * SNAPSHOT_CACHE_TTL_MS (60s) — matches the freshness budget for
 * cohort data, which doesn't change at sub-minute resolution.
 */
export async function getCohortsSnapshot(): Promise<CohortsSnapshot> {
  const now = Date.now();
  const cached = snapshotCache.get(SNAPSHOT_CACHE_KEY);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const rows = await fetchCohortRows();
  const cohorts = rows.map(mapCohortEntry);
  const summary = buildSummary(cohorts);

  const snapshot: CohortsSnapshot = {
    computedAt: new Date().toISOString(),
    cohorts,
    summary,
  };

  snapshotCache.set(SNAPSHOT_CACHE_KEY, {
    expiresAt: now + SNAPSHOT_CACHE_TTL_MS,
    data: snapshot,
  });

  return snapshot;
}
