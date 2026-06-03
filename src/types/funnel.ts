// src/types/funnel.ts
// Type system for the SHIFT RWA funnel + attribution + cohort platform.
// Consumed by: funnelService, attributionService, cohortService, streamService,
// routes/funnels, routes/attribution, routes/cohorts, routes/stream.

export type FunnelId =
  | 'acquisition'
  | 'activation'
  | 'conversion'
  | 'whale_pipeline'
  | 'loyalty'
  | 'referral'
  | 'retention';

export type SourceDim =
  | 'utm_source'
  | 'utm_medium'
  | 'channel'
  | 'kol_code'
  | 'wallet_size';

export type CohortDim = 'day' | 'week' | 'month';

export interface FunnelQueryParams {
  from?: string;        // ISO date
  to?: string;          // ISO date
  source?: string;      // e.g. 'twitter', 'discord'
  asset?: string;       // e.g. 'TSL2L'
  cohort?: CohortDim;
  walletSizeMin?: number;
  walletSizeMax?: number;
}

export interface FunnelStepResult {
  id: string;
  name: string;
  count: number;
  uniqueWallets: number;
  conversionFromPrev: number;        // % (0-100)
  conversionFromFirst: number;       // % (0-100)
  medianTimeToNextStep?: string;     // ISO 8601 duration, e.g. "PT2H30M"
  vs7dDelta: number;                 // % change vs 7 days ago (-100 to +∞)
  benchmark?: number;                // optional benchmark %
}

export interface FunnelResult {
  funnelId: FunnelId;
  steps: FunnelStepResult[];
  bySource?: Array<{ source: string; steps: number[] }>;
  cohorts?: Array<{ cohort: string; steps: number[] }>;
  computedAt: string;
  cacheKey: string;
  cacheTTLSeconds: number;
  // Acquisition-only header fields (per Analytics Reporter §7.5)
  attributablePct?: number | null;
  stitchedPct?: number;
  medianTimeToFirstTrade?: number | null;
}

export interface ChannelROIRow {
  source: string;
  users: number;
  stitchedUsers: number;
  holders: number;
  whales: number;
  totalVolumeUSD: number;
  avgPositionUSD: number;
  attribution: 'first_touch' | 'last_touch' | 'multi_touch';
}

export interface WhaleOriginEdge {
  from: string;        // e.g. 'twitter'
  to: string;          // e.g. 'first_trade'
  value: number;       // # of whales flowing through
}

export interface CohortMatrix {
  dim: CohortDim;
  cohorts: Array<{
    cohort: string;          // e.g. '2026-05-W22'
    sizeAtStart: number;
    retention: number[];     // % retained at week 0, 1, 2, ...
  }>;
}

export interface WhaleStreamEvent {
  type: 'trade';
  wallet: string;
  asset: string;
  sizeUSD: number;
  side: 'long' | 'short';
  timestamp: string;          // ISO
}
