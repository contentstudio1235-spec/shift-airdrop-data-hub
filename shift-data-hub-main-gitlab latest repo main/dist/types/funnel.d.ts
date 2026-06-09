export type FunnelId = 'acquisition' | 'activation' | 'conversion' | 'whale_pipeline' | 'loyalty' | 'referral' | 'retention';
export type SourceDim = 'utm_source' | 'utm_medium' | 'channel' | 'kol_code' | 'wallet_size';
export type CohortDim = 'day' | 'week' | 'month';
export interface FunnelQueryParams {
    from?: string;
    to?: string;
    source?: string;
    asset?: string;
    cohort?: CohortDim;
    walletSizeMin?: number;
    walletSizeMax?: number;
    volumeFrom?: string;
    volumeTo?: string;
}
export interface FunnelStepResult {
    id: string;
    name: string;
    count: number;
    uniqueWallets: number;
    conversionFromPrev: number;
    conversionFromFirst: number;
    medianTimeToNextStep?: string;
    vs7dDelta: number;
    benchmark?: number;
}
export interface FunnelResult {
    funnelId: FunnelId;
    steps: FunnelStepResult[];
    bySource?: Array<{
        source: string;
        steps: number[];
    }>;
    cohorts?: Array<{
        cohort: string;
        steps: number[];
    }>;
    computedAt: string;
    cacheKey: string;
    cacheTTLSeconds: number;
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
    from: string;
    to: string;
    value: number;
}
export interface CohortMatrix {
    dim: CohortDim;
    cohorts: Array<{
        cohort: string;
        sizeAtStart: number;
        retention: number[];
    }>;
}
export interface WhaleStreamEvent {
    type: 'trade';
    wallet: string;
    asset: string;
    sizeUSD: number;
    side: 'long' | 'short';
    timestamp: string;
}
//# sourceMappingURL=funnel.d.ts.map