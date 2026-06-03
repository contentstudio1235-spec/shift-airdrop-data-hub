// src/services/attributionService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { ChannelROIRow, FunnelQueryParams } from '../types/funnel';
import type { WhaleOriginsResponse, SankeyNode, SankeyEdge, KOLResponse, KOLEntry } from '../types/sankey';

const ATTRIBUTION_TTL_SECONDS = 300;
const cache = new FunnelCache({ ttlSeconds: ATTRIBUTION_TTL_SECONDS, maxEntries: 200 });

export interface TopCampaignRow {
  campaign: string;
  source: string | null;
  medium: string | null;
  profiles: number;
}

export interface AttributionCoverage {
  total: number;
  withUtm: number;
  withReferralOnly: number;
  neither: number;
  percentWithSignal: number;
  percentWithUtm: number;
}

export async function computeChannelROI(params: FunnelQueryParams): Promise<ChannelROIRow[]> {
  const cacheKey = `channel_roi|${buildCacheKey('channel_roi', params as Record<string, unknown>)}`;
  const cached = cache.get<ChannelROIRow[]>(cacheKey);
  if (cached) return cached;

  // UTM-first with referral fallback. Source order of truth:
  //   1. user_profiles.first_utm_source  (Sprint 2.3 live stitch)
  //   2. users.referred_by_code          (Sprint 0 referral signal)
  //   3. 'direct'                        (no signal)
  // Special handling:
  //   - 'unknown_legacy' is a Sprint 2.0 backfill placeholder, filtered to NULL
  //   - 6-char alphanumeric values are Snag referral codes (e.g. ?ref=3VAN8Y),
  //     collapsed into a single 'snag_referrals' channel rather than appearing
  //     as 50+ pseudo-source rows
  const rows = await query<{
    source: string;
    users: string;
    stitched_users: string;
    holders: string;
    whales: string;
    total_volume_usd: string;
    avg_position_usd: string;
  }>(
    `
    -- Check the 6-char Snag-referral pattern on raw values BEFORE the COALESCE
    -- falls through to 'direct'. Otherwise 'direct' (literally 6 letters) gets
    -- matched and EVERY direct user becomes a snag_referral.
    WITH user_source AS (
      SELECT
        CASE
          WHEN NULLIF(NULLIF(LOWER(p.first_utm_source), ''), 'unknown_legacy') ~ '^[a-zA-Z0-9]{6}$' THEN 'snag_referrals'
          WHEN NULLIF(u.referred_by_code, '') ~ '^[a-zA-Z0-9]{6}$' THEN 'snag_referrals'
          ELSE COALESCE(
            NULLIF(NULLIF(LOWER(p.first_utm_source), ''), 'unknown_legacy'),
            NULLIF(u.referred_by_code, ''),
            'direct'
          )
        END AS source,
        u.wallet,
        (u.ga_user_id IS NOT NULL OR u.snag_user_id IS NOT NULL OR p.profile_id IS NOT NULL) AS is_stitched
      FROM users u
      LEFT JOIN user_profiles p ON p.primary_wallet = u.wallet AND p.merged_into_profile_id IS NULL
      WHERE ($1::timestamp IS NULL OR u.created_at >= $1)
        AND ($2::timestamp IS NULL OR u.created_at <= $2)
    ),
    holders AS (
      SELECT wallet, SUM(position_size_usd) AS volume
      FROM positions
      WHERE ($1::timestamp IS NULL OR opened_at >= $1)
        AND ($2::timestamp IS NULL OR opened_at <= $2)
      GROUP BY wallet
    )
    SELECT
      us.source,
      COUNT(*)::bigint AS users,
      COUNT(*) FILTER (WHERE us.is_stitched)::bigint AS stitched_users,
      COUNT(*) FILTER (WHERE h.wallet IS NOT NULL)::bigint AS holders,
      COUNT(*) FILTER (WHERE h.volume >= 1000)::bigint AS whales,
      COALESCE(SUM(h.volume), 0)::bigint AS total_volume_usd,
      COALESCE(AVG(h.volume) FILTER (WHERE h.wallet IS NOT NULL), 0)::bigint AS avg_position_usd
    FROM user_source us
    LEFT JOIN holders h ON h.wallet = us.wallet
    GROUP BY us.source
    ORDER BY users DESC
    LIMIT 50
    `,
    [params.from ?? null, params.to ?? null],
  );

  const result: ChannelROIRow[] = rows.map(r => ({
    source: r.source,
    users: Number(r.users),
    stitchedUsers: Number(r.stitched_users),
    holders: Number(r.holders),
    whales: Number(r.whales),
    totalVolumeUSD: Number(r.total_volume_usd),
    avgPositionUSD: Number(r.avg_position_usd),
    attribution: 'first_touch',
  }));

  cache.set(cacheKey, result);
  return result;
}

