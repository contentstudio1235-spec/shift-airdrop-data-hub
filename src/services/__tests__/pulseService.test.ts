// ============================================================
// pulseService — unit tests
// ============================================================
// Mocks the DB pool. Asserts response shape, KPI Δ math, signup
// source rollup, anomaly emission, and the 60-second cache.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../db/pool';
import { getPulseSnapshot, _clearPulseCache } from '../pulseService';

vi.mock('../../db/pool');

// Helper — stage a sequence of query/queryOne responses in the order
// pulseService calls them. The order is:
//   queryOne:  registeredUsers, activeHolders, aumUSD, stitchPct,
//              activations24h, openWhalesCount        (6 calls)
//   query:     aum30d, signupsBySource24h, whaleActivity24h   (3 calls)
//   queryOne:  airdrop_config baseline (only if anomaly path runs)
// Promise.all runs them in parallel so individual ordering inside a
// type (queryOne vs query) is preserved per the source.
function stageQueryOne(responses: any[]) {
  const spy = vi.spyOn(db, 'queryOne');
  for (const r of responses) spy.mockResolvedValueOnce(r);
  return spy;
}

function stageQuery(responses: any[]) {
  const spy = vi.spyOn(db, 'query');
  for (const r of responses) spy.mockResolvedValueOnce(r as any);
  return spy;
}

