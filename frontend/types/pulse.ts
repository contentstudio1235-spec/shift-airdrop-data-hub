// ============================================================
// SHIFT Data Hub — Pulse Snapshot Types
// ============================================================
//
// Mirrors the backend response shape from GET /api/pulse/snapshot.
// Must remain byte-for-byte compatible with the contract defined
// alongside the Data Engineer's endpoint in Phase 2.1.
//
// Consumed by:
//   - hooks/usePulseSnapshot.ts
//   - components/DataHub/pulse/PulseView.tsx
//   - components/DataHub/pulse/*

/** A single numeric KPI with 24h delta context. */
export interface PulseKPI {
  /** Current value as of `computedAt`. */
  value: number;
  /** Absolute change vs 24h ago. `null` when no prior snapshot exists. */
  delta24h: number | null;
  /** Percentage change vs 24h ago (e.g. 1.04 for +1.04%). `null` when prior value is 0 or missing. */
  delta24hPct: number | null;
}

/** The six hero KPIs displayed at the top of the Pulse view. */
export interface PulseKPIs {
  registeredUsers: PulseKPI;
  activeHolders: PulseKPI;
  aumUSD: PulseKPI;
  stitchPct: PulseKPI;
  activations24h: PulseKPI;
  openWhalesCount: PulseKPI;
}

/** A single point on the 30-day AUM line. */
export interface AumTrendPoint {
  /** ISO date string (YYYY-MM-DD) for the bucket. */
  date: string;
  /** AUM value in USD at end-of-day. */
  value: number;
}

/** A signup count grouped by acquisition source (top 5 + "other"). */
export interface SignupSourceBucket {
  /** Channel label, e.g. "twitter", "snag", "organic", "other". */
  source: string;
  /** Number of signups attributed to this source in the last 24h. */
  count: number;
}

/** Aggregated trend series for the Pulse view. */
export interface PulseTrends {
  /** 30 daily AUM data points. Sorted ascending; most recent value is last. */
  aum30d: AumTrendPoint[];
  /** Top 5 signup sources in the last 24h, with everything else folded into "other". */
  signupsBySource24h: SignupSourceBucket[];
}

/** One whale event (open or close) in the last 24h. */
export interface WhaleActivityEvent {
  /** ISO timestamp when the position was opened or closed. */
  occurredAt: string;
  /** Full wallet address. */
  wallet: string;
  /** Token symbol, e.g. "TSL2L". */
  asset: string;
  /** Notional position size in USD. */
  sizeUSD: number;
  /** Whether this event opened or closed the position. */
  event: 'open' | 'close';
}

/** A single notable anomaly worth surfacing to operators. */
export interface PulseAnomaly {
  /** Severity drives icon, color, and operator urgency. */
  severity: 'info' | 'warn' | 'critical';
  /** Plain-text one-sentence description. No markdown. */
  message: string;
  /**
   * The Data Hub view this anomaly directs investigation to.
   * Used to build `?view=<actionView>` query params.
   */
  actionView: 'pulse' | 'funnels' | 'attribution' | 'cohorts' | 'users';
}

/** Full Pulse snapshot returned from GET /api/pulse/snapshot. */
export interface PulseSnapshot {
  /** ISO timestamp the snapshot was computed on the server. */
  computedAt: string;
  kpis: PulseKPIs;
  trends: PulseTrends;
  whaleActivity24h: WhaleActivityEvent[];
  anomalies: PulseAnomaly[];
}
