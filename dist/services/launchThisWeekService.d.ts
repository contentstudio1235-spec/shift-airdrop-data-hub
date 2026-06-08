export interface LaunchThisWeekChannel {
    source: string;
    medium: string | null;
    campaignCount: number;
    signups: number;
    stitched: number;
    holders: number;
    spendUSD: number | null;
    cac: number | null;
    htftMedianHours: number | null;
    coveragePct: number;
    gatePass: boolean;
    gateReason?: string;
}
export interface LaunchThisWeekSnapshot {
    computedAt: string;
    windowDays: number;
    weekStart: string;
    activeCampaignCount: number;
    rankedChannels: LaunchThisWeekChannel[];
    gatheringSignal: LaunchThisWeekChannel[];
    /** % of week's signups that have ANY attribution (1 - direct_share). */
    coverageOverall: number;
    /** Count of active campaigns missing budget_usd (operator nudge). */
    campaignsMissingSpend: number;
}
/** Test helper — clears module-level cache. */
export declare function _clearLaunchThisWeekCache(): void;
export declare function getLaunchThisWeekSnapshot(): Promise<LaunchThisWeekSnapshot>;
//# sourceMappingURL=launchThisWeekService.d.ts.map