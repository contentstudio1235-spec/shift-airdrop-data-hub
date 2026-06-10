// src/services/cohortService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { CohortDim, CohortMatrix, FunnelQueryParams } from '../types/funnel';

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
