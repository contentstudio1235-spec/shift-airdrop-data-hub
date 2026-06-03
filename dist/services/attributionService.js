"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeChannelROI = computeChannelROI;
exports.computeTopCampaigns = computeTopCampaigns;
exports.computeAttributionCoverage = computeAttributionCoverage;
exports.computeWhaleOrigins = computeWhaleOrigins;
exports.invalidateAttributionCache = invalidateAttributionCache;
// src/services/attributionService.ts
const pool_1 = require("../db/pool");
const cache_1 = require("../lib/cache");
const ATTRIBUTION_TTL_SECONDS = 300;
const cache = new cache_1.FunnelCache({ ttlSeconds: ATTRIBUTION_TTL_SECONDS, maxEntries: 200 });
async function computeChannelROI(params) {
    const cacheKey = `channel_roi|${(0, cache_1.buildCacheKey)('channel_roi', params)}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    // UTM-first with referral fallback. Source order of truth:
    //   1. user_profiles.first_utm_source  (Sprint 2.3 live stitch)
    //   2. users.referred_by_code          (Sprint 0 referral signal)
    //   3. 'direct'                        (no signal)
    const rows = await (0, pool_1.query)(`
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
    `, [params.from ?? null, params.to ?? null]);
    const result = rows.map(r => ({
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
async function computeTopCampaigns(params, limit = 10) {
    const cacheKey = `top_campaigns|${(0, cache_1.buildCacheKey)('top_campaigns', { ...params, limit })}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    const rows = await (0, pool_1.query)(`
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
    `, [params.from ?? null, params.to ?? null, limit]);
    const result = rows.map(r => ({
        campaign: r.campaign,
        source: r.source,
        medium: r.medium,
        profiles: Number(r.profiles),
    }));
    cache.set(cacheKey, result);
    return result;
}
async function computeAttributionCoverage(params) {
    const cacheKey = `coverage|${(0, cache_1.buildCacheKey)('coverage', params)}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    const rows = await (0, pool_1.query)(`
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
    `, [params.from ?? null, params.to ?? null]);
    const row = rows[0] ?? { total: '0', with_utm: '0', with_referral_only: '0' };
    const total = Number(row.total);
    const withUtm = Number(row.with_utm);
    const withReferralOnly = Number(row.with_referral_only);
    const neither = Math.max(0, total - withUtm - withReferralOnly);
    const pct = (n) => total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
    const result = {
        total, withUtm, withReferralOnly, neither,
        percentWithSignal: pct(withUtm + withReferralOnly),
        percentWithUtm: pct(withUtm),
    };
    cache.set(cacheKey, result);
    return result;
}
async function computeWhaleOrigins(params) {
    const cacheKey = `whale_origins|${(0, cache_1.buildCacheKey)('whale_origins', params)}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    const rows = await (0, pool_1.query)(`
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
    `, [params.from ?? null, params.to ?? null]);
    const result = rows.map(r => ({
        from: r.from_node,
        to: r.to_node,
        value: Number(r.value),
    }));
    cache.set(cacheKey, result);
    return result;
}
function invalidateAttributionCache() {
    cache.invalidate(() => true);
}
//# sourceMappingURL=attributionService.js.map