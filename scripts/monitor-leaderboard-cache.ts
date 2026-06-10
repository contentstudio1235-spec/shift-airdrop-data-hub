/**
 * Leaderboard Cache Health Monitor
 * Tracks: cache refresh status, formula accuracy, data freshness, Redis metrics
 *
 * Usage: npx ts-node scripts/monitor-leaderboard-cache.ts
 */

import { pool } from '../src/db/pool';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface CacheMetrics {
  finalPointsCount: number;
  referralCountCount: number;
  referredVolumeCount: number;
  referredHoldingCount: number;
  lastCacheRefresh: Date | null;
  formulaAccuracy: { passed: number; failed: number; samples: string[] };
  redisMemory: string;
  cacheHitRate: number;
}

export async function monitorLeaderboardCache(): Promise<CacheMetrics> {
  console.log('\n📊 LEADERBOARD CACHE HEALTH CHECK\n');

  // 1. Cache Freshness
  console.log('1️⃣  Cache Freshness & Status');
  const cacheStatus = await checkCacheFreshness();

  // 2. Formula Accuracy
  console.log('\n2️⃣  Formula Accuracy Verification');
  const formulaAccuracy = await verifyFormulaAccuracy();

  // 3. Redis Metrics
  console.log('\n3️⃣  Redis Metrics');
  const redisMetrics = await checkRedisMetrics();

  // 4. Sample Leaderboard Entries
  console.log('\n4️⃣  Sample Top 5 Entries (by Final SP)');
  await sampleTopEntries();

  const metrics: CacheMetrics = {
    finalPointsCount: cacheStatus.finalPointsCount,
    referralCountCount: cacheStatus.referralCountCount,
    referredVolumeCount: cacheStatus.referredVolumeCount,
    referredHoldingCount: cacheStatus.referredHoldingCount,
    lastCacheRefresh: cacheStatus.lastRefresh,
    formulaAccuracy: formulaAccuracy,
    redisMemory: redisMetrics.memory,
    cacheHitRate: redisMetrics.hitRate,
  };

  printSummary(metrics);

  await redis.quit();
  await pool.end();

  return metrics;
}

async function checkCacheFreshness(): Promise<{
  finalPointsCount: number;
  referralCountCount: number;
  referredVolumeCount: number;
  referredHoldingCount: number;
  lastRefresh: Date | null;
}> {
  const keys = await redis.keys('leaderboard:*');

  const counts = {
    finalPointsCount: await redis.zcard('leaderboard:final_points'),
    referralCountCount: await redis.zcard('leaderboard:referral_count'),
    referredVolumeCount: await redis.zcard('leaderboard:referred_volume'),
    referredHoldingCount: await redis.zcard('leaderboard:referred_holding'),
  };

  // Get TTLs to estimate last refresh
  const ttl = await redis.ttl('leaderboard:final_points');
  const maxTtl = 12 * 60 * 60; // 12 hours in seconds
  const refreshTimeAgo = maxTtl - ttl;
  const lastRefresh = new Date(Date.now() - refreshTimeAgo * 1000);

  console.log(`  📈 Final Points: ${counts.finalPointsCount} entries`);
  console.log(`  🎯 Referral Count: ${counts.referralCountCount} entries`);
  console.log(`  💰 Referred Volume: ${counts.referredVolumeCount} entries`);
  console.log(`  📊 Referred Holding: ${counts.referredHoldingCount} entries`);
  console.log(`  ⏱️  Cache TTL: ${Math.floor(ttl / 60)} minutes remaining`);
  console.log(`  🔄 Last Refresh: ~${new Date(lastRefresh).toLocaleString()}`);

  if (ttl < 300) {
    console.log('  ⚠️  Cache expiring soon — next refresh expected within 5 minutes');
  }

  return { ...counts, lastRefresh: new Date(lastRefresh) };
}

