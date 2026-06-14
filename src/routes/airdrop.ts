// ============================================================
// Airdrop Routes
// ============================================================

import express from 'express';
import axios from 'axios';
import { pool } from '../db/pool';
import { snagSyncService } from '../services/snagSyncService';
import { referralService, resolveReferralCode } from '../services/referralService';
import { walletSyncService } from '../services/walletSyncService';

const router = express.Router();

// ── GET /api/airdrop/user/:wallet ─────────────────────────────────────────
// Full airdrop profile: queue position, SP (weighted), multipliers, referral info
router.get('/user/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet' });
    }

    const userQuery = await pool.query(
      `SELECT
         u.wallet, u.created_at, u.total_xp,
         u.permanent_multiplier, u.dynamic_multiplier,
         u.referral_code, u.referred_by_wallet, u.referred_by_code,
         u.invite_bonus_xp,
         -- Count wallets registered before this one + 1 to get true queue position
         (SELECT COUNT(*) + 1 FROM users WHERE created_at < u.created_at) as queue_position
       FROM users u
       WHERE u.wallet = $1`,
      [wallet]
    );

    const user = userQuery.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not registered' });
    }

    // Total members
    const totalQuery = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalMembers = parseInt(totalQuery.rows[0].count);

    // Loyalty points from SNAG + sync log for net social SP calculation
    const loyaltyPoints = await snagSyncService.getUserPoints(wallet).catch(() => 0);
    const syncLog = await pool.query(
      'SELECT last_synced_xp FROM xp_sync_log WHERE wallet = $1',
      [wallet]
    );
    const lastSyncedXp = syncLog.rows.length > 0 ? parseFloat(syncLog.rows[0].last_synced_xp || '0') : 0;

    // Position SP and net Social SP (matches dashboard calculation)
    const positionSp = parseFloat(user.total_xp || 0);
    const socialSp = Math.max(0, loyaltyPoints - lastSyncedXp);
    // Weighted final SP: (Position × 2.0) + (Social × 1.0)
    const totalSp = Math.round(positionSp * 2 + socialSp);

    // Referral count
    const refCount = await pool.query(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_wallet = $1',
      [wallet]
    );

    const referralCode = user.referral_code || wallet.slice(0, 6).toUpperCase();
    const referralLink = `https://airdrop.shiftrwa.xyz/register?ref=${referralCode}`;

    res.json({
      wallet,
      queuePosition: parseInt(user.queue_position),
      totalMembers,
      // Weighted SP values (matches leaderboard calculation)
      totalSp,                   // Final SP weighted: (Position×2) + (Social×1)
      positionSp,                // Position SP (driver × 2.0 in final calculation)
      socialSp,                  // Net Social SP (after deducting synced position XP)
      loyaltyPoints: loyaltyPoints || 0,  // Gross SNAG points (for reference/UI)
      permanentMultiplier: parseFloat(user.permanent_multiplier || '1.0'),
      dynamicMultiplier: parseFloat(user.dynamic_multiplier || '1.0'),
      referralCode,
      referralLink,
      referralCount: parseInt(refCount.rows[0].count),
      inviteBonusXp: parseFloat(user.invite_bonus_xp || '0'),
      referredByWallet: user.referred_by_wallet,
      referredByCode: user.referred_by_code,
      registeredAt: user.created_at,
    });
  } catch (error) {
    console.error('[Airdrop] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ── GET /api/airdrop/ref/:code ─────────────────────────────────────────────
// Resolve a referral code — used by frontend to preview bonus before registering
router.get('/ref/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.length < 4) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    const info = await resolveReferralCode(code);
    if (!info) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    if (!info.isActive) {
      return res.status(410).json({ error: 'Referral code is no longer active' });
    }

    res.json({
      code: info.code,
      displayName: info.displayName,
      isKol: info.isKol,
      multiplierBonus: info.multiplierBonus,
      multiplierType: info.multiplierType,
    });
  } catch (error) {
    console.error('[Airdrop] Error resolving ref code:', error);
    res.status(500).json({ error: 'Failed to resolve referral code' });
  }
});

// ── GET /api/airdrop/loyalty-proxy ─────────────────────────────────────────
// Proxy the external loyalty page for embedding (same-origin, no CORS issues)
// This lets us embed it in iframe/modal without X-Frame-Options blocking us.
// The external site may block direct iframe access, so we fetch server-side.
router.get('/loyalty-proxy', async (_req, res) => {
  try {
    const loyaltyUrl = 'https://loyalty.shiftrwa.xyz/loyalty';
    const response = await axios.get(loyaltyUrl, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Shift Backend Proxy)' },
    });

    // Return with headers that allow embedding
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'public, max-age=300',
    });

    res.send(response.data);
  } catch (error: any) {
    console.error('[Airdrop] Loyalty proxy error:', error?.message);
    res.status(503).json({
      error: 'Failed to fetch loyalty page',
      message: error?.message,
      hint: 'Check if https://loyalty.shiftrwa.xyz/loyalty is accessible and returns HTML',
    });
  }
});

