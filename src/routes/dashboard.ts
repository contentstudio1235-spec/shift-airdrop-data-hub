import { Router } from 'express';
import { queryOne, query } from '../db/pool';
import { snagSyncService } from '../services/snagSyncService';

const router = Router();

// Get dashboard summary for a specific wallet
router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    // 1. Get user stats & SNAG points in parallel
    const [user, loyaltyPoints] = await Promise.all([
      queryOne(
        'SELECT total_xp, claim_multiplier, current_streak FROM users WHERE wallet = $1',
        [wallet]
      ),
      snagSyncService.getUserPoints(wallet)
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Get local rank
    const rankResult = await queryOne(
      'SELECT COUNT(*) + 1 as rank FROM users WHERE total_xp > $1',
      [user.total_xp]
    );

    // 3. Get active positions count
    const positionsResult = await queryOne(
      `SELECT COUNT(*) as count FROM positions WHERE wallet = $1 AND status IN ('open', 'active')`,
      [wallet]
    );

    res.json({
      wallet,
      totalXp: Number(user.total_xp),
      loyaltyPoints: Number(loyaltyPoints),
      claimMultiplier: Number(user.claim_multiplier),
      currentStreak: user.current_streak,
      rank: parseInt(rankResult?.rank || '0', 10),
      activePositions: parseInt(positionsResult?.count || '0', 10),
      projectedAllocation: 'TBD'
    });
  } catch (error) {
    console.error('[API] Dashboard fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
