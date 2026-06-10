"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCohortMatrix = computeCohortMatrix;
exports.invalidateCohortCache = invalidateCohortCache;
// src/services/cohortService.ts
const pool_1 = require("../db/pool");
const cache_1 = require("../lib/cache");
const COHORT_TTL_SECONDS = 300;
const cache = new cache_1.FunnelCache({ ttlSeconds: COHORT_TTL_SECONDS, maxEntries: 100 });
const ALLOWED_DIMS = ['day', 'week', 'month'];
const DATE_TRUNC = {
    day: 'day',
    week: 'week',
    month: 'month',
};
const INTERVAL = {
    day: '1 day',
    week: '1 week',
    month: '1 month',
};
// SQL injection safety: values come from lookup maps keyed by allowlist-validated `dim`
// (checked at the top of computeCohortMatrix via ALLOWED_DIMS). The interpolation is safe.
const LABEL_FMT = {
    day: 'YYYY-MM-DD',
    week: 'IYYY-"W"IW',
    month: 'YYYY-MM',
};
async function computeCohortMatrix(dim, params) {
    if (!ALLOWED_DIMS.includes(dim)) {
        throw new Error(`Invalid cohort dim: ${dim}`);
    }
    const cacheKey = `cohort_${dim}|${(0, cache_1.buildCacheKey)('cohort', params)}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    // SQL injection safety: DATE_TRUNC and INTERVAL values come from lookup maps
    // keyed by the allowlist-validated `dim`. The string interpolation below is
    // safe BECAUSE `dim` is validated against ALLOWED_DIMS at the top of this fn.
    const trunc = DATE_TRUNC[dim];
    const interval = INTERVAL[dim];
    const labelFmt = LABEL_FMT[dim];
    const rows = await (0, pool_1.query)(`
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
    `, [params.from ?? null, params.to ?? null]);
    const result = {
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
function invalidateCohortCache() {
    cache.invalidate(() => true);
}
//# sourceMappingURL=cohortService.js.map