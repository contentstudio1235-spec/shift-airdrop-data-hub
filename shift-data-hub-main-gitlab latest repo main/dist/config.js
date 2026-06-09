"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateSnagConfig = validateSnagConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/shift_airdrop',
    // Helius
    heliusApiKey: process.env.HELIUS_API_KEY || '',
    heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET || '',
    shiftTokenMint: '5dVc9YuDZ3wRbohosa8bwXoj1v6zMvipwr38LFEA7MLJ',
    // Jupiter
    jupiterPriceApi: process.env.JUPITER_PRICE_API || 'https://api.jup.ag/price/v2',
    // SNAG
    snagApiKey: process.env.SNAG_API_KEY || '',
    snagOrganizationId: process.env.SNAG_ORGANIZATION_ID || '',
    snagWebsiteId: process.env.SNAG_WEBSITE_ID || '',
    snagBaseUrl: process.env.SNAG_BASE_URL || 'https://admin.snagsolutions.io',
    // SNAG Loyalty Currency (for batched transaction endpoint)
    snagLoyaltyCurrencyId: process.env.SNAG_LOYALTY_CURRENCY_ID || '',
    // SNAG inbound webhook secret (Stratus HMAC-SHA256)
    snagWebhookSecret: process.env.SNAG_WEBHOOK_SECRET || '',
    // SNAG Rule/Badge IDs (configured in SNAG dashboard)
    snagXpRuleId: process.env.SNAG_XP_RULE_ID || '',
    snagBadgeIds: {
        // Core position badges
        first_trade: process.env.SNAG_FIRST_TRADE_BADGE_ID || '',
        diamond_hands_7d: process.env.SNAG_DIAMOND_HANDS_7D_BADGE_ID || '',
        diamond_hands: process.env.SNAG_DIAMOND_HANDS_BADGE_ID || '',
        long_hauler: process.env.SNAG_LONG_HAULER_BADGE_ID || '',
        the_believer: process.env.SNAG_THE_BELIEVER_BADGE_ID || '',
        // Volume badges
        volume_veteran_i: process.env.SNAG_VOLUME_VETERAN_I_BADGE_ID || '',
        volume_veteran_ii: process.env.SNAG_VOLUME_VETERAN_II_BADGE_ID || '',
        volume_veteran_iii: process.env.SNAG_VOLUME_VETERAN_III_BADGE_ID || '',
        // Stacking badges
        doubled_down: process.env.SNAG_DOUBLED_DOWN_BADGE_ID || '',
        triple_down: process.env.SNAG_TRIPLE_DOWN_BADGE_ID || '',
        conviction_stack: process.env.SNAG_CONVICTION_STACK_BADGE_ID || '',
        pyramid_up: process.env.SNAG_PYRAMID_UP_BADGE_ID || '',
        // Social badges
        community_builder: process.env.SNAG_COMMUNITY_BUILDER_BADGE_ID || '',
        referral_king: process.env.SNAG_REFERRAL_KING_BADGE_ID || '',
        // XP badges
        legend: process.env.SNAG_LEGEND_BADGE_ID || '',
        // OG badge
        the_og: process.env.SNAG_THE_OG_BADGE_ID || '',
        // Earnings / event badges
        earnings_reactor: process.env.SNAG_EARNINGS_REACTOR_BADGE_ID || '',
        multi_earnings_holder: process.env.SNAG_MULTI_EARNINGS_HOLDER_BADGE_ID || '',
        fomc_trader: process.env.SNAG_FOMC_TRADER_BADGE_ID || '',
        fed_day_trade: process.env.SNAG_FED_DAY_TRADE_BADGE_ID || '',
        cpi_bet: process.env.SNAG_CPI_BET_BADGE_ID || '',
        news_reactor: process.env.SNAG_NEWS_REACTOR_BADGE_ID || '',
        earnings_conviction: process.env.SNAG_EARNINGS_CONVICTION_BADGE_ID || '',
        geopolitical_trade: process.env.SNAG_GEOPOLITICAL_TRADE_BADGE_ID || '',
        // Blockchain badges
        shift_holder: process.env.SNAG_SHIFT_HOLDER_BADGE_ID || '',
        // Future / market-data badges (no SNAG IDs yet)
        dip_buyer: process.env.SNAG_DIP_BUYER_BADGE_ID || '',
        crash_buyer: process.env.SNAG_CRASH_BUYER_BADGE_ID || '',
        black_swan_buyer: process.env.SNAG_BLACK_SWAN_BUYER_BADGE_ID || '',
        breakout_buyer: process.env.SNAG_BREAKOUT_BUYER_BADGE_ID || '',
        top_caller: process.env.SNAG_TOP_CALLER_BADGE_ID || '',
        momentum_rider: process.env.SNAG_MOMENTUM_RIDER_BADGE_ID || '',
        new_high_holder: process.env.SNAG_NEW_HIGH_HOLDER_BADGE_ID || '',
        macro_bear: process.env.SNAG_MACRO_BEAR_BADGE_ID || '',
        iron_hands: process.env.SNAG_IRON_HANDS_BADGE_ID || '',
        squeeze_survivor: process.env.SNAG_SQUEEZE_SURVIVOR_BADGE_ID || '',
        earnings_short: process.env.SNAG_EARNINGS_SHORT_BADGE_ID || '',
        first_short: process.env.SNAG_FIRST_SHORT_BADGE_ID || '',
        whale_mode: process.env.SNAG_WHALE_MODE_BADGE_ID || '',
        streak_7d: process.env.SNAG_STREAK_7D_BADGE_ID || '',
    },
    // SNAG Social Task Rule IDs (for inbound webhook task mapping)
    snagSocialRuleIds: {
        follow_x: process.env.SNAG_FOLLOW_X_RULE_ID || '',
        join_discord: process.env.SNAG_JOIN_DISCORD_RULE_ID || '',
        join_telegram: process.env.SNAG_JOIN_TELEGRAM_RULE_ID || '',
        connect_wallet: process.env.SNAG_CONNECT_WALLET_RULE_ID || '',
        first_trade: process.env.SNAG_FIRST_TRADE_RULE_ID || '',
    },
    // App URL (for OAuth redirects)
    appUrl: process.env.APP_URL || 'https://airdrop.shiftrwa.xyz',
    backendUrl: process.env.BACKEND_URL || 'https://shift-airdrop-backend.onrender.com',
    // Discord OAuth App
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    discordGuildId: process.env.DISCORD_GUILD_ID || '', // SHIFT Discord server ID
    // Twitter/X OAuth 2.0 App
    twitterClientId: process.env.TWITTER_CLIENT_ID || '',
    twitterClientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    twitterAccountId: process.env.TWITTER_ACCOUNT_ID || '', // @ShiftRWA numeric user ID
    // Telegram Bot
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '', // @shiftrwa or numeric ID
    // Anti-Farm
    antiFarm: {
        minPositionSizeUSD: parseFloat(process.env.MIN_POSITION_SIZE_USD || '10'),
        minHoldHours: parseInt(process.env.MIN_HOLD_HOURS || '24', 10),
        washTradeWindowMinutes: parseInt(process.env.WASH_TRADE_WINDOW_MINUTES || '5', 10),
        cooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES || '60', 10),
    },
    // Admin
    adminKey: process.env.ADMIN_KEY || 'ShiftRwa2026@@$$Key',
    // Claim Multiplier Progression
    claimMultiplier: {
        weeklyBonus: 0.1, // +0.1x per active week
        monthlyBonus: 0.2, // +0.2x per active month
        badgeBonus: 0.1, // +0.1x per badge earned
        maxMultiplier: 5.0, // cap
    },
};
/**
 * CRITICAL FIX: Validate SNAG configuration on startup.
 * Ensures all required SNAG identifiers are configured before the service starts.
 */
