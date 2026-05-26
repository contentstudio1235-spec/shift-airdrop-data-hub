import { BadgeAward, BadgeName } from '../types';
export declare class BadgeService {
    /**
     * Evaluate all badge conditions for a single wallet.
     */
    evaluateBadges(wallet: string): Promise<BadgeAward[]>;
    /**
     * Evaluate badges for ALL users (called by cron).
     */
    evaluateAllUsers(): Promise<BadgeAward[]>;
    /**
     * Badge: First Trade — user has at least one non-filtered position.
     */
    checkFirstTrade(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Diamond Hands — any position held for 30+ days.
     */
    checkDiamondHands(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Earnings Reactor — traded during an earnings event.
     */
    checkEarningsReactor(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: FOMC Trader — traded during a macro event (FOMC, CPI).
     */
    checkFOMCTrader(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: SHIFT Holder — holds at least 1 SHIFT test token.
     */
    checkShiftHolder(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Fed Day Trade — opened position on FOMC announcement day (+1.20x Dynamic, 14 days)
     */
    checkFedDayTrade(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: CPI Bet — opened position on CPI release day (+1.15x Dynamic, 7 days)
     */
    checkCPIBet(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: News Reactor — opened within 60m of market-moving headline (+1.15x Dynamic, 7 days)
     */
    checkNewsReactor(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Earnings Conviction — opened 24h before earnings, held through report (+1.20x Permanent)
     */
    checkEarningsConviction(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Geopolitical Trade — opened during major geopolitical event (+1.20x Permanent)
     */
    checkGeopoliticalTrade(wallet: string): Promise<BadgeAward | null>;
    /**
     * Check if wallet already has a specific badge.
     */
    hasBadge(wallet: string, badgeName: BadgeName): Promise<boolean>;
    /**
     * Award a badge to a wallet + queue immediate real-time SNAG sync.
     */
    awardBadge(wallet: string, badgeName: BadgeName): Promise<void>;
    /**
     * Get all badges for a wallet.
     */
    getBadges(wallet: string): Promise<Array<{
        badge_name: string;
        earned_at: Date;
    }>>;
    /**
     * Get badge progress info for psychology hooks.
     */
    getBadgeProgress(wallet: string): Promise<Array<{
        badge: BadgeName;
        earned: boolean;
        progress: number;
        description: string;
    }>>;
}
export declare const badgeService: BadgeService;
//# sourceMappingURL=badgeService.d.ts.map