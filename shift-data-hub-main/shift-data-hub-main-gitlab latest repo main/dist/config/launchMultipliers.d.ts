export interface LaunchMultiplierConfig {
    launchStartDate: string;
    week1Multiplier: number;
    week2Multiplier: number;
    week3PlusMultiplier: number;
    week1Label: string;
    week2Label: string;
    week3PlusLabel: string;
    isActive: boolean;
}
export declare const DEFAULT_LAUNCH_CONFIG: LaunchMultiplierConfig;
export declare function getLaunchConfig(): LaunchMultiplierConfig;
export declare function setLaunchConfig(config: Partial<LaunchMultiplierConfig>): LaunchMultiplierConfig;
export declare function resetLaunchConfig(): void;
export interface LaunchPhaseInfo {
    phase: 'week1' | 'week2' | 'week3plus';
    multiplier: number;
    label: string;
    daysIntoLaunch: number;
    daysRemainingInPhase: number;
    countdownDisplay: string;
}
/**
 * Calculate which launch phase we're in and the multiplier to apply.
 */
export declare function getLaunchPhase(now?: Date): LaunchPhaseInfo;
//# sourceMappingURL=launchMultipliers.d.ts.map