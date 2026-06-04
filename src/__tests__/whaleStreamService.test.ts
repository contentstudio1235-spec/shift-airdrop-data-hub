import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchInitialWhales, pollNewWhales } from '../services/whaleStreamService';
import * as pool from '../db/pool';
vi.mock('../db/pool');

describe('fetchInitialWhales', () => {
  beforeEach(() => vi.resetAllMocks());
  it('returns historical events with isHistorical=true and direct source when no utm/ref', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce([
      { wallet: 'AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp', first_utm: null, ref: null, asset: 'TSL2L', size: '1500', opened_at: '2026-06-04T00:00:00Z' },
    ] as any);
    const events = await fetchInitialWhales();
    expect(events).toHaveLength(1);
    expect(events[0].sizeUSD).toBe(1500);
    expect(events[0].isHistorical).toBe(true);
    expect(events[0].source).toBe('direct');
    expect(events[0].walletDisplay).toBe('AbCdEfGh...MnOp');
  });
});

describe('pollNewWhales', () => {
  beforeEach(() => vi.resetAllMocks());
  it('classifies 6-char referred_by_code as snag_referrals', async () => {
    const cursor = new Date('2026-06-04T00:00:00Z');
    vi.spyOn(pool, 'query').mockResolvedValueOnce([
      { wallet: 'XyZxYzXyZxYzXyZxYzXyZxYzXyZxYzXyZxYzXyZxYz', first_utm: null, ref: 'abc123', asset: 'SOX3L', size: '2200', opened_at: '2026-06-04T00:05:00Z' },
    ] as any);
    const events = await pollNewWhales(cursor);
    expect(events).toHaveLength(1);
    expect(events[0].isHistorical).toBeUndefined();
    expect(events[0].source).toBe('snag_referrals');
  });

  it('filters to status=open positions only (Code Reviewer BLOCKER 2)', async () => {
    const cursor = new Date('2026-06-04T00:00:00Z');
    const spy = vi.spyOn(pool, 'query').mockResolvedValueOnce([] as any);
    await pollNewWhales(cursor);
    const sql = spy.mock.calls[0][0] as string;
    expect(sql).toMatch(/pos\.status\s*=\s*'open'/);
  });
});
