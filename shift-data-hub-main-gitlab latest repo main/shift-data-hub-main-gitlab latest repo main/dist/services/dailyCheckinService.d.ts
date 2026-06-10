/**
 * Daily Check-in Service
 * Handles daily streak tracking and checkin bonuses
 */
export declare class DailyCheckinService {
    /**
     * Process daily checkin for a wallet
     * Returns the streak count and XP awarded
     */
    processDailyCheckin(wallet: string): Promise<{
        streakCount: number;
        xpAwarded: number;
        isNewStreak: boolean;
    }>;
    /**
     * Get streak info for a wallet
     */
    getStreakInfo(wallet: string): Promise<{
        currentStreak: number;
        lastCheckinDate: Date | null;
        daysUntilMilestone: number;
    }>;
}
export declare const dailyCheckinService: DailyCheckinService;
//# sourceMappingURL=dailyCheckinService.d.ts.map