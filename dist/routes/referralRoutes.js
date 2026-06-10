"use strict";
/**
 * Referral API Routes
 *
 * Source of truth: `referrals` table (14,232+ rows, covers SHIFT + Snag links)
 *
 * PERMANENT $5 ACTIVATION REQUIREMENT (Referral System v2):
 * - Active = referred wallet holds >= $5 combined in any SHIFT RWA asset
 * - This is a PERMANENT quality gate, not subject to removal or change
 * - Applies to ALL referrals (new and legacy)
 * - Legacy balance claims require referred wallet to meet this threshold
 *
 * Nudge-eligible = registered but inactive (< $5 holding) — targetable for push
 *
 * Endpoints:
 *   GET  /api/referral/:wallet              - Dashboard (stats + SP breakdown)
 *   GET  /api/referral/:wallet/referred     - Full list of referred wallets
 *   GET  /api/referral/:wallet/nudge        - Only inactive referred wallets (for nudge)
 *   POST /api/referral/:wallet/claim-legacy - Claim legacy pending SP
 *   GET  /api/referral/leaderboard          - Leaderboard sorted by various metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referralCommissionService_1 = require("../services/referralCommissionService");
const leaderboardCacheService_1 = require("../services/leaderboardCacheService");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// ── SHIFT RWA asset mints (used for $5 active threshold) ──────────────────
const SHIFT_ASSET_MINTS = [
    '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT', // TSL2L
    'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT', // TSL1S
    'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT', // SOX3L
    '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT', // SOX3S
    '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT', // SPX3L
    '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT', // SPX3S
];
const MINT_PLACEHOLDERS = SHIFT_ASSET_MINTS.map((_, i) => `$${i + 1}`).join(',');
// ── GET /api/referral/:wallet ──────────────────────────────────────────────
router.get('/:wallet', async (req, res) => {
    const wallet = String(req.params.wallet);
    if (req.path === '/leaderboard')
        return req.next();
    try {
        // ── Referral counts from referrals table (source of truth) ──
        const counts = await (0, pool_1.queryOne)(`SELECT
         COUNT(*)                                        AS total,
         COUNT(*) FILTER (WHERE is_active = true)        AS active,
         COUNT(*) FILTER (WHERE is_active = false)       AS inactive,
         COUNT(*) FILTER (WHERE referral_source = 'shift') AS from_shift,
         COUNT(*) FILTER (WHERE referral_source = 'snag')  AS from_snag
       FROM referrals
       WHERE referrer_wallet = $1`, [wallet]);
        // ── SP earned breakdown ──
        const commission = await referralCommissionService_1.referralCommissionService.getTotalCommissionEarned(wallet);
        // Monthly cap progress (position referral only)
        const monthYear = new Date().toISOString().slice(0, 7);
        const monthCapRow = await (0, pool_1.queryOne)(`SELECT COALESCE(SUM(total_awarded), 0) AS total
       FROM referral_monthly_caps
       WHERE referrer_wallet = $1 AND month_year = $2`, [wallet, monthYear]);
        const monthlyEarned = Number(monthCapRow?.total ?? 0);
        // Legacy balance
        const legacy = await referralCommissionService_1.referralCommissionService.getPendingBalance(wallet);
        // Referrer's own referral links
        const links = await (0, pool_1.queryOne)(`SELECT referral_code, snag_default_referral_link, snag_custom_referral_code
       FROM users WHERE wallet = $1`, [wallet]);
        res.json({
            wallet,
            referrals: {
                total: Number(counts?.total ?? 0),
                active: Number(counts?.active ?? 0), // holds >= $5 SHIFT assets
                inactive: Number(counts?.inactive ?? 0), // registered but < $5
                fromShift: Number(counts?.from_shift ?? 0), // came via SHIFT website
                fromSnag: Number(counts?.from_snag ?? 0), // came via Snag loyalty link
            },
            links: {
                shiftReferralCode: links?.referral_code ?? null,
                snagDefaultLink: links?.snag_default_referral_link ?? null,
                snagCustomCode: links?.snag_custom_referral_code ?? null,
            },
            // Position referral SP (10–15% of referred wallets' position XP)
            // Social referral SP is handled by Snag directly → shows in snag_points
            commission: {
                positionReferralSp: commission.position,
                positionTierRate: '10–15%',
                positionMultiplier: '1.0x',
                monthlyProgress: {
                    earned: monthlyEarned,
                    cap: 500,
                    percentage: Math.min((monthlyEarned / 500) * 100, 100),
                },
                // Note: Social referral SP from Snag tasks flows directly into
                // the user's snag_points via Snag's own referral reward system.
                socialReferralNote: 'Handled by Snag — appears in your Social SP total',
            },
            legacy: {
                pending: legacy.pending,
                claimed: legacy.claimed,
            },
        });
    }
    catch (err) {
        console.error('[API] Referral dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── GET /api/referral/:wallet/referred ────────────────────────────────────
// Full list: every referred wallet with holding value, source, active status
router.get('/:wallet/referred', async (req, res) => {
    const wallet = String(req.params.wallet);
    const monthYear = new Date().toISOString().slice(0, 7);
    try {
        const rows = await (0, pool_1.query)(`SELECT
         r.referred_wallet                    AS wallet,
         r.referral_source                    AS source,
         r.is_active,
         r.activated_at,
         r.referred_at,
         r.code_used,
         u.total_xp,
         COALESCE(u.snag_points, 0)           AS snag_points,
         -- Current SHIFT RWA holding (open positions only, permanent $5 threshold check)
         COALESCE((
           SELECT SUM(p.position_size_usd)
           FROM positions p
           WHERE p.wallet = r.referred_wallet
             AND p.status = 'open'
             AND p.asset_mint = ANY($3::text[])
         ), 0)                                AS shift_holding_usd,
         -- Total open position count (all assets, not just SHIFT RWA)
         (SELECT COUNT(*) FROM positions p
          WHERE p.wallet = r.referred_wallet AND p.status = 'open') AS open_positions,
         -- Total historical volume (all non-filtered positions, open + closed)
         COALESCE((
           SELECT SUM(p.position_size_usd)
           FROM positions p
           WHERE p.wallet = r.referred_wallet
             AND p.status != 'filtered'
         ), 0)                                AS total_volume,
         -- Commission earned from this wallet
         (SELECT COALESCE(SUM(sp_awarded), 0) FROM referral_commissions
          WHERE referrer_wallet = $1 AND referred_wallet = r.referred_wallet
            AND commission_type = 'position')  AS commission_earned,
         (SELECT COALESCE(SUM(total_awarded), 0) FROM referral_monthly_caps
          WHERE referrer_wallet = $1 AND referred_wallet = r.referred_wallet
            AND month_year = $2)               AS month_earned
       FROM referrals r
       JOIN users u ON u.wallet = r.referred_wallet
       WHERE r.referrer_wallet = $1
       ORDER BY r.is_active DESC, u.total_xp DESC`, [wallet, monthYear, SHIFT_ASSET_MINTS]);
        const referred = await Promise.all(rows.map(async (row) => {
            const tier = await referralCommissionService_1.referralCommissionService.getPositionTierRate(row.wallet);
            const holding = Number(row.shift_holding_usd);
            return {
                wallet: row.wallet,
                source: row.source, // 'shift' | 'snag'
                isActive: row.is_active, // holds >= $5 SHIFT assets
                activatedAt: row.activated_at,
                referredAt: row.referred_at,
                codeUsed: row.code_used,
                shiftHoldingUsd: holding, // current open SHIFT RWA holding
                openPositions: Number(row.open_positions),
                totalVolume: Number(row.total_volume), // all-time historical volume
                totalXp: Number(row.total_xp),
                snagPoints: Number(row.snag_points),
                commissionTier: `${tier}%`,
                commissionEarned: Number(row.commission_earned),
                monthlyEarned: Number(row.month_earned),
                // Nudge eligibility: registered but hasn't met the $5 threshold yet
                nudgeEligible: !row.is_active,
                nudgeReason: !row.is_active
                    ? (holding > 0
                        ? `Holds $${holding.toFixed(2)} — needs $${(5 - holding).toFixed(2)} more to activate`
                        : 'No SHIFT assets held yet')
                    : null,
            };
        }));
        res.json({
            wallet,
            total: referred.length,
            activeCount: referred.filter(r => r.isActive).length,
            inactiveCount: referred.filter(r => !r.isActive).length,
            nudgeCount: referred.filter(r => r.nudgeEligible).length,
            fromShift: referred.filter(r => r.source === 'shift').length,
            fromSnag: referred.filter(r => r.source === 'snag').length,
            referred,
        });
    }
    catch (err) {
        console.error('[API] Referred users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── GET /api/referral/:wallet/nudge ───────────────────────────────────────
// Only inactive referrals — optimised payload for nudge/notification system
router.get('/:wallet/nudge', async (req, res) => {
    const wallet = String(req.params.wallet);
    try {
        const rows = await (0, pool_1.query)(`SELECT
         r.referred_wallet AS wallet,
         r.referral_source AS source,
         r.referred_at,
         COALESCE((
           SELECT SUM(p.position_size_usd)
           FROM positions p
           WHERE p.wallet = r.referred_wallet
             AND p.status = 'open'
             AND p.asset_mint = ANY($2::text[])
         ), 0) AS shift_holding_usd
       FROM referrals r
       WHERE r.referrer_wallet = $1
         AND r.is_active = false
       ORDER BY shift_holding_usd DESC`, [wallet, SHIFT_ASSET_MINTS]);
        const nudgeList = rows.map((row) => {
            const holding = Number(row.shift_holding_usd);
            return {
                wallet: row.wallet,
                source: row.source,
                referredAt: row.referred_at,
                holdingUsd: holding,
                needed: Math.max(0, 5 - holding),
                hasAnyAssets: holding > 0,
                message: holding > 0
                    ? `Almost there! Hold $${(5 - holding).toFixed(2)} more in SHIFT assets to activate`
                    : 'Buy any SHIFT RWA asset ($5 minimum) to start earning referral rewards',
            };
        });
        res.json({
            wallet,
            nudgeCount: nudgeList.length,
            list: nudgeList,
        });
    }
    catch (err) {
        console.error('[API] Nudge list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /api/referral/:wallet/claim-legacy ───────────────────────────────
router.post('/:wallet/claim-legacy', async (req, res) => {
    const wallet = String(req.params.wallet);
    try {
        const amount = await referralCommissionService_1.referralCommissionService.claimLegacyBalance(wallet);
        res.json({ success: true, claimedAmount: amount });
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to claim balance' });
    }
});
// ── GET /api/referral/leaderboard ─────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'final_points';
    const limit = Math.min(parseInt(typeof req.query.limit === 'string' ? req.query.limit : '100') || 100, 500);
    try {
        let leaderboard;
        switch (sort) {
            case 'referral_count':
                leaderboard = await leaderboardCacheService_1.leaderboardCacheService.getTopByReferralCount(limit);
                break;
            case 'referred_volume':
                leaderboard = await leaderboardCacheService_1.leaderboardCacheService.getTopByReferredVolume(limit);
                break;
            case 'referred_holding':
                leaderboard = await leaderboardCacheService_1.leaderboardCacheService.getTopByReferredHolding(limit);
                break;
            default: leaderboard = await leaderboardCacheService_1.leaderboardCacheService.getTopByFinalPoints(limit);
        }
        // Enrich with referral stats from referrals table
        const enriched = await Promise.all(leaderboard.map(async (entry) => {
            const stats = await (0, pool_1.queryOne)(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active
         FROM referrals WHERE referrer_wallet = $1`, [entry.wallet]);
            return {
                ...entry,
                referredTotal: Number(stats?.total ?? 0),
                referredActive: Number(stats?.active ?? 0),
            };
        }));
        res.json({ sort, limit, count: enriched.length, leaderboard: enriched });
    }
    catch (err) {
        console.error('[API] Leaderboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=referralRoutes.js.map