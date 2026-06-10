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
export declare class ReferralCommissionService {
    private static readonly POSITION_TIERS;
    private static readonly MONTHLY_CAP_SP;
    awardPositionReferralCommission(referredWallet: string, newPositionSpEarned: number): Promise<void>;
    processAllPendingCommissions(): Promise<{
        position: number;
        social: number;
    }>;
    getPositionTierRate(referredWallet: string): Promise<number>;
    private getReferrerWallet;
    private currentMonthYear;
    resetMonthlyCaps(): Promise<number>;
    getTotalCommissionEarned(referrerWallet: string): Promise<{
        position: number;
        social: number;
        total: number;
    }>;
    getReferralStats(referrerWallet: string): Promise<{
        referralCount: number;
        totalVolume: number;
        totalHolding: number;
    }>;
    getPendingBalance(referrerWallet: string): Promise<{
        pending: number;
        claimed: boolean;
    }>;
    /**
     * Claim legacy balance for a referrer.
     *
     * ⚠️  PERMANENT REQUIREMENT:
     * - Legacy balance is only claimable if referred wallets have reached the $5
     *   SHIFT RWA holding threshold (checked before this is even called)
     * - This is a PERMANENT system feature, not subject to removal
     * - Do NOT remove or modify this check without explicit approval
     */
    claimLegacyBalance(referrerWallet: string): Promise<number>;
    calculateAndAwardCommission(referredWallet: string, _ignored: number): Promise<void>;
    getTierForWallet(referredWallet: string): Promise<number>;
}
export declare const referralCommissionService: ReferralCommissionService;
//# sourceMappingURL=referralCommissionService.d.ts.map