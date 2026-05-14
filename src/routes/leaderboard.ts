import { Router } from 'express';
import { query } from '../db/pool';

const router = Router();

// Get global leaderboard (mocking SNAG for now)
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const rows = await query(
      `SELECT u.wallet, u.total_xp, u.claim_multiplier,
              COUNT(b.id) as badge_count
       FROM users u
       LEFT JOIN badges b ON u.wallet = b.wallet
       GROUP BY u.wallet, u.total_xp, u.claim_multiplier
       ORDER BY u.total_xp DESC
       LIMIT $1`,
      [limit]
    );

    const leaderboard = rows.map((row: any, index: number) => ({
      rank: index + 1,
      wallet: row.wallet,
      totalXP: Number(row.total_xp),
      multiplier: Number(row.claim_multiplier),
      badgeCount: Number(row.badge_count),
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('[API] Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
