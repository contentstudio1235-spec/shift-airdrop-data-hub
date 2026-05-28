"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// Get global leaderboard — combined score: position SP + social/referral SP
router.get('/', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    try {
        const rows = await (0, pool_1.query)(`WITH ranked_users AS (
        SELECT u.wallet,
               CAST(u.total_xp AS DECIMAL) as total_xp,
               CAST(COALESCE(u.snag_points, 0) AS DECIMAL) as snag_total,
               CAST(COALESCE(s.last_synced_xp, 0) AS DECIMAL) as last_synced_xp,
               u.claim_multiplier,
               COUNT(DISTINCT b.id) as badge_count,
               CAST(u.total_xp AS DECIMAL) + GREATEST(0, CAST(COALESCE(u.snag_points, 0) AS DECIMAL) - CAST(COALESCE(s.last_synced_xp, 0) AS DECIMAL)) as combined_score
        FROM users u
        LEFT JOIN badges b ON u.wallet = b.wallet
        LEFT JOIN xp_sync_log s ON u.wallet = s.wallet
        GROUP BY u.wallet, u.total_xp, u.snag_points, s.last_synced_xp, u.claim_multiplier
       )
       SELECT wallet, total_xp, snag_total, last_synced_xp, claim_multiplier, badge_count, combined_score
       FROM ranked_users
       WHERE combined_score > 0
       ORDER BY combined_score DESC
       LIMIT $1`, [limit]);
        const leaderboard = rows.map((row, index) => {
            const positionSp = Number(row.total_xp);
            const snagTotal = Number(row.snag_total);
            const lastSynced = Number(row.last_synced_xp);
            const socialSp = Math.max(0, snagTotal - lastSynced);
            const totalSp = Number(row.combined_score);
            return {
                rank: index + 1,
                wallet: row.wallet,
                totalSp, // combined score (main display)
                positionSp, // from holding SHIFT positions
                socialSp, // from SNAG tasks + referrals
                // Legacy
                totalXP: positionSp,
                multiplier: Number(row.claim_multiplier),
                badgeCount: Number(row.badge_count),
            };
        });
        res.json({ leaderboard });
    }
    catch (error) {
        console.error('[API] Leaderboard fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map