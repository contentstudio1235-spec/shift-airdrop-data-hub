/**
 * Referral System Cron Jobs
 * Scheduled tasks:
 *   1. Commission calculation (runs after XP cron)
 *   2. Final Score calculation (every 6 hours)
 *   3. Leaderboard cache refresh (every 12 hours)
 *   4. Monthly cap reset (1st of month at 00:00 UTC)
 */
export declare class ReferralCronJobs {
    /**
     * Initialize all referral cron jobs
     */
    static initialize(): void;
    private static calculateCommissions;
    private static calculateFinalScores;
    private static refreshLeaderboardCache;
    private static resetMonthlyCaps;
}
//# sourceMappingURL=referralCronJobs.d.ts.map