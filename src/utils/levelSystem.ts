/**
 * Level System — XP to Level mapping
 * 5 level tiers tied to Shift brand identity
 */

export interface Level {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
  icon: string;
  color: string;
}

export const LEVEL_TIERS: Level[] = [
  {
    level: 1,
    name: 'Seed',
    minXp: 0,
    maxXp: 999,
    icon: '🌱',
    color: '#10B981', // green
  },
  {
    level: 2,
    name: 'Holder',
    minXp: 1000,
    maxXp: 4999,
    icon: '💎',
    color: '#3B82F6', // blue
  },
  {
    level: 3,
    name: 'Trader',
    minXp: 5000,
    maxXp: 14999,
    icon: '📈',
    color: '#F59E0B', // amber
  },
  {
    level: 4,
    name: 'Whale',
    minXp: 15000,
    maxXp: 49999,
    icon: '🐋',
    color: '#8B5CF6', // purple
  },
  {
    level: 5,
    name: 'Legend',
    minXp: 50000,
    maxXp: Infinity,
    icon: '👑',
    color: '#EC4899', // pink
  },
];

/**
 * Get level info from XP amount
 */
export function getLevel(totalXp: number): Level {
  const tier = LEVEL_TIERS.find(t => totalXp >= t.minXp && totalXp <= t.maxXp);
  return tier || LEVEL_TIERS[0]; // default to Seed
}

/**
 * Get progress to next level (0-100%)
 */
export function getProgressToNextLevel(totalXp: number): number {
  const currentLevel = getLevel(totalXp);

  // If at max level, return 100%
  if (currentLevel.level === 5) {
    return 100;
  }

  const nextLevel = LEVEL_TIERS[currentLevel.level]; // next tier
  const currentRangeStart = currentLevel.minXp;
  const currentRangeEnd = nextLevel.minXp;

  const xpInRange = totalXp - currentRangeStart;
  const rangeSize = currentRangeEnd - currentRangeStart;

  return Math.min(100, Math.round((xpInRange / rangeSize) * 100));
}

/**
 * Get XP needed to reach next level
 */
export function getXpToNextLevel(totalXp: number): number {
  const currentLevel = getLevel(totalXp);

  if (currentLevel.level === 5) {
    return 0; // max level
  }

  const nextLevel = LEVEL_TIERS[currentLevel.level];
  return Math.max(0, nextLevel.minXp - totalXp);
}

/**
 * Get all level info for a user
 */
export interface UserLevelInfo {
  currentLevel: Level;
  progressPercent: number;
  xpToNextLevel: number;
  nextLevelName: string;
}

export function getUserLevelInfo(totalXp: number): UserLevelInfo {
  const currentLevel = getLevel(totalXp);
  const progressPercent = getProgressToNextLevel(totalXp);
  const xpToNextLevel = getXpToNextLevel(totalXp);

  const nextLevelTier = currentLevel.level < 5
    ? LEVEL_TIERS[currentLevel.level]
    : currentLevel;

  return {
    currentLevel,
    progressPercent,
    xpToNextLevel,
    nextLevelName: nextLevelTier.name,
  };
}
