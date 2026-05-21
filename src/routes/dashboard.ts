import { Router } from 'express';
import { queryOne, query } from '../db/pool';
import { snagSyncService } from '../services/snagSyncService';
import { dailyCheckinService } from '../services/dailyCheckinService';
import { leaderboardService } from '../services/leaderboardService';
import { getUserLevelInfo } from '../utils/levelSystem';

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

// Daily checkin — process daily streak
router.post('/:wallet/checkin', async (req, res) => {
  const { wallet } = req.params;

  try {
    const result = await dailyCheckinService.processDailyCheckin(wallet);
    res.json({
      wallet,
      streakCount: result.streakCount,
      xpAwarded: result.xpAwarded,
      isNewStreak: result.isNewStreak,
      message: `+${result.xpAwarded} XP! ${result.streakCount} day streak 🔥`
    });
  } catch (error) {
    console.error('[API] Daily checkin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's streak info
router.get('/:wallet/streak', async (req, res) => {
  const { wallet } = req.params;

  try {
    const streakInfo = await dailyCheckinService.getStreakInfo(wallet);
    res.json(streakInfo);
  } catch (error) {
    console.error('[API] Streak info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top 100 leaderboard
router.get('/leaderboard/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await leaderboardService.getTopLeaderboard(limit);
    res.json({
      count: leaderboard.length,
      entries: leaderboard
    });
  } catch (error) {
    console.error('[API] Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rank and percentile
router.get('/:wallet/rank', async (req, res) => {
  const { wallet } = req.params;

  try {
    const position = await leaderboardService.getUserRank(wallet);
    if (!position) {
      return res.status(404).json({ error: 'User not found on leaderboard' });
    }
    res.json(position);
  } catch (error) {
    console.error('[API] User rank error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard around user (context window)
router.get('/:wallet/leaderboard-context', async (req, res) => {
  const { wallet } = req.params;
  const context = parseInt(req.query.context as string) || 5;

  try {
    const entries = await leaderboardService.getLeaderboardAround(wallet, context);
    res.json({
      count: entries.length,
      entries
    });
  } catch (error) {
    console.error('[API] Leaderboard context error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user level info
router.get('/:wallet/level', async (req, res) => {
  const { wallet } = req.params;

  try {
    const user = await queryOne(
      'SELECT total_xp FROM users WHERE wallet = $1',
      [wallet]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const levelInfo = getUserLevelInfo(Number(user.total_xp));
    res.json(levelInfo);
  } catch (error) {
    console.error('[API] Level info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
