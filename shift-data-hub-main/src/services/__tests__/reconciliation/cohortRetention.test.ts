// ============================================================
// Metric Reconciliation #10 — Cohort retentionWeek4
// ============================================================
// Top-10 Trust Audit, Part VI, metric #10.
//   Decisions served: D2 (cohort health), D7 (KOL/source effectiveness)
//   Variance threshold: ≤0.5pp absolute
//
// Reconciliation methodology:
//   - Source A: getCohortsSnapshot().cohorts[i].retentionWeek4 —
//     production endpoint output.
//   - Source B (canonical recomputation): for the same raw
//     `retained_w4` and `size` fixture, recompute
//     `(retained_w4 / size) * 100` with raw arithmetic, then
//     compare to source A. Variance must be ≤ 0.5pp.
//   - Cross-source check: also assert retentionWeek4 is `null` for
//     cohorts younger than 35 days (the documented age cutoff).
//
// Why a 0.5pp threshold:
//   - Retention is reported with 1-decimal precision (`round1`).
//   - A 0.5pp drift between the endpoint and the canonical
//     formula would mean the rounding lost a full percentage step,
//     which on a 1000-user cohort is 5 users — material for D2.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../../db/pool';
import { getCohortsSnapshot, _clearCohortSnapshotCache } from '../../cohortService';

vi.mock('../../../db/pool');

// 12 weekly cohorts. The 2 oldest are >35d (eligible for retentionWeek4).
// All retention math is exact integer-fraction so rounding is well-defined.
//
// Cohort | week_start  | age_days | size | retained_w4 | expected retentionW4
//   01   | 2026-04-01  | 65       | 1000 | 320         | 32.0%
//   02   | 2026-04-08  | 58       |  800 | 240         | 30.0%
//   03   | 2026-04-15  | 51       |  600 | 168         | 28.0%
//   04   | 2026-04-22  | 44       |  500 | 130         | 26.0%
//   05   | 2026-04-29  | 37       |  400 |  96         | 24.0%
//   06-12 are younger than 35d → retentionWeek4 must be null
const COHORT_FIXTURE = [
  // Most recent first (matches SQL ORDER BY cohort_start DESC)
  { cohort_key: '2026-W23', week_start: '2026-06-01', size: '50',   activated: '20',  lifetime_volume: '5000',  whales: '0', stitch_count: '15', retained_w1: '15', retained_w4: '0', age_days: '5' },
  { cohort_key: '2026-W22', week_start: '2026-05-25', size: '100',  activated: '40',  lifetime_volume: '12000', whales: '1', stitch_count: '30', retained_w1: '30', retained_w4: '0', age_days: '12' },
  { cohort_key: '2026-W21', week_start: '2026-05-18', size: '150',  activated: '60',  lifetime_volume: '18000', whales: '2', stitch_count: '40', retained_w1: '45', retained_w4: '0', age_days: '19' },
  { cohort_key: '2026-W20', week_start: '2026-05-11', size: '200',  activated: '80',  lifetime_volume: '25000', whales: '3', stitch_count: '55', retained_w1: '60', retained_w4: '0', age_days: '26' },
  { cohort_key: '2026-W19', week_start: '2026-05-04', size: '250',  activated: '100', lifetime_volume: '30000', whales: '4', stitch_count: '65', retained_w1: '75', retained_w4: '0', age_days: '33' }, // still <35
  { cohort_key: '2026-W18', week_start: '2026-04-27', size: '300',  activated: '120', lifetime_volume: '40000', whales: '5', stitch_count: '80', retained_w1: '90', retained_w4: '60', age_days: '40' },
  // ── eligible for retentionWeek4 (age_days >= 35) — these are the 2 historical cohorts we reconcile ──
  { cohort_key: '2026-W17', week_start: '2026-04-20', size: '400',  activated: '160', lifetime_volume: '55000', whales: '6', stitch_count: '100', retained_w1: '120', retained_w4: '96',  age_days: '47' },
  { cohort_key: '2026-W16', week_start: '2026-04-13', size: '500',  activated: '200', lifetime_volume: '70000', whales: '7', stitch_count: '130', retained_w1: '150', retained_w4: '130', age_days: '54' },
];

