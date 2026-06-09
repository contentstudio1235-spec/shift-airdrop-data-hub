export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly databaseUrl: string;
    readonly heliusApiKey: string;
    readonly heliusWebhookSecret: string;
    readonly shiftTokenMint: "5dVc9YuDZ3wRbohosa8bwXoj1v6zMvipwr38LFEA7MLJ";
    readonly jupiterPriceApi: string;
    readonly snagApiKey: string;
    readonly snagOrganizationId: string;
    readonly snagWebsiteId: string;
    readonly snagBaseUrl: string;
    readonly snagLoyaltyCurrencyId: string;
    readonly snagWebhookSecret: string;
    readonly snagXpRuleId: string;
    readonly snagBadgeIds: {
        readonly first_trade: string;
        readonly diamond_hands_7d: string;
        readonly diamond_hands: string;
        readonly long_hauler: string;
        readonly the_believer: string;
        readonly volume_veteran_i: string;
        readonly volume_veteran_ii: string;
        readonly volume_veteran_iii: string;
        readonly doubled_down: string;
        readonly triple_down: string;
        readonly conviction_stack: string;
        readonly pyramid_up: string;
        readonly community_builder: string;
        readonly referral_king: string;
        readonly legend: string;
        readonly the_og: string;
        readonly earnings_reactor: string;
        readonly multi_earnings_holder: string;
        readonly fomc_trader: string;
        readonly fed_day_trade: string;
        readonly cpi_bet: string;
        readonly news_reactor: string;
        readonly earnings_conviction: string;
        readonly geopolitical_trade: string;
        readonly shift_holder: string;
        readonly dip_buyer: string;
        readonly crash_buyer: string;
        readonly black_swan_buyer: string;
        readonly breakout_buyer: string;
        readonly top_caller: string;
        readonly momentum_rider: string;
        readonly new_high_holder: string;
        readonly macro_bear: string;
        readonly iron_hands: string;
        readonly squeeze_survivor: string;
        readonly earnings_short: string;
        readonly first_short: string;
        readonly whale_mode: string;
        readonly streak_7d: string;
    };
    readonly snagSocialRuleIds: {
        readonly follow_x: string;
        readonly join_discord: string;
        readonly join_telegram: string;
        readonly connect_wallet: string;
        readonly first_trade: string;
    };
    readonly appUrl: string;
    readonly backendUrl: string;
    readonly discordClientId: string;
    readonly discordClientSecret: string;
    readonly discordGuildId: string;
    readonly twitterClientId: string;
    readonly twitterClientSecret: string;
    readonly twitterAccountId: string;
    readonly telegramBotToken: string;
    readonly telegramChannelId: string;
    readonly antiFarm: {
        readonly minPositionSizeUSD: number;
        readonly minHoldHours: number;
        readonly washTradeWindowMinutes: number;
        readonly cooldownMinutes: number;
    };
    readonly adminKey: string;
    readonly claimMultiplier: {
        readonly weeklyBonus: 0.1;
        readonly monthlyBonus: 0.2;
        readonly badgeBonus: 0.1;
        readonly maxMultiplier: 5;
    };
};
/**
 * CRITICAL FIX: Validate SNAG configuration on startup.
 * Ensures all required SNAG identifiers are configured before the service starts.
 */
export declare function validateSnagConfig(): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=config.d.ts.map