// ── GET /api/airdrop/referrals/:wallet ────────────────────────────────────
// Get referrals made by this wallet
router.get('/referrals/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    const result = await pool.query(
      `SELECT
         r.referred_wallet, r.code_used, r.is_kol_referral,
         r.bonus_multiplier, r.bonus_type, r.referred_at,
         u.total_xp as referee_xp
       FROM referrals r
       LEFT JOIN users u ON u.wallet = r.referred_wallet
       WHERE r.referrer_wallet = $1
       ORDER BY r.referred_at DESC
       LIMIT 100`,
      [wallet]
    );

    res.json({
      wallet,
      referrals: result.rows.map((r) => ({
        wallet: r.referred_wallet.slice(0, 6) + '…' + r.referred_wallet.slice(-4),
        codeUsed: r.code_used,
        isKol: r.is_kol_referral,
        bonusMultiplier: parseFloat(r.bonus_multiplier),
        bonusType: r.bonus_type,
        referredAt: r.referred_at,
        refereeXp: parseFloat(r.referee_xp || '0'),
      })),
      totalReferrals: result.rows.length,
    });
  } catch (error) {
    console.error('[Airdrop] Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// ── POST /api/airdrop/register ────────────────────────────────────────────
// Register wallet; optionally apply referral code (?ref=CODE in body)
// After registration, automatically syncs on-chain SHIFT token holdings.
//
// UTM Phase A: when utmCapture middleware has set req.utmNormalized,
// persist first_utm_* (if not locked) and always overwrite last_utm_*
// on the user_profiles row keyed by this wallet. Failures are swallowed
// so registration never fails on attribution-write side effects.
router.post('/register', async (req, res) => {
  try {
    const { wallet, refCode } = req.body;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet' });
    }

    const result = await referralService.registerWithReferral(wallet, refCode || undefined);

    // Fire-and-forget: sync holdings after new registration
    walletSyncService.syncWallet(wallet).catch((err) =>
      console.warn(`[Airdrop] Post-register sync failed for ${wallet.slice(0, 8)}...:`, err)
    );

    // UTM persistence — additive, non-blocking
    if (req.utmNormalized) {
      const u = req.utmNormalized;
      // Only touch user_profiles when at least one normalized value survived
      // validation (otherwise we'd write nothing of value).
      if (u.source || u.medium || u.campaign || u.content || u.term) {
        // Fire-and-forget; swallow errors so registration response is unaffected.
        (async () => {
          try {
            await pool.query(
              `
              UPDATE user_profiles AS p
              SET first_utm_source   = COALESCE(p.first_utm_source, $2),
                  first_utm_medium   = COALESCE(p.first_utm_medium, $3),
                  first_utm_campaign = COALESCE(p.first_utm_campaign, $4),
                  first_utm_content  = COALESCE(p.first_utm_content, $5),
                  first_utm_term     = COALESCE(p.first_utm_term, $6),
                  last_utm_source    = COALESCE($2, p.last_utm_source),
                  last_utm_medium    = COALESCE($3, p.last_utm_medium),
                  last_utm_campaign  = COALESCE($4, p.last_utm_campaign),
                  last_seen_at       = NOW(),
                  updated_at         = NOW()
              FROM identity_links l
              WHERE l.profile_id = p.profile_id
                AND l.identity_type = 'wallet'
                AND l.identity_value = $1
                AND l.unlinked_at IS NULL
                AND (p.attribution_locked_at IS NULL OR (
                  p.last_utm_source IS DISTINCT FROM $2
                  OR p.last_utm_medium IS DISTINCT FROM $3
                  OR p.last_utm_campaign IS DISTINCT FROM $4
                ))
              `,
              [wallet, u.source, u.medium, u.campaign, u.content, u.term],
            );
          } catch (err) {
            console.warn('[Airdrop/register] UTM persistence failed:', err);
          }
        })();
      }
    }

    res.json(result);
  } catch (error) {
    console.error('[Airdrop] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/airdrop/sync ────────────────────────────────────────────────
// Triggered by the frontend whenever a wallet connects.
// Scans Helius tx history + live on-chain balances for all SHIFT tokens,
// then creates/closes any positions that are missing from the DB.
// Safe to call repeatedly — all operations are idempotent.
router.post('/sync', async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const syncResult = await walletSyncService.syncWallet(wallet);

    res.json({
      success: true,
      ...syncResult,
    });
  } catch (error) {
    console.error('[Airdrop] Sync error:', error);
    res.status(500).json({ error: 'Sync failed', message: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
