"use strict";
/**
 * Daily Check-in Service
 * Handles daily streak tracking and checkin bonuses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyCheckinService = exports.DailyCheckinService = void 0;
const pool_1 = require("../db/pool");
const realtimeSnagSyncService_1 = require("./realtimeSnagSyncService");
const DAILY_CHECKIN_XP = 50;
class DailyCheckinService {
    /**
     * Process daily checkin for a wallet
     * Returns the streak count and XP awarded
     */
    async processDailyCheckin(wallet) {
        try {
            // Get user's last checkin and current streak
            const userResult = await pool_1.pool.query(`SELECT last_daily_checkin, current_streak, total_xp FROM users WHERE wallet = $1`, [wallet]);
            if (userResult.rows.length === 0) {
                throw new Error(`User ${wallet} not found`);
            }
            const user = userResult.rows[0];
            const lastCheckin = user.last_daily_checkin ? new Date(user.last_daily_checkin) : null;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // Check if already checked in today
            if (lastCheckin && lastCheckin >= todayStart) {
                return {
                    streakCount: user.current_streak,
                    xpAwarded: 0,
                    isNewStreak: false,
                };
            }
            // Calculate new streak
            let newStreak = 1;
            const isNewStreak = !lastCheckin || lastCheckin < new Date(now.getTime() - 48 * 60 * 60 * 1000);
            if (!isNewStreak && lastCheckin) {
                // Check if last checkin was yesterday
                const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
                if (lastCheckin >= yesterdayStart) {
                    newStreak = user.current_streak + 1;
                }
            }
            // Milestone bonuses
            let xpBonus = DAILY_CHECKIN_XP;
            if (newStreak === 7)
                xpBonus += 250; // 7-day milestone
            if (newStreak === 30)
                xpBonus += 500; // 30-day milestone
            if (newStreak === 100)
                xpBonus += 1000; // 100-day milestone
            // Update user
            const newTotalXp = parseFloat(user.total_xp) + xpBonus;
            await (0, pool_1.execute)(`UPDATE users
         SET last_daily_checkin = NOW(),
             current_streak = $1,
             total_xp = $2,
             updated_at = NOW()
         WHERE wallet = $3`, [newStreak, newTotalXp, wallet]);
            // Queue real-time sync to SNAG for checkin bonus XP (debounced, will batch within 2 seconds)
            await realtimeSnagSyncService_1.realtimeSnagSyncService.queueXPSync(wallet, xpBonus);
            return {
                streakCount: newStreak,
                xpAwarded: xpBonus,
                isNewStreak,
            };
        }
        catch (error) {
            console.error('[DailyCheckin] Error processing checkin:', error);
            throw error;
        }
    }
    /**
     * Get streak info for a wallet
     */
    async getStreakInfo(wallet) {
        try {
            const result = await pool_1.pool.query(`SELECT last_daily_checkin, current_streak FROM users WHERE wallet = $1`, [wallet]);
            if (result.rows.length === 0) {
                return {
                    currentStreak: 0,
                    lastCheckinDate: null,
                    daysUntilMilestone: 7,
                };
            }
            const user = result.rows[0];
            const lastCheckin = user.last_daily_checkin ? new Date(user.last_daily_checkin) : null;
            const streak = user.current_streak || 0;
            // Next milestone
            let nextMilestone = 7;
            if (streak >= 7 && streak < 30)
                nextMilestone = 30;
            if (streak >= 30 && streak < 100)
                nextMilestone = 100;
            if (streak >= 100)
                nextMilestone = 999; // aspirational
            return {
                currentStreak: streak,
                lastCheckinDate: lastCheckin,
                daysUntilMilestone: Math.max(0, nextMilestone - streak),
            };
        }
        catch (error) {
            console.error('[DailyCheckin] Error fetching streak info:', error);
            throw error;
        }
    }
}
exports.DailyCheckinService = DailyCheckinService;
exports.dailyCheckinService = new DailyCheckinService();
//# sourceMappingURL=dailyCheckinService.js.map