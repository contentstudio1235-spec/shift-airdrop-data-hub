// ============================================================
// SHIFT Airdrop — Complete Badge Catalog (31 badges)
// ============================================================
// All 31 badges from Badge Strategy doc with real icon paths.
// Icon naming: /badges/{category}_{template_key}.png

import type { Badge } from './types';

export const ACTIVITY_BADGES: Omit<Badge, 'earned' | 'earnedAt'>[] = [
  // ── CONVICTION ADDING (4) ───────────────────────────────────────────
  {
    id: 'doubled_down',
    name: 'Doubled Down',
    description: 'Added to position after -5% drop from entry',
    xpValue: 110,
    rarity: 'COMMON',
    category: 'activity',
    icon: '/badges/conviction_doubled_down.png',
  },
  {
    id: 'triple_down',
    name: 'Triple Down',
    description: 'Added 3+ times during -10% drawdown',
    xpValue: 112,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/conviction_triple_down.png',
  },
  {
    id: 'pyramid_up',
    name: 'Pyramid Up',
    description: 'Added 3+ times as position rose +10%',
    xpValue: 110,
    rarity: 'COMMON',
    category: 'activity',
    icon: '/badges/conviction_pyramid_up.png',
  },
  {
    id: 'conviction_stack',
    name: 'Conviction Stack',
    description: '5+ separate adds over 30+ days',
    xpValue: 115,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/conviction_conviction_stack.png',
  },

  // ── BUYING DIP / BREAKOUT (6) ───────────────────────────────────────
  {
    id: 'dip_buyer',
    name: 'Dip Buyer',
    description: 'Opened long on day underlying closed -3%+',
    xpValue: 110,
    rarity: 'COMMON',
    category: 'activity',
    icon: '/badges/buyingdip_dip_buyer.png',
  },
  {
    id: 'crash_buyer',
    name: 'Crash Buyer',
    description: 'Opened long on day SPX closed -5%+',
    xpValue: 115,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/buyingdip_crash_buyer.png',
  },
  {
    id: 'black_swan_buyer',
    name: 'Black Swan Buyer',
    description: 'Opened long on day SPX closed -10%+',
    xpValue: 120,
    rarity: 'EPIC',
    category: 'activity',
    icon: '/badges/buyingdip_black_swan_buyer.png',
  },
  {
    id: 'momentum_rider',
    name: 'Momentum Rider',
    description: 'Opened long on day underlying closed +3%+',
    xpValue: 110,
    rarity: 'COMMON',
    category: 'activity',
    icon: '/badges/buyingdip_momentum_rider.png',
  },
  {
    id: 'breakout_buyer',
    name: 'Breakout Buyer',
    description: 'Opened within 24h of 52-week high',
    xpValue: 112,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/buyingdip_breakout_buyer.png',
  },
  {
    id: 'new_high_holder',
    name: 'New High Holder',
    description: 'Opened at all-time high, held 30+ days',
    xpValue: 113,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/buyingdip_new_high_holder.png',
  },

  // ── SHORT CONVICTION (5) ────────────────────────────────────────────
  {
    id: 'first_short',
    name: 'First Short',
    description: 'First short position opened',
    xpValue: 115,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/shortconviction_first_short.png',
  },
  {
    id: 'top_caller',
    name: 'Top Caller',
    description: 'Shorted within 24h of 52-week high',
    xpValue: 118,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/shortconviction_top_caller.png',
  },
  {
    id: 'earnings_short',
    name: 'Earnings Short',
    description: 'Shorted into earnings, closed profitable',
    xpValue: 120,
    rarity: 'EPIC',
    category: 'activity',
    icon: '/badges/shortconviction_earnings_short.png',
  },
  {
    id: 'squeeze_survivor',
    name: 'Squeeze Survivor',
    description: 'Held short through +10% squeeze, closed profitable',
    xpValue: 125,
    rarity: 'EPIC',
    category: 'activity',
    icon: '/badges/shortconviction_squeeze_survivor.png',
  },
  {
    id: 'macro_bear',
    name: 'Macro Bear',
    description: 'Held short 30+ days',
    xpValue: 115,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/shortconviction_macro_bear.png',
  },

  // ── DRAWDOWN / DURATION (7) ─────────────────────────────────────────
  {
    id: 'negative_10_survivor',
    name: 'Negative 10% Survivor',
    description: 'Held through -10% drawdown without closing',
    xpValue: 118,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/drawdown_negative_10_survivor.png',
  },
  {
    id: 'negative_20_survivor',
    name: 'Negative 20% Survivor',
    description: 'Held through -20% drawdown without closing',
    xpValue: 122,
    rarity: 'EPIC',
    category: 'activity',
    icon: '/badges/drawdown_negative_20_survivor.png',
  },
  {
    id: 'iron_hands',
    name: 'Iron Hands',
    description: 'Held through -30%+ drawdown and closed profitable',
    xpValue: 130,
    rarity: 'LEGENDARY',
    category: 'activity',
    icon: '/badges/drawdown_iron_hands.png',
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    description: 'Held single position 60+ days',
    xpValue: 115,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/drawdown_diamond_hands.png',
  },
  {
    id: 'long_hauler',
    name: 'Long Hauler',
    description: 'Held single position 90+ days',
    xpValue: 118,
    rarity: 'EPIC',
    category: 'activity',
    icon: '/badges/drawdown_long_hauler.png',
  },
  {
    id: 'the_believer',
    name: 'The Believer',
    description: 'Held single position 180+ days',
    xpValue: 125,
    rarity: 'LEGENDARY',
    category: 'activity',
    icon: '/badges/drawdown_the_believer.png',
  },
  {
    id: 'multi_earnings_holder',
    name: 'Multi-Earnings Holder',
    description: 'Held same position through 2+ earnings reports',
    xpValue: 115,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/drawdown_multi_earnings_holder.png',
  },

  // ── VOLUME & OG (4) ─────────────────────────────────────────────────
  {
    id: 'volume_veteran_i',
    name: 'Volume Veteran I',
    description: 'Cumulative volume ≥ $10,000',
    xpValue: 110,
    rarity: 'COMMON',
    category: 'activity',
    icon: '/badges/volumeog_volume_veteran_i.png',
  },
  {
    id: 'volume_veteran_ii',
    name: 'Volume Veteran II',
    description: 'Cumulative volume ≥ $100,000',
    xpValue: 112,
    rarity: 'RARE',
    category: 'activity',
    icon: '/badges/volumeog_volume_veteran_ii.png',
  },
  {
    id: 'volume_veteran_iii',
    name: 'Volume Veteran III',
    description: 'Cumulative volume ≥ $1,000,000',
    xpValue: 115,
    rarity: 'EPIC',
    category: 'activity',
    icon: '/badges/volumeog_volume_veteran_iii.png',
  },
  {
    id: 'the_og',
    name: 'The OG',
    description: 'Active in first 30 days of launch',
    xpValue: 110,
    rarity: 'LEGENDARY',
    category: 'activity',
    icon: '/badges/volumeog_the_og.png',
  },
];

