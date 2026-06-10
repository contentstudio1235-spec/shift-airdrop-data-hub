/**
 * Referral API Routes
 * Endpoints:
 *   GET  /api/referral/:wallet                  - Get referral dashboard
 *   GET  /api/referral/:wallet/referred         - Get list of referred wallets
 *   POST /api/referral/:wallet/claim-legacy     - Claim pending legacy balance
 *   GET  /api/leaderboard?sort=<type>&limit=<n>- Get leaderboard by sort type
 */

import { Router, Request, Response } from 'express';
import { referralCommissionService } from '../services/referralCommissionService';
import { userPointsService } from '../services/userPointsService';
import { leaderboardCacheService } from '../services/leaderboardCacheService';
import { queryOne, query } from '../db/pool';

const router = Router();

// ── GET /api/referral/:wallet ──────────────────────────────
// Returns referral dashboard: stats, pending balance, referred users summary
router.get('/:wallet', async (req: Request, res: Response) => {
  const wallet = String(req.params.wallet);

  try {
    // Get referral stats
    const stats = await referralCommissionService.getReferralStats(wallet);

    // Get pending legacy balance
    const legacy = await referralCommissionService.getPendingBalance(wallet);

    // Get total commission earned — split by type
    const totalEarned = await referralCommissionService.getTotalCommissionEarned(wallet);

    // Monthly cap progress (applies to position referral SP only)
    const monthYear = new Date().toISOString().slice(0, 7);
    const monthCapResult = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(total_awarded), 0) as total FROM referral_monthly_caps
       WHERE referrer_wallet = $1 AND month_year = $2`,
      [wallet, monthYear]
    );
    const monthlyEarned = monthCapResult?.total ?? 0;

    res.json({
      wallet,
      stats,
      legacy: {
        pending: legacy.pending,
        claimed: legacy.claimed,
      },
      commission: {
        // Position referral: 10-15% of referred wallets' Position SP (on top of 2X)
        positionReferralSp: totalEarned.position,
        positionReferralMultiplier: '1.0x',
        positionMonthlyProgress: {
          earned: monthlyEarned,
          cap: 500,
          percentage: Math.min((monthlyEarned / 500) * 100, 100),
        },
        // Social referral: flat 5% of referred wallets' Social SP (0.5x modifier)
        socialReferralSp: totalEarned.social,
        socialReferralMultiplier: '0.5x',
        socialReferralRate: '5%',
        // Combined totals
        totalEarned: totalEarned.total,
      },
    });
  } catch (error) {
    console.error('[API] Referral dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/referral/:wallet/referred ──────────────────────
// Returns list of all referred wallets with their stats and commission tier
router.get('/:wallet/referred', async (req: Request, res: Response) => {
  const wallet = String(req.params.wallet);

  try {
    const monthYear = new Date().toISOString().slice(0, 7);
    const referredRows = await query<any>(
      `SELECT
         u.wallet,
         u.total_xp,
         u.referral_commission_sp,
         (SELECT COUNT(*) FROM positions WHERE wallet = u.wallet AND status = 'open') as open_positions,
         (SELECT SUM(position_size_usd) FROM positions WHERE wallet = u.wallet AND status != 'filtered') as total_volume,
         (SELECT SUM(position_size_usd) FROM positions WHERE wallet = u.wallet AND status = 'open') as current_holding,
         (SELECT SUM(sp_awarded) FROM referral_commissions WHERE referrer_wallet = $1 AND referred_wallet = u.wallet) as commission_earned,
         (SELECT SUM(total_awarded) FROM referral_monthly_caps WHERE referrer_wallet = $1 AND referred_wallet = u.wallet AND month_year = $2) as month_earned
       FROM users u
       WHERE u.referred_by_wallet = $1
       ORDER BY u.total_xp DESC`,
      [wallet, monthYear]
    );

    // Determine tier for each referred wallet
    const referred = await Promise.all(
      referredRows.map(async (row) => {
        const tier = await referralCommissionService.getTierForWallet(row.wallet);
        return {
          wallet: row.wallet,
          status: row.open_positions > 0 ? 'active' : 'inactive',
          positionsOpen: row.open_positions,
          totalVolume: parseFloat(row.total_volume || 0),
          currentHolding: parseFloat(row.current_holding || 0),
          totalXp: parseFloat(row.total_xp),
          commissionTier: `${tier}%`,
          commissionEarned: parseFloat(row.commission_earned || 0),
          monthlyEarned: parseFloat(row.month_earned || 0),
        };
      })
    );

    res.json({
      wallet,
      referredCount: referred.length,
      referred,
    });
  } catch (error) {
    console.error('[API] Referred users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/referral/:wallet/claim-legacy ────────────────
// Claims pending legacy balance and adds to total XP
router.post('/:wallet/claim-legacy', async (req: Request, res: Response) => {
  const wallet = String(req.params.wallet);

  try {
    const claimedAmount = await referralCommissionService.claimLegacyBalance(wallet);

    res.json({
      success: true,
      claimedAmount,
      message: `Claimed ${claimedAmount} Position SP. Your leaderboard rank is updating.`,
    });
  } catch (error: any) {
    console.error('[API] Claim legacy error:', error);
    res.status(400).json({ error: error.message || 'Failed to claim balance' });
  }
});

// ── GET /api/leaderboard ──────────────────────────────────
// Get leaderboard with 4 sort options
router.get('/', async (req: Request, res: Response) => {
  const sortParam = typeof req.query.sort === 'string' ? req.query.sort : 'final_points';
  const limitParam = typeof req.query.limit === 'string' ? req.query.limit : '100';
  const limitNum = Math.min(parseInt(limitParam) || 100, 500);

  try {
    let leaderboard;

    switch (sortParam) {
      case 'referral_count':
        leaderboard = await leaderboardCacheService.getTopByReferralCount(limitNum);
        break;
      case 'referred_volume':
        leaderboard = await leaderboardCacheService.getTopByReferredVolume(limitNum);
        break;
      case 'referred_holding':
        leaderboard = await leaderboardCacheService.getTopByReferredHolding(limitNum);
        break;
      case 'final_points':
      default:
        leaderboard = await leaderboardCacheService.getTopByFinalPoints(limitNum);
    }

    // Enrich with referral stats for each user
    const enriched = await Promise.all(
      leaderboard.map(async (entry) => {
        const stats = await referralCommissionService.getReferralStats(entry.wallet);
        return {
          ...entry,
          referredCount: stats.referralCount,
          referredVolume: stats.totalVolume,
          referredHolding: stats.totalHolding,
        };
      })
    );

    res.json({
      sort: sortParam,
      limit: limitNum,
      count: enriched.length,
      leaderboard: enriched,
    });
  } catch (error) {
    console.error('[API] Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
