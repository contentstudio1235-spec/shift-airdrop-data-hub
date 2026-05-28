export interface WalletSyncResult {
    wallet: string;
    registered: boolean;
    txsScanned: number;
    positionsCreated: number;
    positionsClosed: number;
    holdingsBackfilled: number;
    skipped: number;
    details: string[];
}
export declare class WalletSyncService {
    private heliusBase;
    /**
     * Full sync for a wallet:
     *   1. Register user (upsert)
     *   2. Replay transaction history for SHIFT token swaps
     *   3. Backfill any live holdings with no open position
     */
    syncWallet(wallet: string): Promise<WalletSyncResult>;
    private replayTransactionHistory;
    private processTx;
    /**
     * Extract the SHIFT token being bought or sold from an enhanced tx,
     * plus the USD value derived from the stablecoin side of the swap.
     * Using stablecoin input is more reliable than pricing RWA tokens via Jupiter.
     */
    private extractShiftToken;
    private backfillLiveHoldings;
}
export declare const walletSyncService: WalletSyncService;
//# sourceMappingURL=walletSyncService.d.ts.map