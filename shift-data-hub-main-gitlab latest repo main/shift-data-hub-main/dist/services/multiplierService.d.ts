/**
 * Claim Multiplier is SEPARATE from Position Multiplier.
 *
 * Position multiplier → affects XP generation per position
 * Claim multiplier   → affects final airdrop claim amount
 *
 * Claim multiplier grows based on:
 * - Time active (weekly/monthly bonuses)
 * - Badges earned
 * - Streak maintenance
 */
export declare class MultiplierService {
    /**
     * Recalculate claim multiplier for all users.
     * Called by cron every hour.
     */
    recalculateAllMultipliers(): Promise<number>;
    /**
     * Calculate claim multiplier for a wallet.
     */
    calculateClaimMultiplier(wallet: string): Promise<number>;
    /**
     * Get number of distinct weeks the user has been active (had open positions).
     */
    private getActiveWeeks;
    /**
     * Get number of badges earned by wallet.
     */
    private getBadgeCount;
    /**
     * Update claim multiplier with audit log + real-time SNAG sync.
     */
    private updateClaimMultiplier;
    /**
     * Update streak counter.
     * Called when we detect activity within the last 24 hours.
     */
    updateStreak(wallet: string): Promise<void>;
    /**
     * Get multiplier info for display.
     */
    getMultiplierInfo(wallet: string): Promise<{
        claimMultiplier: number;
        breakdown: {
            base: number;
            timeBonus: number;
            badgeBonus: number;
            streakBonus: number;
        };
        nextMilestone: string;
    }>;
}
export declare const multiplierService: MultiplierService;
//# sourceMappingURL=multiplierService.d.ts.map