export const EVENT_BADGES: Omit<Badge, 'earned' | 'earnedAt'>[] = [
  // ── EVENT-DRIVEN (5) ────────────────────────────────────────────────
  {
    id: 'earnings_conviction',
    name: 'Earnings Conviction',
    description: 'Opened 24h before earnings, held through report',
    xpValue: 120,
    rarity: 'EPIC',
    category: 'event',
    icon: '/badges/eventdriven_earnings_conviction.png',
  },
  {
    id: 'geopolitical_trade',
    name: 'Geopolitical Trade',
    description: 'Opened during a major geopolitical event',
    xpValue: 120,
    rarity: 'EPIC',
    category: 'event',
    icon: '/badges/eventdriven_geopolitical_trade.png',
  },
  {
    id: 'fed_day_trade',
    name: 'Fed Day Trade',
    description: 'Opened on FOMC announcement day',
    xpValue: 120,
    rarity: 'RARE',
    category: 'event',
    icon: '/badges/eventdriven_fed_day_trade.png',
  },
  {
    id: 'cpi_bet',
    name: 'CPI Bet',
    description: 'Opened on CPI release day',
    xpValue: 115,
    rarity: 'RARE',
    category: 'event',
    icon: '/badges/eventdriven_cpi_bet.png',
  },
  {
    id: 'news_reactor',
    name: 'News Reactor',
    description: 'Opened within 60 minutes of a market-moving headline',
    xpValue: 115,
    rarity: 'RARE',
    category: 'event',
    icon: '/badges/eventdriven_news_reactor.png',
  },
];

