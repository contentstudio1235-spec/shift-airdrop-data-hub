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

  it('produces sankey edges for top whales', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { from_node: 'twitter', to_node: 'first_trade', value: '14' },
      { from_node: 'discord', to_node: 'first_trade', value: '6' },
    ] satisfies Array<{ from_node: string; to_node: string; value: string }>);

    const result = await computeWhaleOrigins({});
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe('twitter');
    expect(result[0].value).toBe(14);
  });
});