export async function computeTopCampaigns(params: FunnelQueryParams, limit = 10): Promise<TopCampaignRow[]> {
  const cacheKey = `top_campaigns|${buildCacheKey('top_campaigns', { ...params, limit } as Record<string, unknown>)}`;
  const cached = cache.get<TopCampaignRow[]>(cacheKey);
  if (cached) return cached;

  const rows = await query<{
    campaign: string;
    source: string | null;
    medium: string | null;
    profiles: string;
  }>(
    `
    SELECT
      first_utm_campaign AS campaign,
      first_utm_source   AS source,
      first_utm_medium   AS medium,
      COUNT(*)::bigint   AS profiles
    FROM user_profiles
    WHERE merged_into_profile_id IS NULL
      AND first_utm_campaign IS NOT NULL
      AND first_utm_campaign <> ''
      AND first_utm_campaign <> 'unknown_legacy'
      AND first_utm_campaign !~ '^[a-zA-Z0-9]{6}$'
      AND ($1::timestamp IS NULL OR first_seen_at >= $1)
      AND ($2::timestamp IS NULL OR first_seen_at <= $2)
    GROUP BY first_utm_campaign, first_utm_source, first_utm_medium
    ORDER BY profiles DESC
    LIMIT $3
    `,
    [params.from ?? null, params.to ?? null, limit],
  );

  const result: TopCampaignRow[] = rows.map(r => ({
    campaign: r.campaign,
    source: r.source,
    medium: r.medium,
    profiles: Number(r.profiles),
  }));

  cache.set(cacheKey, result);
  return result;
}

export async function computeAttributionCoverage(params: FunnelQueryParams): Promise<AttributionCoverage> {
  const cacheKey = `coverage|${buildCacheKey('coverage', params as Record<string, unknown>)}`;
  const cached = cache.get<AttributionCoverage>(cacheKey);
  if (cached) return cached;

  const rows = await query<{
    total: string;
    with_utm: string;
    with_referral_only: string;
  }>(
    `
    -- 6-char alphanumeric values in first_utm_source are Snag referral codes
    -- that Sprint 2.0 backfill wrote into the UTM column — they're referral
    -- signal, not UTM signal, so we reclassify here.
    WITH base AS (
      SELECT
        u.wallet,
        CASE
          WHEN NULLIF(NULLIF(p.first_utm_source, ''), 'unknown_legacy') ~ '^[a-zA-Z0-9]{6}$' THEN NULL
          ELSE NULLIF(NULLIF(p.first_utm_source, ''), 'unknown_legacy')
        END AS utm,
        COALESCE(
          NULLIF(u.referred_by_code, ''),
          CASE
            WHEN NULLIF(NULLIF(p.first_utm_source, ''), 'unknown_legacy') ~ '^[a-zA-Z0-9]{6}$'
              THEN p.first_utm_source
            ELSE NULL
          END
        ) AS ref
      FROM users u
      LEFT JOIN user_profiles p ON p.primary_wallet = u.wallet AND p.merged_into_profile_id IS NULL
      WHERE ($1::timestamp IS NULL OR u.created_at >= $1)
        AND ($2::timestamp IS NULL OR u.created_at <= $2)
    )
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE utm IS NOT NULL)::bigint AS with_utm,
      COUNT(*) FILTER (WHERE utm IS NULL AND ref IS NOT NULL)::bigint AS with_referral_only
    FROM base
    `,
    [params.from ?? null, params.to ?? null],
  );

  const row = rows[0] ?? { total: '0', with_utm: '0', with_referral_only: '0' };
  const total = Number(row.total);
  const withUtm = Number(row.with_utm);
  const withReferralOnly = Number(row.with_referral_only);
  const neither = Math.max(0, total - withUtm - withReferralOnly);
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
  const result: AttributionCoverage = {
    total, withUtm, withReferralOnly, neither,
    percentWithSignal: pct(withUtm + withReferralOnly),
    percentWithUtm: pct(withUtm),
  };

  cache.set(cacheKey, result);
  return result;
}

