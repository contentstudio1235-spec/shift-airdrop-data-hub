import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeKOLLeaderboard } from '../services/attributionService';
import * as pool from '../db/pool';
vi.mock('../db/pool');
describe('computeKOLLeaderboard', () => {
  beforeEach(() => vi.resetAllMocks());
  it('ranks referrers by composite score and computes derived fields', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce([
      { referrer: 'abc123', users: '100', holders: '15', whales: '1', volume: '4000', first_seen: '2026-01-01T00:00:00Z', last_seen: '2026-06-04T00:00:00Z' },
      { referrer: 'def456', users: '50',  holders: '1',  whales: '0', volume: '50',   first_seen: '2026-02-01T00:00:00Z', last_seen: '2026-06-01T00:00:00Z' },
    ] as any);
    const result = await computeKOLLeaderboard({}, 10);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].referrer).toBe('abc123');
    expect(result.rows[0].holderRate).toBe(0.15);
    expect(result.rows[0].avgVolumePerUserUSD).toBe(40);
    expect(result.rows[0].source).toBe('snag_referrals');
    expect(result.rows[0].score).toBeGreaterThan(result.rows[1].score);
    expect(result.totals.totalReferrers).toBe(2);
  });
});
