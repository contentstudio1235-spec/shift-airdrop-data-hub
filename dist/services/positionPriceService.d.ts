export declare const RWA_TOKEN_MINTS: Record<string, string>;
interface PriceUpdateResult {
    updated: number;
    skipped: number;
    errors: number;
    pricesFetched: Record<string, number>;
    durationMs: number;
}
export declare class PositionPriceService {
    recordEntryPrice(positionId: string, assetMint: string, tokenAmount: number): Promise<void>;
    recordClosePrice(positionId: string, assetMint: string, tokenAmount: number): Promise<void>;
    updateAllOpenPositionPrices(): Promise<PriceUpdateResult>;
    backfillMissingEntryPrices(): Promise<{
        fixed: number;
        skipped: number;
    }>;
    getPriceHealthStats(): Promise<void>;
}
export declare const positionPriceService: PositionPriceService;
export {};
//# sourceMappingURL=positionPriceService.d.ts.map