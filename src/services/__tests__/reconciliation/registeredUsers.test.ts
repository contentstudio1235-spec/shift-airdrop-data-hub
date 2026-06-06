// ============================================================
// Metric Reconciliation #5 — registeredUsers + Δ24h
// ============================================================
// Top-10 Trust Audit, Part VI, metric #5.
//   Decisions served: D8 + anomaly detection (Pulse hero KPI)
//   Variance threshold: EXACT — no slop. registeredUsers is the
//                       most-quoted single number on the Hub; any drift
//                       erodes M1/M2/X1 confidence permanently.
//
// Reconciliation methodology:
//   - Source A (production endpoint): getPulseSnapshot() — emits
//     `kpis.registeredUsers.value` and `.delta24h`.
//   - Source B (canonical recomputation): on the same mocked DB rows,
//     directly read the fixture and assert value == total, delta24h ==
//     new_24h. The endpoint's only transform is Number() — anything
//     other than identity-equality means a regression has shipped.
//   - Cross-source check: Pulse Stage-1 funnel "connect" count is
//     compared against Pulse registeredUsers in a separate test below
//     (the audit plan v2 hard-equality requirement).
//
// All three Pulse hero KPIs that this file reconciles (registeredUsers,
// activeHolders, aumUSD) appear together in the Pulse payload — the
// happy-path test stages the same query sequence used by
// pulseService.getPulseSnapshot().
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../../db/pool';
import { getPulseSnapshot, _clearPulseCache } from '../../pulseService';
import { computeFunnel, invalidateFunnelCache } from '../../funnelService';

vi.mock('../../../db/pool');

// Ground-truth fixture: 16,790 total profiles, 173 created in last 24h.
const TRUE_REGISTERED = 16790;
const TRUE_NEW_24H = 173;

// pulseService queryOne sequence:
//   registeredUsers, activeHolders, aumUSD, stitchPct,
//   activations24h, openWhalesCount
const queryOneSequence = (registeredOverride?: { total: string; new_24h: string }) => [
  registeredOverride ?? { total: String(TRUE_REGISTERED), new_24h: String(TRUE_NEW_24H) },
  { total: '473', new_holders: '4', churned: '2' },
  { total: '26400', opens_24h: '500', closes_24h: '300' },
  { pct: '24.0' },
  { activations: '47' },
  { total: '4', opens: '1', closes: '1' },
];

// pulseService query sequence: aum30d, signupsBySource24h, whaleActivity24h
const querySequence = [
  Array.from({ length: 30 }, (_, i) => ({
    date: `2026-05-${String(7 + i).padStart(2, '0')}`,
    value: String(22000 + i * 150),
  })),
  [{ source: 'twitter', count: String(TRUE_NEW_24H) }],
  [],
];

function stageQueryOne(seq: any[]) {
  const spy = vi.spyOn(db, 'queryOne');
  for (const r of seq) spy.mockResolvedValueOnce(r);
  return spy;
}
function stageQuery(seq: any[]) {
  const spy = vi.spyOn(db, 'query');
  for (const r of seq) spy.mockResolvedValueOnce(r as any);
  return spy;
}

beforeEach(() => {
  vi.resetAllMocks();
  _clearPulseCache();
  invalidateFunnelCache();
});

describe('reconciliation #5: registeredUsers — Pulse endpoint vs canonical recomputation', () => {
  it('value identity-equals the canonical COUNT(*) FROM user_profiles', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();

    // EXACT equality — registeredUsers is the executive-level number.
    expect(snap.kpis.registeredUsers.value).toBe(TRUE_REGISTERED);
  });

  it('delta24h identity-equals the canonical COUNT(*) WHERE created_at >= NOW() - 24h', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    expect(snap.kpis.registeredUsers.delta24h).toBe(TRUE_NEW_24H);
  });

  it('delta24hPct === (delta24h / (total − delta24h)) * 100, rounded to 2dp', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    const canonical = (TRUE_NEW_24H / (TRUE_REGISTERED - TRUE_NEW_24H)) * 100;
    const canonicalRounded = Math.round(canonical * 100) / 100;
    expect(snap.kpis.registeredUsers.delta24hPct).toBe(canonicalRounded);
  });

  it('delta24hPct is null when prior baseline is 0 (division-by-zero guard)', async () => {
    stageQueryOne(queryOneSequence({ total: '5', new_24h: '5' })); // all created in last 24h
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    expect(snap.kpis.registeredUsers.value).toBe(5);
    expect(snap.kpis.registeredUsers.delta24h).toBe(5);
    expect(snap.kpis.registeredUsers.delta24hPct).toBeNull();
  });
});

describe('reconciliation #5: registeredUsers — hard-equality cross-source contract', () => {
  // Audit plan v2, Part VI, row #4 + #5: Pulse `kpis.registeredUsers`
  // must EQUAL the Funnel Stage-1 connect-count exactly (no tolerance).
  //
  // The contract is on the underlying SQL: both endpoints count
  // user_profiles for the same window. The test below mocks both
  // endpoints with the SAME canonical fixture and asserts they return
  // the same number. Any production drift between the two SQL
  // statements would be caught when this test fails on a live DB
  // (integration test) — but the unit-test version asserts the
  // STRUCTURAL contract is in place.

  it('Pulse registeredUsers == Funnel acquisition stage-3 (connect) count when fed identical fixtures', async () => {
    const REGISTERED = 16790;

    // ── Pulse side ──
    stageQueryOne(queryOneSequence({ total: String(REGISTERED), new_24h: String(TRUE_NEW_24H) }));
    stageQuery(querySequence);
    const pulse = await getPulseSnapshot();

    // ── Funnel side: rebuild fresh mocks (vi.resetAllMocks isolates) ──
    vi.resetAllMocks();
    _clearPulseCache();
    invalidateFunnelCache();

    const funnelRows = [
      { step: 'visit',       count: '50000' },
      { step: 'landing',     count: '20000' },
      { step: 'connect',     count: String(REGISTERED) }, // same canonical source
      { step: 'first_trade', count: '800' },
    ];
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce(funnelRows as any)
      .mockResolvedValueOnce([{ attributable_pct: null, stitched_pct: '85.0', median_seconds: '7200' }] as any);
    const funnel = await computeFunnel('acquisition', {});
    const connect = funnel.steps.find(s => s.id === 'connect')!;

    // Hard equality — these are computed from the same canonical row in prod.
    expect(pulse.kpis.registeredUsers.value).toBe(connect.count);
  });
});
