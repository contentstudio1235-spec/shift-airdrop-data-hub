/**
 * User Points Service
 *
 * Final SP formula:
 *   Final = (Position SP × 2.0)
 *         + (Social SP × 1.0)
 *         + (Referral Position SP × 1.0)   ← 10-15% of referred's Position SP, on top of their 2X
 *
 * Where:
 *   Position SP          = total_xp              (holding positions; 2X already baked in via XP formula)
 *   Social SP            = snag_points            (Snag task completions — includes Snag's own referral
 *                                                  rewards that Snag auto-awards to referrers)
 *   Referral Position SP = referral_position_sp   (10–15% of referred wallets' position SP)
 *
 * Social Referral SP is NOT calculated here. Snag handles it on their end and it
 * flows back into snag_points via the normal Snag sync. No double-counting.
 */

import { pool, queryOne } from '../db/pool';

export interface UserPoints {
  wallet: string;
  positionSp: number;
  socialSp: number;
  referralPositionSp: number;
  finalPoints: number;
}

export class UserPointsService {
  private static readonly POSITION_MULTIPLIER          = 2.0;
  private static readonly SOCIAL_MULTIPLIER            = 1.0;
  private static readonly REFERRAL_POSITION_MULTIPLIER = 1.0;

  async calculateFinalPoints(wallet: string): Promise<UserPoints> {
    const row = await queryOne<{
      total_xp: number;
      snag_points: number;
      referral_position_sp: number;
    }>(
      `SELECT
         COALESCE(total_xp, 0)             as total_xp,
         COALESCE(snag_points, 0)          as snag_points,
         COALESCE(referral_position_sp, 0) as referral_position_sp
       FROM users WHERE wallet = $1`,
      [wallet]
    );

    if (!row) return { wallet, positionSp: 0, socialSp: 0, referralPositionSp: 0, finalPoints: 0 };

    const finalPoints =
      Number(row.total_xp)             * UserPointsService.POSITION_MULTIPLIER +
      Number(row.snag_points)          * UserPointsService.SOCIAL_MULTIPLIER +
      Number(row.referral_position_sp) * UserPointsService.REFERRAL_POSITION_MULTIPLIER;

    return {
      wallet,
      positionSp:         Math.floor(Number(row.total_xp)),
      socialSp:           Math.floor(Number(row.snag_points)),
      referralPositionSp: Math.floor(Number(row.referral_position_sp)),
      finalPoints:        Math.floor(finalPoints),
    };
  }

  async calculateAllFinalPoints(limit: number = 10000): Promise<UserPoints[]> {
    const results = await pool.query(
      `SELECT
         wallet,
         COALESCE(total_xp, 0)             as total_xp,
         COALESCE(snag_points, 0)          as snag_points,
         COALESCE(referral_position_sp, 0) as referral_position_sp,
         (COALESCE(total_xp, 0) * 2.0)
           + (COALESCE(snag_points, 0) * 1.0)
           + (COALESCE(referral_position_sp, 0) * 1.0) as final_points
       FROM users
       WHERE total_xp > 0 OR snag_points > 0 OR referral_position_sp > 0
       ORDER BY final_points DESC
       LIMIT $1`,
      [limit]
    );

    return results.rows.map(row => ({
      wallet:             row.wallet,
      positionSp:         Math.floor(Number(row.total_xp)),
      socialSp:           Math.floor(Number(row.snag_points)),
      referralPositionSp: Math.floor(Number(row.referral_position_sp)),
      finalPoints:        Math.floor(Number(row.final_points)),
    }));
  }

  async getRankByFinalPoints(wallet: string): Promise<number> {
    const result = await queryOne<{ rank: number }>(
      `WITH ranked AS (
         SELECT wallet,
           ROW_NUMBER() OVER (ORDER BY
             (COALESCE(total_xp, 0) * 2.0)
             + (COALESCE(snag_points, 0) * 1.0)
             + (COALESCE(referral_position_sp, 0) * 1.0)
           DESC) as rank
         FROM users
         WHERE total_xp > 0 OR snag_points > 0 OR referral_position_sp > 0
       )
       SELECT rank FROM ranked WHERE wallet = $1`,
      [wallet]
    );
    return result?.rank ?? 0;
  }

  async getTopByFinalPoints(limit: number = 100): Promise<(UserPoints & { rank: number })[]> {
    const results = await pool.query(
      `WITH ranked AS (
         SELECT
           wallet,
           COALESCE(total_xp, 0)             as total_xp,
           COALESCE(snag_points, 0)          as snag_points,
           COALESCE(referral_position_sp, 0) as referral_position_sp,
           (COALESCE(total_xp, 0) * 2.0)
             + (COALESCE(snag_points, 0) * 1.0)
             + (COALESCE(referral_position_sp, 0) * 1.0) as final_points,
           ROW_NUMBER() OVER (ORDER BY
             (COALESCE(total_xp, 0) * 2.0)
             + (COALESCE(snag_points, 0) * 1.0)
             + (COALESCE(referral_position_sp, 0) * 1.0)
           DESC) as rank
         FROM users
         WHERE total_xp > 0 OR snag_points > 0 OR referral_position_sp > 0
       )
       SELECT * FROM ranked LIMIT $1`,
      [limit]
    );

    return results.rows.map(row => ({
      wallet:             row.wallet,
      positionSp:         Math.floor(Number(row.total_xp)),
      socialSp:           Math.floor(Number(row.snag_points)),
      referralPositionSp: Math.floor(Number(row.referral_position_sp)),
      finalPoints:        Math.floor(Number(row.final_points)),
      rank:               Number(row.rank),
    }));
  }
}

export const userPointsService = new UserPointsService();
