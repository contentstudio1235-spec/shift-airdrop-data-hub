import { describe, it, expect } from 'vitest';
import { whalePubsub, publishWhaleEvent } from '../services/streamService';
import type { WhaleStreamEvent } from '../types/funnel';

describe('whalePubsub', () => {
  it('delivers events to subscribers', () => {
    const events: WhaleStreamEvent[] = [];
    const unsub = whalePubsub.subscribe(e => events.push(e));

    publishWhaleEvent({
      type: 'trade',
      wallet: 'AbCd1234',
      asset: 'TSL2L',
      sizeUSD: 1500,
      side: 'long',
      timestamp: '2026-06-02T20:00:00Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0].asset).toBe('TSL2L');

    unsub();
    publishWhaleEvent({
      type: 'trade',
      wallet: 'AbCd1234',
      asset: 'SPX3L',
      sizeUSD: 1500,
      side: 'long',
      timestamp: '2026-06-02T20:00:01Z',
    });
    expect(events).toHaveLength(1);
  });

  it('filters by minimum size', () => {
    const events: WhaleStreamEvent[] = [];
    const unsub = whalePubsub.subscribe(e => events.push(e));

    publishWhaleEvent({
      type: 'trade',
      wallet: 'AbCd1234',
      asset: 'TSL2L',
      sizeUSD: 100,  // below default $1000 threshold
      side: 'long',
      timestamp: '2026-06-02T20:00:00Z',
    });

    expect(events).toHaveLength(0);
    unsub();
  });
});
