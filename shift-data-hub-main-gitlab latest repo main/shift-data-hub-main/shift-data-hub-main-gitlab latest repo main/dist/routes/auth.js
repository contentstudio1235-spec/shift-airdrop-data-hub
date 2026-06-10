"use strict";
// ============================================================
// Auth Routes — Social verification OAuth callbacks
// Discord, Twitter/X, Telegram
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("../config");
const socialVerificationService_1 = require("../services/socialVerificationService");
const router = express_1.default.Router();
// ── Redirect helper ──────────────────────────────────────────
function redirectToApp(res, status, task, detail) {
    const params = new URLSearchParams({ task, status });
    if (detail)
        params.set('detail', detail);
    // Redirect to the auth callback page on the frontend
    res.redirect(`${config_1.config.appUrl}/auth/callback?${params}`);
}
// ── Discord ──────────────────────────────────────────────────
/**
 * GET /api/auth/discord?wallet=<wallet>
 * Redirects the user to Discord OAuth consent screen.
 */
router.get('/discord', (req, res) => {
    const { wallet } = req.query;
    if (!wallet || wallet.length < 32) {
        return res.status(400).json({ error: 'wallet query param required' });
    }
    const url = socialVerificationService_1.socialVerificationService.getDiscordAuthUrl(wallet);
    res.redirect(url);
});
/**
 * GET /api/auth/discord/callback?code=...&state=...
 * Discord redirects here after user authorizes.
 * Verifies guild membership → awards task → redirects to frontend.
 */
router.get('/discord/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
        console.warn('[Auth/Discord] OAuth denied:', error);
        return redirectToApp(res, 'error', 'discord', 'oauth_denied');
    }
    if (!code || !state) {
        return redirectToApp(res, 'error', 'discord', 'missing_params');
    }
    try {
        const { wallet, inGuild, discordUsername } = await socialVerificationService_1.socialVerificationService.handleDiscordCallback(code, state);
        if (!inGuild) {
            console.log(`[Auth/Discord] ${wallet.slice(0, 8)} is NOT in the SHIFT guild`);
            return redirectToApp(res, 'not_member', 'discord');
        }
        await socialVerificationService_1.socialVerificationService.awardVerifiedTask(wallet, 'discord');
        console.log(`[Auth/Discord] ✅ ${discordUsername ?? wallet.slice(0, 8)} verified & awarded`);
        redirectToApp(res, 'success', 'discord');
    }
    catch (err) {
        console.error('[Auth/Discord] Callback error:', err.message);
        redirectToApp(res, 'error', 'discord', 'server_error');
    }
});
// ── Twitter / X ──────────────────────────────────────────────
/**
 * GET /api/auth/twitter?wallet=<wallet>
 * Redirects the user to Twitter OAuth 2.0 PKCE consent screen.
 */
router.get('/twitter', (req, res) => {
    const { wallet } = req.query;
    if (!wallet || wallet.length < 32) {
        return res.status(400).json({ error: 'wallet query param required' });
    }
    const { url } = socialVerificationService_1.socialVerificationService.getTwitterAuthUrl(wallet);
    res.redirect(url);
});
/**
 * GET /api/auth/twitter/callback?code=...&state=...
 * Twitter redirects here after user authorizes.
 * Verifies follow status → awards task → redirects to frontend.
 */
router.get('/twitter/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
        console.warn('[Auth/Twitter] OAuth denied:', error);
        return redirectToApp(res, 'error', 'x_follow', 'oauth_denied');
    }
    if (!code || !state) {
        return redirectToApp(res, 'error', 'x_follow', 'missing_params');
    }
    try {
        const { wallet, isFollowing, twitterUsername } = await socialVerificationService_1.socialVerificationService.handleTwitterCallback(code, state);
        if (!isFollowing) {
            console.log(`[Auth/Twitter] ${wallet.slice(0, 8)} is NOT following @ShiftRWA`);
            return redirectToApp(res, 'not_member', 'x_follow');
        }
        await socialVerificationService_1.socialVerificationService.awardVerifiedTask(wallet, 'x_follow');
        console.log(`[Auth/Twitter] ✅ @${twitterUsername ?? wallet.slice(0, 8)} verified & awarded`);
        redirectToApp(res, 'success', 'x_follow');
    }
    catch (err) {
        console.error('[Auth/Twitter] Callback error:', err.message);
        redirectToApp(res, 'error', 'x_follow', 'server_error');
    }
});
// ── Telegram ─────────────────────────────────────────────────
/**
 * POST /api/auth/telegram
 * Body: { wallet: string; telegramData: Record<string, string> }
 * The Telegram Login Widget POSTs the signed user data here (via our frontend proxy).
 */
router.post('/telegram', async (req, res) => {
    const { wallet, telegramData } = req.body;
    if (!wallet || wallet.length < 32) {
        return res.status(400).json({ error: 'wallet required' });
    }
    if (!telegramData || typeof telegramData !== 'object') {
        return res.status(400).json({ error: 'telegramData required' });
    }
    try {
        const { isValid, isMember, telegramUsername } = await socialVerificationService_1.socialVerificationService.handleTelegramLogin(telegramData, wallet);
        if (!isValid) {
            return res.status(400).json({ verified: false, reason: 'invalid_signature' });
        }
        if (!isMember) {
            return res.json({ verified: false, reason: 'not_member' });
        }
        await socialVerificationService_1.socialVerificationService.awardVerifiedTask(wallet, 'telegram');
        console.log(`[Auth/Telegram] ✅ @${telegramUsername ?? wallet.slice(0, 8)} verified & awarded`);
        res.json({ verified: true, task: 'telegram' });
    }
    catch (err) {
        console.error('[Auth/Telegram] Error:', err.message);
        res.status(500).json({ verified: false, reason: 'server_error' });
    }
});
/**
 * GET /api/auth/status?wallet=<wallet>&task=<taskId>
 * Check if a wallet has already completed a specific social task.
 * Used by the frontend to poll after a popup closes.
 */
router.get('/status', async (req, res) => {
    const { wallet, task } = req.query;
    if (!wallet || !task) {
        return res.status(400).json({ error: 'wallet and task required' });
    }
    try {
        const { query: dbQuery } = await Promise.resolve().then(() => __importStar(require('../db/pool')));
        const row = await dbQuery(`SELECT completed_at FROM snag_completed_tasks
       WHERE wallet = $1 AND task_id = $2 LIMIT 1`, [wallet, task]);
        const completed = row.length > 0;
        res.json({ wallet, task, completed, completedAt: row[0]?.completed_at ?? null });
    }
    catch (err) {
        console.error('[Auth/Status] Error:', err.message);
        res.status(500).json({ error: 'server_error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map