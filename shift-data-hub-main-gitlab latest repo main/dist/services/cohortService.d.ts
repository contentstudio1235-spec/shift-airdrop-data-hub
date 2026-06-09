import type { CohortDim, CohortMatrix, FunnelQueryParams } from '../types/funnel';
import type { CohortsSnapshot } from '../types/cohort';
export declare function computeCohortMatrix(dim: CohortDim, params: FunnelQueryParams): Promise<CohortMatrix>;
export declare function invalidateCohortCache(): void;
/** Exposed for tests — clears the snapshot cache. */
export declare function _clearCohortSnapshotCache(): void;
/**
 * Returns the full weekly-cohort snapshot. Cached in-memory for
 * SNAPSHOT_CACHE_TTL_MS (60s) — matches the freshness budget for
 * cohort data, which doesn't change at sub-minute resolution.
 */
export declare function getCohortsSnapshot(): Promise<CohortsSnapshot>;
//# sourceMappingURL=cohortService.d.ts.map