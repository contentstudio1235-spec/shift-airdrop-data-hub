"use strict";
/**
 * Level System — XP to Level mapping
 * 5 level tiers tied to Shift brand identity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVEL_TIERS = void 0;
exports.getLevel = getLevel;
exports.getProgressToNextLevel = getProgressToNextLevel;
exports.getXpToNextLevel = getXpToNextLevel;
exports.getUserLevelInfo = getUserLevelInfo;
exports.LEVEL_TIERS = [
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
function getLevel(totalXp) {
    const tier = exports.LEVEL_TIERS.find(t => totalXp >= t.minXp && totalXp <= t.maxXp);
    return tier || exports.LEVEL_TIERS[0]; // default to Seed
}
/**
 * Get progress to next level (0-100%)
 */
function getProgressToNextLevel(totalXp) {
    const currentLevel = getLevel(totalXp);
    // If at max level, return 100%
    if (currentLevel.level === 5) {
        return 100;
    }
    const nextLevel = exports.LEVEL_TIERS[currentLevel.level]; // next tier
    const currentRangeStart = currentLevel.minXp;
    const currentRangeEnd = nextLevel.minXp;
    const xpInRange = totalXp - currentRangeStart;
    const rangeSize = currentRangeEnd - currentRangeStart;
    return Math.min(100, Math.round((xpInRange / rangeSize) * 100));
}
/**
 * Get XP needed to reach next level
 */
function getXpToNextLevel(totalXp) {
    const currentLevel = getLevel(totalXp);
    if (currentLevel.level === 5) {
        return 0; // max level
    }
    const nextLevel = exports.LEVEL_TIERS[currentLevel.level];
    return Math.max(0, nextLevel.minXp - totalXp);
}
function getUserLevelInfo(totalXp) {
    const currentLevel = getLevel(totalXp);
    const progressPercent = getProgressToNextLevel(totalXp);
    const xpToNextLevel = getXpToNextLevel(totalXp);
    const nextLevelTier = currentLevel.level < 5
        ? exports.LEVEL_TIERS[currentLevel.level]
        : currentLevel;
    return {
        currentLevel,
        progressPercent,
        xpToNextLevel,
        nextLevelName: nextLevelTier.name,
    };
}
//# sourceMappingURL=levelSystem.js.map