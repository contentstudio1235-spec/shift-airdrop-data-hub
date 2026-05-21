import express from 'express';
import { pool } from '../db/pool';
import { snagSyncService } from '../services/snagSyncService';

const router = express.Router();

/**
 * GET /api/airdrop/user/:wallet
 * Get user's queue position, referral link, total members, points earned
 */
router.get('/user/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet' });
    }

    // Get user's registration rank (earliest registrations are highest rank)
    const userQuery = await pool.query(
      `SELECT 
        wallet, created_at, total_xp,
        ROW_NUMBER() OVER (ORDER BY created_at ASC) as queue_position
       FROM users WHERE wallet = $1`,
      [wallet]
    );

    const user = userQuery.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not registered' });
    }

    // Get total registered members
    const totalQuery = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalMembers = parseInt(totalQuery.rows[0].count);

    // Generate referral link
    const referralHandle = user.wallet.slice(0, 6).toUpperCase();
    const referralLink = `https://shiftrwa.xyz?ref=${referralHandle}`;

    // Get loyalty points from SNAG
    const loyaltyPoints = await snagSyncService.getUserPoints(wallet).catch(() => 0);

    res.json({
      wallet,
      queuePosition: user.queue_position,
      totalMembers,
      totalXp: parseFloat(user.total_xp || 0),
      loyaltyPoints: loyaltyPoints || 0,
      referralLink,
      registeredAt: user.created_at,
    });
  } catch (error) {
    console.error('[Airdrop] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * GET /api/airdrop/referrals/:wallet
 * Get list of wallets referred by this user
 */
router.get('/referrals/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    // Query for referrals (users who registered via this wallet's link)
    // For now, return empty array (requires referral tracking table)
    // TODO: Implement referral tracking on user signup

    res.json({
      wallet,
      referrals: [],
      totalReferrals: 0,
    });
  } catch (error) {
    console.error('[Airdrop] Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * POST /api/airdrop/register
 * Register new user (creates wallet record)
 */
router.post('/register', async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet' });
    }

    // Insert user if not exists
    await pool.query(
      `INSERT INTO users (wallet, total_xp, created_at, updated_at)
       VALUES ($1, 0, NOW(), NOW())
       ON CONFLICT (wallet) DO NOTHING`,
      [wallet]
    );

    // Return updated user data
    const query = await pool.query(
      `SELECT 
        wallet, created_at, total_xp,
        ROW_NUMBER() OVER (ORDER BY created_at ASC) as queue_position
       FROM users WHERE wallet = $1`,
      [wallet]
    );

    const user = query.rows[0];
    const totalQuery = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalMembers = parseInt(totalQuery.rows[0].count);

    const referralHandle = user.wallet.slice(0, 6).toUpperCase();
    const referralLink = `https://shiftrwa.xyz?ref=${referralHandle}`;

    res.json({
      wallet: user.wallet,
      queuePosition: user.queue_position,
      totalMembers,
      referralLink,
    });
  } catch (error) {
    console.error('[Airdrop] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
