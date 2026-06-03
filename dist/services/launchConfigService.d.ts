export interface LaunchPhaseConfig {
    phase1_start_time: Date;
    phase1_end_time: Date;
    phase1_multiplier: number;
    phase1_label: string;
    phase2_start_time: Date;
    phase2_end_time: Date;
    phase2_multiplier: number;
    phase2_label: string;
    phase3_start_time: Date;
    phase3_end_time?: Date;
    phase3_multiplier: number;
    phase3_label: string;
    is_active: boolean;
    launch_start_time: Date;
    updated_at: Date;
}
export interface CurrentPhaseResult {
    phase: 'phase1' | 'phase2' | 'phase3' | 'none';
    multiplier: number;
    label: string;
    endsAt?: Date;
    timeRemaining?: string;
}
export declare class LaunchConfigService {
    /**
     * Get current launch phase and multiplier (UTC-aware)
     * Returns: phase name, multiplier value, and time remaining
     */
    getCurrentPhase(): Promise<CurrentPhaseResult>;
    /**
     * Get full launch configuration (cached)
     */
    getConfig(): Promise<LaunchPhaseConfig | null>;
    /**
     * Update a specific phase (admin only)
     * Admin changes are immediately reflected after cache expiry (5 minutes max)
     * For instant updates, clear cache manually
     */
    updatePhase(phase: 'phase1' | 'phase2' | 'phase3', updates: {
        multiplier?: number;
        label?: string;
        start_time?: Date;
        end_time?: Date;
    }, adminWallet: string, reason?: string): Promise<void>;
    /**
     * Toggle launch bonus on/off
     */
    toggleLaunchBonus(isActive: boolean, adminWallet: string, reason?: string): Promise<void>;
    /**
     * Clear cache (call after updates for instant frontend reflection)
     */
    clearCache(): void;
    /**
     * Helper: Calculate time remaining until a date
     */
    private getTimeRemaining;
    /**
     * Audit logging for launch config changes
     */
    private logAudit;
}
export declare const launchConfigService: LaunchConfigService;
//# sourceMappingURL=launchConfigService.d.ts.map