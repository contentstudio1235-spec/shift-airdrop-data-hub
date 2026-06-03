interface RuleConfig {
    [key: string]: number | string | boolean | string[];
}
interface BadgeEligibility {
    templateKey: string;
    earned: boolean;
    reason?: string;
    earnedAt?: Date;
}
interface StackingResult {
    topThreeBadges: string[];
    remainingBadges: string[];
    totalMultiplier: number;
    hallOfFameMultiplier: number;
    finalMultiplier: number;
}
export declare class BadgeTemplateService {
    /**
     * Get all available badge templates
     */
    getTemplates(): Promise<any[]>;
    /**
     * Get template by key
     */
    getTemplate(templateKey: string): Promise<any>;
    /**
     * Evaluate if wallet qualifies for a badge based on rule template
     * Rule templates: doubled_down, fed_day_trade, crash_buyer, etc.
     */
    evaluateRule(wallet: string, templateKey: string, config?: RuleConfig): Promise<BadgeEligibility>;
    /**
     * Evaluate all badges for a wallet
     */
    evaluateAllBadges(wallet: string): Promise<BadgeEligibility[]>;
    /**
     * Calculate badge multiplier stacking for a wallet/position
     * Enforces +2.0x cap with Hall of Fame bypass
     */
    calculateBadgeStacking(wallet: string, positionId?: string): Promise<StackingResult>;
    /**
     * Award badge to wallet (with optional position context)
     */
    awardBadge(wallet: string, templateKey: string, positionId?: string, awardedBy?: string): Promise<void>;
    /**
     * Revoke badge from wallet
     */
    revokeBadge(wallet: string, templateKey: string): Promise<void>;
    /**
     * Get evaluator function for template
     * Maps template key to evaluation logic
     */
    private getEvaluator;
    private evaluateDoubledDown;
    private evaluateTripleDown;
    private evaluatePyramidUp;
    private evaluateConvictionStack;
    private evaluateDipBuyer;
    private evaluateCrashBuyer;
    private evaluateBlackSwanBuyer;
    private evaluateMomentumRider;
    private evaluateBreakoutBuyer;
    private evaluateNewHighHolder;
    private evaluateEarningsConviction;
    private evaluateGeopoliticalTrade;
    private evaluateFedDayTrade;
    private evaluateCpiBet;
    private evaluateNewsReactor;
    private evaluateFirstShort;
    private evaluateTopCaller;
    private evaluateEarningsShort;
    private evaluateSqueezeSurvivor;
    private evaluateMacroBear;
    private evaluateNegative10Survivor;
    private evaluateNegative20Survivor;
    private evaluateIronHands;
    private evaluateDiamondHands;
    private evaluateLongHauler;
    private evaluateTheBeliever;
    private evaluateMultiEarningsHolder;
    private evaluateVolumeVeteranI;
    private evaluateVolumeVeteranII;
    private evaluateVolumeVeteranIII;
    private evaluateTheOg;
}
export declare const badgeTemplateService: BadgeTemplateService;
export {};
//# sourceMappingURL=badgeTemplateService.d.ts.map