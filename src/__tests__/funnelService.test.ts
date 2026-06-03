import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFunnel, invalidateFunnelCache } from '../services/funnelService';
import * as db from '../db/pool';

vi.mock('../db/pool');

describe('computeFunnel — acquisition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateFunnelCache(); // clear LRU cache between tests to prevent cache bleed
  });

  it('returns 4 steps with conversion percentages', async () => {
    // Mock the query function to return step counts
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([
        { step: 'visit', count: '12415' },
        { step: 'landing', count: '8200' },
        { step: 'connect', count: '3387' },
        { step: 'first_trade', count: '430' },
      ] satisfies Array<{ step: string; count: string }>)
      .mockResolvedValueOnce([
        { attributable_pct: null, stitched_pct: '22.0', median_seconds: '7200' },
      ] satisfies Array<{ attributable_pct: string | null; stitched_pct: string | null; median_seconds: string | null }>);

    const result = await computeFunnel('acquisition', {});
    expect(result.funnelId).toBe('acquisition');
    expect(result.steps).toHaveLength(4);
    expect(result.steps[0].name).toBe('GA4 Visit');
    expect(result.steps[0].count).toBe(12415);
    expect(result.steps[1].conversionFromPrev).toBeCloseTo(66.05, 1);
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(3.46, 1);
  });

  it('handles empty steps gracefully', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([] satisfies Array<{ step: string; count: string }>)
      .mockResolvedValueOnce([
        { attributable_pct: null, stitched_pct: null, median_seconds: null },
      ] satisfies Array<{ attributable_pct: string | null; stitched_pct: string | null; median_seconds: string | null }>);
    const result = await computeFunnel('acquisition', {});
    expect(result.steps).toEqual([]);
  });

  it('returns acquisition extras when funnel is acquisition', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([
        { step: 'visit', count: '12415' },
        { step: 'landing', count: '8200' },
        { step: 'connect', count: '3387' },
        { step: 'first_trade', count: '430' },
      ] satisfies Array<{ step: string; count: string }>)
      .mockResolvedValueOnce([
        { attributable_pct: null, stitched_pct: '22.0', median_seconds: '7200' },
      ] satisfies Array<{ attributable_pct: string | null; stitched_pct: string | null; median_seconds: string | null }>);

    const result = await computeFunnel('acquisition', {});
    expect(result.stitchedPct).toBe(22);
    expect(result.attributablePct).toBeNull();
    expect(result.medianTimeToFirstTrade).toBe(7200);
  });
});

describe('computeFunnel — activation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateFunnelCache();
  });

  it('returns connect→register→kyc→first_trade counts', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'connect', count: '3387' },
      { step: 'register', count: '3387' },
      { step: 'kyc', count: '1200' },
      { step: 'first_trade', count: '430' },
    ] satisfies Array<{ step: string; count: string }>);

    const result = await computeFunnel('activation', {});
    expect(result.steps).toHaveLength(4);
    expect(result.steps[2].name).toBe('KYC Complete');
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(12.69, 1);
  });
});

describe('computeFunnel — conversion', () => {
  beforeEach(() => { vi.resetAllMocks(); invalidateFunnelCache(); });

  it('returns first_trade→second→multi_asset→active steps', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'first_trade', count: '430' },
      { step: 'second_trade', count: '180' },
      { step: 'multi_asset', count: '60' },
      { step: 'active_holder', count: '30' },
    ] satisfies Array<{ step: string; count: string }>);

    const result = await computeFunnel('conversion', {});
    expect(result.steps).toHaveLength(4);
    expect(result.steps[1].conversionFromPrev).toBeCloseTo(41.86, 1);
  });
});

describe('computeFunnel — whale_pipeline', () => {
  beforeEach(() => { vi.resetAllMocks(); invalidateFunnelCache(); });

  it('segments by position size tiers', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'holder', count: '430' },
      { step: 'over_1k', count: '120' },
      { step: 'over_10k', count: '25' },
      { step: 'over_100k', count: '3' },
    ] satisfies Array<{ step: string; count: string }>);

    const result = await computeFunnel('whale_pipeline', {});
    expect(result.steps[3].count).toBe(3);
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(0.70, 1);
  });
});

describe('computeFunnel — loyalty', () => {
  beforeEach(() => { vi.resetAllMocks(); invalidateFunnelCache(); });

  it('counts trader → snag_linked → badged → top tier', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'trader', count: '430' },
      { step: 'snag_linked', count: '180' },
      { step: 'badged', count: '120' },
      { step: 'top_tier', count: '20' },
    ] satisfies Array<{ step: string; count: string }>);

    const result = await computeFunnel('loyalty', {});
    expect(result.steps[1].name).toBe('Snag Linked');
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(4.65, 1);
  });
});

describe('computeFunnel — referral', () => {
  beforeEach(() => { vi.resetAllMocks(); invalidateFunnelCache(); });

  it('counts referral chain steps', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'user', count: '15455' },
      { step: 'code_generated', count: '2400' },
      { step: 'referral_clicked', count: '800' },
      { step: 'referral_traded', count: '120' },
    ] satisfies Array<{ step: string; count: string }>);
    const result = await computeFunnel('referral', {});
    expect(result.steps[3].count).toBe(120);
  });
});

describe('computeFunnel — retention', () => {
  beforeEach(() => { vi.resetAllMocks(); invalidateFunnelCache(); });

  it('classifies users by activity recency', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'active', count: '430' },
      { step: 'dormant_7d', count: '180' },
      { step: 'reactivated', count: '40' },
      { step: 'lost_30d', count: '300' },
    ] satisfies Array<{ step: string; count: string }>);
    const result = await computeFunnel('retention', {});
    expect(result.steps).toHaveLength(4);
  });
});