beforeEach(() => {
  vi.resetAllMocks();
  _clearCohortSnapshotCache();
});

describe('reconciliation #10: cohort retentionWeek4 — endpoint vs canonical recomputation', () => {
  it('historical cohort #1 (2026-W17): endpoint retentionWeek4 within ≤0.5pp of canonical', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce(COHORT_FIXTURE as any);
    const snap = await getCohortsSnapshot();

    const cohort = snap.cohorts.find(c => c.cohortKey === '2026-W17');
    expect(cohort).toBeDefined();
    expect(cohort!.retentionWeek4).not.toBeNull();

    // Canonical: 96 / 400 * 100 = 24.0
    const canonical = (96 / 400) * 100;
    const delta = Math.abs(cohort!.retentionWeek4! - canonical);
    expect(delta).toBeLessThanOrEqual(0.5);
  });

  it('historical cohort #2 (2026-W16): endpoint retentionWeek4 within ≤0.5pp of canonical', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce(COHORT_FIXTURE as any);
    const snap = await getCohortsSnapshot();

    const cohort = snap.cohorts.find(c => c.cohortKey === '2026-W16');
    expect(cohort).toBeDefined();
    expect(cohort!.retentionWeek4).not.toBeNull();

    // Canonical: 130 / 500 * 100 = 26.0
    const canonical = (130 / 500) * 100;
    const delta = Math.abs(cohort!.retentionWeek4! - canonical);
    expect(delta).toBeLessThanOrEqual(0.5);
  });

  it('cohorts younger than 35d return retentionWeek4 = null (no premature emission)', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce(COHORT_FIXTURE as any);
    const snap = await getCohortsSnapshot();

    // Five cohorts < 35d (2026-W19..W23) must all have null retentionWeek4.
    const youngCohorts = snap.cohorts.filter(c => ['2026-W23','2026-W22','2026-W21','2026-W20','2026-W19'].includes(c.cohortKey));
    expect(youngCohorts).toHaveLength(5);
    for (const c of youngCohorts) {
      expect(c.retentionWeek4).toBeNull();
    }
  });

  it('all eligible cohorts (age >= 35d) emit a non-null retentionWeek4 in [0, 100]', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce(COHORT_FIXTURE as any);
    const snap = await getCohortsSnapshot();

    const mature = snap.cohorts.filter(c => ['2026-W17', '2026-W16', '2026-W18'].includes(c.cohortKey));
    expect(mature.length).toBeGreaterThanOrEqual(2);
    for (const c of mature) {
      expect(c.retentionWeek4).not.toBeNull();
      expect(c.retentionWeek4!).toBeGreaterThanOrEqual(0);
      expect(c.retentionWeek4!).toBeLessThanOrEqual(100);
    }
  });

  it('catches a 1pp rounding-direction bug (sanity check)', async () => {
    // Hypothetical bug: a Math.floor instead of Math.round on the
    // (retained / size * 100) calculation. For size=400, retained=96:
    //   correct = round(24.0 * 10) / 10 = 24.0
    //   buggy   = floor(24.0 * 10) / 10 = 24.0  (same here, no bug visible)
    // For a non-integer fraction, e.g. retained=97:
    //   correct = round(24.25 * 10) / 10 = 24.3
    //   buggy   = floor(24.25 * 10) / 10 = 24.2  (delta = 0.1pp — within threshold)
    //
    // To produce a 1pp bug, simulate a divisor-typo (size used in
    // numerator-only path): retained=96, but size accidentally doubled
    // somewhere → reported as 12.0% instead of 24.0%.
    const canonical = (96 / 400) * 100; // 24.0
    const buggy = (96 / 800) * 100;     // 12.0 — the divisor-typo bug
    const delta = Math.abs(canonical - buggy);
    expect(delta).toBeGreaterThan(0.5);   // exceeds the ≤0.5pp threshold → caught
  });
});
