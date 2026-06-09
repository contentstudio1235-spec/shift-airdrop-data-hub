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
     * Badge: Diamond Hands — any position held for 60+ days.
     */
    checkDiamondHands(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Long-Hauler — any position held for 90+ days.
     */
    checkLongHauler(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: The Believer — any position held for 180+ days.
     */
    checkTheBeliever(wallet: string): Promise<BadgeAward | null>;
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
     * Badge: Diamond Hands 7d — any open position held for 7+ days.
     */
    checkDiamondHands7d(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Volume Veteran I — 5+ total trades (testnet: count-based).
     */
    checkVolumeVeteranI(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Volume Veteran II — 25+ total trades.
     */
    checkVolumeVeteranII(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Volume Veteran III — 100+ total trades.
     */
    checkVolumeVeteranIII(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Doubled Down — 2+ positions on the same asset.
     */
    checkDoubledDown(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Triple Down — 3+ positions on the same asset.
     */
    checkTripleDown(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Conviction Stack — 4+ positions on the same asset.
     */
    checkConvictionStack(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Pyramid Up — 5+ positions on the same asset.
     */
    checkPyramidUp(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Community Builder — referred 3+ users.
     */
    checkCommunityBuilder(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Referral King — referred 10+ users.
     */
    checkReferralKing(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Legend — 50,000+ total XP.
     */
    checkLegend(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: The OG — active trader in the first 30 days of SHIFT launch.
     * Launch date: May 26 2026. Window closes: June 25 2026.
     * Pre-launch wallets (before May 26) also qualify — they're even more OG.
     */
    checkTheOG(wallet: string): Promise<BadgeAward | null>;
    /**
     * Badge: Multi-Earnings Holder — held same position through 3+ earnings events.
     */
    checkMultiEarningsHolder(wallet: string): Promise<BadgeAward | null>;
    /**
     * Check if wallet already has a specific badge.
     */
    hasBadge(wallet: string, badgeName: BadgeName): Promise<boolean>;
    private static readonly BADGE_XP;
    /**
     * Award a badge to a wallet, grant rarity-based XP, and queue SNAG sync.
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