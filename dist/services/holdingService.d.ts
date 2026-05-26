export declare class HoldingService {
    private rpcUrl;
    constructor();
    /**
     * Get balance of a specific token for a wallet.
     * Returns human-readable amount (adjusted for decimals).
     */
    getTokenBalance(wallet: string, mint: string): Promise<number>;
    /**
     * Check if wallet holds at least a certain amount of a token.
     */
    holdsMinimum(wallet: string, mint: string, minAmount: number): Promise<boolean>;
}
export declare const holdingService: HoldingService;
//# sourceMappingURL=holdingService.d.ts.map