/**
 * Cache Warmer for May 27 Maintenance Window
 * Pre-fetches and caches critical data before maintenance
 * If backend goes down, components fall back to cached data
 */

const CACHE_KEYS = {
  level: 'shift_cache_level',
  streak: 'shift_cache_streak',
  rank: 'shift_cache_rank',
  missions: 'shift_cache_missions',
  badges: 'shift_cache_badges',
  activity: 'shift_cache_activity',
  referrals: 'shift_cache_referrals',
  leaderboard: 'shift_cache_leaderboard',
  leaderboardContext: 'shift_cache_leaderboard_context',
};

const CACHE_TIMESTAMP_KEY = 'shift_cache_timestamp';

/**
 * Warm cache by pre-fetching critical data
 * Call this 5-10 minutes before maintenance window
 */
export async function warmCache(wallet: string) {
  if (!wallet) {
    console.warn('[CacheWarmer] No wallet provided');
    return false;
  }

  console.log('[CacheWarmer] Starting cache warm-up...');
  const startTime = Date.now();

  try {
    // Fetch all critical data in parallel
    const [level, streak, rank, missions, badges, activity, referrals, leaderboard, leaderboardContext] =
      await Promise.allSettled([
        fetch(`/api/dashboard/${wallet}/level`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/streak`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/rank`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/missions`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/badges/gallery`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/activity?limit=15`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/referrals/stats`).then(r => r.json()),
        fetch(`/api/dashboard/leaderboard/top?limit=100`).then(r => r.json()),
        fetch(`/api/dashboard/${wallet}/leaderboard-context`).then(r => r.json()),
      ]);

    // Store successful results
    let cacheCount = 0;

    if (level.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.level, JSON.stringify(level.value));
      cacheCount++;
    }
    if (streak.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.streak, JSON.stringify(streak.value));
      cacheCount++;
    }
    if (rank.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.rank, JSON.stringify(rank.value));
      cacheCount++;
    }
    if (missions.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.missions, JSON.stringify(missions.value));
      cacheCount++;
    }
    if (badges.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.badges, JSON.stringify(badges.value));
      cacheCount++;
    }
    if (activity.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.activity, JSON.stringify(activity.value));
      cacheCount++;
    }
    if (referrals.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.referrals, JSON.stringify(referrals.value));
      cacheCount++;
    }
    if (leaderboard.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.leaderboard, JSON.stringify(leaderboard.value));
      cacheCount++;
    }
    if (leaderboardContext.status === 'fulfilled') {
      localStorage.setItem(CACHE_KEYS.leaderboardContext, JSON.stringify(leaderboardContext.value));
      cacheCount++;
    }

    // Store timestamp
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());

    const duration = Date.now() - startTime;
    console.log(`[CacheWarmer] ✅ Cached ${cacheCount}/9 datasets in ${duration}ms`);

    return true;
  } catch (error) {
    console.error('[CacheWarmer] Error warming cache:', error);
    return false;
  }
}

/**
 * Get cached data by key
 * Returns cached data or null if not available
 */
export function getCachedData<T>(key: keyof typeof CACHE_KEYS): T | null {
  try {
    const cached = localStorage.getItem(CACHE_KEYS[key]);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`[CacheWarmer] Error retrieving cached ${key}:`, error);
    return null;
  }
}

/**
 * Get cache timestamp
 * Shows when cache was last updated
 */
export function getCacheTimestamp(): Date | null {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * Check if data is stale
 * Consider stale if older than 30 minutes
 */
export function isCacheStale(maxAgeMinutes = 30): boolean {
  const timestamp = getCacheTimestamp();
  if (!timestamp) return true;

  const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);
  return ageMinutes > maxAgeMinutes;
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  console.log('[CacheWarmer] Cache cleared');
}

/**
 * Check if currently in maintenance window
 */
export function isMaintenanceWindow(): boolean {
  const now = new Date();
  const utcDate = now.getUTCDate();
  const utcHours = now.getUTCHours();

  // May 27, 01:00-02:00 UTC
  return utcDate === 27 && utcHours >= 1 && utcHours < 2;
}

/**
 * Time until maintenance (in seconds)
 * Returns negative if already in maintenance
 */
export function secondsUntilMaintenance(): number {
  const now = new Date();
  const maintenance = new Date(Date.UTC(2026, 4, 27, 1, 0, 0)); // May 27, 01:00 UTC

  return Math.floor((maintenance.getTime() - now.getTime()) / 1000);
}
