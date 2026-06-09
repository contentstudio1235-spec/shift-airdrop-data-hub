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

import { pool } from '../db/pool';
import Redis from 'ioredis';

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  referredCount?: number;
  referredVolume?: number;
  referredHolding?: number;
}

export class LeaderboardCacheService {
  private redis: Redis;

  private static readonly CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours
  private static readonly CACHE_KEYS = {
    finalPoints: 'leaderboard:final_points',
    referralCount: 'leaderboard:referral_count',
    referredVolume: 'leaderboard:referred_volume',
    referredHolding: 'leaderboard:referred_holding',
  };

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Rebuild all leaderboard caches
   * Should be called every 12 hours by cron job
   */
  async rebuildAllCaches(): Promise<void> {
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
  async getTopByFinalPoints(limit: number = 100): Promise<LeaderboardEntry[]> {
    const cached = await this.redis.zrevrange(
      LeaderboardCacheService.CACHE_KEYS.finalPoints,
      0,
      limit - 1,
      'WITHSCORES'
    );

    return this.parseLeaderboardData(cached, 1);
  }

  /**
   * Get top N by Referral Count
   */
  async getTopByReferralCount(limit: number = 100): Promise<LeaderboardEntry[]> {
    const cached = await this.redis.zrevrange(
      LeaderboardCacheService.CACHE_KEYS.referralCount,
      0,
      limit - 1,
      'WITHSCORES'
    );

    return this.parseLeaderboardData(cached, 2);
  }

  /**
   * Get top N by Referred Volume
   */
  async getTopByReferredVolume(limit: number = 100): Promise<LeaderboardEntry[]> {
    const cached = await this.redis.zrevrange(
      LeaderboardCacheService.CACHE_KEYS.referredVolume,
      0,
      limit - 1,
      'WITHSCORES'
    );

    return this.parseLeaderboardData(cached, 3);
  }

  /**
   * Get top N by Referred Holding
   */
  async getTopByReferredHolding(limit: number = 100): Promise<LeaderboardEntry[]> {
    const cached = await this.redis.zrevrange(
      LeaderboardCacheService.CACHE_KEYS.referredHolding,
      0,
      limit - 1,
      'WITHSCORES'
    );

    return this.parseLeaderboardData(cached, 4);
  }

  /**
   * Get rank for a specific wallet
   */
  async getRank(wallet: string, sortBy: 'final_points' | 'referral_count' | 'referred_volume' | 'referred_holding' = 'final_points'): Promise<number> {
    const key = this.getKeyBySortType(sortBy);
    const rank = await this.redis.zrevrank(key, wallet);
    return rank !== null ? rank + 1 : 0;
  }

  // ── Private methods ──

  private async rebuildFinalPointsCache(): Promise<void> {
    const results = await pool.query(
      `WITH ranked AS (
         SELECT
           wallet,
           (total_xp * 0.8 * 2.0) +
           (total_xp * 0.2 * 1.0) +
           (COALESCE(referral_commission_sp, 0) * 0.5) as final_points
         FROM users
         WHERE total_xp > 0 OR referral_commission_sp > 0
       )
       SELECT wallet, final_points FROM ranked ORDER BY final_points DESC`
    );

    const pipeline = this.redis.pipeline();
    pipeline.del(LeaderboardCacheService.CACHE_KEYS.finalPoints);

    for (const row of results.rows) {
      pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.finalPoints, row.final_points, row.wallet);
    }

    pipeline.expire(LeaderboardCacheService.CACHE_KEYS.finalPoints, LeaderboardCacheService.CACHE_TTL_SECONDS);
    await pipeline.exec();

    console.log(`[Leaderboard] Rebuilt final_points cache: ${results.rows.length} entries`);
  }

  private async rebuildReferralCountCache(): Promise<void> {
    const results = await pool.query(
      `SELECT
         referred_by_wallet as wallet,
         COUNT(*) as referral_count
       FROM users
       WHERE referred_by_wallet IS NOT NULL
       GROUP BY referred_by_wallet
       ORDER BY referral_count DESC`
    );

    const pipeline = this.redis.pipeline();
    pipeline.del(LeaderboardCacheService.CACHE_KEYS.referralCount);

    for (const row of results.rows) {
      pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.referralCount, row.referral_count, row.wallet);
    }

    pipeline.expire(LeaderboardCacheService.CACHE_KEYS.referralCount, LeaderboardCacheService.CACHE_TTL_SECONDS);
    await pipeline.exec();

    console.log(`[Leaderboard] Rebuilt referral_count cache: ${results.rows.length} entries`);
  }

  private async rebuildReferredVolumeCache(): Promise<void> {
    const results = await pool.query(
      `SELECT
         u.referred_by_wallet as wallet,
         SUM(p.position_size_usd) as total_volume
       FROM users u
       LEFT JOIN positions p ON u.wallet = p.wallet AND p.status != 'filtered'
       WHERE u.referred_by_wallet IS NOT NULL
       GROUP BY u.referred_by_wallet
       HAVING SUM(p.position_size_usd) > 0
       ORDER BY total_volume DESC`
    );

    const pipeline = this.redis.pipeline();
    pipeline.del(LeaderboardCacheService.CACHE_KEYS.referredVolume);

    for (const row of results.rows) {
      pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.referredVolume, row.total_volume || 0, row.wallet);
    }

    pipeline.expire(LeaderboardCacheService.CACHE_KEYS.referredVolume, LeaderboardCacheService.CACHE_TTL_SECONDS);
    await pipeline.exec();

    console.log(`[Leaderboard] Rebuilt referred_volume cache: ${results.rows.length} entries`);
  }

  private async rebuildReferredHoldingCache(): Promise<void> {
    const results = await pool.query(
      `SELECT
         u.referred_by_wallet as wallet,
         SUM(p.position_size_usd) as total_holding
       FROM users u
       LEFT JOIN positions p ON u.wallet = p.wallet AND p.status = 'open'
       WHERE u.referred_by_wallet IS NOT NULL
       GROUP BY u.referred_by_wallet
       HAVING SUM(p.position_size_usd) > 0
       ORDER BY total_holding DESC`
    );

    const pipeline = this.redis.pipeline();
    pipeline.del(LeaderboardCacheService.CACHE_KEYS.referredHolding);

    for (const row of results.rows) {
      pipeline.zadd(LeaderboardCacheService.CACHE_KEYS.referredHolding, row.total_holding || 0, row.wallet);
    }

    pipeline.expire(LeaderboardCacheService.CACHE_KEYS.referredHolding, LeaderboardCacheService.CACHE_TTL_SECONDS);
    await pipeline.exec();

    console.log(`[Leaderboard] Rebuilt referred_holding cache: ${results.rows.length} entries`);
  }

  private parseLeaderboardData(redisData: string[], sortType: number): LeaderboardEntry[] {
    const result: LeaderboardEntry[] = [];

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

  private getKeyBySortType(sortBy: string): string {
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

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export const leaderboardCacheService = new LeaderboardCacheService();