export async function computeWhaleOrigins(params: FunnelQueryParams): Promise<WhaleOriginsResponse> {
  const cacheKey = `whale_origins_v2|${buildCacheKey('whale_origins_v2', params as Record<string, unknown>)}`;
  const cached = cache.get<WhaleOriginsResponse>(cacheKey);
  if (cached) return cached;

  const rows = await query<{ source: string; cohort: string; outcome: string; users: string; volume: string; }>(
    `
    WITH base AS (
      SELECT
        CASE
          WHEN NULLIF(NULLIF(LOWER(p.first_utm_source), ''), 'unknown_legacy') ~ '^[a-zA-Z0-9]{6}$' THEN 'snag_referrals'
          WHEN NULLIF(u.referred_by_code, '') ~ '^[a-zA-Z0-9]{6}$' THEN 'snag_referrals'
          ELSE COALESCE(
            NULLIF(NULLIF(LOWER(p.first_utm_source), ''), 'unknown_legacy'),
            NULLIF(u.referred_by_code, ''),
            'direct'
          )
        END AS source,
        u.wallet,
        p.last_seen_at
      FROM users u
      LEFT JOIN user_profiles p ON p.primary_wallet = u.wallet AND p.merged_into_profile_id IS NULL
      WHERE ($1::timestamp IS NULL OR u.created_at >= $1)
        AND ($2::timestamp IS NULL OR u.created_at <= $2)
    ),
    vol AS (
      SELECT b.wallet, b.source, b.last_seen_at,
             COALESCE(SUM(pos.position_size_usd), 0) AS volume
      FROM base b
      LEFT JOIN positions pos ON pos.wallet = b.wallet
      GROUP BY b.wallet, b.source, b.last_seen_at
    )
    SELECT source,
           CASE WHEN volume >= 1000 THEN 'whale'
                WHEN volume > 0 THEN 'dolphin'
                ELSE 'fish' END AS cohort,
           CASE WHEN last_seen_at IS NULL THEN 'churned'
                WHEN last_seen_at > NOW() - INTERVAL '30 days' THEN 'active'
                ELSE 'dormant' END AS outcome,
           COUNT(*)::text AS users,
           SUM(volume)::text AS volume
    FROM vol
    GROUP BY source, cohort, outcome
    `,
    [params.from ?? null, params.to ?? null],
  );

  const sources = new Map<string, number>();
  const cohorts = new Map<string, number>();
  const outcomes = new Map<string, number>();
  const sourceToCohort = new Map<string, number>();
  const cohortToOutcome = new Map<string, number>();
  let totalWhales = 0, totalWhaleVolume = 0, totalSourceUsers = 0;

  for (const r of rows) {
    const users = Number(r.users);
    const volume = Number(r.volume);
    sources.set(r.source, (sources.get(r.source) ?? 0) + users);
    cohorts.set(r.cohort, (cohorts.get(r.cohort) ?? 0) + users);
    outcomes.set(r.outcome, (outcomes.get(r.outcome) ?? 0) + users);
    const sKey = `src:${r.source}|coh:${r.cohort}`;
    sourceToCohort.set(sKey, (sourceToCohort.get(sKey) ?? 0) + users);
    const cKey = `coh:${r.cohort}|out:${r.outcome}`;
    cohortToOutcome.set(cKey, (cohortToOutcome.get(cKey) ?? 0) + users);
    totalSourceUsers += users;
    if (r.cohort === 'whale') {
      totalWhales += users;
      totalWhaleVolume += volume;
    }
  }

  const nodes: SankeyNode[] = [
    ...Array.from(sources.entries()).map(([s, v]) => ({ id: `src:${s}`, label: s, kind: 'source' as const, value: v })),
    ...Array.from(cohorts.entries()).map(([c, v]) => ({ id: `coh:${c}`, label: c, kind: 'cohort' as const, value: v })),
    ...Array.from(outcomes.entries()).map(([o, v]) => ({ id: `out:${o}`, label: o, kind: 'outcome' as const, value: v })),
  ];
  const edges: SankeyEdge[] = [
    ...Array.from(sourceToCohort.entries()).map(([k, v]) => { const [from, to] = k.split('|'); return { from, to, value: v }; }),
    ...Array.from(cohortToOutcome.entries()).map(([k, v]) => { const [from, to] = k.split('|'); return { from, to, value: v }; }),
  ];

  const result: WhaleOriginsResponse = {
    nodes, edges,
    totals: { sourceUsers: totalSourceUsers, whales: totalWhales, whaleVolumeUSD: totalWhaleVolume },
    computedAt: new Date().toISOString(),
    dataQuality: 'sprint_2_3_live',
  };
  cache.set(cacheKey, result);
  return result;
}

