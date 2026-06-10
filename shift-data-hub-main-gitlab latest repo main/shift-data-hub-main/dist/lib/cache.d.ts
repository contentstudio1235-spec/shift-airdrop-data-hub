export interface FunnelCacheOptions {
    ttlSeconds: number;
    maxEntries: number;
}
export declare class FunnelCache {
    private cache;
    constructor(opts: FunnelCacheOptions);
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    invalidate(predicate: (key: string) => boolean): number;
}
export declare function buildCacheKey(funnelId: string, params: Record<string, unknown>): string;
//# sourceMappingURL=cache.d.ts.map