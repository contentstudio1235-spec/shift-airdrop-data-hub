import { Router } from 'express';
import { query } from '../db/pool';

const router = Router();

// Get global leaderboard — combined score: position SP + social/referral SP
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const rows = await query(
      `SELECT u.wallet,
              u.total_xp,
              COALESCE(u.snag_points, 0) as snag_total,
              COALESCE(s.last_synced_xp, 0) as last_synced_xp,
              u.claim_multiplier,
              COUNT(b.id) as badge_count
       FROM users u
       LEFT JOIN badges b ON u.wallet = b.wallet
       LEFT JOIN xp_sync_log s ON u.wallet = s.wallet
       GROUP BY u.wallet, u.total_xp, u.snag_points, s.last_synced_xp, u.claim_multiplier
       ORDER BY (u.total_xp + GREATEST(0, COALESCE(u.snag_points, 0) - COALESCE(s.last_synced_xp, 0))) DESC
       LIMIT $1`,
      [limit]
    );

    const leaderboard = rows.map((row: any, index: number) => {
      const positionSp = Number(row.total_xp);
      const snagTotal  = Number(row.snag_total);
      const lastSynced = Number(row.last_synced_xp);
      const socialSp   = Math.max(0, snagTotal - lastSynced);
      const totalSp    = positionSp + socialSp;

      return {
        rank: index + 1,
        wallet: row.wallet,
        totalSp,          // combined score (main display)
        positionSp,       // from holding SHIFT positions
        socialSp,         // from SNAG tasks + referrals
        // Legacy
        totalXP: positionSp,
        multiplier: Number(row.claim_multiplier),
        badgeCount: Number(row.badge_count),
      };
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error('[API] Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
