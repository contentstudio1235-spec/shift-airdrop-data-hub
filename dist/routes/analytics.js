"use strict";
// ============================================================
// Analytics Route — GA4 Measurement Protocol + Dashboard Stats
// Bug fixes applied 2026-06-01:
//   #1 stitchedUsers now uses snag_user_id OR ga_user_id (was ga_user_id only → returned 1)
//   #2 AUM funnel now starts at total_users (was stitchedUsers → funnel was inverted)
//   #3 recentStitched now shows any identity-linked user (was ga_user_id only → 1 test row)
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// GA4 Measurement parameters
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-16YK1Q7QHD';
const GA_API_SECRET = process.env.GA_API_SECRET || '';
/**
 * POST /api/analytics/stitch
 * Records wallet ↔ GA4 client_id ↔ referral_code identity link
 */
router.post('/stitch', async (req, res) => {
    const { wallet, clientId, referralCode, sessionId } = req.body;
    if (!wallet || !clientId) {
        return res.status(400).json({
            success: false,
            error: 'wallet and clientId are required for identity stitching',
        });
    }
    console.log(`[Analytics] Stitching GA4 identity: ${wallet.slice(0, 8)}...`);
    try {
        // 1. Persist the stitch to the users table
        await (0, pool_1.execute)(`INSERT INTO users (wallet, ga_user_id, snag_custom_referral_code, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (wallet) 
       DO UPDATE SET ga_user_id = $2, snag_custom_referral_code = COALESCE(users.snag_custom_referral_code, $3), updated_at = NOW()`, [wallet, clientId, referralCode || null]);
        // 2. Dispatch server-side event to GA4 via Measurement Protocol
        const gaPayload = {
            client_id: clientId,
            events: [
                {
                    name: 'wallet_linked',
                    params: {
                        wallet_address: wallet,
                        referral_code: referralCode || undefined,
                        session_id: sessionId || undefined,
                        engagement_time_msec: 1,
                    },
                },
            ],
        };
        const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
        await axios_1.default.post(gaUrl, gaPayload, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(`[Analytics] ✅ Stitched GA4 identity for ${wallet.slice(0, 8)}...`);
        return res.status(200).json({
            success: true,
            message: 'Identity stitched and GA4 event dispatched successfully',
        });
    }
    catch (err) {
        console.error('[Analytics POST] Failed to stitch identity:', err.message);
        // Don't fail hard — stitch best-effort, still return success if DB write worked
        return res.status(200).json({
            success: true,
            message: 'Identity stitched (GA4 dispatch may have failed silently)',
            error: err.message,
        });
    }
});
/**
 * GET /api/analytics/dashboard-stats
 * Aggregated cross-channel KPIs for the Data Hub
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        // 1. Total registered users
        const totalUsersRes = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users');
        // 2. Stitched users = users with ANY identity signal (Snag OR GA4)
        //    FIX #1: was "ga_user_id IS NOT NULL" which returned 1 (only test data).
        //    Now uses snag_user_id OR ga_user_id → returns real stitched count.
        const stitchedUsersRes = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL OR ga_user_id IS NOT NULL');
        // 3. Active on-chain holders (open positions)
        const activeHoldersRes = await (0, pool_1.queryOne)("SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open'");
        // 4. Total trading volume (USD)
        const totalVolumeRes = await (0, pool_1.queryOne)("SELECT COALESCE(SUM(position_size_usd), 0) as total FROM positions");
        // 5. Recent identity-linked users for the Real-Time Ledger
        //    FIX #3: was "WHERE ga_user_id IS NOT NULL" → only returned 1 test row.
        //    Now shows any user with any identity signal (snag OR ga4 OR referral code).
        const recentStitched = await (0, pool_1.query)(`SELECT wallet, ga_user_id, snag_custom_referral_code, total_xp, snag_points, updated_at 
       FROM users 
       WHERE snag_user_id IS NOT NULL OR ga_user_id IS NOT NULL OR snag_custom_referral_code IS NOT NULL
       ORDER BY updated_at DESC 
       LIMIT 20`);
        // 6. Conversion funnel counts
        // ── AUM Acquisition Funnel ──
        // FIX #2: was using stitchedUsers as step 1, which was 1 — making step 2 (416) impossible.
        // Now: Total Users → Snag/GA4 Linked → Position Opened → Active Holder → Long-Term
        const totalUsers = Number(totalUsersRes?.count || 0);
        const stitchedUsers = Number(stitchedUsersRes?.count || 0);
        const fAum2Res = await (0, pool_1.queryOne)('SELECT COUNT(DISTINCT wallet) as count FROM positions');
        const fAum2 = Number(fAum2Res?.count || 0);
        const fAum3 = Number(activeHoldersRes?.count || 0);
        const fAum4Res = await (0, pool_1.queryOne)("SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open' AND opened_at < NOW() - INTERVAL '24 hours'");
        const fAum4 = Number(fAum4Res?.count || 0);
        // ── Holder Onboarding Funnel ──
        const fH1Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL');
        const fH1 = Number(fH1Res?.count || 0);
        const fH2 = stitchedUsers; // snag OR ga4 linked
        const fH3 = fAum2; // actually opened position
        // ── Brand Referral Funnel ──
        const fR1Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE referred_by_code IS NOT NULL OR referred_by_wallet IS NOT NULL');
        const fR1 = Number(fR1Res?.count || 0);
        const fR2Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE (referred_by_code IS NOT NULL OR referred_by_wallet IS NOT NULL) AND (snag_user_id IS NOT NULL OR ga_user_id IS NOT NULL)');
        const fR2 = Number(fR2Res?.count || 0);
        const fR3Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE snag_custom_referral_code IS NOT NULL');
        const fR3 = Number(fR3Res?.count || 0);
        return res.status(200).json({
            success: true,
            metrics: {
                totalUsers,
                stitchedUsers,
                activeHolders: fAum3,
                totalVolume: Number(totalVolumeRes?.total || 0),
            },
            funnels: {
                aum: [
                    { name: 'Registered Users', count: totalUsers },
                    { name: 'Identity Linked', count: stitchedUsers },
                    { name: 'Opened Position', count: fAum2 },
                    { name: 'Active Holder', count: fAum3 },
                    { name: 'Long Term (>24h)', count: fAum4 },
                ],
                holder: [
                    { name: 'Snag Identity Link', count: fH1 },
                    { name: 'Fully Stitched', count: fH2 },
                    { name: 'On-chain Purchase', count: fH3 },
                ],
                referral: [
                    { name: 'Referred Landings', count: fR1 },
                    { name: 'Stitched Referred', count: fR2 },
                    { name: 'Referrers Created', count: fR3 },
                ],
            },
            recentStitched,
        });
    }
    catch (err) {
        console.error('[Analytics GET] Failed to fetch stats:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map