// src/services/attributionService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { ChannelROIRow, FunnelQueryParams, WhaleOriginEdge } from '../types/funnel';

const ATTRIBUTION_TTL_SECONDS = 300;
const cache = new FunnelCache({ ttlSeconds: ATTRIBUTION_TTL_SECONDS, maxEntries: 200 });

export async function computeChannelROI(params: FunnelQueryParams): Promise<ChannelROIRow[]> {
  const cacheKey = `channel_roi|${buildCacheKey('channel_roi', params as Record<string, unknown>)}`;
  const cached = cache.get<ChannelROIRow[]>(cacheKey);
  if (cached) return cached;

  // v1: source attribution based on referred_by_code; Tracking Specialist output
  // will replace this with proper UTM-source columns in a later sprint
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
        COALESCE(NULLIF(referred_by_code, ''), 'direct') AS source,
        wallet,
        (ga_user_id IS NOT NULL OR snag_user_id IS NOT NULL) AS is_stitched
      FROM users
      WHERE ($1::timestamp IS NULL OR created_at >= $1)
        AND ($2::timestamp IS NULL OR created_at <= $2)
    ),
    holders AS (
      SELECT DISTINCT wallet, SUM(position_size_usd) AS volume
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
      COALESCE(AVG(h.volume), 0)::bigint AS avg_position_usd
    FROM user_source us
    LEFT JOIN holders h ON h.wallet = us.wallet
    GROUP BY us.source
    ORDER BY total_volume_usd DESC
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
