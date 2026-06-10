/**
 * Leaderboard Service
 * Handles leaderboard rankings and user position
 */
export interface LeaderboardEntry {
    rank: number;
    wallet: string;
    totalXp: number;
    level: number;
    levelName: string;
    currentStreak: number;
}
export interface UserLeaderboardPosition {
    rank: number;
    percentile: number;
    totalUsers: number;
    userEntry: LeaderboardEntry;
}
export declare class LeaderboardService {
    /**
     * Get top 100 users on leaderboard
     */
    getTopLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Get user's rank and percentile
     */
    getUserRank(wallet: string): Promise<UserLeaderboardPosition | null>;
    /**
     * Get leaderboard around a user (user + N above and below)
     */
    getLeaderboardAround(wallet: string, context?: number): Promise<LeaderboardEntry[]>;
}
export declare const leaderboardService: LeaderboardService;
//# sourceMappingURL=leaderboardService.d.ts.map