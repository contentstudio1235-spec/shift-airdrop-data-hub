export declare class XPEngine {
    /**
     * Position multiplier: grows 0.1x per week held, capped at 3.0x.
     * For tracked RWA tokens, applies additional base multiplier.
     * position_multiplier(t) = base_mult × min(1.0 + 0.10 × weeks_open, 3.0)
     */
    calculatePositionMultiplier(weeksOpen: number, assetMint?: string | null): number;
    /**
     * Weekly XP for a single position (includes launch event multiplier).
     * weekly_position_XP = log₁₀(position_size_USD) × 100 × position_multiplier × launch_multiplier
     * Returns 0 for positions under $1 (log₁₀ is negative below $1 which would subtract XP).
     */
    calculateWeeklyXP(positionSizeUSD: number, multiplier: number, launchMultiplier?: number): number;
    /**
     * Calculate XP earned since last calculation for a position.
     * Prorates the weekly XP based on hours elapsed (includes launch event multiplier).
     */
    calculateXPSinceLastCalc(positionSizeUSD: number, multiplier: number, hoursSinceLastCalc: number, launchMultiplier?: number): number;
    /**
     * Main recalculation job — runs every minute (or configurable interval).
     * 1. Get all open positions
     * 2. Skip positions under 24h hold (anti-farm)
     * 3. Calculate position multiplier based on age + apply launch event multiplier
     * 4. Calculate XP earned since last calc
     * 5. Update position records
     * 6. Aggregate XP per wallet → update users.total_xp
     */
    recalculateAllXP(): Promise<{
        usersUpdated: number;
        positionsProcessed: number;
    }>;
    /**
     * Get total XP for a wallet (from DB).
     */
    getWalletXP(wallet: string): Promise<number>;
    /**
     * Get XP breakdown per position for a wallet (includes launch event multiplier).
     */
    getXPBreakdown(wallet: string): Promise<Array<{
        asset: string;
        positionSizeUSD: number;
        weeksHeld: number;
        multiplier: number;
        launchMultiplier: number;
        effectiveMultiplier: number;
        xpPerWeek: number;
        xpPerHour: number;
        totalXP: number;
    }>>;
}
export declare const xpEngine: XPEngine;
//# sourceMappingURL=xpEngine.d.ts.map