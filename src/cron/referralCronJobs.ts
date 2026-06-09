/**
 * Referral System Cron Jobs
 * Scheduled tasks:
 *   1. Commission calculation (runs after XP cron)
 *   2. Final Score calculation (every 6 hours)
 *   3. Leaderboard cache refresh (every 12 hours)
 *   4. Monthly cap reset (1st of month at 00:00 UTC)
 */

import { schedule } from 'node-cron';
import { referralCommissionService } from '../services/referralCommissionService';
import { userPointsService } from '../services/userPointsService';
import { leaderboardCacheService } from '../services/leaderboardCacheService';
import { query } from '../db/pool';

export class ReferralCronJobs {
  /**
   * Initialize all referral cron jobs
   */
  static initialize(): void {
    console.log('[Cron] Initializing referral system jobs...');

    // Job 1: Commission calculation (every 30 minutes)
    schedule('0 */30 * * * *', () => this.calculateCommissions());
    console.log('[Cron] Commission calculation job scheduled (every 30 min)');

    // Job 2: Final Score recalculation (every 6 hours)
    schedule('0 0 */6 * * *', () => this.calculateFinalScores());
    console.log('[Cron] Final score calculation job scheduled (every 6 hours)');

    // Job 3: Leaderboard cache refresh (every 12 hours)
    schedule('0 0 */12 * * *', () => this.refreshLeaderboardCache());
    console.log('[Cron] Leaderboard cache refresh job scheduled (every 12 hours)');

    // Job 4: Monthly cap reset (1st of month at 00:00 UTC)
    schedule('0 0 1 * * *', () => this.resetMonthlyCaps());
    console.log('[Cron] Monthly cap reset job scheduled (1st of month)');

    console.log('[Cron] Referral cron jobs initialized successfully');
  }

  // ── Job 1: Calculate and award commissions ──────────────
  private static async calculateCommissions(): Promise<void> {
    try {
      console.log('[Cron] Starting commission calculation...');

      // Get all wallets that earned SP since last cron
      const recentEarners = await query<{ wallet: string; total_xp: number }>(
        `SELECT wallet, total_xp FROM users
         WHERE total_xp > 0
         AND last_updated > NOW() - INTERVAL '30 minutes'
         LIMIT 1000`
      );

      let awarded = 0;
      for (const row of recentEarners) {
        try {
          await referralCommissionService.calculateAndAwardCommission(row.wallet, 0);
          awarded++;
        } catch (err) {
          console.error(`[Cron] Commission calculation failed for ${row.wallet}:`, err);
        }
      }

      console.log(`[Cron] Commission calculation complete: processed ${recentEarners.length} wallets, awarded ${awarded}`);
    } catch (error) {
      console.error('[Cron] Commission calculation error:', error);
    }
  }

  // ── Job 2: Recalculate final scores ────────────────────
  private static async calculateFinalScores(): Promise<void> {
    try {
      console.log('[Cron] Starting final score recalculation...');

      const startTime = Date.now();

      // Calculate for top 10K users
      const topUsers = await userPointsService.calculateAllFinalPoints(10000);

      // In production, you'd store these in a final_scores table for fast leaderboard queries
      // For now, they're calculated on-demand from the formula

      const elapsed = Date.now() - startTime;
      console.log(`[Cron] Final score recalculation complete: ${topUsers.length} users in ${elapsed}ms`);
    } catch (error) {
      console.error('[Cron] Final score calculation error:', error);
    }
  }

  // ── Job 3: Refresh leaderboard cache ────────────────────
  private static async refreshLeaderboardCache(): Promise<void> {
    try {
      console.log('[Cron] Starting leaderboard cache refresh...');

      const startTime = Date.now();
      await leaderboardCacheService.rebuildAllCaches();

      const elapsed = Date.now() - startTime;
      console.log(`[Cron] Leaderboard cache refresh complete in ${elapsed}ms`);
    } catch (error) {
      console.error('[Cron] Leaderboard cache refresh error:', error);
    }
  }

  // ── Job 4: Reset monthly caps ──────────────────────────
  private static async resetMonthlyCaps(): Promise<void> {
    try {
      console.log('[Cron] Starting monthly cap reset...');

      const deleted = await referralCommissionService.resetMonthlyCaps();

      console.log(`[Cron] Monthly cap reset complete: deleted ${deleted} old cap records`);
    } catch (error) {
      console.error('[Cron] Monthly cap reset error:', error);
    }
  }
}

// Auto-initialize on module load
ReferralCronJobs.initialize();
