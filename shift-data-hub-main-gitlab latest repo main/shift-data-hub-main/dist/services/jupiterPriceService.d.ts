export declare class JupiterPriceService {
    private baseUrl;
    private priceCache;
    private readonly CACHE_TTL_MS;
    constructor();
    /**
     * Check if a cached price is still valid
     */
    private isCacheValid;
    /**
     * Clear expired cache entries periodically
     */
    private pruneCache;
    /**
     * Get USD price for a token mint (with caching and RWA fallback).
     * Returns null if price unavailable.
     */
    getPrice(mint: string): Promise<number | null>;
    /**
     * Get USD prices for multiple mints (with caching and batch optimization).
     * Reduces API calls by checking cache first.
     */
    getPrices(mints: string[]): Promise<Record<string, number>>;
    /**
     * Calculate USD value of a token position.
     */
    calculateUSDValue(mint: string, tokenAmount: number): Promise<{
        usdValue: number;
        price: number;
    } | null>;
    /**
     * Get human-readable symbol for a mint address.
     */
    getSymbol(mint: string): string;
}
export declare const jupiterPriceService: JupiterPriceService;
//# sourceMappingURL=jupiterPriceService.d.ts.map