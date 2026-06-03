import dotenv from 'dotenv';
dotenv.config();

export const config = {
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
    first_trade: process.env.SNAG_FIRST_TRADE_BADGE_ID || '',
    diamond_hands: process.env.SNAG_DIAMOND_HANDS_BADGE_ID || '',
    earnings_reactor: process.env.SNAG_EARNINGS_REACTOR_BADGE_ID || '',
    fomc_trader: process.env.SNAG_FOMC_TRADER_BADGE_ID || '',
    shift_holder: process.env.SNAG_SHIFT_HOLDER_BADGE_ID || '',
    fed_day_trade: process.env.SNAG_FED_DAY_TRADE_BADGE_ID || '',
    cpi_bet: process.env.SNAG_CPI_BET_BADGE_ID || '',
    news_reactor: process.env.SNAG_NEWS_REACTOR_BADGE_ID || '',
    earnings_conviction: process.env.SNAG_EARNINGS_CONVICTION_BADGE_ID || '',
    geopolitical_trade: process.env.SNAG_GEOPOLITICAL_TRADE_BADGE_ID || '',
    long_hauler: process.env.SNAG_LONG_HAULER_BADGE_ID || '',
    the_believer: process.env.SNAG_THE_BELIEVER_BADGE_ID || '',
  } as const,

  // SNAG Social Task Rule IDs (for inbound webhook task mapping)
  snagSocialRuleIds: {
    follow_x:       process.env.SNAG_FOLLOW_X_RULE_ID || '',
    join_discord:   process.env.SNAG_JOIN_DISCORD_RULE_ID || '',
    join_telegram:  process.env.SNAG_JOIN_TELEGRAM_RULE_ID || '',
    connect_wallet: process.env.SNAG_CONNECT_WALLET_RULE_ID || '',
    first_trade:    process.env.SNAG_FIRST_TRADE_RULE_ID || '',
  },

  // App URL (for OAuth redirects)
  appUrl: process.env.APP_URL || 'https://airdrop.shiftrwa.xyz',
  backendUrl: process.env.BACKEND_URL || 'https://shift-airdrop-backend.onrender.com',

  // Discord OAuth App
  discordClientId:     process.env.DISCORD_CLIENT_ID || '',
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  discordGuildId:      process.env.DISCORD_GUILD_ID || '',  // SHIFT Discord server ID

  // Twitter/X OAuth 2.0 App
  twitterClientId:     process.env.TWITTER_CLIENT_ID || '',
  twitterClientSecret: process.env.TWITTER_CLIENT_SECRET || '',
  twitterAccountId:    process.env.TWITTER_ACCOUNT_ID || '', // @ShiftRWA numeric user ID

  // Telegram Bot
  telegramBotToken:  process.env.TELEGRAM_BOT_TOKEN || '',
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
    weeklyBonus: 0.1,     // +0.1x per active week
    monthlyBonus: 0.2,    // +0.2x per active month
    badgeBonus: 0.1,      // +0.1x per badge earned
    maxMultiplier: 5.0,   // cap
  },
} as const;

/**
 * CRITICAL FIX: Validate SNAG configuration on startup.
 * Ensures all required SNAG identifiers are configured before the service starts.
 */
export function validateSnagConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.snagApiKey) {
    errors.push('SNAG_API_KEY is not configured');
  }

  if (!config.snagOrganizationId) {
    errors.push('SNAG_ORGANIZATION_ID is not configured');
  }

  if (!config.snagWebsiteId) {
    errors.push('SNAG_WEBSITE_ID is not configured');
  }

  if (!config.snagWebhookSecret) {
    errors.push('SNAG_WEBHOOK_SECRET is not configured (dev mode: webhooks will be accepted without signature verification)');
  }

  if (!config.snagLoyaltyCurrencyId) {
    errors.push('SNAG_LOYALTY_CURRENCY_ID is not configured (loyalty point syncing will not work)');
  }

  // Social rule IDs are optional but warn if missing
  const socialRules = config.snagSocialRuleIds;
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
