import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeCohortMatrix, invalidateCohortCache } from '../services/cohortService';
import * as db from '../db/pool';

vi.mock('../db/pool');

describe('computeCohortMatrix', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateCohortCache();
  });

  it('produces weekly retention matrix', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { cohort: '2026-05-W22', size_at_start: '100', retention: [100, 60, 40, 30] },
      { cohort: '2026-05-W21', size_at_start: '80',  retention: [100, 55, 35] },
    ] satisfies Array<{ cohort: string; size_at_start: string; retention: number[] }>);

    const result = await computeCohortMatrix('week', {});
    expect(result.dim).toBe('week');
    expect(result.cohorts).toHaveLength(2);
    expect(result.cohorts[0].retention[1]).toBe(60);
  });

  it('rejects invalid dim', async () => {
    // @ts-expect-error testing runtime guard
    await expect(computeCohortMatrix('decade', {})).rejects.toThrow();
  });
});
