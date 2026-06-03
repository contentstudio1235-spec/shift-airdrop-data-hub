export declare class JupiterPriceService {
    private baseUrl;
    constructor();
    /**
     * Get USD price for a token mint.
     * Returns null if price unavailable.
     */
    getPrice(mint: string): Promise<number | null>;
    /**
     * Get USD prices for multiple mints in a single call.
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