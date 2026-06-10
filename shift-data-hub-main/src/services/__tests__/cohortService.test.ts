// ============================================================
// cohortService — getCohortsSnapshot unit tests
// ============================================================
// Mocks the DB pool. Covers:
//   - response shape
//   - per-row math (activation %, retention null-cutoff, whales, stitch)
//   - summary trend logic (improving / stable / declining boundaries)
//   - empty cohort list
//   - 60-second in-memory cache
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../db/pool';
import {
  getCohortsSnapshot,
  _clearCohortSnapshotCache,
} from '../cohortService';

vi.mock('../../db/pool');

/**
 * Build a synthetic cohort row exactly matching the SELECT shape from
 * fetchCohortRows. age_days drives the retention null-cutoff.
 */
interface RawRow {
  cohort_key: string;
  week_start: string | Date;
  size: string;
  activated: string;
  lifetime_volume: string | null;
  whales: string;
  stitch_count: string;
  retained_w1: string;
  retained_w4: string;
  age_days: string;
}

function makeRow(overrides: Partial<RawRow> = {}): RawRow {
  return {
    cohort_key: '2026-W23',
    week_start: '2026-06-01',
    size: '200',
    activated: '80',
    lifetime_volume: '12500.50',
    whales: '4',
    stitch_count: '70',
    retained_w1: '60',
    retained_w4: '40',
    age_days: '90',
    ...overrides,
  };
}

function stageRows(rows: RawRow[]) {
  return vi.spyOn(db, 'query').mockResolvedValueOnce(rows as any);
}

beforeEach(() => {
  vi.resetAllMocks();
  _clearCohortSnapshotCache();
});

// ─── Shape ────────────────────────────────────────────────────

describe('getCohortsSnapshot — shape', () => {
  it('returns the documented contract shape with summary block', async () => {
    stageRows([
      makeRow({ cohort_key: '2026-W23', activated: '90', size: '200' }),
      makeRow({ cohort_key: '2026-W22', activated: '70', size: '200' }),
    ]);

    const snap = await getCohortsSnapshot();

    expect(snap).toHaveProperty('computedAt');
    expect(Array.isArray(snap.cohorts)).toBe(true);
    expect(snap.cohorts).toHaveLength(2);
    expect(snap.summary).toHaveProperty('trend');
    expect(snap.summary).toHaveProperty('recentAvgActivation');
    expect(snap.summary).toHaveProperty('historicalAvgActivation');
    expect(snap.summary).toHaveProperty('deltaPP');
    expect(snap.summary).toHaveProperty('bestCohort');
    expect(snap.summary).toHaveProperty('worstCohort');

    const c = snap.cohorts[0];
    expect(c).toMatchObject({
      cohortKey: expect.any(String),
      weekStart: expect.any(String),
      size: expect.any(Number),
      activated: expect.any(Number),
      activationPct: expect.any(Number),
      lifetimeVolumeUSD: expect.any(Number),
      avgVolumePerUser: expect.any(Number),
      whales: expect.any(Number),
      stitchPct: expect.any(Number),
    });
  });
});

// ─── Per-row math ─────────────────────────────────────────────

describe('getCohortsSnapshot — per-row math', () => {
  it('computes activationPct, avg/user, and stitchPct', async () => {
    stageRows([
      makeRow({
        size: '200',
        activated: '50',
        lifetime_volume: '10000',
        stitch_count: '40',
      }),
    ]);
    const snap = await getCohortsSnapshot();
    const c = snap.cohorts[0];
    expect(c.size).toBe(200);
    expect(c.activated).toBe(50);
    expect(c.activationPct).toBe(25); // 50/200 * 100
    expect(c.lifetimeVolumeUSD).toBe(10_000);
    expect(c.avgVolumePerUser).toBe(50); // 10000/200
    expect(c.stitchPct).toBe(20); // 40/200 * 100
  });

  it('returns 0s for an empty cohort (size=0) — no divide-by-zero', async () => {
    stageRows([
      makeRow({
        size: '0',
        activated: '0',
        lifetime_volume: '0',
        stitch_count: '0',
        retained_w1: '0',
        retained_w4: '0',
      }),
    ]);
    const snap = await getCohortsSnapshot();
    const c = snap.cohorts[0];
    expect(c.size).toBe(0);
    expect(c.activationPct).toBe(0);
    expect(c.avgVolumePerUser).toBe(0);
    expect(c.stitchPct).toBe(0);
  });

  it('nulls retentionWeek1 when cohort is younger than 14 days', async () => {
    stageRows([makeRow({ age_days: '10', retained_w1: '5', retained_w4: '0' })]);
    const snap = await getCohortsSnapshot();
    expect(snap.cohorts[0].retentionWeek1).toBeNull();
    expect(snap.cohorts[0].retentionWeek4).toBeNull();
  });

  it('reports retentionWeek1 once cohort is ≥14 days old', async () => {
    stageRows([
      makeRow({
        size: '100',
        retained_w1: '60',
        retained_w4: '0',
        age_days: '20',
      }),
    ]);
    const snap = await getCohortsSnapshot();
    expect(snap.cohorts[0].retentionWeek1).toBe(60);
    expect(snap.cohorts[0].retentionWeek4).toBeNull();
  });

  it('reports retentionWeek4 once cohort is ≥35 days old', async () => {
    stageRows([
      makeRow({
        size: '100',
        retained_w1: '60',
        retained_w4: '40',
        age_days: '50',
      }),
    ]);
    const snap = await getCohortsSnapshot();
    expect(snap.cohorts[0].retentionWeek1).toBe(60);
    expect(snap.cohorts[0].retentionWeek4).toBe(40);
  });
});

