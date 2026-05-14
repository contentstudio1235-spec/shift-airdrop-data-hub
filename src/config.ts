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

  // SNAG Rule/Badge IDs (configured in SNAG dashboard)
  snagXpRuleId: process.env.SNAG_XP_RULE_ID || '',
  snagBadgeIds: {
    first_trade: process.env.SNAG_FIRST_TRADE_BADGE_ID || '',
    diamond_hands: process.env.SNAG_DIAMOND_HANDS_BADGE_ID || '',
    earnings_reactor: process.env.SNAG_EARNINGS_REACTOR_BADGE_ID || '',
    fomc_trader: process.env.SNAG_FOMC_TRADER_BADGE_ID || '',
    shift_holder: process.env.SNAG_SHIFT_HOLDER_BADGE_ID || '',
  },

  // Anti-Farm
  antiFarm: {
    minPositionSizeUSD: parseFloat(process.env.MIN_POSITION_SIZE_USD || '10'),
    minHoldHours: parseInt(process.env.MIN_HOLD_HOURS || '24', 10),
    washTradeWindowMinutes: parseInt(process.env.WASH_TRADE_WINDOW_MINUTES || '5', 10),
    cooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES || '60', 10),
  },

  // Claim Multiplier Progression
  claimMultiplier: {
    weeklyBonus: 0.1,     // +0.1x per active week
    monthlyBonus: 0.2,    // +0.2x per active month
    badgeBonus: 0.1,      // +0.1x per badge earned
    maxMultiplier: 5.0,   // cap
  },
} as const;
