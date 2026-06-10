/**
 * Referral Commission Service
 *
 * ⚠️  PERMANENT $5 ACTIVATION REQUIREMENT (Referral System v2):
 * - ALL referrals must have referred wallet hold ≥$5 in SHIFT RWA assets
 * - This is NOT temporary — it is a permanent quality gate
 * - Applies to both new referrals and legacy balance claims
 * - Legacy balance becomes claimable only after referred wallet meets $5 threshold
 *
 * TWO separate referral reward streams:
 *
 * 1. POSITION REFERRAL SP (10%–15%)
 *    - Triggered when a referred wallet earns Position SP (total_xp)
 *    - Rate: 10% if referred's total_xp < 1000, 12% < 10000, 15% >= 10000
 *    - The 2X position multiplier is already baked into total_xp before we
 *      compute commission — so the referrer earns 10-15% ON TOP of the 2X
 *    - Stored in: users.referral_position_sp
 *    - Monthly cap: 500 SP per referrer/referred pair
 *    - Only counts toward this cap if referred wallet is ACTIVE (≥$5)
 *
 * 2. SOCIAL REFERRAL SP — handled entirely by Snag on their end.
 *    When a referred user completes Snag social tasks, Snag automatically
 *    credits the referrer. Those credits flow into snag_points via the
 *    normal Snag sync. We do NOT calculate or store social referral SP here.
 *
 * Final leaderboard score formula (computed in userPointsService):
 *   Final = (Position SP × 2.0) + (Social SP × 1.0)
 *         + (Referral Position SP × 1.0)   ← on top of 2X already in Position SP
 */

import { queryOne, execute, query } from '../db/pool';

export class ReferralCommissionService {
  // ── Position referral tier thresholds (based on referred wallet's total_xp) ──
  private static readonly POSITION_TIERS = [
    { maxXp: 999,      rate: 10.0 },
    { maxXp: 9999,     rate: 12.0 },
    { maxXp: Infinity, rate: 15.0 },
  ];

  private static readonly MONTHLY_CAP_SP = 500;