// ── Certificate catalog ─────────────────────────────────────────────────────

export type CertificateCategory = 'tier' | 'mastery' | 'personality' | 'seasonal';

export interface CertificateDefinition {
  id: string;
  name: string;
  category: CertificateCategory;
  description: string;
  icon: string;
  multiplierValue: number;
  multiplierType: 'permanent' | 'dynamic';
}

export const CERTIFICATES: CertificateDefinition[] = [
  // ── TIER ────────────────────────────────────────────────────────────
  { id: 'tier_bronze',   name: 'Bronze',   category: 'tier', description: 'Reach Bronze tier — top 25% by XP', icon: '/certificates/tier_tier_bronze.png',   multiplierValue: 1.05, multiplierType: 'permanent' },
  { id: 'tier_silver',   name: 'Silver',   category: 'tier', description: 'Reach Silver tier — top 10% by XP', icon: '/certificates/tier_tier_silver.png',   multiplierValue: 1.10, multiplierType: 'permanent' },
  { id: 'tier_gold',     name: 'Gold',     category: 'tier', description: 'Reach Gold tier — top 5% by XP',   icon: '/certificates/tier_tier_gold.png',     multiplierValue: 1.20, multiplierType: 'permanent' },
  { id: 'tier_platinum', name: 'Platinum', category: 'tier', description: 'Reach Platinum tier — top 1% by XP', icon: '/certificates/tier_tier_platinum.png', multiplierValue: 1.30, multiplierType: 'permanent' },

  // ── MASTERY ─────────────────────────────────────────────────────────
  { id: 'mastery_comeback_kid',     name: 'Comeback Kid',     category: 'mastery', description: 'Recovered from -20% drawdown to close profitable',       icon: '/certificates/mastery_comeback_kid.png',     multiplierValue: 1.15, multiplierType: 'permanent' },
  { id: 'mastery_iron_stomach',     name: 'Iron Stomach',     category: 'mastery', description: 'Held through extreme volatility without panic selling',   icon: '/certificates/mastery_iron_stomach.png',     multiplierValue: 1.20, multiplierType: 'permanent' },
  { id: 'mastery_profit_maximizer', name: 'Profit Maximizer', category: 'mastery', description: 'Closed position with 50%+ profit on a single trade',     icon: '/certificates/mastery_profit_maximizer.png', multiplierValue: 1.15, multiplierType: 'permanent' },
  { id: 'mastery_risk_manager',     name: 'Risk Manager',     category: 'mastery', description: 'Maintained Sharpe ratio > 2 for 30+ days',              icon: '/certificates/mastery_risk_manager.png',     multiplierValue: 1.12, multiplierType: 'permanent' },
  { id: 'mastery_timing_master',    name: 'Timing Master',    category: 'mastery', description: 'Opened and closed 5+ positions within 24h of peak/trough', icon: '/certificates/mastery_timing_master.png',   multiplierValue: 1.18, multiplierType: 'permanent' },

  // ── PERSONALITY ─────────────────────────────────────────────────────
  { id: 'personality_analyst',   name: 'Analyst',   category: 'personality', description: 'Consistently traded on fundamental analysis patterns', icon: '/certificates/personality_personality_analyst.png',   multiplierValue: 1.10, multiplierType: 'permanent' },
  { id: 'personality_champion',  name: 'Champion',  category: 'personality', description: 'Top performer across multiple event windows',          icon: '/certificates/personality_personality_champion.png',  multiplierValue: 1.20, multiplierType: 'permanent' },
  { id: 'personality_investor',  name: 'Investor',  category: 'personality', description: 'Long-term holder with strong fundamentals focus',       icon: '/certificates/personality_personality_investor.png',  multiplierValue: 1.10, multiplierType: 'permanent' },
  { id: 'personality_predator',  name: 'Predator',  category: 'personality', description: 'Aggressive momentum trader with high win rate',         icon: '/certificates/personality_personality_predator.png',  multiplierValue: 1.15, multiplierType: 'permanent' },
  { id: 'personality_rogue',     name: 'Rogue',     category: 'personality', description: 'Contrarian trader who profits against the trend',        icon: '/certificates/personality_personality_rogue.png',     multiplierValue: 1.15, multiplierType: 'permanent' },
  { id: 'personality_sage',      name: 'Sage',      category: 'personality', description: 'Patient, disciplined trader with consistent returns',    icon: '/certificates/personality_personality_sage.png',      multiplierValue: 1.12, multiplierType: 'permanent' },
  { id: 'personality_virtuoso',  name: 'Virtuoso',  category: 'personality', description: 'Master of all trading styles and market conditions',     icon: '/certificates/personality_personality_virtuoso.png',  multiplierValue: 1.25, multiplierType: 'permanent' },

  // ── SEASONAL ────────────────────────────────────────────────────────
  { id: 'seasonal_most_active',     name: 'Most Active',     category: 'seasonal', description: 'Most trades executed in a single season',      icon: '/certificates/seasonal_most_active_seasonal.png',     multiplierValue: 1.15, multiplierType: 'dynamic' },
  { id: 'seasonal_most_profitable', name: 'Most Profitable', category: 'seasonal', description: 'Highest profit percentage in a single season', icon: '/certificates/seasonal_most_profitable_seasonal.png', multiplierValue: 1.20, multiplierType: 'dynamic' },
  { id: 'seasonal_top_25_percent',  name: 'Top 25%',         category: 'seasonal', description: 'Finished in top 25% of seasonal leaderboard',  icon: '/certificates/seasonal_seasonal_top_25_percent.png',  multiplierValue: 1.05, multiplierType: 'dynamic' },
  { id: 'seasonal_top_10_percent',  name: 'Top 10%',         category: 'seasonal', description: 'Finished in top 10% of seasonal leaderboard',  icon: '/certificates/seasonal_seasonal_top_10_percent.png',  multiplierValue: 1.10, multiplierType: 'dynamic' },
  { id: 'seasonal_top_1_percent',   name: 'Top 1%',          category: 'seasonal', description: 'Finished in top 1% of seasonal leaderboard',   icon: '/certificates/seasonal_seasonal_top_1_percent.png',   multiplierValue: 1.20, multiplierType: 'dynamic' },
];

