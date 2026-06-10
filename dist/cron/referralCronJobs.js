"use strict";
/**
 * Referral System Cron Jobs
 * Scheduled tasks:
 *   1. Commission calculation (runs after XP cron)
 *   2. Final Score calculation (every 6 hours)
 *   3. Leaderboard cache refresh (every 12 hours)
 *   4. Monthly cap reset (1st of month at 00:00 UTC)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralCronJobs = void 0;
const node_cron_1 = require("node-cron");
const referralCommissionService_1 = require("../services/referralCommissionService");
const userPointsService_1 = require("../services/userPointsService");
const leaderboardCacheService_1 = require("../services/leaderboardCacheService");
class ReferralCronJobs {
    /**
     * Initialize all referral cron jobs
     */
    static initialize() {
        console.log('[Cron] Initializing referral system jobs...');
        // Job 1: Commission calculation (every 30 minutes)
        (0, node_cron_1.schedule)('0 */30 * * * *', () => this.calculateCommissions());
        console.log('[Cron] Commission calculation job scheduled (every 30 min)');
        // Job 2: Final Score recalculation (every 6 hours)
        (0, node_cron_1.schedule)('0 0 */6 * * *', () => this.calculateFinalScores());
        console.log('[Cron] Final score calculation job scheduled (every 6 hours)');
        // Job 3: Leaderboard cache refresh (every 12 hours)
        (0, node_cron_1.schedule)('0 0 */12 * * *', () => this.refreshLeaderboardCache());
        console.log('[Cron] Leaderboard cache refresh job scheduled (every 12 hours)');
        // Job 4: Monthly cap reset (1st of month at 00:00 UTC)
        (0, node_cron_1.schedule)('0 0 1 * * *', () => this.resetMonthlyCaps());
        console.log('[Cron] Monthly cap reset job scheduled (1st of month)');
        console.log('[Cron] Referral cron jobs initialized successfully');
    }
    // ── Job 1: Calculate and award commissions ──────────────
    static async calculateCommissions() {
        try {
            console.log('[Cron] Starting referral commission calculation...');
            const result = await referralCommissionService_1.referralCommissionService.processAllPendingCommissions();
            console.log(`[Cron] Commission calculation complete: position=${result.position}, social=${result.social}`);
        }
        catch (error) {
            console.error('[Cron] Commission calculation error:', error);
        }
    }
    // ── Job 2: Recalculate final scores ────────────────────
    static async calculateFinalScores() {
        try {
            console.log('[Cron] Starting final score recalculation...');
            const startTime = Date.now();
            // Calculate for top 10K users
            const topUsers = await userPointsService_1.userPointsService.calculateAllFinalPoints(10000);
            // In production, you'd store these in a final_scores table for fast leaderboard queries
            // For now, they're calculated on-demand from the formula
            const elapsed = Date.now() - startTime;
            console.log(`[Cron] Final score recalculation complete: ${topUsers.length} users in ${elapsed}ms`);
        }
        catch (error) {
            console.error('[Cron] Final score calculation error:', error);
        }
    }
    // ── Job 3: Refresh leaderboard cache ────────────────────
    static async refreshLeaderboardCache() {
        try {
            console.log('[Cron] Starting leaderboard cache refresh...');
            const startTime = Date.now();
            await leaderboardCacheService_1.leaderboardCacheService.rebuildAllCaches();
            const elapsed = Date.now() - startTime;
            console.log(`[Cron] Leaderboard cache refresh complete in ${elapsed}ms`);
        }
        catch (error) {
            console.error('[Cron] Leaderboard cache refresh error:', error);
        }
    }
    // ── Job 4: Reset monthly caps ──────────────────────────
    static async resetMonthlyCaps() {
        try {
            console.log('[Cron] Starting monthly cap reset...');
            const deleted = await referralCommissionService_1.referralCommissionService.resetMonthlyCaps();
            console.log(`[Cron] Monthly cap reset complete: deleted ${deleted} old cap records`);
        }
        catch (error) {
            console.error('[Cron] Monthly cap reset error:', error);
        }
    }
}
exports.ReferralCronJobs = ReferralCronJobs;
// Auto-initialize on module load
ReferralCronJobs.initialize();
//# sourceMappingURL=referralCronJobs.js.map