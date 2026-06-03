import type { ChannelROIRow, FunnelQueryParams, WhaleOriginEdge } from '../types/funnel';
export declare function computeChannelROI(params: FunnelQueryParams): Promise<ChannelROIRow[]>;
export declare function computeWhaleOrigins(params: FunnelQueryParams): Promise<WhaleOriginEdge[]>;
export declare function invalidateAttributionCache(): void;
//# sourceMappingURL=attributionService.d.ts.map