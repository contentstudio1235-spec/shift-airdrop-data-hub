// ============================================================
// Pulse types — response contract for GET /api/pulse/snapshot
// ============================================================
// These types are the public contract consumed by the Data Hub
// frontend (frontend/components/DataHub/types.ts can re-import
// them). Any change here is a breaking change for the UI.
// ============================================================

/**
 * A single KPI cell. `delta24h` and `delta24hPct` are nullable
 * when the underlying metric has no meaningful comparison
 * (e.g. activations24h IS itself a Δ-style metric).
 */
export interface PulseKpi {
  value: number;
  delta24h: number | null;
  delta24hPct: number | null;
}

export interface PulseKpis {
  /** Total non-merged user_profiles. */
  registeredUsers: PulseKpi;
  /** Distinct wallets with an open position. */
  activeHolders: PulseKpi;
  /** SUM(position_size_usd) on open positions. Rounded to int. */
  aumUSD: PulseKpi;
  /** % of profiles with ≥2 distinct identity_types linked. */
  stitchPct: PulseKpi;
  /** Distinct wallets that opened their first-ever position in last 24h. */
  activations24h: PulseKpi;
  /** Open positions ≥ $1k whale threshold. */
  openWhalesCount: PulseKpi;
}

export interface PulseTrendPoint {
  /** ISO date 'YYYY-MM-DD'. */
  date: string;
  /** End-of-day AUM in USD (int). */
  value: number;
}

export interface PulseSignupSource {
  source: string;
  count: number;
}

export type PulseWhaleEvent = 'open' | 'close';

export interface PulseWhaleActivity {
  /** ISO datetime when the open/close happened. */
  occurredAt: string;
  wallet: string;
  asset: string;
  sizeUSD: number;
  event: PulseWhaleEvent;
}

export type PulseAnomalySeverity = 'info' | 'warn' | 'critical';
export type PulseActionView =
  | 'pulse'
  | 'funnels'
  | 'attribution'
  | 'cohorts'
  | 'users';

export interface PulseAnomaly {
  severity: PulseAnomalySeverity;
  message: string;
  actionView: PulseActionView;
}

export interface PulseTrends {
  /** Exactly 30 entries, oldest first, most recent last. */
  aum30d: PulseTrendPoint[];
  /** Top 5 + "other" rollup. */
  signupsBySource24h: PulseSignupSource[];
}

export interface PulseSnapshot {
  /** ISO timestamp the snapshot was computed (cache stamp). */
  computedAt: string;
  kpis: PulseKpis;
  trends: PulseTrends;
  /** Last-24h whale events (open OR close), most recent first, max 20. */
  whaleActivity24h: PulseWhaleActivity[];
  /** 0-3 anomaly flags computed from above metrics. */
  anomalies: PulseAnomaly[];
}
