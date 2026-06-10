interface SwapPriceData {
    tokenAmount: number;
    stablecoinAmount: number;
    pricePerToken: number;
    timestamp: Date;
    txSignature: string;
    source: 'helius' | 'fallback';
}
/**
 * Extract swap price from a transaction
 * Tries Helius first, falls back to null if unavailable
 */
export declare function extractSwapPriceFromTx(txSignature: string, wallet: string, assetMint: string): Promise<SwapPriceData | null>;
/**
 * Batch extract prices for multiple positions
 * Implements rate limiting (100 req/s, chunked into 10 per batch)
 */
export declare function batchExtractSwapPrices(positions: Array<{
    id: string;
    wallet: string;
    asset_mint: string;
    tx_signature_open: string;
}>): Promise<Map<string, SwapPriceData>>;
/**
 * Verify a transaction's swap data (for testing/debugging)
 */
export declare function verifyTransactionSwap(txSignature: string): Promise<any>;
export {};
//# sourceMappingURL=heliusTransactionService.d.ts.map