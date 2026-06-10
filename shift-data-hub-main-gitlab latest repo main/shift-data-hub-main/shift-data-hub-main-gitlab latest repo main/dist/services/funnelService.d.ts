import type { FunnelId, FunnelQueryParams, FunnelResult } from '../types/funnel';
export declare function computeFunnel(funnelId: FunnelId, params: FunnelQueryParams): Promise<FunnelResult>;
export declare function invalidateFunnelCache(funnelId?: FunnelId): void;
//# sourceMappingURL=funnelService.d.ts.map