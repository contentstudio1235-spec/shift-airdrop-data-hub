/**
 * Referral Tracking Service
 * Tracks referral earnings and provides referral analytics
 */

import { pool, queryOne } from '../db/pool';

export interface ReferralEntry {
  referredWallet: string;
  referrerWallet: string | null;
  codeUsed: string | null;
  referredAt: Date;
  xpAwarded: number;
  bonusMultiplier: number;
  bonusType: 'none' | 'dynamic' | 'permanent';
  bonusApplied: boolean;
}

export interface ReferrerStats {
  totalReferred: number;
  totalXpEarned: number;
  activeReferrals: number;
  bonusXpAvailable: number;
}

export class ReferralTrackingService {
  /**
   * Get referrer's referral stats
   */
  async getReferrerStats(wallet: string): Promise<ReferrerStats> {
    try {
      const result = await queryOne(
        `SELECT
           COUNT(*) as total_referred,
           COALESCE(SUM(xp_awarded), 0) as total_xp_earned,
           COUNT(CASE WHEN bonus_applied = false THEN 1 END) as bonus_available
         FROM referrals
         WHERE referrer_wallet = $1`,
        [wallet]
      );

      const total = parseInt(result?.total_referred || '0', 10);
      const totalXp = parseInt(result?.total_xp_earned || '0', 10);
      const bonusAvailable = parseInt(result?.bonus_available || '0', 10);

      // Get active referrals (referred user still has XP)
      const activeResult = await queryOne(
        `SELECT COUNT(*) as active_count
         FROM referrals r
         JOIN users u ON r.referred_wallet = u.wallet
         WHERE r.referrer_wallet = $1 AND u.total_xp > 0`,
        [wallet]
      );

      const active = parseInt(activeResult?.active_count || '0', 10);

      return {
        totalReferred: total,
        totalXpEarned: totalXp,
        activeReferrals: active,
        bonusXpAvailable: bonusAvailable * 250, // Estimate: 250 XP per pending bonus
      };
    } catch (error) {
      console.error('[ReferralTracking] Error fetching referrer stats:', error);
      return {
        totalReferred: 0,
        totalXpEarned: 0,
        activeReferrals: 0,
        bonusXpAvailable: 0,
      };
    }
  }

  /**
   * Get list of users referred by a wallet
   */
  async getReferredUsers(wallet: string, limit: number = 20): Promise<ReferralEntry[]> {
    try {
      const result = await pool.query(
        `SELECT
           r.referred_wallet,
           r.referrer_wallet,
           r.code_used,
           r.referred_at,
           COALESCE(r.xp_awarded, 0) as xp_awarded,
           COALESCE(r.bonus_multiplier, 1.0) as bonus_multiplier,
           COALESCE(r.bonus_type, 'none') as bonus_type,
           COALESCE(r.bonus_applied, false) as bonus_applied
         FROM referrals r
         WHERE r.referrer_wallet = $1
         ORDER BY r.referred_at DESC
         LIMIT $2`,
        [wallet, limit]
      );

      return result.rows.map(row => ({
        referredWallet: row.referred_wallet,
        referrerWallet: row.referrer_wallet,
        codeUsed: row.code_used,
        referredAt: new Date(row.referred_at),
        xpAwarded: parseInt(row.xp_awarded, 10),
        bonusMultiplier: parseFloat(row.bonus_multiplier),
        bonusType: row.bonus_type,
        bonusApplied: row.bonus_applied,
      }));
    } catch (error) {
      console.error('[ReferralTracking] Error fetching referred users:', error);
      return [];
    }
  }

  /**
   * Get referrer info for a user
   */
  async getMyReferrer(wallet: string): Promise<{
    referrerWallet: string | null;
    code: string | null;
    xpFromReferral: number;
  } | null> {
    try {
      const result = await queryOne(
        `SELECT
           r.referrer_wallet,
           r.code_used,
           COALESCE(u.invite_bonus_xp, 0) as xp_from_referral
         FROM referrals r
         LEFT JOIN users u ON r.referred_wallet = u.wallet
         WHERE r.referred_wallet = $1`,
        [wallet]
      );

      if (!result) {
        return null;
      }

      return {
        referrerWallet: result.referrer_wallet,
        code: result.code_used,
        xpFromReferral: parseInt(result.xp_from_referral, 10),
      };
    } catch (error) {
      console.error('[ReferralTracking] Error fetching referrer:', error);
      return null;
    }
  }

  /**
   * Get referral leaderboard (by referral count)
   */
  async getReferralLeaderboard(limit: number = 50): Promise<Array<{
    wallet: string;
    referralCount: number;
    xpEarned: number;
  }>> {
    try {
      const result = await pool.query(
        `SELECT
           r.referrer_wallet,
           COUNT(*) as referral_count,
           COALESCE(SUM(r.xp_awarded), 0) as total_xp
         FROM referrals r
         WHERE r.referrer_wallet IS NOT NULL
         GROUP BY r.referrer_wallet
         ORDER BY referral_count DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        wallet: row.referrer_wallet,
        referralCount: parseInt(row.referral_count, 10),
        xpEarned: parseInt(row.total_xp, 10),
      }));
    } catch (error) {
      console.error('[ReferralTracking] Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Calculate total network XP (referrer + all referrals' XP)
   */
  async getNetworkXp(wallet: string): Promise<{
    myXp: number;
    networkXp: number;
    referralXp: number;
  }> {
    try {
      // My XP
      const myResult = await queryOne(
        `SELECT total_xp FROM users WHERE wallet = $1`,
        [wallet]
      );
      const myXp = parseInt(myResult?.total_xp || '0', 10);

      // Referral XP sum
      const refResult = await queryOne(
        `SELECT COALESCE(SUM(u.total_xp), 0) as total
         FROM referrals r
         JOIN users u ON r.referred_wallet = u.wallet
         WHERE r.referrer_wallet = $1`,
        [wallet]
      );
      const referralXp = parseInt(refResult?.total, 10);

      return {
        myXp,
        networkXp: myXp + referralXp,
        referralXp,
      };
    } catch (error) {
      console.error('[ReferralTracking] Error calculating network XP:', error);
      return { myXp: 0, networkXp: 0, referralXp: 0 };
    }
  }
}

export const referralTrackingService = new ReferralTrackingService();
