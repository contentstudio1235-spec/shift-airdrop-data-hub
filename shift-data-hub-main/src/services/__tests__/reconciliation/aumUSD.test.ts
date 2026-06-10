// ============================================================
// Metric Reconciliation #7 — aumUSD + 30d sparkline
// ============================================================
// Top-10 Trust Audit, Part VI, metric #7.
//   Decisions served: D8 (executive/board reporting)
//   Variance threshold: <0.1% (tightest tier — financial metric)
//
// Reconciliation methodology:
//   - Source A: getPulseSnapshot().kpis.aumUSD — card value.
//   - Source B: getPulseSnapshot().trends.aum30d — sparkline. Today's
//     entry (last element of the 30-day series) MUST equal the card
//     value within <0.1%. v2 audit plan row #7: "Sparkline endpoint at
//     today's date === current card value."
//   - Why this matters: AUM is the single most-quoted number on
//     executive slides. Card and sparkline diverging by even 0.5% means
//     a director quotes one number out loud and the screenshot behind
//     them shows another — credibility erodes immediately.
//
// Production SQL emits both via the SAME `position_size_usd` aggregate
// against the SAME `positions` table — but with different temporal
// predicates. Card = SUM WHERE status='open'. Sparkline-today = SUM
// WHERE opened_at ≤ (today+1day) AND (closed_at IS NULL OR > today+1day).
// These two MUST converge to the same number when "today" is now.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../../db/pool';
import { getPulseSnapshot, _clearPulseCache } from '../../pulseService';

vi.mock('../../../db/pool');

// Ground truth: $26,400 AUM today, varying sparkline that ENDS on 26400.
const TRUE_AUM_NOW = 26400;

function buildSparkline(endValue: number): Array<{ date: string; value: string }> {
  // 30 days. Last entry MUST equal endValue (the card value).
  // Earlier values trend upward to 26400.
  const out: Array<{ date: string; value: string }> = [];
  const today = new Date('2026-06-05T00:00:00Z');
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const value = i === 0 ? endValue : Math.round(endValue - i * 150);
    out.push({
      date: d.toISOString().slice(0, 10),
      value: String(value),
    });
  }
  return out;
}

const queryOneSequence = (aumOverride?: { total: string; opens_24h: string; closes_24h: string }) => [
  { total: '16790', new_24h: '173' },
  { total: '473', new_holders: '4', churned: '2' },
  aumOverride ?? { total: String(TRUE_AUM_NOW), opens_24h: '500', closes_24h: '300' },
  { pct: '24.0' },
  { activations: '47' },
  { total: '4', opens: '1', closes: '1' },
];

const querySequence = (sparklineEndValue: number) => [
  buildSparkline(sparklineEndValue),
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

describe('reconciliation #7: aumUSD card vs trends.aum30d sparkline — <0.1% variance', () => {
  it('sparkline\'s today entry equals card value within <0.1% variance', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence(TRUE_AUM_NOW));

    const snap = await getPulseSnapshot();
    const card = snap.kpis.aumUSD.value;
    const sparklineToday = snap.trends.aum30d[snap.trends.aum30d.length - 1].value;

    // Relative variance < 0.1% (= 0.001) — the financial-metric tier.
    const variance = card === 0 ? 0 : Math.abs(card - sparklineToday) / card;
    expect(variance).toBeLessThan(0.001);
  });

  it('sparkline has exactly 30 entries, oldest first', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence(TRUE_AUM_NOW));

    const snap = await getPulseSnapshot();
    expect(snap.trends.aum30d).toHaveLength(30);
    for (let i = 1; i < snap.trends.aum30d.length; i++) {
      expect(snap.trends.aum30d[i].date >= snap.trends.aum30d[i - 1].date).toBe(true);
    }
  });

  it('aumUSD value identity-equals the canonical SUM(position_size_usd) WHERE status=open', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence(TRUE_AUM_NOW));

    const snap = await getPulseSnapshot();
    // pulseService rounds via Math.round — fixture is already integer.
    expect(snap.kpis.aumUSD.value).toBe(TRUE_AUM_NOW);
  });

  it('delta24h identity-equals (opens_24h − closes_24h), rounded to int', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence(TRUE_AUM_NOW));

    const snap = await getPulseSnapshot();
    expect(snap.kpis.aumUSD.delta24h).toBe(500 - 300);
  });

  it('catches a 0.5% drift between card and sparkline (sanity check)', async () => {
    // Simulate a backend that computes sparkline against a slightly
    // different `positions` snapshot than the card — e.g. one query runs
    // 5 minutes later than the other, so an additional $132 position has
    // opened. 0.5% of $26,400 = $132 → variance = 0.005, > 0.001 threshold.
    const driftValue = TRUE_AUM_NOW - 132;
    stageQueryOne(queryOneSequence()); // card = 26400
    stageQuery(querySequence(driftValue)); // sparkline-today = 26268

    const snap = await getPulseSnapshot();
    const card = snap.kpis.aumUSD.value;
    const sparklineToday = snap.trends.aum30d[snap.trends.aum30d.length - 1].value;
    const variance = Math.abs(card - sparklineToday) / card;

    // The test below would FAIL with this drift — proving the threshold is tight enough.
    expect(variance).toBeGreaterThan(0.001);
  });
});
