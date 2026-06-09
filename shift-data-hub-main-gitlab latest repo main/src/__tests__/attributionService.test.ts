import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeChannelROI, computeWhaleOrigins, invalidateAttributionCache } from '../services/attributionService';
import * as db from '../db/pool';

vi.mock('../db/pool');

describe('computeChannelROI', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateAttributionCache();
  });

  it('groups users and volume by utm_source', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { source: 'twitter', users: '4200', stitched_users: '900', holders: '180', whales: '14', total_volume_usd: '8200', avg_position_usd: '600' },
      { source: 'discord', users: '2100', stitched_users: '700', holders: '90', whales: '6', total_volume_usd: '3400', avg_position_usd: '550' },
    ] satisfies Array<{ source: string; users: string; stitched_users: string; holders: string; whales: string; total_volume_usd: string; avg_position_usd: string }>);

    const result = await computeChannelROI({});
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('twitter');
    expect(result[0].totalVolumeUSD).toBe(8200);
  });
});

describe('computeWhaleOrigins', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateAttributionCache();
  });

  it('returns Sankey-shaped response with nodes, edges, and totals', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { source: 'twitter', cohort: 'whale', outcome: 'active', users: '14', volume: '28000' },
      { source: 'discord', cohort: 'whale', outcome: 'active', users: '6', volume: '12000' },
    ] as any);

    const result = await computeWhaleOrigins({});
    expect(result.nodes.some(n => n.kind === 'source' && n.id === 'src:twitter')).toBe(true);
    expect(result.edges.some(e => e.from === 'src:twitter' && e.to === 'coh:whale')).toBe(true);
    expect(result.totals.whales).toBe(20);
    expect(result.totals.whaleVolumeUSD).toBe(40000);
    expect(result.dataQuality).toBe('sprint_2_3_live');
  });
});
