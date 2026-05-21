// ============================================================
// Airdrop Routes
// ============================================================

import express from 'express';
import { pool } from '../db/pool';
import { snagSyncService } from '../services/snagSyncService';
import { referralService, resolveReferralCode } from '../services/referralService';

const router = express.Router();

// ── GET /api/airdrop/user/:wallet ─────────────────────────────────────────
// Full airdrop profile: queue position, XP, multipliers, referral info
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
         ROW_NUMBER() OVER (ORDER BY u.created_at ASC) as queue_position
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

    // Loyalty points from SNAG
    const loyaltyPoints = await snagSyncService.getUserPoints(wallet).catch(() => 0);

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
      totalXp: parseFloat(user.total_xp || 0),
      loyaltyPoints: loyaltyPoints || 0,
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
router.post('/register', async (req, res) => {
  try {
    const { wallet, refCode } = req.body;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet' });
    }

    const result = await referralService.registerWithReferral(wallet, refCode || undefined);
    res.json(result);
  } catch (error) {
    console.error('[Airdrop] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
