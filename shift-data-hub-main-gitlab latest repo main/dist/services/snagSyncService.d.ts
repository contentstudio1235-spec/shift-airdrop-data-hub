import { BadgeName, LeaderboardEntry } from '../types';
export declare class SnagSyncService {
    private client;
    private circuitFailures;
    private circuitOpen;
    private circuitOpenUntil;
    constructor();
    private checkCircuit;
    private recordFailure;
    private recordSuccess;
    private backoffMs;
    private queueFailedEntries;
    fullSync(): Promise<void>;
    syncAllXP(): Promise<void>;
    /**
     * Debit XP from SNAG accounts (for early-sell claw-backs).
     * Mirror of batchPushXP but uses direction: 'debit'.
     */
    batchDebitXP(entries: Array<{
        wallet: string;
        xpDelta: number;
    }>): Promise<{
        succeeded: string[];
        failed: string[];
    }>;
    /**
     * Push XP entries to SNAG in batches via POST /api/loyalty/transactions.
     * Uses idempotency keys to prevent double-crediting on retry.
     */
    batchPushXP(entries: Array<{
        wallet: string;
        xpDelta: number;
    }>): Promise<{
        succeeded: string[];
        failed: string[];
    }>;
    /**
     * Fallback: push XP via External Rule (used when SNAG_LOYALTY_CURRENCY_ID is not set).
     */
    private pushXPViaRule;
    /**
     * Push claim_multiplier changes to SNAG.
     * Called as step 6 of fullSync. Tracks snag_multiplier_id per user.
     */
    syncMultipliers(): Promise<void>;
    awardBadgeInSnag(wallet: string, badgeName: BadgeName): Promise<void>;
    /**
     * Mark a social task rule as complete in SNAG.
     * Called after we've independently verified the action
     * (Discord guild join, Twitter follow, Telegram membership).
     * Uses the rule completion endpoint so SNAG records the activity.
     */
    awardSocialRule(wallet: string, ruleId: string, points: number): Promise<void>;
    /**
     * Process pending items in the retry queue.
     * Called by the 2-minute cron worker.
     */
    processRetryQueue(): Promise<void>;
    getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
    private getLocalLeaderboard;
    getUserRank(wallet: string): Promise<number | null>;
    getUserPoints(wallet: string): Promise<number>;
    /**
     * Fetch user's referral links from SNAG (default + custom).
     */
    getUserReferralLinks(wallet: string): Promise<{
        defaultLink: string;
        customLink: string | null;
    }>;
    /**
     * Set a custom referral code for the user in SNAG.
     */
    setCustomReferralLink(wallet: string, customCode: string): Promise<void>;
}
export declare const snagSyncService: SnagSyncService;
//# sourceMappingURL=snagSyncService.d.ts.map