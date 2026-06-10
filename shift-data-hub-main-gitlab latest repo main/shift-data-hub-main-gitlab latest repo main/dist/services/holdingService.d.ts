export declare class HoldingService {
    private rpcUrl;
    private cache;
    constructor();
    private cacheKey;
    private getFromCache;
    private setCache;
    /** Invalidate cache for a wallet+mint — call after a known buy/sell. */
    invalidate(wallet: string, mint: string): void;
    /**
     * Get balance of a specific token for a wallet.
     * Returns cached value for 10 minutes before hitting Helius RPC again.
     */
    getTokenBalance(wallet: string, mint: string): Promise<number>;
    /**
     * Check if wallet holds at least a certain amount of a token.
     */
    holdsMinimum(wallet: string, mint: string, minAmount: number): Promise<boolean>;
    /** How many entries are currently cached (for diagnostics). */
    get cacheSize(): number;
}
export declare const holdingService: HoldingService;
//# sourceMappingURL=holdingService.d.ts.map