async function verifyFormulaAccuracy(): Promise<{
  passed: number;
  failed: number;
  samples: string[];
}> {
  // Get top 10 wallets from cache
  const topWallets = await redis.zrevrange('leaderboard:final_points', 0, 9, 'WITHSCORES');

  const results = { passed: 0, failed: 0, samples: [] as string[] };

  for (let i = 0; i < topWallets.length; i += 2) {
    const wallet = topWallets[i];
    const cachedScore = parseFloat(topWallets[i + 1]);

    // Query actual values from database
    const userQuery = await pool.query(
      `SELECT wallet, COALESCE(total_xp, 0) as position_sp,
              COALESCE(snag_points, 0) as social_sp,
              COALESCE(referral_position_sp, 0) as referral_sp
       FROM users
       WHERE wallet = $1`,
      [wallet]
    );

    if (userQuery.rows.length === 0) {
      continue;
    }

    const { position_sp, social_sp, referral_sp } = userQuery.rows[0];
    const computedScore = position_sp * 2.0 + social_sp * 1.0 + referral_sp * 1.0;
    const match = Math.abs(cachedScore - computedScore) < 0.01; // Allow 0.01 rounding error

    if (match) {
      results.passed++;
    } else {
      results.failed++;
      results.samples.push(
        `❌ ${wallet.substring(0, 8)}... | Cached: ${cachedScore.toFixed(2)} | Computed: ${computedScore.toFixed(2)} | Diff: ${Math.abs(cachedScore - computedScore).toFixed(2)}`
      );
    }
  }

  console.log(`  ✅ Passed: ${results.passed}/10 samples`);
  console.log(`  ❌ Failed: ${results.failed}/10 samples`);

  if (results.samples.length > 0) {
    console.log(`\n  Mismatches:`);
    results.samples.forEach((s) => console.log(`    ${s}`));
  }

  return results;
}

async function checkRedisMetrics(): Promise<{ memory: string; hitRate: number }> {
  const info = await redis.info('memory');
  const statsInfo = await redis.info('stats');

  const memoryMatch = info.match(/used_memory_human:(.*?)\r/);
  const usedMemory = memoryMatch ? memoryMatch[1] : 'N/A';

  // Parse hit/miss stats
  const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
  const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
  const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
  const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
  const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

  console.log(`  💾 Used Memory: ${usedMemory}`);
  console.log(`  📍 Keyspace Hits: ${hits}`);
  console.log(`  📍 Keyspace Misses: ${misses}`);
  console.log(`  🎯 Hit Rate: ${hitRate.toFixed(2)}%`);

  return { memory: usedMemory, hitRate };
}

async function sampleTopEntries(): Promise<void> {
  const topWallets = await redis.zrevrange('leaderboard:final_points', 0, 4, 'WITHSCORES');

  console.log(`  \nRank | Wallet               | Final SP`);
  console.log(`  -----|----------------------|----------`);

  for (let i = 0; i < topWallets.length; i += 2) {
    const wallet = topWallets[i];
    const score = parseFloat(topWallets[i + 1]);
    const rank = i / 2 + 1;
    console.log(`  ${rank}    | ${wallet.substring(0, 20).padEnd(20)} | ${score.toFixed(0)}`);
  }
}

function printSummary(metrics: CacheMetrics): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  const formulaStatus =
    metrics.formulaAccuracy.failed === 0 ? '✅ PASS' : `❌ FAIL (${metrics.formulaAccuracy.failed} mismatches)`;
  const cacheStatus = metrics.finalPointsCount > 0 ? '✅ OK' : '⚠️  EMPTY';
  const redisStatus = metrics.cacheHitRate > 0.8 ? '✅ HEALTHY' : '⚠️  LOW HIT RATE';

  console.log(`Formula Accuracy: ${formulaStatus}`);
  console.log(`Cache Status: ${cacheStatus} (${metrics.finalPointsCount} entries)`);
  console.log(`Redis Health: ${redisStatus} (${metrics.cacheHitRate.toFixed(2)}% hit rate)`);
  console.log('='.repeat(60) + '\n');
}

monitorLeaderboardCache().catch(console.error);
