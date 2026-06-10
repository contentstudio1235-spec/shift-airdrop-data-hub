// ============================================================
// SHIFT Data Hub — Cohorts Snapshot Types
// ============================================================
// Mirrors the backend response shape from GET /api/cohorts/snapshot.
// MUST stay byte-for-byte compatible with src/types/cohort.ts.
// Any change here is a breaking change for both ends.
//
// Consumed by:
//   - hooks/useCohortsSnapshot.ts
//   - app/admin/data-hub/views/CohortsView.tsx
// ============================================================

/** One weekly cohort row. Newest cohort first in the snapshot array. */
export interface CohortEntry {
  /** ISO week label, e.g. "2026-W23". */
  cohortKey: string;
  /** ISO date 'YYYY-MM-DD' for the Monday that begins this cohort week. */
  weekStart: string;
  /** Count of non-merged profiles signed up in this cohort week. */
  size: number;
  /** Count who opened ≥1 position by snapshot time. */
  activated: number;
  /** activated / size * 100, 1 decimal. 0 when size=0. */
  activationPct: number;
  /**
   * % of cohort with ≥1 position opened in the 7d after their cohort start.
   * `null` when the cohort is too young to have a full week-1 window yet.
   */
  retentionWeek1: number | null;
  /**
   * % of cohort with ≥1 position opened in the 7d window starting 4 weeks
   * after cohort start. `null` when cohort is too young.
   */
  retentionWeek4: number | null;
  /** SUM(position_size_usd) for every position opened by cohort members. */
  lifetimeVolumeUSD: number;
  /** lifetimeVolumeUSD / size, rounded to int. 0 when size=0. */
  avgVolumePerUser: number;
  /** Count of cohort members who opened ≥1 position ≥ $1k. */
  whales: number;
  /** % of cohort with ≥2 active identity links, 1 decimal. */
  stitchPct: number;
}

/** Summary metrics describing the trend across the 12 cohorts. */
export interface CohortSummary {
  /**
   * 'improving' when recent − historical > +3 pp.
   * 'declining' when recent − historical < -3 pp.
   * 'stable' otherwise.
   */
  trend: 'improving' | 'stable' | 'declining';
  /** Avg activationPct across cohorts 1–4 (most recent), 1 decimal. */
  recentAvgActivation: number;
  /** Avg activationPct across cohorts 5–12, 1 decimal. */
  historicalAvgActivation: number;
  /** recentAvg − historicalAvg, in percentage points (1 decimal). */
  deltaPP: number;
  /** Best cohort by activationPct across the returned set. */
  bestCohort: { cohortKey: string; activationPct: number };
  /** Worst cohort by activationPct across the returned set. */
  worstCohort: { cohortKey: string; activationPct: number };
}

/** Full snapshot returned from GET /api/cohorts/snapshot. */
export interface CohortsSnapshot {
  /** ISO timestamp when this snapshot was computed (cache stamp). */
  computedAt: string;
  /** Up to 12 weekly cohorts, newest first. */
  cohorts: CohortEntry[];
  /** Summary trend block; defaults when fewer than 5 cohorts exist. */
  summary: CohortSummary;
}