// ─── Summary trend logic ──────────────────────────────────────

describe('getCohortsSnapshot — summary trend', () => {
  it('returns trend="improving" when recent − historical > +3pp', async () => {
    // recent (1-4): all 50% activation, historical (5-12): all 40%
    // delta = +10pp → improving
    const rows: RawRow[] = [];
    for (let i = 0; i < 4; i++) {
      rows.push(makeRow({ cohort_key: `R${i}`, size: '100', activated: '50' }));
    }
    for (let i = 0; i < 8; i++) {
      rows.push(makeRow({ cohort_key: `H${i}`, size: '100', activated: '40' }));
    }
    stageRows(rows);

    const snap = await getCohortsSnapshot();
    expect(snap.summary.recentAvgActivation).toBe(50);
    expect(snap.summary.historicalAvgActivation).toBe(40);
    expect(snap.summary.deltaPP).toBe(10);
    expect(snap.summary.trend).toBe('improving');
  });

  it('returns trend="declining" when recent − historical < -3pp', async () => {
    const rows: RawRow[] = [];
    for (let i = 0; i < 4; i++) {
      rows.push(makeRow({ cohort_key: `R${i}`, size: '100', activated: '20' }));
    }
    for (let i = 0; i < 8; i++) {
      rows.push(makeRow({ cohort_key: `H${i}`, size: '100', activated: '40' }));
    }
    stageRows(rows);

    const snap = await getCohortsSnapshot();
    expect(snap.summary.deltaPP).toBe(-20);
    expect(snap.summary.trend).toBe('declining');
  });

  it('returns trend="stable" exactly at the +3pp boundary', async () => {
    // Choose values that give recent=43, historical=40 → delta=+3.0
    // The rule is "> 3" so this should be 'stable', not 'improving'.
    const rows: RawRow[] = [];
    for (let i = 0; i < 4; i++) {
      rows.push(makeRow({ cohort_key: `R${i}`, size: '100', activated: '43' }));
    }
    for (let i = 0; i < 8; i++) {
      rows.push(makeRow({ cohort_key: `H${i}`, size: '100', activated: '40' }));
    }
    stageRows(rows);

    const snap = await getCohortsSnapshot();
    expect(snap.summary.deltaPP).toBe(3);
    expect(snap.summary.trend).toBe('stable');
  });

  it('returns trend="stable" exactly at the -3pp boundary', async () => {
    const rows: RawRow[] = [];
    for (let i = 0; i < 4; i++) {
      rows.push(makeRow({ cohort_key: `R${i}`, size: '100', activated: '37' }));
    }
    for (let i = 0; i < 8; i++) {
      rows.push(makeRow({ cohort_key: `H${i}`, size: '100', activated: '40' }));
    }
    stageRows(rows);

    const snap = await getCohortsSnapshot();
    expect(snap.summary.deltaPP).toBe(-3);
    expect(snap.summary.trend).toBe('stable');
  });

  it('flags best and worst cohorts by activationPct', async () => {
    stageRows([
      makeRow({ cohort_key: 'W23', size: '100', activated: '60' }), // best
      makeRow({ cohort_key: 'W22', size: '100', activated: '40' }),
      makeRow({ cohort_key: 'W21', size: '100', activated: '10' }), // worst
    ]);
    const snap = await getCohortsSnapshot();
    expect(snap.summary.bestCohort.cohortKey).toBe('W23');
    expect(snap.summary.bestCohort.activationPct).toBe(60);
    expect(snap.summary.worstCohort.cohortKey).toBe('W21');
    expect(snap.summary.worstCohort.activationPct).toBe(10);
  });
});

// ─── Empty / edge cases ───────────────────────────────────────

describe('getCohortsSnapshot — empty cohort handling', () => {
  it('returns an empty cohorts array and stable defaults when no rows exist', async () => {
    stageRows([]);
    const snap = await getCohortsSnapshot();
    expect(snap.cohorts).toEqual([]);
    expect(snap.summary.trend).toBe('stable');
    expect(snap.summary.recentAvgActivation).toBe(0);
    expect(snap.summary.historicalAvgActivation).toBe(0);
    expect(snap.summary.deltaPP).toBe(0);
    expect(snap.summary.bestCohort.activationPct).toBe(0);
    expect(snap.summary.worstCohort.activationPct).toBe(0);
  });

  it('handles fewer than 5 cohorts (no historical bucket)', async () => {
    stageRows([
      makeRow({ cohort_key: 'W23', size: '100', activated: '50' }),
      makeRow({ cohort_key: 'W22', size: '100', activated: '40' }),
    ]);
    const snap = await getCohortsSnapshot();
    expect(snap.summary.recentAvgActivation).toBe(45);
    expect(snap.summary.historicalAvgActivation).toBe(0);
    // delta=+45 → improving
    expect(snap.summary.trend).toBe('improving');
  });
});

// ─── Caching ──────────────────────────────────────────────────

describe('getCohortsSnapshot — caching', () => {
  it('serves the cached snapshot on the second call (no extra DB calls)', async () => {
    const spy = stageRows([makeRow({ cohort_key: 'W23' })]);
    const first = await getCohortsSnapshot();
    const callsAfterFirst = spy.mock.calls.length;
    const second = await getCohortsSnapshot();
    const callsAfterSecond = spy.mock.calls.length;

    expect(second).toEqual(first);
    expect(callsAfterSecond).toBe(callsAfterFirst);
  });
});
