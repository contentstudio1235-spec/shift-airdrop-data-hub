import { Position } from '../types';
export declare class PositionService {
    /**
     * Ensure a user record exists (upsert on first seen wallet).
     */
    ensureUserExists(wallet: string): Promise<void>;
    /**
     * Open a new position. Returns false if tx already processed (dedup).
     */
    openPosition(wallet: string, asset: string, assetMint: string | null, positionSizeUSD: number, tokenAmount: number | null, priceAtOpen: number | null, txSignature: string, timestamp: Date): Promise<boolean>;
    /**
     * Close a position matching wallet + asset (FIFO — closes oldest open).
     */
    closePosition(wallet: string, asset: string, txSignature: string, timestamp: Date): Promise<Position | null>;
    /**
     * Get all active (open) positions for a wallet.
     */
    getActivePositions(wallet: string): Promise<Position[]>;
    /**
     * Get all positions for a wallet (any status).
     */
    getAllPositions(wallet: string): Promise<Position[]>;
    /**
     * Get all open positions across all users (for cron recalc).
     */
    getAllOpenPositions(): Promise<Position[]>;
    /**
     * Get position age in weeks and days.
     */
    getPositionAge(openedAt: Date, referenceDate?: Date): {
        weeks: number;
        days: number;
        hours: number;
    };
    /**
     * Update position XP and multiplier after recalculation.
     */
    updatePositionXP(positionId: string, xpGenerated: number, multiplier: number): Promise<void>;
    /**
     * Mark a position as filtered (anti-farm).
     */
    filterPosition(positionId: string): Promise<void>;
    private formatDuration;
    /**
     * Capture entry price from blockchain transaction (when position opens).
     * Extracts swap price via Helius API and stores in price_at_open.
     */
    capturePositionOpen(position: Position): Promise<boolean>;
    /**
     * Capture exit price when position closes.
     * Extracts swap price and stores close_value_usd.
     */
    capturePositionClose(positionId: string, txSignatureClose: string, wallet: string, assetMint: string): Promise<boolean>;
    /**
     * Backfill entry prices for all positions without price_at_open.
     * Uses Helius to extract swap prices from blockchain transactions.
     * Returns { total, updated, failed } for audit.
     */
    backfillEntryPrices(): Promise<{
        total: number;
        updated: number;
        failed: number;
    }>;
}
export declare const positionService: PositionService;
//# sourceMappingURL=positionService.d.ts.map