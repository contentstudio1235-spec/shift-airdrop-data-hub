// src/services/attributionService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { ChannelROIRow, FunnelQueryParams, WhaleOriginEdge } from '../types/funnel';

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
    WITH user_source AS (
      SELECT
        COALESCE(
          NULLIF(LOWER(p.first_utm_source), ''),
          NULLIF(u.referred_by_code, ''),
          'direct'
        ) AS source,
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
    WITH base AS (
      SELECT
        u.wallet,
        p.first_utm_source AS utm,
        NULLIF(u.referred_by_code, '') AS ref
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

export async function computeWhaleOrigins(params: FunnelQueryParams): Promise<WhaleOriginEdge[]> {
  const cacheKey = `whale_origins|${buildCacheKey('whale_origins', params as Record<string, unknown>)}`;
  const cached = cache.get<WhaleOriginEdge[]>(cacheKey);
  if (cached) return cached;

  const rows = await query<{ from_node: string; to_node: string; value: string }>(
    `
    WITH whales AS (
      SELECT DISTINCT p.wallet FROM positions p
      WHERE p.position_size_usd >= 1000
        AND ($1::timestamp IS NULL OR p.opened_at >= $1)
        AND ($2::timestamp IS NULL OR p.opened_at <= $2)
    ),
    whale_sources AS (
      SELECT COALESCE(NULLIF(u.referred_by_code, ''), 'direct') AS source, w.wallet
      FROM whales w INNER JOIN users u ON u.wallet = w.wallet
    )
    SELECT source AS from_node, 'whale_trade'::text AS to_node, COUNT(*)::bigint AS value
    FROM whale_sources
    GROUP BY source
    ORDER BY value DESC
    LIMIT 50
    `,
    [params.from ?? null, params.to ?? null],
  );

  const result: WhaleOriginEdge[] = rows.map(r => ({
    from: r.from_node,
    to: r.to_node,
    value: Number(r.value),
  }));

  cache.set(cacheKey, result);
  return result;
}

export function invalidateAttributionCache(): void {
  cache.invalidate(() => true);
}
