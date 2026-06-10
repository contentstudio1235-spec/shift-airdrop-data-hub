"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardCacheService = exports.LeaderboardCacheService = void 0;
const pool_1 = require("../db/pool");
const ioredis_1 = __importDefault(require("ioredis"));
class LeaderboardCacheService {
    redis;
    static CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours
    static CACHE_KEYS = {
        finalPoints: 'leaderboard:final_points',
        referralCount: 'leaderboard:referral_count',
        referredVolume: 'leaderboard:referred_volume',
        referredHolding: 'leaderboard:referred_holding',
    };
    constructor(redisUrl) {
        this.redis = new ioredis_1.default(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    }
    /**
     * Rebuild all leaderboard caches
     * Should be called every 12 hours by cron job
     */
    async rebuildAllCaches() {
        console.log('[Leaderboard] Starting cache rebuild...');
        const startTime = Date.now();
        await Promise.all([
            this.rebuildFinalPointsCache(),
            this.rebuildReferralCountCache(),
            this.rebuildReferredVolumeCache(),
            this.rebuildReferredHoldingCache(),
        ]);
        const elapsed = Date.now() - startTime;
        console.log(`[Leaderboard] Cache rebuild complete in ${elapsed}ms`);
    }
    /**
     * Get top N by Final Points
     */
    async getTopByFinalPoints(limit = 100) {
        const cached = await this.redis.zrevrange(LeaderboardCacheService.CACHE_KEYS.finalPoints, 0, limit - 1, 'WITHSCORES');
        return this.parseLeaderboardData(cached, 1);
    }
    /**
     * Get top N by Referral Count
     */
    async getTopByReferralCount(limit = 100) {
        const cached = await this.redis.zrevrange(LeaderboardCacheService.CACHE_KEYS.referralCount, 0, limit - 1, 'WITHSCORES');
        return this.parseLeaderboardData(cached, 2);
    }
    /**
     * Get top N by Referred Volume
     */
    async getTopByReferredVolume(limit = 100) {
        const cached = await this.redis.zrevrange(LeaderboardCacheService.CACHE_KEYS.referredVolume, 0, limit - 1, 'WITHSCORES');
        return this.parseLeaderboardData(cached, 3);
    }
    /**
     * Get top N by Referred Holding
     */
    async getTopByReferredHolding(limit = 100) {
        const cached = await this.redis.zrevrange(LeaderboardCacheService.CACHE_KEYS.referredHolding, 0, limit - 1, 'WITHSCORES');
        return this.parseLeaderboardData(cached, 4);
    }
    /**
     * Get rank for a specific wallet
     */
    async getRank(wallet, sortBy = 'final_points') {
        const key = this.getKeyBySortType(sortBy);
        const rank = await this.redis.zrevrank(key, wallet);
        return rank !== null ? rank + 1 : 0;
    }
    // ── Private methods ──
    async rebuildFinalPointsCache() {
        const results = await pool_1.pool.query(`WITH ranked AS (
         SELECT
           wallet,
           (COALESCE(total_xp, 0) * 2.0) +
           (COALESCE(snag_points, 0) * 1.0) +
           (COALESCE(referral_position_sp, 0) * 1.0) as final_points
         FROM users
         WHERE total_xp > 0 OR snag_points > 0 OR referral_position_sp > 0
       )
       SELECT wallet, final_points FROM ranked ORDER BY final_points DESC`);
        const pipeline = this.redis.pipeline();
        pipeline.del(LeaderboardCacheService.CACHE_KEYS.finalPoints);
        for (const row of results.rows) {
            pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.finalPoints, row.final_points, row.wallet);
        }
        pipeline.expire(LeaderboardCacheService.CACHE_KEYS.finalPoints, LeaderboardCacheService.CACHE_TTL_SECONDS);
        await pipeline.exec();
        console.log(`[Leaderboard] Rebuilt final_points cache: ${results.rows.length} entries`);
    }
    async rebuildReferralCountCache() {
        const results = await pool_1.pool.query(`SELECT
         referred_by_wallet as wallet,
         COUNT(*) as referral_count
       FROM users
       WHERE referred_by_wallet IS NOT NULL
       GROUP BY referred_by_wallet
       ORDER BY referral_count DESC`);
        const pipeline = this.redis.pipeline();
        pipeline.del(LeaderboardCacheService.CACHE_KEYS.referralCount);
        for (const row of results.rows) {
            pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.referralCount, row.referral_count, row.wallet);
        }
        pipeline.expire(LeaderboardCacheService.CACHE_KEYS.referralCount, LeaderboardCacheService.CACHE_TTL_SECONDS);
        await pipeline.exec();
        console.log(`[Leaderboard] Rebuilt referral_count cache: ${results.rows.length} entries`);
    }
    async rebuildReferredVolumeCache() {
        const results = await pool_1.pool.query(`SELECT
         u.referred_by_wallet as wallet,
         SUM(p.position_size_usd) as total_volume
       FROM users u
       LEFT JOIN positions p ON u.wallet = p.wallet AND p.status != 'filtered'
       WHERE u.referred_by_wallet IS NOT NULL
       GROUP BY u.referred_by_wallet
       HAVING SUM(p.position_size_usd) > 0
       ORDER BY total_volume DESC`);
        const pipeline = this.redis.pipeline();
        pipeline.del(LeaderboardCacheService.CACHE_KEYS.referredVolume);
        for (const row of results.rows) {
            pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.referredVolume, row.total_volume || 0, row.wallet);
        }
        pipeline.expire(LeaderboardCacheService.CACHE_KEYS.referredVolume, LeaderboardCacheService.CACHE_TTL_SECONDS);
        await pipeline.exec();
        console.log(`[Leaderboard] Rebuilt referred_volume cache: ${results.rows.length} entries`);
    }
    async rebuildReferredHoldingCache() {
        const results = await pool_1.pool.query(`SELECT
         u.referred_by_wallet as wallet,
         SUM(p.position_size_usd) as total_holding
       FROM users u
       LEFT JOIN positions p ON u.wallet = p.wallet AND p.status = 'open'
       WHERE u.referred_by_wallet IS NOT NULL
       GROUP BY u.referred_by_wallet
       HAVING SUM(p.position_size_usd) > 0
       ORDER BY total_holding DESC`);
        const pipeline = this.redis.pipeline();
        pipeline.del(LeaderboardCacheService.CACHE_KEYS.referredHolding);
        for (const row of results.rows) {
            pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.referredHolding, row.total_holding || 0, row.wallet);
        }
        pipeline.expire(LeaderboardCacheService.CACHE_KEYS.referredHolding, LeaderboardCacheService.CACHE_TTL_SECONDS);
        await pipeline.exec();
        console.log(`[Leaderboard] Rebuilt referred_holding cache: ${results.rows.length} entries`);
    }
    parseLeaderboardData(redisData, sortType) {
        const result = [];
        for (let i = 0; i < redisData.length; i += 2) {
            const wallet = redisData[i];
            const score = parseFloat(redisData[i + 1]);
            result.push({
                rank: result.length + 1,
                wallet,
                score,
            });
        }
        return result;
    }
    getKeyBySortType(sortBy) {
        switch (sortBy) {
            case 'referral_count':
                return LeaderboardCacheService.CACHE_KEYS.referralCount;
            case 'referred_volume':
                return LeaderboardCacheService.CACHE_KEYS.referredVolume;
            case 'referred_holding':
                return LeaderboardCacheService.CACHE_KEYS.referredHolding;
            default:
                return LeaderboardCacheService.CACHE_KEYS.finalPoints;
        }
    }
    async disconnect() {
        await this.redis.quit();
    }
}
exports.LeaderboardCacheService = LeaderboardCacheService;
exports.leaderboardCacheService = new LeaderboardCacheService();
//# sourceMappingURL=leaderboardCacheService.js.map