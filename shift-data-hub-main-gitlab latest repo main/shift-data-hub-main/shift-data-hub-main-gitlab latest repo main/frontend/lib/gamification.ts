/**
 * Gamification types and utilities for frontend
 */

export interface LevelInfo {
  currentLevel: {
    level: number;
    name: string;
    minXp: number;
    maxXp: number;
    icon: string;
    color: string;
  };
  progressPercent: number;
  xpToNextLevel: number;
  nextLevelName: string;
}

export interface StreakInfo {
  currentStreak: number;
  lastCheckinDate: string | null;
  daysUntilMilestone: number;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalXp: number;
  level: number;
  levelName: string;
  currentStreak: number;
}

export interface UserRankInfo {
  rank: number;
  percentile: number;
  totalUsers: number;
  userEntry: LeaderboardEntry;
}

/**
 * Format wallet address for display (first 6 + last 4)
 */
export function formatWalletShort(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

/**
 * Format XP with thousands separator
 */
export function formatXp(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Get milestone message based on streak
 */
export function getMilestoneMessage(streak: number): string {
  if (streak === 7) return '🎉 7-day Streak! +250 Bonus XP';
  if (streak === 30) return '🏆 30-day Streak! +500 Bonus XP';
  if (streak === 100) return '👑 100-day Legend! +1000 Bonus XP';
  return '';
}

/**
 * Determine if a milestone was just hit
 */
export function isMilestoneHit(newStreak: number): boolean {
  return [7, 30, 100].includes(newStreak);
}
