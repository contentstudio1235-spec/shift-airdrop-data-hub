/**
 * Leaderboard Cache Service
 * Maintains cached leaderboard rankings for all 4 sort dimensions:
 *   1. Final Points (weighted score)
 *   2. Referral Count (number of referred wallets)
 *   3. Referred Volume (total position size of all referred wallets)
 *   4. Referred Holding (current open position sizes of all referred wallets)
 *
 * Cache is refreshed every 12 hours via cron job.
 * Uses Redis for fast lookup.
 */
export interface LeaderboardEntry {
    rank: number;
    wallet: string;
    score: number;
    referredCount?: number;
    referredVolume?: number;
    referredHolding?: number;
}
export declare class LeaderboardCacheService {
    private redis;
    private static readonly CACHE_TTL_SECONDS;
    private static readonly CACHE_KEYS;
    constructor(redisUrl?: string);
    /**
     * Rebuild all leaderboard caches
     * Should be called every 12 hours by cron job
     */
    rebuildAllCaches(): Promise<void>;
    /**
     * Get top N by Final Points
     */
    getTopByFinalPoints(limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Get top N by Referral Count
     */
    getTopByReferralCount(limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Get top N by Referred Volume
     */
    getTopByReferredVolume(limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Get top N by Referred Holding
     */
    getTopByReferredHolding(limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Get rank for a specific wallet
     */
    getRank(wallet: string, sortBy?: 'final_points' | 'referral_count' | 'referred_volume' | 'referred_holding'): Promise<number>;
    private rebuildFinalPointsCache;
    private rebuildReferralCountCache;
    private rebuildReferredVolumeCache;
    private rebuildReferredHoldingCache;
    private parseLeaderboardData;
    private getKeyBySortType;
    disconnect(): Promise<void>;
}
export declare const leaderboardCacheService: LeaderboardCacheService;
//# sourceMappingURL=leaderboardCacheService.d.ts.map