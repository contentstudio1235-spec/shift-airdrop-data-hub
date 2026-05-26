/**
 * Missions Service
 * Manages weekly quests and mission progress
 */
export interface Mission {
    id: string;
    name: string;
    description: string;
    xpReward: number;
    icon: string;
    requirementType: string;
    requirementValue: number;
}
export interface UserMissionProgress {
    missionId: string;
    missionName: string;
    progressValue: number;
    requirementValue: number;
    completed: boolean;
    completedAt: Date | null;
    claimedReward: boolean;
    icon: string;
    xpReward: number;
}
export declare class MissionsService {
    /**
     * Get this week's missions
     */
    getWeeklyMissions(): Promise<Mission[]>;
    /**
     * Get user's mission progress
     */
    getUserMissionProgress(wallet: string): Promise<UserMissionProgress[]>;
    /**
     * Update mission progress for a user
     */
    updateMissionProgress(wallet: string, missionId: string, progressValue: number): Promise<void>;
    /**
     * Claim reward for completed mission
     */
    claimMissionReward(wallet: string, missionId: string): Promise<number>;
    /**
     * Get total XP earned from missions this week
     */
    getWeeklyMissionXp(wallet: string): Promise<number>;
}
export declare const missionsService: MissionsService;
//# sourceMappingURL=missionsService.d.ts.map