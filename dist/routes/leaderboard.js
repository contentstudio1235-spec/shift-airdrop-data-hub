"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// SHIFT RWA asset mints — same 6 as used in referral activation threshold
const SHIFT_MINTS = [
    '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
    'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
    '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
    '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
];
// Get global leaderboard with referral enrichment
router.get('/', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const sort = req.query.sort || 'final_points';
    const orderBy = {
        final_points: 'combined_score DESC',
        referral_count: 'referred_count DESC, combined_score DESC',
        referred_volume: 'referred_volume DESC, combined_score DESC',
        referred_holding: 'referred_holding DESC, combined_score DESC',
    };
    try {
        const rows = await (0, pool_1.query)(`WITH ranked_users AS (
         SELECT
           u.wallet,
           CAST(u.total_xp AS DECIMAL)                                                    AS total_xp,
           CAST(COALESCE(u.snag_points, 0) AS DECIMAL)                                    AS snag_total,
           CAST(COALESCE(s.last_synced_xp, 0) AS DECIMAL)                                 AS last_synced_xp,
           u.claim_multiplier,
           COUNT(DISTINCT b.id)                                                            AS badge_count,
           CAST(u.total_xp AS DECIMAL)
             + GREATEST(0,
                 CAST(COALESCE(u.snag_points, 0) AS DECIMAL)
               - CAST(COALESCE(s.last_synced_xp, 0) AS DECIMAL))                         AS combined_score
         FROM users u
         LEFT JOIN badges b ON u.wallet = b.wallet
         LEFT JOIN xp_sync_log s ON u.wallet = s.wallet
         GROUP BY u.wallet, u.total_xp, u.snag_points, s.last_synced_xp, u.claim_multiplier
       ),
       ref_counts AS (
         SELECT
           referrer_wallet,
           COUNT(*)                                                               AS referred_count,
           COUNT(*) FILTER (WHERE referred_at < '2026-05-26 15:00:00+00')        AS pre_reg_count,
           COUNT(*) FILTER (WHERE referred_at >= '2026-05-26 15:00:00+00')       AS season1_count
         FROM referrals
         GROUP BY referrer_wallet
       ),
       ref_volume AS (
         SELECT r.referrer_wallet, COALESCE(SUM(p.position_size_usd), 0) AS referred_volume
         FROM referrals r
         JOIN positions p ON p.wallet = r.referred_wallet
           AND p.status != 'filtered'
           AND p.asset_mint = ANY($2::text[])
         GROUP BY r.referrer_wallet
       ),
       ref_holding AS (
         SELECT r.referrer_wallet, COALESCE(SUM(p.position_size_usd), 0) AS referred_holding
         FROM referrals r
         JOIN positions p ON p.wallet = r.referred_wallet
           AND p.status = 'open'
           AND p.asset_mint = ANY($2::text[])
         GROUP BY r.referrer_wallet
       )
       SELECT
         ru.wallet,
         ru.total_xp,
         ru.snag_total,
         ru.last_synced_xp,
         ru.claim_multiplier,
         ru.badge_count,
         ru.combined_score,
         COALESCE(rc.referred_count,  0) AS referred_count,
         COALESCE(rc.pre_reg_count,   0) AS pre_reg_count,
         COALESCE(rc.season1_count,   0) AS season1_count,
         COALESCE(rv.referred_volume, 0) AS referred_volume,
         COALESCE(rh.referred_holding,0) AS referred_holding
       FROM ranked_users ru
       LEFT JOIN ref_counts  rc ON ru.wallet = rc.referrer_wallet
       LEFT JOIN ref_volume  rv ON ru.wallet = rv.referrer_wallet
       LEFT JOIN ref_holding rh ON ru.wallet = rh.referrer_wallet
       WHERE ru.combined_score > 0
       ORDER BY ${orderBy[sort] ?? orderBy.final_points}
       LIMIT $1`, [limit, SHIFT_MINTS]);
        const leaderboard = rows.map((row, index) => {
            const positionSp = Number(row.total_xp);
            const snagTotal = Number(row.snag_total);
            const lastSynced = Number(row.last_synced_xp);
            const socialSp = Math.max(0, snagTotal - lastSynced);
            const totalSp = Number(row.combined_score);
            return {
                rank: index + 1,
                wallet: row.wallet,
                totalSp,
                positionSp,
                socialSp,
                referredCount: Number(row.referred_count),
                referredVolume: Number(row.referred_volume),
                referredHolding: Number(row.referred_holding),
                preRegCount: Number(row.pre_reg_count),
                season1Count: Number(row.season1_count),
                // Legacy fields kept for backward compat
                totalXP: positionSp,
                multiplier: Number(row.claim_multiplier),
                badgeCount: Number(row.badge_count),
            };
        });
        res.json({ sort, limit, count: leaderboard.length, leaderboard });
    }
    catch (error) {
        console.error('[API] Leaderboard fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map