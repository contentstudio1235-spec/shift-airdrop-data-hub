import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeWhaleOrigins } from '../services/attributionService';
import * as pool from '../db/pool';
vi.mock('../db/pool');
describe('computeWhaleOrigins', () => {
  beforeEach(() => vi.resetAllMocks());
  it('returns nodes + edges + totals shape from grouped rows', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce([
      { source: 'direct', cohort: 'whale', outcome: 'active', users: '3', volume: '15000' },
      { source: 'direct', cohort: 'fish', outcome: 'churned', users: '5355', volume: '0' },
      { source: 'snag_referrals', cohort: 'whale', outcome: 'active', users: '1', volume: '2000' },
    ] as any);
    const result = await computeWhaleOrigins({});
    expect(result.nodes.some(n => n.kind === 'source' && n.id === 'src:direct')).toBe(true);
    expect(result.nodes.some(n => n.kind === 'cohort' && n.id === 'coh:whale')).toBe(true);
    expect(result.edges.some(e => e.from === 'src:direct' && e.to === 'coh:whale' && e.value === 3)).toBe(true);
    expect(result.totals.whales).toBe(4);
    expect(result.totals.whaleVolumeUSD).toBe(17000);
  });
});
