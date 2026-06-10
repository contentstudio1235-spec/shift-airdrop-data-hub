"use strict";
// ============================================================
// SNAG Routes — Points and completed tasks endpoints
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const snagSyncService_1 = require("../services/snagSyncService");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
/**
 * GET /api/snag/points/:wallet
 * Returns the user's SNAG loyalty points balance.
 */
router.get('/points/:wallet', async (req, res) => {
    const { wallet } = req.params;
    if (!wallet || wallet.length < 32) {
        res.status(400).json({ error: 'Invalid wallet address' });
        return;
    }
    try {
        const loyaltyPoints = await snagSyncService_1.snagSyncService.getUserPoints(wallet);
        res.json({ wallet, loyaltyPoints });
    }
    catch (error) {
        console.error('[SNAG] Failed to fetch points:', error);
        res.status(500).json({ error: 'Failed to fetch SNAG points' });
    }
});
/**
 * GET /api/snag/tasks/:wallet
 * Returns the list of social task IDs the user has completed via SNAG.
 */
router.get('/tasks/:wallet', async (req, res) => {
    const { wallet } = req.params;
    if (!wallet || wallet.length < 32) {
        res.status(400).json({ error: 'Invalid wallet address' });
        return;
    }
    try {
        const rows = await (0, pool_1.query)('SELECT task_id, completed_at FROM snag_completed_tasks WHERE wallet = $1', [wallet]);
        res.json({
            wallet,
            completedTasks: rows.map(r => r.task_id),
            completedAt: Object.fromEntries(rows.map(r => [r.task_id, r.completed_at])),
        });
    }
    catch (error) {
        console.error('[SNAG] Failed to fetch tasks:', error);
        res.status(500).json({ error: 'Failed to fetch completed tasks' });
    }
});
/**
 * GET /api/snag/referral/:wallet
 * Returns user's referral links from SNAG (default + custom).
 */
router.get('/referral/:wallet', async (req, res) => {
    const { wallet } = req.params;
    if (!wallet || wallet.length < 32) {
        res.status(400).json({ error: 'Invalid wallet address' });
        return;
    }
    try {
        const referralLinks = await snagSyncService_1.snagSyncService.getUserReferralLinks(wallet);
        res.json({
            wallet,
            defaultLink: referralLinks.defaultLink,
            customLink: referralLinks.customLink,
        });
    }
    catch (error) {
        console.error('[SNAG] Failed to fetch referral links:', error);
        res.status(500).json({ error: 'Failed to fetch referral links' });
    }
});
/**
 * POST /api/snag/referral/:wallet/custom
 * Set a custom referral code for the user.
 */
router.post('/referral/:wallet/custom', async (req, res) => {
    const { wallet } = req.params;
    const { customCode } = req.body;
    if (!wallet || wallet.length < 32) {
        res.status(400).json({ error: 'Invalid wallet address' });
        return;
    }
    if (!customCode || customCode.length < 4 || customCode.length > 64) {
        res.status(400).json({ error: 'Custom code must be 4-64 characters' });
        return;
    }
    try {
        await snagSyncService_1.snagSyncService.setCustomReferralLink(wallet, customCode.toUpperCase());
        res.json({
            success: true,
            wallet,
            customLink: customCode.toUpperCase(),
        });
    }
    catch (error) {
        console.error('[SNAG] Failed to set custom referral code:', error);
        // CRITICAL FIX: Sanitize error messages to prevent information leakage
        let userMessage = 'Failed to set custom referral code';
        if (error.message?.includes('already in use')) {
            userMessage = 'This code is already in use. Please try another.';
        }
        else if (error.message?.includes('invalid') || error.message?.includes('format')) {
            userMessage = 'Code format is invalid. Use only letters, numbers, and hyphens.';
        }
        res.status(500).json({ error: userMessage });
    }
});
exports.default = router;
//# sourceMappingURL=snag.js.map