function validateSnagConfig() {
    const errors = [];
    if (!exports.config.snagApiKey) {
        errors.push('SNAG_API_KEY is not configured');
    }
    if (!exports.config.snagOrganizationId) {
        errors.push('SNAG_ORGANIZATION_ID is not configured');
    }
    if (!exports.config.snagWebsiteId) {
        errors.push('SNAG_WEBSITE_ID is not configured');
    }
    if (!exports.config.snagWebhookSecret) {
        errors.push('SNAG_WEBHOOK_SECRET is not configured (dev mode: webhooks will be accepted without signature verification)');
    }
    if (!exports.config.snagLoyaltyCurrencyId) {
        errors.push('SNAG_LOYALTY_CURRENCY_ID is not configured (loyalty point syncing will not work)');
    }
    // Social rule IDs are optional but warn if missing
    const socialRules = exports.config.snagSocialRuleIds;
    if (!socialRules.follow_x) {
        errors.push('SNAG_FOLLOW_X_RULE_ID is not configured (X follow task will not work)');
    }
    if (!socialRules.join_discord) {
        errors.push('SNAG_JOIN_DISCORD_RULE_ID is not configured (Discord join task will not work)');
    }
    if (!socialRules.join_telegram) {
        errors.push('SNAG_JOIN_TELEGRAM_RULE_ID is not configured (Telegram join task will not work)');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=config.js.map