"use strict";
/**
 * Leaderboard Service
 * Handles leaderboard rankings and user position
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardService = exports.LeaderboardService = void 0;
const pool_1 = require("../db/pool");
const levelSystem_1 = require("../utils/levelSystem");
class LeaderboardService {
    /**
     * Get top 100 users on leaderboard
     */
    async getTopLeaderboard(limit = 100) {
        try {
            const result = await pool_1.pool.query(`SELECT
           wallet,
           total_xp,
           current_streak,
           ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
         FROM users
         WHERE total_xp > 0
         ORDER BY total_xp DESC
         LIMIT $1`, [limit]);
            return result.rows.map(row => {
                const level = (0, levelSystem_1.getLevel)(parseFloat(row.total_xp));
                return {
                    rank: row.rank,
                    wallet: row.wallet,
                    totalXp: parseFloat(row.total_xp),
                    level: level.level,
                    levelName: level.name,
                    currentStreak: row.current_streak || 0,
                };
            });
        }
        catch (error) {
            console.error('[Leaderboard] Error fetching top leaderboard:', error);
            throw error;
        }
    }
    /**
     * Get user's rank and percentile
     */
    async getUserRank(wallet) {
        try {
            // Get total users with XP
            const countResult = await pool_1.pool.query(`SELECT COUNT(*) as total FROM users WHERE total_xp > 0`);
            const totalUsers = parseInt(countResult.rows[0].total);
            // Get user's position
            const rankResult = await pool_1.pool.query(`SELECT
           wallet,
           total_xp,
           current_streak,
           ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
         FROM users
         WHERE wallet = $1`, [wallet]);
            if (rankResult.rows.length === 0) {
                return null;
            }
            const user = rankResult.rows[0];
            const rank = user.rank;
            const percentile = Math.round((1 - rank / totalUsers) * 100);
            const level = (0, levelSystem_1.getLevel)(parseFloat(user.total_xp));
            return {
                rank,
                percentile,
                totalUsers,
                userEntry: {
                    rank,
                    wallet: user.wallet,
                    totalXp: parseFloat(user.total_xp),
                    level: level.level,
                    levelName: level.name,
                    currentStreak: user.current_streak || 0,
                },
            };
        }
        catch (error) {
            console.error('[Leaderboard] Error fetching user rank:', error);
            throw error;
        }
    }
    /**
     * Get leaderboard around a user (user + N above and below)
     */
    async getLeaderboardAround(wallet, context = 5) {
        try {
            const result = await pool_1.pool.query(`WITH ranked AS (
           SELECT
             wallet,
             total_xp,
             current_streak,
             ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
           FROM users
           WHERE total_xp > 0
         ),
         user_rank AS (
           SELECT rank FROM ranked WHERE wallet = $1
         )
         SELECT
           wallet,
           total_xp,
           current_streak,
           rank
         FROM ranked
         WHERE rank BETWEEN
           (SELECT MAX(1, rank - $2) FROM user_rank) AND
           (SELECT rank + $2 FROM user_rank)
         ORDER BY rank ASC`, [wallet, context]);
            return result.rows.map(row => {
                const level = (0, levelSystem_1.getLevel)(parseFloat(row.total_xp));
                return {
                    rank: row.rank,
                    wallet: row.wallet,
                    totalXp: parseFloat(row.total_xp),
                    level: level.level,
                    levelName: level.name,
                    currentStreak: row.current_streak || 0,
                };
            });
        }
        catch (error) {
            console.error('[Leaderboard] Error fetching leaderboard around user:', error);
            throw error;
        }
    }
}
exports.LeaderboardService = LeaderboardService;
exports.leaderboardService = new LeaderboardService();
//# sourceMappingURL=leaderboardService.js.map