// ── Merge helpers ─────────────────────────────────────────────────────────

export function mergeBadges(
  earnedFromApi: Array<{ id?: string; name?: string; badge_name?: string; earned_at?: string }> = []
): { activity: Badge[]; events: Badge[] } {
  const earnedIds = new Set(
    earnedFromApi.map((b) => (b.id || b.badge_name || '').toLowerCase().replace(/\s+/g, '_'))
  );
  const earnedNames = new Set(
    earnedFromApi.map((b) => (b.name || b.badge_name || '').toLowerCase())
  );

  const isEarned = (badge: Omit<Badge, 'earned' | 'earnedAt'>) =>
    earnedIds.has(badge.id) || earnedNames.has(badge.name.toLowerCase());

  const getEarnedAt = (badge: Omit<Badge, 'earned' | 'earnedAt'>) => {
    const found = earnedFromApi.find(
      (b) =>
        (b.id || b.badge_name || '').toLowerCase().replace(/\s+/g, '_') === badge.id ||
        (b.name || b.badge_name || '').toLowerCase() === badge.name.toLowerCase()
    );
    return found?.earned_at || null;
  };

  const toBadge = (b: Omit<Badge, 'earned' | 'earnedAt'>): Badge => ({
    ...b,
    earned: isEarned(b),
    earnedAt: isEarned(b) ? getEarnedAt(b) : null,
  });

  return {
    activity: ACTIVITY_BADGES.map(toBadge),
    events: EVENT_BADGES.map(toBadge),
  };
}
