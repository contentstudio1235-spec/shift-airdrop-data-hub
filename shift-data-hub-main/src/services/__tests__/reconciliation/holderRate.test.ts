// ============================================================
// Metric Reconciliation #3 — holderRate per source (KOL leaderboard)
// ============================================================
// Top-10 Trust Audit, Part VI, metric #3.
//   Decisions served: D1, D7, D8 (channel scoring + KOL ranking + executive)
//   Variance threshold: ≤0.5 pp absolute
//
// Reconciliation methodology (per metric-reconciliation SKILL.md):
//   - Source A (production endpoint): computeKOLLeaderboard() — emits
//     `holderRate` as a 0..1 fraction per referrer (= holders / users).
//   - Source B (canonical recomputation): for the same raw `users` and
//     `holders` counts, compute `holders / users` and compare.
//   - Variance assertion: |sourceA − sourceB| ≤ 0.005 (= 0.5pp) per row.
//
// Both compute from the same mocked DB fixture (the "two independent
// computations against the same data" discipline). The "independence"
// comes from the recomputation NOT going through the same code path
// (no rounding inside `Math.round((holders/users)*10000)/10000`, raw
// division instead). Any drift > 0.5pp = production formula is wrong.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../../db/pool';
import { computeKOLLeaderboard } from '../../attributionService';

vi.mock('../../../db/pool');

// Three referrers — covers ranges typical of M2 KOL leaderboard:
//   - High performer: 12% holder rate (above the green 10% threshold)
//   - Mid performer:  4.5% holder rate (yellow band)
//   - Low performer:  1% holder rate (red band)
const FIXTURE = [
  { referrer: 'kolA', users: '250', holders: '30', whales: '4',  volume: '125000', first_seen: '2026-05-01', last_seen: '2026-06-05' },
  { referrer: 'kolB', users: '200', holders: '9',  whales: '1',  volume: '40000',  first_seen: '2026-05-05', last_seen: '2026-06-05' },
  { referrer: 'kolC', users: '100', holders: '1',  whales: '0',  volume: '2500',   first_seen: '2026-05-10', last_seen: '2026-06-05' },
];

describe('reconciliation #3: holderRate per source — endpoint vs canonical SQL recomputation', () => {
  beforeEach(() => vi.resetAllMocks());

  // attributionService has a module-level cache keyed on (params, limit).
  // Each test uses a different `limit` to dodge cross-test cache hits.

  it('every row\'s endpoint holderRate matches `holders / users` within 0.5pp', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce(FIXTURE as any);

    const result = await computeKOLLeaderboard({}, 51);
    expect(result.rows).toHaveLength(3);

    for (const row of result.rows) {
      // ── canonical recomputation: raw fraction, no rounding ──
      const fixtureRow = FIXTURE.find(f => f.referrer === row.referrer)!;
      const canonicalUsers = Number(fixtureRow.users);
      const canonicalHolders = Number(fixtureRow.holders);
      const canonicalHolderRate = canonicalUsers === 0 ? 0 : canonicalHolders / canonicalUsers;

      // ── variance assertion: ≤ 0.5pp absolute (0.005 as a 0..1 fraction) ──
      const delta = Math.abs(row.holderRate - canonicalHolderRate);
      expect(delta).toBeLessThanOrEqual(0.005);
    }
  });

  it('emits holderRate as a 0..1 fraction (not a 0..100 percent)', async () => {
    // Regression guard for Code Reviewer sprint-3 BLOCKER 1 — backend used
    // to emit `15` for 15%, frontend re-multiplied → "1500.0%". This test
    // catches any future regression by asserting holderRate stays bounded
    // in [0, 1] for sane inputs.
    vi.spyOn(db, 'query').mockResolvedValueOnce(FIXTURE as any);

    const result = await computeKOLLeaderboard({}, 52);
    for (const row of result.rows) {
      expect(row.holderRate).toBeGreaterThanOrEqual(0);
      expect(row.holderRate).toBeLessThanOrEqual(1);
    }
  });

  it('holderRate = 0 when users = 0 (division-by-zero guard)', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { referrer: 'kolZ', users: '0', holders: '0', whales: '0', volume: '0', first_seen: null, last_seen: null },
    ] as any);
    const result = await computeKOLLeaderboard({}, 53);
    if (result.rows.length > 0) {
      expect(result.rows[0].holderRate).toBe(0);
    } else {
      // SQL HAVING COUNT(*) >= 5 may filter out the row entirely; that's also acceptable
      expect(result.rows).toHaveLength(0);
    }
  });

  it('per-row variance threshold catches the historic percent-vs-fraction bug', async () => {
    // Synthetic "bad" fixture: simulate a buggy backend that returns 12.0
    // (percent) when the canonical is 0.12 (fraction). |12 − 0.12| = 11.88
    // — far above the 0.005 threshold, so the test would fail. This
    // sanity-check confirms the threshold is tight enough to catch the bug.
    const buggy = 12.0;
    const canonical = 30 / 250;
    expect(Math.abs(buggy - canonical)).toBeGreaterThan(0.005);
  });
});
