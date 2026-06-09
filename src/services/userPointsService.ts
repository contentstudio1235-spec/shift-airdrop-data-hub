/**
 * User Points Service
 * Calculates weighted final points for leaderboard:
 *   Final Points = (Position SP × 2.0) + (Social SP × 1.0) + (Referral SP × 0.5)
 */

import { pool, queryOne } from '../db/pool';

export interface UserPoints {
  wallet: string;
  positionSp: number;
  socialSp: number;
  referralSp: number;
  finalPoints: number;
}

export class UserPointsService {
  private static readonly POSITION_MULTIPLIER = 2.0;
  private static readonly SOCIAL_MULTIPLIER = 1.0;
  private static readonly REFERRAL_MULTIPLIER = 0.5;

  /**
   * Calculate final weighted points for a single wallet
   */
  async calculateFinalPoints(wallet: string): Promise<UserPoints> {
    // Fetch all SP components
    const result = await queryOne<{
      total_xp: number;
      referral_commission_sp: number;
    }>(
      `SELECT
         total_xp,
         COALESCE(referral_commission_sp, 0) as referral_commission_sp
       FROM users
       WHERE wallet = $1`,
      [wallet]
    );

    if (!result) {
      return {
        wallet,
        positionSp: 0,
        socialSp: 0,
        referralSp: 0,
        finalPoints: 0,
      };
    }

    // Assume total_xp includes position SP + social SP + badge XP
    // For now, we separate using heuristic:
    // - Position SP = earned from positions + badges (majority)
    // - Social SP = from Snag tasks (tracked separately in future)
    // - Referral SP = from referral_commission_sp (explicit)

    const referralSp = result.referral_commission_sp;
    const positionAndSocialSp = result.total_xp;

    // Simple split: assume 80% position, 20% social (can be refined)
    const positionSp = positionAndSocialSp * 0.8;
    const socialSp = positionAndSocialSp * 0.2;

    // Calculate final points
    const finalPoints =
      positionSp * UserPointsService.POSITION_MULTIPLIER +
      socialSp * UserPointsService.SOCIAL_MULTIPLIER +
      referralSp * UserPointsService.REFERRAL_MULTIPLIER;

    return {
      wallet,
      positionSp: Math.floor(positionSp),
      socialSp: Math.floor(socialSp),
      referralSp: Math.floor(referralSp),
      finalPoints: Math.floor(finalPoints),
    };
  }

  /**
   * Calculate final points for all active users
   * Returns sorted by finalPoints DESC
   */
  async calculateAllFinalPoints(limit: number = 10000): Promise<UserPoints[]> {
    const results = await pool.query(
      `SELECT
         wallet,
         total_xp,
         COALESCE(referral_commission_sp, 0) as referral_commission_sp
       FROM users
       WHERE total_xp > 0 OR referral_commission_sp > 0
       ORDER BY total_xp DESC
       LIMIT $1`,
      [limit]
    );

    const points: UserPoints[] = results.rows.map(row => {
      const referralSp = row.referral_commission_sp;
      const positionAndSocialSp = row.total_xp;

      const positionSp = positionAndSocialSp * 0.8;
      const socialSp = positionAndSocialSp * 0.2;

      const finalPoints =
        positionSp * UserPointsService.POSITION_MULTIPLIER +
        socialSp * UserPointsService.SOCIAL_MULTIPLIER +
        referralSp * UserPointsService.REFERRAL_MULTIPLIER;

      return {
        wallet: row.wallet,
        positionSp: Math.floor(positionSp),
        socialSp: Math.floor(socialSp),
        referralSp: Math.floor(referralSp),
        finalPoints: Math.floor(finalPoints),
      };
    });

    // Sort by final points descending
    return points.sort((a, b) => b.finalPoints - a.finalPoints);
  }

  /**
   * Get ranking for a specific wallet
   */
  async getRankByFinalPoints(wallet: string): Promise<number> {
    const result = await queryOne<{ rank: number }>(
      `WITH ranked AS (
         SELECT
           wallet,
           ROW_NUMBER() OVER (
             ORDER BY
               (total_xp * 0.8 * 2.0) +
               (total_xp * 0.2 * 1.0) +
               (COALESCE(referral_commission_sp, 0) * 0.5)
               DESC
           ) as rank
         FROM users
         WHERE total_xp > 0 OR referral_commission_sp > 0
       )
       SELECT rank FROM ranked WHERE wallet = $1`,
      [wallet]
    );

    return result?.rank ?? 0;
  }

  /**
   * Get top N users by final points
   */
  async getTopByFinalPoints(limit: number = 100): Promise<(UserPoints & { rank: number })[]> {
    const results = await pool.query(
      `WITH ranked AS (
         SELECT
           wallet,
           total_xp,
           COALESCE(referral_commission_sp, 0) as referral_commission_sp,
           (total_xp * 0.8 * 2.0) +
           (total_xp * 0.2 * 1.0) +
           (COALESCE(referral_commission_sp, 0) * 0.5) as final_points,
           ROW_NUMBER() OVER (
             ORDER BY
               (total_xp * 0.8 * 2.0) +
               (total_xp * 0.2 * 1.0) +
               (COALESCE(referral_commission_sp, 0) * 0.5)
               DESC
           ) as rank
         FROM users
         WHERE total_xp > 0 OR referral_commission_sp > 0
       )
       SELECT * FROM ranked LIMIT $1`,
      [limit]
    );

    return results.rows.map(row => ({
      wallet: row.wallet,
      positionSp: Math.floor(row.total_xp * 0.8),
      socialSp: Math.floor(row.total_xp * 0.2),
      referralSp: Math.floor(row.referral_commission_sp),
      finalPoints: Math.floor(row.final_points),
      rank: row.rank,
    }));
  }
}

export const userPointsService = new UserPointsService();
