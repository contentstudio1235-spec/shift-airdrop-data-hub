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
export declare const LEVEL_TIERS: Level[];
/**
 * Get level info from XP amount
 */
export declare function getLevel(totalXp: number): Level;
/**
 * Get progress to next level (0-100%)
 */
export declare function getProgressToNextLevel(totalXp: number): number;
/**
 * Get XP needed to reach next level
 */
export declare function getXpToNextLevel(totalXp: number): number;
/**
 * Get all level info for a user
 */
export interface UserLevelInfo {
    currentLevel: Level;
    progressPercent: number;
    xpToNextLevel: number;
    nextLevelName: string;
}
export declare function getUserLevelInfo(totalXp: number): UserLevelInfo;
//# sourceMappingURL=levelSystem.d.ts.map