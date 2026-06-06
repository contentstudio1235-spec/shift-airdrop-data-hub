// ============================================================
// Metric Reconciliation #6 — activeHolders + Δ24h
// ============================================================
// Top-10 Trust Audit, Part VI, metric #6.
//   Decisions served: D8 (executive), D5 (whale prospecting)
//   Variance threshold:
//     - vs canonical SQL: EXACT (same DB rows, must agree)
//     - vs on-chain RPC count: ≤5% (off-chain "stitching gap")
//
// Reconciliation methodology:
//   - Source A (production endpoint): getPulseSnapshot() —
//     `kpis.activeHolders.value` = COUNT(DISTINCT wallet) FROM positions
//     WHERE status='open'.
//   - The .value unit test is a STRUCTURAL SMOKE TEST that confirms
//     toNumber() + field-name plumbing flows through unchanged. It is
//     NOT a true reconciliation — the mock data IS the canonical
//     computation, so a future row-multiplication regression at the SQL
//     layer would not be detected by this test alone.
//   - The delta24h tests (formula correctness + canonical Δ%/percent
//     identity + negative-delta) ARE real reconciliations — they
//     exercise the production code's arithmetic against an independent
//     computation derived from a different SQL shape.
//   - Source B (on-chain RPC, `/api/admin/onchain-holders`): SKIPPED
//     integration test — compares on-chain holder count for the 6 SHIFT
//     tokens vs the activeHolders count. Variance ≤5%. This is the
//     actual second-source reconciliation for this metric and must be
//     wired before this metric is considered audit-floor complete.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../../db/pool';
import { getPulseSnapshot, _clearPulseCache } from '../../pulseService';

vi.mock('../../../db/pool');

const TRUE_ACTIVE_HOLDERS = 473;
const TRUE_NEW_HOLDERS_24H = 4;
const TRUE_CHURNED_24H = 2;

const queryOneSequence = (activeOverride?: { total: string; new_holders: string; churned: string }) => [
  { total: '16790', new_24h: '173' },
  activeOverride ?? {
    total: String(TRUE_ACTIVE_HOLDERS),
    new_holders: String(TRUE_NEW_HOLDERS_24H),
    churned: String(TRUE_CHURNED_24H),
  },
  { total: '26400', opens_24h: '500', closes_24h: '300' },
  { pct: '24.0' },
  { activations: '47' },
  { total: '4', opens: '1', closes: '1' },
];

const querySequence = [
  Array.from({ length: 30 }, (_, i) => ({
    date: `2026-05-${String(7 + i).padStart(2, '0')}`,
    value: String(22000 + i * 150),
  })),
  [{ source: 'twitter', count: '173' }],
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
});

describe('reconciliation #6: activeHolders — Pulse endpoint vs canonical recomputation', () => {
  it('value identity-equals the canonical COUNT(DISTINCT wallet) FROM positions WHERE status=open', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    expect(snap.kpis.activeHolders.value).toBe(TRUE_ACTIVE_HOLDERS);
  });

  it('delta24h identity-equals (new_holders − churned)', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    expect(snap.kpis.activeHolders.delta24h).toBe(TRUE_NEW_HOLDERS_24H - TRUE_CHURNED_24H);
  });

  it('delta24hPct === (delta24h / (total − delta24h)) * 100, rounded to 2dp', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    const delta = TRUE_NEW_HOLDERS_24H - TRUE_CHURNED_24H;
    const canonical = (delta / (TRUE_ACTIVE_HOLDERS - delta)) * 100;
    const canonicalRounded = Math.round(canonical * 100) / 100;
    expect(snap.kpis.activeHolders.delta24hPct).toBe(canonicalRounded);
  });

  it('delta24h can be negative (more churned than new — net holder loss)', async () => {
    stageQueryOne(queryOneSequence({
      total: '400', new_holders: '2', churned: '15',
    }));
    stageQuery(querySequence);

    const snap = await getPulseSnapshot();
    expect(snap.kpis.activeHolders.delta24h).toBe(2 - 15);
    expect(snap.kpis.activeHolders.delta24h).toBeLessThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION-LEVEL CHECK (skipped at unit scope)
// ─────────────────────────────────────────────────────────────────────────────
describe('reconciliation #6: activeHolders vs on-chain holder count (integration)', () => {
  it.skip('TODO[integration]: Pulse activeHolders within ≤5% of /api/admin/onchain-holders.uniqueHolders', async () => {
    // What this test would do at integration time:
    //   1. Call getPulseSnapshot() against the live DB. Read
    //      snap.kpis.activeHolders.value.
    //   2. Call GET /api/admin/onchain-holders with the admin key. This
    //      makes a Helius RPC call enumerating all token-account holders
    //      across the 6 SHIFT leveraged tokens (TSL2L, TSL1S, SOX3L,
    //      SOX3S, SPX3L, SPX3S).
    //   3. Read `uniqueHolders` from the response.
    //   4. Compute relative variance: |db − onchain| / onchain.
    //   5. Assert variance ≤ 0.05 (5%) per v2 audit plan row #6.
    //
    // Why skipped at unit scope:
    //   - Requires real Helius RPC (rate-limited, ~30s cold-start, costs
    //     real API quota).
    //   - The "on-chain truth" cannot be mocked without re-implementing
    //     the SPL Token Program enumeration — which would defeat the
    //     purpose of an independent second source.
    //   - The 5% threshold reflects expected stitching gap: wallets that
    //     hold tokens but never registered through the Hub. Validating
    //     this with mocks would lock in an arbitrary number, not a
    //     reconciled fact.
    //
    // Trigger: integration suite, nightly, against staging DB + live
    //   Helius mainnet RPC. On failure, page on-call + freeze deploys.
  });
});
