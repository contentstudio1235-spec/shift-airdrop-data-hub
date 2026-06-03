"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFunnel = computeFunnel;
exports.invalidateFunnelCache = invalidateFunnelCache;
// src/services/funnelService.ts
const pool_1 = require("../db/pool");
const cache_1 = require("../lib/cache");
const FUNNEL_TTL_SECONDS = 60;
const cache = new cache_1.FunnelCache({ ttlSeconds: FUNNEL_TTL_SECONDS, maxEntries: 500 });
const FUNNEL_STEPS = {
    acquisition: [
        { id: 'visit', name: 'GA4 Visit', benchmark: 100 },
        { id: 'landing', name: 'Landing Page', benchmark: 60 },
        { id: 'connect', name: 'Wallet Connect', benchmark: 25 },
        { id: 'first_trade', name: 'First Trade', benchmark: 8 },
    ],
    activation: [
        { id: 'connect', name: 'Wallet Connect' },
        { id: 'register', name: 'Register' },
        { id: 'kyc', name: 'KYC Complete' },
        { id: 'first_trade', name: 'First Trade' },
    ],
    conversion: [
        { id: 'first_trade', name: 'First Trade' },
        { id: 'second_trade', name: 'Second Trade' },
        { id: 'multi_asset', name: 'Multi-Asset Holder' },
        { id: 'active_holder', name: 'Active Holder' },
    ],
    whale_pipeline: [
        { id: 'holder', name: 'Holder' },
        { id: 'over_1k', name: '$1K+ Position' },
        { id: 'over_10k', name: '$10K+ Position' },
        { id: 'over_100k', name: '$100K+ Whale' },
    ],
    loyalty: [
        { id: 'trader', name: 'Trader' },
        { id: 'snag_linked', name: 'Snag Linked' },
        { id: 'badged', name: 'Badge Earned' },
        { id: 'top_tier', name: 'Top Tier Multiplier' },
    ],
    referral: [
        { id: 'user', name: 'Registered User' },
        { id: 'code_generated', name: 'Referral Code Created' },
        { id: 'referral_clicked', name: 'Referral Clicked' },
        { id: 'referral_traded', name: 'Referral Traded' },
    ],
    retention: [
        { id: 'active', name: 'Active' },
        { id: 'dormant_7d', name: 'Dormant 7d' },
        { id: 'reactivated', name: 'Reactivated' },
        { id: 'lost_30d', name: 'Lost 30d' },
    ],
};
const FUNNEL_QUERIES = {
    acquisition: (params) => ({
        sql: `
      WITH ga4_visits AS (
        SELECT 'visit'::text AS step, COUNT(DISTINCT ga_user_id)::bigint AS count
        FROM users
        WHERE ga_user_id IS NOT NULL
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      landings AS (
        SELECT 'landing'::text AS step, COUNT(*)::bigint AS count
        FROM users
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      connects AS (
        SELECT 'connect'::text AS step, COUNT(*)::bigint AS count
        FROM users
        WHERE wallet IS NOT NULL AND wallet != ''
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      first_trades AS (
        SELECT 'first_trade'::text AS step, COUNT(DISTINCT wallet)::bigint AS count
        FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
      )
      SELECT step, count FROM ga4_visits
      UNION ALL SELECT step, count FROM landings
      UNION ALL SELECT step, count FROM connects
      UNION ALL SELECT step, count FROM first_trades
    `,
        values: [params.from ?? null, params.to ?? null],
    }),
    activation: (params) => ({
        sql: `
      WITH connects AS (
        SELECT 'connect'::text AS step, COUNT(*)::bigint AS count
        FROM users WHERE wallet IS NOT NULL AND wallet != ''
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      registers AS (
        SELECT 'register'::text AS step, COUNT(*)::bigint AS count
        FROM users WHERE wallet IS NOT NULL AND wallet != ''
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      kyc_complete AS (
        SELECT 'kyc'::text AS step, COUNT(DISTINCT u.wallet)::bigint AS count
        FROM users u
        WHERE u.snag_user_id IS NOT NULL
          AND ($1::timestamp IS NULL OR u.created_at >= $1)
          AND ($2::timestamp IS NULL OR u.created_at <= $2)
      ),
      first_trades AS (
        SELECT 'first_trade'::text AS step, COUNT(DISTINCT wallet)::bigint AS count
        FROM positions
          WHERE ($1::timestamp IS NULL OR opened_at >= $1)
            AND ($2::timestamp IS NULL OR opened_at <= $2)
      )
      SELECT step, count FROM connects
      UNION ALL SELECT step, count FROM registers
      UNION ALL SELECT step, count FROM kyc_complete
      UNION ALL SELECT step, count FROM first_trades
    `,
        values: [params.from ?? null, params.to ?? null],
    }),
    conversion: (params) => ({
        sql: `
      WITH trade_counts AS (
        SELECT wallet, COUNT(*) AS trades, COUNT(DISTINCT asset) AS assets
        FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
        GROUP BY wallet
      ),
      open_positions AS (
        SELECT wallet FROM positions
        WHERE status = 'open'
          AND ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
        GROUP BY wallet
      )
      SELECT 'first_trade'::text AS step, COUNT(*)::bigint AS count FROM trade_counts WHERE trades >= 1
      UNION ALL
      SELECT 'second_trade'::text AS step, COUNT(*)::bigint AS count FROM trade_counts WHERE trades >= 2
      UNION ALL
      SELECT 'multi_asset'::text AS step, COUNT(*)::bigint AS count FROM trade_counts WHERE assets >= 2
      UNION ALL
      SELECT 'active_holder'::text AS step, COUNT(DISTINCT wallet)::bigint AS count FROM open_positions
    `,
        values: [params.from ?? null, params.to ?? null],
    }),
    whale_pipeline: (params) => ({
        sql: `
      WITH max_positions AS (
        SELECT wallet, MAX(position_size_usd) AS max_size
        FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
        GROUP BY wallet
      )
      SELECT 'holder'::text AS step, COUNT(*)::bigint AS count FROM max_positions
      UNION ALL
      SELECT 'over_1k'::text AS step, COUNT(*)::bigint AS count FROM max_positions WHERE max_size >= 1000
      UNION ALL
      SELECT 'over_10k'::text AS step, COUNT(*)::bigint AS count FROM max_positions WHERE max_size >= 10000
      UNION ALL
      SELECT 'over_100k'::text AS step, COUNT(*)::bigint AS count FROM max_positions WHERE max_size >= 100000
    `,
        values: [params.from ?? null, params.to ?? null],
    }),
    loyalty: (params) => ({
        sql: `
      WITH traders AS (
        SELECT DISTINCT wallet FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
      ),
      snag AS (
        SELECT u.wallet FROM users u
        INNER JOIN traders t ON t.wallet = u.wallet
        WHERE u.snag_user_id IS NOT NULL
      ),
      badged_wallets AS (
        SELECT DISTINCT b.wallet FROM badges b
        INNER JOIN traders t ON t.wallet = b.wallet
      ),
      top_tier AS (
        SELECT u.wallet FROM users u
        INNER JOIN traders t ON t.wallet = u.wallet
        WHERE u.claim_multiplier >= 2.0
      )
      SELECT 'trader'::text AS step, COUNT(*)::bigint AS count FROM traders
      UNION ALL SELECT 'snag_linked'::text AS step, COUNT(*)::bigint AS count FROM snag
      UNION ALL SELECT 'badged'::text AS step, COUNT(*)::bigint AS count FROM badged_wallets
      UNION ALL SELECT 'top_tier'::text AS step, COUNT(*)::bigint AS count FROM top_tier
    `,
        values: [params.from ?? null, params.to ?? null],
    }),
    referral: (params) => ({
        sql: `
      WITH all_users AS (
        SELECT wallet FROM users
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      code_holders AS (
        SELECT DISTINCT referred_by_code AS code FROM users WHERE referred_by_code IS NOT NULL
      ),
      referred_users AS (
        SELECT wallet FROM users
        WHERE referred_by_wallet IS NOT NULL
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      referred_traders AS (
        SELECT DISTINCT p.wallet FROM positions p
        INNER JOIN referred_users r ON r.wallet = p.wallet
      )
      SELECT 'user'::text AS step, COUNT(*)::bigint AS count FROM all_users
      UNION ALL SELECT 'code_generated'::text AS step, COUNT(*)::bigint AS count FROM code_holders
      UNION ALL SELECT 'referral_clicked'::text AS step, COUNT(*)::bigint AS count FROM referred_users
      UNION ALL SELECT 'referral_traded'::text AS step, COUNT(*)::bigint AS count FROM referred_traders
    `,
        values: [params.from ?? null, params.to ?? null],
    }),
    retention: () => ({
        sql: `
      WITH last_trade AS (
        SELECT wallet, MAX(opened_at) AS last_at FROM positions GROUP BY wallet
      ),
      reactivated AS (
        SELECT lt.wallet FROM last_trade lt
        WHERE lt.last_at >= NOW() - INTERVAL '7 days'
          AND EXISTS (
            SELECT 1 FROM positions p2
            WHERE p2.wallet = lt.wallet
              AND p2.opened_at < NOW() - INTERVAL '30 days'
              AND p2.opened_at >= NOW() - INTERVAL '90 days'
          )
      )
      SELECT 'active'::text AS step, COUNT(*)::bigint AS count
        FROM last_trade WHERE last_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'dormant_7d'::text AS step, COUNT(*)::bigint AS count
        FROM last_trade WHERE last_at < NOW() - INTERVAL '7 days' AND last_at >= NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 'reactivated'::text AS step, COUNT(*)::bigint AS count FROM reactivated
      UNION ALL
      SELECT 'lost_30d'::text AS step, COUNT(*)::bigint AS count
        FROM last_trade WHERE last_at < NOW() - INTERVAL '30 days'
    `,
        values: [],
    }),
};
async function computeFunnel(funnelId, params) {
    const cacheKey = (0, cache_1.buildCacheKey)(funnelId, params);
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    const { sql, values } = FUNNEL_QUERIES[funnelId](params);
    const rows = await (0, pool_1.query)(sql, values);
    const stepDefs = FUNNEL_STEPS[funnelId];
    const stepCounts = new Map(rows.map(r => [r.step, Number(r.count)]));
    // Dev-mode safety: warn when SQL output doesn't include all expected steps.
    // This catches step-ID typos between FUNNEL_STEPS and FUNNEL_QUERIES SQL.
    if (process.env.NODE_ENV !== 'production' && rows.length > 0) {
        const expectedIds = new Set(stepDefs.map(d => d.id));
        const returnedIds = new Set(rows.map(r => r.step));
        const missing = [...expectedIds].filter(id => !returnedIds.has(id));
        if (missing.length > 0) {
            console.warn(`[funnelService] ${funnelId}: SQL returned no rows for step IDs: ${missing.join(', ')}`);
        }
    }
    const steps = stepDefs
        .filter(def => stepCounts.has(def.id))
        .map((def, i, arr) => {
        const count = stepCounts.get(def.id) ?? 0;
        const firstCount = stepCounts.get(arr[0].id) ?? 0;
        // At step 0, prevCount === count → conversionFromPrev = 100% by definition
        const prevCount = i > 0 ? (stepCounts.get(arr[i - 1].id) ?? 0) : count;
        return {
            id: def.id,
            name: def.name,
            count,
            uniqueWallets: count, // for v1, same as count; v2 will distinguish
            conversionFromPrev: prevCount > 0 ? (count / prevCount) * 100 : 0,
            conversionFromFirst: firstCount > 0 ? (count / firstCount) * 100 : 0,
            vs7dDelta: 0, // populated in v2 with historical comparison
            benchmark: def.benchmark,
        };
    });
    let acquisitionExtras;
    if (funnelId === 'acquisition') {
        const extraRows = await (0, pool_1.query)(`
      WITH window_users AS (
        SELECT wallet, ga_user_id, snag_user_id, created_at FROM users
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      first_trades AS (
        SELECT wallet, MIN(opened_at) AS first_at FROM positions GROUP BY wallet
      ),
      deltas AS (
        SELECT EXTRACT(EPOCH FROM (ft.first_at - wu.created_at)) AS dt
        FROM window_users wu
        INNER JOIN first_trades ft ON ft.wallet = wu.wallet
        WHERE ft.first_at >= wu.created_at
      )
      SELECT
        NULL::float AS attributable_pct,
        (100.0 * COUNT(*) FILTER (WHERE ga_user_id IS NOT NULL OR snag_user_id IS NOT NULL) / NULLIF(COUNT(*), 0))::float AS stitched_pct,
        (SELECT PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY dt) FROM deltas)::float AS median_seconds
      FROM window_users
      `, [params.from ?? null, params.to ?? null]);
        const row = extraRows[0];
        acquisitionExtras = {
            attributablePct: row?.attributable_pct !== null && row?.attributable_pct !== undefined ? Number(row.attributable_pct) : null,
            stitchedPct: row?.stitched_pct ? Number(row.stitched_pct) : 0,
            medianTimeToFirstTrade: row?.median_seconds ? Number(row.median_seconds) : null,
        };
    }
    const result = {
        funnelId,
        steps,
        computedAt: new Date().toISOString(),
        cacheKey,
        cacheTTLSeconds: FUNNEL_TTL_SECONDS,
        ...(acquisitionExtras ?? {}),
    };
    cache.set(cacheKey, result);
    return result;
}
function invalidateFunnelCache(funnelId) {
    if (funnelId) {
        cache.invalidate(key => key.startsWith(`${funnelId}|`));
    }
    else {
        cache.invalidate(() => true);
    }
}
//# sourceMappingURL=funnelService.js.map