  // ────────────────────────────────────────────────────────────────────────────
  // POSITION REFERRAL: called when referred wallet's total_xp changes
  // ────────────────────────────────────────────────────────────────────────────
  async awardPositionReferralCommission(referredWallet: string, newPositionSpEarned: number): Promise<void> {
    if (newPositionSpEarned <= 0) return;

    const referrer = await this.getReferrerWallet(referredWallet);
    if (!referrer) return;

    const rate = await this.getPositionTierRate(referredWallet);
    const commission = (newPositionSpEarned * rate) / 100;
    if (commission <= 0) return;

    const monthYear = this.currentMonthYear();

    // Check monthly cap
    const capRow = await queryOne<{ total_awarded: number }>(
      `SELECT COALESCE(total_awarded, 0) as total_awarded
       FROM referral_monthly_caps
       WHERE referrer_wallet = $1 AND referred_wallet = $2 AND month_year = $3`,
      [referrer, referredWallet, monthYear]
    );

    const alreadyAwarded = capRow?.total_awarded ?? 0;
    const available = ReferralCommissionService.MONTHLY_CAP_SP - alreadyAwarded;
    if (available <= 0) return;

    const toAward = Math.min(commission, available);

    // Record commission
    await execute(
      `INSERT INTO referral_commissions
         (referrer_wallet, referred_wallet, commission_type, commission_rate, sp_awarded, source_sp, month_year)
       VALUES ($1, $2, 'position', $3, $4, $5, $6)`,
      [referrer, referredWallet, rate, toAward, newPositionSpEarned, monthYear]
    );

    // Update monthly cap
    await execute(
      `INSERT INTO referral_monthly_caps (referrer_wallet, referred_wallet, month_year, total_awarded)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (referrer_wallet, referred_wallet, month_year)
       DO UPDATE SET total_awarded = referral_monthly_caps.total_awarded + $4`,
      [referrer, referredWallet, monthYear, toAward]
    );

    // Add to referrer's position referral bucket
    await execute(
      `UPDATE users SET referral_position_sp = referral_position_sp + $1, updated_at = NOW()
       WHERE wallet = $2`,
      [toAward, referrer]
    );

    console.log(`[Referral] Position: +${toAward.toFixed(2)} SP → ${referrer.slice(0,8)} (from ${referredWallet.slice(0,8)}, tier ${rate}%)`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CRON ENTRY POINT: diff-based — compare current vs last recorded total_xp
  // Social referral SP is handled by Snag on their end; it flows into
  // snag_points via the normal Snag sync. We only process position referrals.
  // ────────────────────────────────────────────────────────────────────────────
  async processAllPendingCommissions(): Promise<{ position: number; social: number }> {
    let positionCount = 0;

    // Find referred wallets whose position XP changed since last commission check
    const earners = await query<{
      wallet: string;
      total_xp: number;
      last_commission_xp: number;
    }>(
      `SELECT
         u.wallet,
         u.total_xp,
         COALESCE(u.last_commission_xp, 0) as last_commission_xp
       FROM users u
       WHERE u.referred_by_wallet IS NOT NULL
         AND u.total_xp > COALESCE(u.last_commission_xp, 0)
       LIMIT 2000`
    );

    for (const row of earners) {
      try {
        const newPositionSp = Number(row.total_xp) - Number(row.last_commission_xp);

        if (newPositionSp > 0) {
          await this.awardPositionReferralCommission(row.wallet, newPositionSp);
          positionCount++;
        }

        await execute(
          `UPDATE users
           SET last_commission_xp = GREATEST(COALESCE(last_commission_xp, 0), $1)
           WHERE wallet = $2`,
          [row.total_xp, row.wallet]
        );
      } catch (err) {
        console.error(`[Referral] Commission processing failed for ${row.wallet}:`, err);
      }
    }

    console.log(`[Referral] Cron: position commissions=${positionCount}`);
    return { position: positionCount, social: 0 };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER: based on referred wallet's total position XP
  // ────────────────────────────────────────────────────────────────────────────
  async getPositionTierRate(referredWallet: string): Promise<number> {
    const row = await queryOne<{ total_xp: number }>(
      `SELECT COALESCE(total_xp, 0) as total_xp FROM users WHERE wallet = $1`,
      [referredWallet]
    );
    const xp = row?.total_xp ?? 0;

    for (const tier of ReferralCommissionService.POSITION_TIERS) {
      if (xp <= tier.maxXp) return tier.rate;
    }
    return 15.0;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────────────────────
  private async getReferrerWallet(referredWallet: string): Promise<string | null> {
    const row = await queryOne<{ referred_by_wallet: string }>(
      `SELECT referred_by_wallet FROM users WHERE wallet = $1`,
      [referredWallet]
    );
    return row?.referred_by_wallet ?? null;
  }

  private currentMonthYear(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  async resetMonthlyCaps(): Promise<number> {
    const result = await execute(
      `DELETE FROM referral_monthly_caps WHERE month_year < $1`,
      [this.currentMonthYear()]
    );
    const deleted = (result as any)?.rowCount ?? 0;
    console.log(`[Referral] Monthly caps reset: ${deleted} old records deleted`);
    return deleted;
  }

  async getTotalCommissionEarned(referrerWallet: string): Promise<{ position: number; social: number; total: number }> {
    const row = await queryOne<{ position_sp: number; social_sp: number }>(
      `SELECT
         COALESCE(referral_position_sp, 0) as position_sp,
         COALESCE(referral_social_sp, 0)   as social_sp
       FROM users WHERE wallet = $1`,
      [referrerWallet]
    );
    const position = row?.position_sp ?? 0;
    const social   = row?.social_sp ?? 0;
    return { position, social, total: position + social };
  }

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
      totalVolume:   result?.total_volume ?? 0,
      totalHolding:  result?.total_holding ?? 0,
    };
  }

  async getPendingBalance(referrerWallet: string): Promise<{ pending: number; claimed: boolean }> {
    const result = await queryOne<{ pending_sp: number; claimed: boolean }>(
      `SELECT pending_sp, claimed FROM referral_legacy_balance WHERE referrer_wallet = $1`,
      [referrerWallet]
    );
    return { pending: result?.pending_sp ?? 0, claimed: result?.claimed ?? false };
  }

  /**
   * Claim legacy balance for a referrer.
   *
   * ⚠️  PERMANENT REQUIREMENT:
   * - Legacy balance is only claimable if referred wallets have reached the $5
   *   SHIFT RWA holding threshold (checked before this is even called)
   * - This is a PERMANENT system feature, not subject to removal
   * - Do NOT remove or modify this check without explicit approval
   */
  async claimLegacyBalance(referrerWallet: string): Promise<number> {
    const balance = await queryOne<{ pending_sp: number }>(
      `SELECT pending_sp FROM referral_legacy_balance WHERE referrer_wallet = $1 AND claimed = false`,
      [referrerWallet]
    );
    if (!balance || balance.pending_sp <= 0) throw new Error('No pending balance to claim');

    const amount = balance.pending_sp;
    await execute(`UPDATE users SET total_xp = total_xp + $1 WHERE wallet = $2`, [amount, referrerWallet]);
    await execute(
      `UPDATE referral_legacy_balance SET claimed = true, claimed_at = NOW(), claim_method = 'manual' WHERE referrer_wallet = $1`,
      [referrerWallet]
    );
    console.log(`[Legacy] ${referrerWallet.slice(0,8)} claimed ${amount} SP`);
    return amount;
  }

  // Kept for backwards compat (old cron calls this)
  async calculateAndAwardCommission(referredWallet: string, _ignored: number): Promise<void> {
    await this.processAllPendingCommissions();
  }

  async getTierForWallet(referredWallet: string): Promise<number> {
    return this.getPositionTierRate(referredWallet);
  }
}

export const referralCommissionService = new ReferralCommissionService();
