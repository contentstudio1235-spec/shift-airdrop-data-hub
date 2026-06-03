/**
 * Referral Tracking Service
 * Tracks referral earnings and provides referral analytics
 */
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
export declare class ReferralTrackingService {
    /**
     * Get referrer's referral stats
     */
    getReferrerStats(wallet: string): Promise<ReferrerStats>;
    /**
     * Get list of users referred by a wallet
     */
    getReferredUsers(wallet: string, limit?: number): Promise<ReferralEntry[]>;
    /**
     * Get referrer info for a user
     */
    getMyReferrer(wallet: string): Promise<{
        referrerWallet: string | null;
        code: string | null;
        xpFromReferral: number;
    } | null>;
    /**
     * Get referral leaderboard (by referral count)
     */
    getReferralLeaderboard(limit?: number): Promise<Array<{
        wallet: string;
        referralCount: number;
        xpEarned: number;
    }>>;
    /**
     * Calculate total network XP (referrer + all referrals' XP)
     */
    getNetworkXp(wallet: string): Promise<{
        myXp: number;
        networkXp: number;
        referralXp: number;
    }>;
}
export declare const referralTrackingService: ReferralTrackingService;
//# sourceMappingURL=referralTrackingService.d.ts.map