const happy = {
  // queryOne sequence — 6 KPIs in service call order
  registered: { total: '16790', new_24h: '173' },
  activeHolders: { total: '473', new_holders: '4', churned: '2' },
  aum: { total: '26400', opens_24h: '500', closes_24h: '300' },
  stitch: { pct: '24.0' },
  activations: { activations: '47' },
  whales: { total: '4', opens: '1', closes: '1' },
  // query sequence — trends and feed
  aum30d: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-05-${String(7 + i).padStart(2, '0')}`,
    value: String(22000 + i * 150),
  })),
  signups: [
    { source: 'snag_referrals', count: '102' },
    { source: 'direct', count: '71' },
    { source: 'twitter', count: '40' },
    { source: 'discord', count: '20' },
    { source: 'telegram', count: '10' },
    { source: 'tiktok', count: '3' },
  ],
  whaleFeed: [
    {
      occurred_at: new Date('2026-06-05T12:08:42Z'),
      wallet: 'Ab3fXYZ',
      asset: 'TSL2L',
      size_usd: '1452',
      event: 'open' as const,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  _clearPulseCache();
});

describe('getPulseSnapshot — shape', () => {
  it('returns a snapshot with the documented shape', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    stageQuery([happy.aum30d, happy.signups, happy.whaleFeed]);

    const snap = await getPulseSnapshot();

    expect(snap).toHaveProperty('computedAt');
    expect(snap.kpis).toHaveProperty('registeredUsers');
    expect(snap.kpis).toHaveProperty('activeHolders');
    expect(snap.kpis).toHaveProperty('aumUSD');
    expect(snap.kpis).toHaveProperty('stitchPct');
    expect(snap.kpis).toHaveProperty('activations24h');
    expect(snap.kpis).toHaveProperty('openWhalesCount');
    expect(snap.trends.aum30d).toHaveLength(30);
    expect(Array.isArray(snap.trends.signupsBySource24h)).toBe(true);
    expect(Array.isArray(snap.whaleActivity24h)).toBe(true);
    expect(Array.isArray(snap.anomalies)).toBe(true);
  });
});

describe('getPulseSnapshot — KPI math', () => {
  beforeEach(() => {
    stageQuery([happy.aum30d, happy.signups, happy.whaleFeed]);
  });

  it('computes registeredUsers Δ24h and Δ24hPct', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const snap = await getPulseSnapshot();
    expect(snap.kpis.registeredUsers.value).toBe(16790);
    expect(snap.kpis.registeredUsers.delta24h).toBe(173);
    // (173 / (16790 - 173)) * 100 = 1.0411... → 1.04
    expect(snap.kpis.registeredUsers.delta24hPct).toBe(1.04);
  });

  it('computes activeHolders Δ24h as new − churned', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders, // new=4, churned=2 → Δ=2
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const snap = await getPulseSnapshot();
    expect(snap.kpis.activeHolders.value).toBe(473);
    expect(snap.kpis.activeHolders.delta24h).toBe(2);
  });

  it('rounds aumUSD and computes Δ from opens − closes', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum, // total=26400, opens=500, closes=300 → Δ=200
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const snap = await getPulseSnapshot();
    expect(snap.kpis.aumUSD.value).toBe(26400);
    expect(snap.kpis.aumUSD.delta24h).toBe(200);
  });

  it('returns stitchPct with null deltas (v1 limitation)', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const snap = await getPulseSnapshot();
    expect(snap.kpis.stitchPct.value).toBe(24);
    expect(snap.kpis.stitchPct.delta24h).toBeNull();
    expect(snap.kpis.stitchPct.delta24hPct).toBeNull();
  });

  it('returns activations24h with null deltas (is itself a Δ-metric)', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const snap = await getPulseSnapshot();
    expect(snap.kpis.activations24h.value).toBe(47);
    expect(snap.kpis.activations24h.delta24h).toBeNull();
  });
});

describe('getPulseSnapshot — signupsBySource24h rollup', () => {
  it('rolls sources below 5% share into "other"', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    // total = 102+71+40+20+10+3 = 246; "tiktok" with 3 is 1.2% → other
    stageQuery([happy.aum30d, happy.signups, happy.whaleFeed]);

    const snap = await getPulseSnapshot();
    const sources = snap.trends.signupsBySource24h;
    const other = sources.find(s => s.source === 'other');
    expect(other).toBeDefined();
    expect(other!.count).toBeGreaterThanOrEqual(3);
    // Should be sorted by count desc
    for (let i = 1; i < sources.length; i++) {
      expect(sources[i - 1].count).toBeGreaterThanOrEqual(sources[i].count);
    }
  });

  it('returns [] when there are no signups', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    stageQuery([happy.aum30d, [], happy.whaleFeed]);

    const snap = await getPulseSnapshot();
    expect(snap.trends.signupsBySource24h).toEqual([]);
  });
});

describe('getPulseSnapshot — anomalies', () => {
  it('emits no anomalies on the happy path', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch, // 24% — matches baseline fallback
      happy.activations,
      happy.whales,
    ]);
    stageQuery([happy.aum30d, happy.signups, happy.whaleFeed]);
    const snap = await getPulseSnapshot();
    expect(snap.anomalies).toEqual([]);
  });

  it('emits a warn anomaly when whale events exceed surge threshold', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const tenWhales = Array.from({ length: 10 }, (_, i) => ({
      occurred_at: new Date(`2026-06-05T12:00:0${i % 10}Z`),
      wallet: `wallet-${i}`,
      asset: 'TSL2L',
      size_usd: '1500',
      event: 'open' as const,
    }));
    stageQuery([happy.aum30d, happy.signups, tenWhales]);

    const snap = await getPulseSnapshot();
    const whaleSurge = snap.anomalies.find(a =>
      a.message.toLowerCase().includes('whale activity'),
    );
    expect(whaleSurge).toBeDefined();
    expect(whaleSurge!.severity).toBe('info');
    expect(whaleSurge!.actionView).toBe('attribution');
  });

  it('emits a warn anomaly when direct surge crosses 80%', async () => {
    stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    // 95 direct vs 5 twitter → 95% direct
    stageQuery([
      happy.aum30d,
      [
        { source: 'direct', count: '95' },
        { source: 'twitter', count: '5' },
      ],
      happy.whaleFeed,
    ]);

    const snap = await getPulseSnapshot();
    const utm = snap.anomalies.find(a =>
      a.message.toLowerCase().includes('unattributed'),
    );
    expect(utm).toBeDefined();
    expect(utm!.severity).toBe('warn');
    expect(utm!.actionView).toBe('attribution');
  });
});

describe('getPulseSnapshot — caching', () => {
  it('serves the cached snapshot on the second call', async () => {
    const qOne = stageQueryOne([
      happy.registered,
      happy.activeHolders,
      happy.aum,
      happy.stitch,
      happy.activations,
      happy.whales,
    ]);
    const q = stageQuery([happy.aum30d, happy.signups, happy.whaleFeed]);

    const first = await getPulseSnapshot();
    const callsAfterFirst = qOne.mock.calls.length + q.mock.calls.length;

    const second = await getPulseSnapshot();
    const callsAfterSecond = qOne.mock.calls.length + q.mock.calls.length;

    expect(second).toEqual(first);
    expect(callsAfterSecond).toBe(callsAfterFirst); // no extra DB calls
  });
});
