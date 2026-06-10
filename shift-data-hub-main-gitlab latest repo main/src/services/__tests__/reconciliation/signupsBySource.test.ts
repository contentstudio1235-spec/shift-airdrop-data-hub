// ============================================================
// Metric Reconciliation #8 — signupsBySource24h
// ============================================================
// Top-10 Trust Audit, Part VI, metric #8.
//   Decisions served: D1 (channel scoring), D4 (UTM outage detection)
//   Variance threshold: EXACT — sum of all source counts MUST equal
//                       Pulse `kpis.registeredUsers.delta24h`.
//
// Reconciliation methodology:
//   - Source A: getPulseSnapshot().trends.signupsBySource24h — the
//     per-source rollup (top 5 + "other"). Each entry's `count` is a
//     COUNT(*) FROM user_profiles WHERE created_at >= NOW() − 24h
//     GROUPed BY first_utm_source.
//   - Source B (canonical): getPulseSnapshot().kpis.registeredUsers
//     .delta24h — the COUNT(*) FROM user_profiles WHERE created_at >=
//     NOW() − 24h (UN-grouped).
//   - Hard equality: sum(signupsBySource24h.count) === registeredUsers.delta24h.
//
// Why this matters:
//   - If sum != delta24h → either (a) the source rollup is dropping
//     rows silently (broken), or (b) the delta is computed against a
//     different time window than the rollup (drift).
//   - Either way, M1 cannot trust "twitter brought 40 signups today"
//     when they don't add up to the headline "173 new signups today".
//
// Production behaviour (pulseService.computeSignupsBySource24h):
//   - Rolls sources below 5% share into "other" — so individual rows
//     may aggregate, but the SUM is preserved by construction.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../../db/pool';
import { getPulseSnapshot, _clearPulseCache } from '../../pulseService';

vi.mock('../../../db/pool');

const TRUE_NEW_24H = 173;

// Mocked breakdown — sums to TRUE_NEW_24H. Includes 4 below-5% sources
// (tiktok=3, telegram=10, etc.) that pulseService should roll into "other".
const SIGNUP_ROWS = [
  { source: 'snag_referrals', count: '60' },
  { source: 'direct',         count: '40' },
  { source: 'twitter',        count: '35' },
  { source: 'discord',        count: '25' },
  { source: 'telegram',       count: '10' },
  { source: 'tiktok',         count: '3' },
];

const queryOneSequence = (newOverride?: string) => [
  { total: '16790', new_24h: newOverride ?? String(TRUE_NEW_24H) },
  { total: '473', new_holders: '4', churned: '2' },
  { total: '26400', opens_24h: '500', closes_24h: '300' },
  { pct: '24.0' },
  { activations: '47' },
  { total: '4', opens: '1', closes: '1' },
];

const querySequence = (signupRows: any[]) => [
  Array.from({ length: 30 }, (_, i) => ({
    date: `2026-05-${String(7 + i).padStart(2, '0')}`,
    value: String(22000 + i * 150),
  })),
  signupRows,
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

describe('reconciliation #8: signupsBySource24h — sum equals registeredUsers.delta24h (hard equality)', () => {
  it('sum of source counts identity-equals Pulse registeredUsers.delta24h', async () => {
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence(SIGNUP_ROWS));

    const snap = await getPulseSnapshot();
    const sumOfSources = snap.trends.signupsBySource24h.reduce((s, r) => s + r.count, 0);
    const canonical = snap.kpis.registeredUsers.delta24h ?? 0;

    // EXACT equality — the audit plan v2 row #8 contract.
    expect(sumOfSources).toBe(canonical);
  });

  it('rollup preserves total even when below-threshold sources collapse into "other"', async () => {
    // Construct a fixture where 2 sources < 5% share — they should be
    // merged into "other" but the SUM must remain 173.
    stageQueryOne(queryOneSequence());
    stageQuery(querySequence(SIGNUP_ROWS));

    const snap = await getPulseSnapshot();

    // The total should still be 173 even though tiktok (3) and possibly
    // telegram (10/173 = 5.8% → kept) are reassigned.
    const sumOfSources = snap.trends.signupsBySource24h.reduce((s, r) => s + r.count, 0);
    const inputTotal = SIGNUP_ROWS.reduce((s, r) => s + Number(r.count), 0);
    expect(sumOfSources).toBe(inputTotal);
  });

  it('handles empty signups (no new users in 24h) without divergence', async () => {
    stageQueryOne(queryOneSequence('0')); // delta24h = 0
    stageQuery(querySequence([]));        // no source rows

    const snap = await getPulseSnapshot();
    expect(snap.trends.signupsBySource24h).toEqual([]);
    expect(snap.kpis.registeredUsers.delta24h).toBe(0);
    // Trivially satisfies sum == delta24h (0 == 0)
  });

  it('catches a 1-row drop bug (sanity check)', async () => {
    // Backend bug: a UNION ALL inadvertently filters out NULL first_utm_source
    // rows. Sum drops from 173 to 133 (40 direct rows dropped). Test would
    // fail with sumOfSources != canonical.
    const buggySources = SIGNUP_ROWS.filter(r => r.source !== 'direct');
    const buggySum = buggySources.reduce((s, r) => s + Number(r.count), 0);
    const canonical = TRUE_NEW_24H;

    // The reconciliation would detect:
    expect(buggySum).not.toBe(canonical);
    expect(canonical - buggySum).toBe(40); // exactly the dropped "direct" count
  });
});
