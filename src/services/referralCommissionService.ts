/**
 * Referral Commission Service
 * Handles all referral commission logic:
 *   - Tier evaluation (10%, 12%, 15% based on SP thresholds)
 *   - Commission calculation and award
 *   - Monthly cap enforcement
 *   - Legacy balance management
 */

import { pool, queryOne, execute, query } from '../db/pool';

export class ReferralCommissionService {
  // ── Tier thresholds ──
  private static readonly TIER_THRESHOLDS = {
    tier1: { min: 0, max: 999, rate: 10.0 },
    tier2: { min: 1000, max: 9999, rate: 12.0 },
    tier3: { min: 10000, max: Infinity, rate: 15.0 },
  };

  private static readonly MONTHLY_CAP_SP = 500;

  /**
   * Get commission tier for a referred wallet based on their total Position SP
   * Returns: 10%, 12%, or 15%
   */
  async getTierForWallet(referredWallet: string): Promise<number> {
    const result = await queryOne<{ referral_commission_sp: number }>(
      `SELECT COALESCE(referral_commission_sp, 0) as referral_commission_sp FROM users WHERE wallet = $1`,
      [referredWallet]
    );

    const totalSp = result?.referral_commission_sp ?? 0;

    if (totalSp < ReferralCommissionService.TIER_THRESHOLDS.tier1.max + 1) {
      return ReferralCommissionService.TIER_THRESHOLDS.tier1.rate;
    } else if (totalSp < ReferralCommissionService.TIER_THRESHOLDS.tier2.max + 1) {
      return ReferralCommissionService.TIER_THRESHOLDS.tier2.rate;
    } else {
      return ReferralCommissionService.TIER_THRESHOLDS.tier3.rate;
    }
  }

  /**
   * Calculate and award commission for a referred wallet earning new SP
   * Called by XP cron after position SP is calculated
   */
  async calculateAndAwardCommission(referredWallet: string, newSpEarned: number): Promise<void> {
    // Get referrer wallet
    const referred = await queryOne<{ referred_by_wallet: string }>(
      `SELECT referred_by_wallet FROM users WHERE wallet = $1`,
      [referredWallet]
    );

    if (!referred?.referred_by_wallet) {
      // Not a referred wallet, no commission
      return;
    }

    const referrerWallet = referred.referred_by_wallet;

    // Get current tier for referred wallet
    const commissionRate = await this.getTierForWallet(referredWallet);

    // Calculate commission on new SP earned
    const commission = (newSpEarned * commissionRate) / 100;

    if (commission <= 0) return;

    // Check monthly cap
    const monthYear = this.getCurrentMonthYear();
    const capCheck = await queryOne<{ total_awarded: number }>(
      `SELECT COALESCE(total_awarded, 0) as total_awarded FROM referral_monthly_caps
       WHERE referrer_wallet = $1 AND referred_wallet = $2 AND month_year = $3`,
      [referrerWallet, referredWallet, monthYear]
    );

    const alreadyAwarded = capCheck?.total_awarded ?? 0;
    const available = ReferralCommissionService.MONTHLY_CAP_SP - alreadyAwarded;

    if (available <= 0) {
      // Cap reached for this month
      return;
    }

    const commissionToAward = Math.min(commission, available);

    // Award commission
    await execute(
      `INSERT INTO referral_commissions (referrer_wallet, referred_wallet, commission_rate, sp_awarded, source_sp, month_year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [referrerWallet, referredWallet, commissionRate, commissionToAward, newSpEarned, monthYear]
    );

    // Update monthly cap
    await execute(
      `INSERT INTO referral_monthly_caps (referrer_wallet, referred_wallet, month_year, total_awarded)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (referrer_wallet, referred_wallet, month_year) DO UPDATE
       SET total_awarded = total_awarded + $4`,
      [referrerWallet, referredWallet, monthYear, commissionToAward]
    );

    // Add to referrer's total
    await execute(
      `UPDATE users SET referral_commission_sp = referral_commission_sp + $1 WHERE wallet = $2`,
      [commissionToAward, referrerWallet]
    );

    console.log(`[Commission] Awarded ${commissionToAward} SP to ${referrerWallet} (from ${referredWallet}, tier ${commissionRate}%)`);
  }

  /**
   * Reset monthly caps at start of new month
   * Should be called 1st of month at 00:00 UTC
   */
  async resetMonthlyCaps(): Promise<number> {
    const result = await execute(
      `DELETE FROM referral_monthly_caps WHERE month_year < $1`,
      [this.getCurrentMonthYear()]
    );

    const deleted = (result as any)?.rowCount ?? 0;
    console.log(`[Commission] Reset monthly caps: deleted ${deleted} old cap records`);
    return deleted;
  }

  /**
   * Get total referral commission SP earned by a wallet
   */
  async getTotalCommissionEarned(referrerWallet: string): Promise<number> {
    const result = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(sp_awarded), 0) as total FROM referral_commissions WHERE referrer_wallet = $1`,
      [referrerWallet]
    );
    return result?.total ?? 0;
  }

  /**
   * Get referral stats (count, volume, holding) for leaderboard
   */
  async getReferralStats(referrerWallet: string): Promise<{
    referralCount: number;
    totalVolume: number;
    totalHolding: number;
  }> {
    const result = await queryOne<any>(
      `SELECT
         COUNT(DISTINCT u.wallet) as referral_count,
         COALESCE(SUM(p.position_size_usd), 0) as total_volume,
         0 as total_holding
       FROM users u
       LEFT JOIN positions p ON u.wallet = p.wallet AND p.status = 'open'
       WHERE u.referred_by_wallet = $1`,
      [referrerWallet]
    );

    return {
      referralCount: result?.referral_count ?? 0,
      totalVolume: result?.total_volume ?? 0,
      totalHolding: result?.total_holding ?? 0,
    };
  }

  /**
   * Claim legacy pending balance
   * Moves pending_sp to referrer's total_xp
   */
  async claimLegacyBalance(referrerWallet: string): Promise<number> {
    const balance = await queryOne<{ pending_sp: number }>(
      `SELECT pending_sp FROM referral_legacy_balance WHERE referrer_wallet = $1 AND claimed = false`,
      [referrerWallet]
    );

    if (!balance || balance.pending_sp <= 0) {
      throw new Error('No pending balance to claim');
    }

    const claimAmount = balance.pending_sp;

    // Add to total_xp
    await execute(
      `UPDATE users SET total_xp = total_xp + $1 WHERE wallet = $2`,
      [claimAmount, referrerWallet]
    );

    // Mark as claimed
    await execute(
      `UPDATE referral_legacy_balance SET claimed = true, claimed_at = NOW(), claim_method = 'manual' WHERE referrer_wallet = $1`,
      [referrerWallet]
    );

    console.log(`[Legacy] ${referrerWallet} claimed ${claimAmount} Position SP`);
    return claimAmount;
  }

  /**
   * Get pending legacy balance for a wallet
   */
  async getPendingBalance(referrerWallet: string): Promise<{ pending: number; claimed: boolean }> {
    const result = await queryOne<{ pending_sp: number; claimed: boolean }>(
      `SELECT pending_sp, claimed FROM referral_legacy_balance WHERE referrer_wallet = $1`,
      [referrerWallet]
    );

    return {
      pending: result?.pending_sp ?? 0,
      claimed: result?.claimed ?? false,
    };
  }

  /**
   * Helper: Get current month in YYYY-MM format
   */
  private getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}

export const referralCommissionService = new ReferralCommissionService();
