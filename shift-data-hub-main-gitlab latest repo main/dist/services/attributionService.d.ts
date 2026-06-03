import type { ChannelROIRow, FunnelQueryParams, WhaleOriginEdge } from '../types/funnel';
export interface TopCampaignRow {
    campaign: string;
    source: string | null;
    medium: string | null;
    profiles: number;
}
export interface AttributionCoverage {
    total: number;
    withUtm: number;
    withReferralOnly: number;
    neither: number;
    percentWithSignal: number;
    percentWithUtm: number;
}
export declare function computeChannelROI(params: FunnelQueryParams): Promise<ChannelROIRow[]>;
export declare function computeTopCampaigns(params: FunnelQueryParams, limit?: number): Promise<TopCampaignRow[]>;
export declare function computeAttributionCoverage(params: FunnelQueryParams): Promise<AttributionCoverage>;
export declare function computeWhaleOrigins(params: FunnelQueryParams): Promise<WhaleOriginEdge[]>;
export declare function invalidateAttributionCache(): void;
//# sourceMappingURL=attributionService.d.ts.map