export async function computeKOLLeaderboard(params: FunnelQueryParams, limit = 50): Promise<KOLResponse> {
  const cacheKey = `kol|${buildCacheKey('kol', { ...params, limit } as Record<string, unknown>)}`;
  const cached = cache.get<KOLResponse>(cacheKey);
  if (cached) return cached;

  const rows = await query<{ referrer: string; users: string; holders: string; whales: string; volume: string; first_seen: string; last_seen: string; }>(
    `
    WITH agg AS (
      SELECT u.referred_by_code AS referrer,
             u.wallet,
             u.created_at,
             COALESCE(SUM(p.position_size_usd), 0) AS user_volume
      FROM users u
      LEFT JOIN positions p ON p.wallet = u.wallet
      WHERE u.referred_by_code IS NOT NULL AND u.referred_by_code <> ''
        AND ($1::timestamp IS NULL OR u.created_at >= $1)
        AND ($2::timestamp IS NULL OR u.created_at <= $2)
      GROUP BY u.referred_by_code, u.wallet, u.created_at
    )
    SELECT referrer,
           COUNT(*)::text AS users,
           COUNT(*) FILTER (WHERE user_volume > 0)::text AS holders,
           COUNT(*) FILTER (WHERE user_volume >= 1000)::text AS whales,
           SUM(user_volume)::text AS volume,
           MIN(created_at)::text AS first_seen,
           MAX(created_at)::text AS last_seen
    FROM agg
    GROUP BY referrer
    HAVING COUNT(*) >= 5
    LIMIT $3
    `,
    [params.from ?? null, params.to ?? null, limit * 4],
  );

  const entries: KOLEntry[] = rows.map(r => {
    const users = Number(r.users);
    const holders = Number(r.holders);
    const volume = Number(r.volume);
    const holderRate = users === 0 ? 0 : Math.round((holders / users) * 1000) / 10;
    const score = holderRate * Math.log10(1 + volume) * Math.log10(1 + users);
    const isSnag = /^[a-zA-Z0-9]{6}$/.test(r.referrer);
    return {
      referrer: r.referrer,
      source: isSnag ? 'snag_referrals' : 'other',
      users, holders, whales: Number(r.whales),
      holderRate,
      totalVolumeUSD: volume,
      avgVolumePerUserUSD: users === 0 ? 0 : Math.round(volume / users),
      score: Math.round(score * 100) / 100,
      firstSeenAt: r.first_seen,
      lastSeenAt: r.last_seen,
    };
  });
  entries.sort((a, b) => b.score - a.score);

  const result: KOLResponse = {
    rows: entries.slice(0, limit),
    totals: { totalReferrers: entries.length, activeReferrers: entries.filter(e => e.holders > 0).length },
    computedAt: new Date().toISOString(),
    dataQuality: 'sprint_2_3_live',
  };
  cache.set(cacheKey, result);
  return result;
}

export function invalidateAttributionCache(): void {
  cache.invalidate(() => true);
}
