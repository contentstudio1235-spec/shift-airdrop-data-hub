// ============================================================
// Auth Routes — Social verification OAuth callbacks
// Discord, Twitter/X, Telegram
// ============================================================

import express from 'express';
import { config } from '../config';
import { socialVerificationService } from '../services/socialVerificationService';

const router = express.Router();

// ── Redirect helper ──────────────────────────────────────────

function redirectToApp(
  res: express.Response,
  status: 'success' | 'error' | 'not_member',
  task: string,
  detail?: string
): void {
  const params = new URLSearchParams({ task, status });
  if (detail) params.set('detail', detail);
  // Redirect to the auth callback page on the frontend
  res.redirect(`${config.appUrl}/auth/callback?${params}`);
}

// ── Discord ──────────────────────────────────────────────────

/**
 * GET /api/auth/discord?wallet=<wallet>
 * Redirects the user to Discord OAuth consent screen.
 */
router.get('/discord', (req, res) => {
  const { wallet } = req.query as { wallet?: string };
  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'wallet query param required' });
  }
  const url = socialVerificationService.getDiscordAuthUrl(wallet);
  res.redirect(url);
});

/**
 * GET /api/auth/discord/callback?code=...&state=...
 * Discord redirects here after user authorizes.
 * Verifies guild membership → awards task → redirects to frontend.
 */
router.get('/discord/callback', async (req, res) => {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    console.warn('[Auth/Discord] OAuth denied:', error);
    return redirectToApp(res, 'error', 'discord', 'oauth_denied');
  }
  if (!code || !state) {
    return redirectToApp(res, 'error', 'discord', 'missing_params');
  }

  try {
    const { wallet, inGuild, discordUsername } = await socialVerificationService.handleDiscordCallback(
      code,
      state
    );

    if (!inGuild) {
      console.log(`[Auth/Discord] ${wallet.slice(0, 8)} is NOT in the SHIFT guild`);
      return redirectToApp(res, 'not_member', 'discord');
    }

    await socialVerificationService.awardVerifiedTask(wallet, 'discord');
    console.log(`[Auth/Discord] ✅ ${discordUsername ?? wallet.slice(0, 8)} verified & awarded`);
    redirectToApp(res, 'success', 'discord');
  } catch (err: any) {
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
  const { wallet } = req.query as { wallet?: string };
  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'wallet query param required' });
  }
  const { url } = socialVerificationService.getTwitterAuthUrl(wallet);
  res.redirect(url);
});

/**
 * GET /api/auth/twitter/callback?code=...&state=...
 * Twitter redirects here after user authorizes.
 * Verifies follow status → awards task → redirects to frontend.
 */
router.get('/twitter/callback', async (req, res) => {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    console.warn('[Auth/Twitter] OAuth denied:', error);
    return redirectToApp(res, 'error', 'x_follow', 'oauth_denied');
  }
  if (!code || !state) {
    return redirectToApp(res, 'error', 'x_follow', 'missing_params');
  }

  try {
    const { wallet, isFollowing, twitterUsername } = await socialVerificationService.handleTwitterCallback(
      code,
      state
    );

    if (!isFollowing) {
      console.log(`[Auth/Twitter] ${wallet.slice(0, 8)} is NOT following @ShiftRWA`);
      return redirectToApp(res, 'not_member', 'x_follow');
    }

    await socialVerificationService.awardVerifiedTask(wallet, 'x_follow');
    console.log(`[Auth/Twitter] ✅ @${twitterUsername ?? wallet.slice(0, 8)} verified & awarded`);
    redirectToApp(res, 'success', 'x_follow');
  } catch (err: any) {
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
  const { wallet, telegramData } = req.body as {
    wallet?: string;
    telegramData?: Record<string, string>;
  };

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'wallet required' });
  }
  if (!telegramData || typeof telegramData !== 'object') {
    return res.status(400).json({ error: 'telegramData required' });
  }

  try {
    const { isValid, isMember, telegramUsername } = await socialVerificationService.handleTelegramLogin(
      telegramData,
      wallet
    );

    if (!isValid) {
      return res.status(400).json({ verified: false, reason: 'invalid_signature' });
    }
    if (!isMember) {
      return res.json({ verified: false, reason: 'not_member' });
    }

    await socialVerificationService.awardVerifiedTask(wallet, 'telegram');
    console.log(`[Auth/Telegram] ✅ @${telegramUsername ?? wallet.slice(0, 8)} verified & awarded`);
    res.json({ verified: true, task: 'telegram' });
  } catch (err: any) {
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
  const { wallet, task } = req.query as { wallet?: string; task?: string };
  if (!wallet || !task) {
    return res.status(400).json({ error: 'wallet and task required' });
  }

  try {
    const { query: dbQuery } = await import('../db/pool');
    const row = await dbQuery<{ completed_at: string }>(
      `SELECT completed_at FROM snag_completed_tasks
       WHERE wallet = $1 AND task_id = $2 LIMIT 1`,
      [wallet, task]
    );
    const completed = row.length > 0;
    res.json({ wallet, task, completed, completedAt: row[0]?.completed_at ?? null });
  } catch (err: any) {
    console.error('[Auth/Status] Error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
