// ============================================================
// SHIFT Airdrop — Static Badge Catalog
// ============================================================
// Ground truth for badge metadata. API response tells us which
// are earned; we merge here.

import type { Badge } from './types';

export const ACTIVITY_BADGES: Omit<Badge, 'earned' | 'earnedAt'>[] = [
  {
    id: 'first_trade',
    name: 'First Trade',
    description: 'Complete your first swap on Jupiter',
    xpValue: 100,
    rarity: 'COMMON',
    category: 'activity',
    icon: '⚡',
  },
  {
    id: 'volume_veteran_i',
    name: 'Volume Veteran I',
    description: 'Trade $1,000 total volume',
    xpValue: 150,
    rarity: 'COMMON',
    category: 'activity',
    icon: '📈',
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    description: 'Hold a position for 30+ days',
    xpValue: 500,
    rarity: 'RARE',
    category: 'activity',
    icon: '💎',
  },
  {
    id: 'long_hauler',
    name: 'Long-Hauler',
    description: 'Hold any position for 12+ weeks',
    xpValue: 1500,
    rarity: 'EPIC',
    category: 'activity',
    icon: '🚢',
  },
  {
    id: 'maxed_out',
    name: 'Maxed Out',
    description: 'Reach the 3.0x position multiplier cap',
    xpValue: 2000,
    rarity: 'LEGENDARY',
    category: 'activity',
    icon: '🔥',
  },
  {
    id: 'streak_holder_i',
    name: 'Streak Holder I',
    description: 'Maintain an active position for 4 consecutive weeks',
    xpValue: 700,
    rarity: 'RARE',
    category: 'activity',
    icon: '🔗',
  },
  {
    id: 'jupiter_router',
    name: 'Jupiter Router',
    description: 'Execute 10 Jupiter swaps',
    xpValue: 300,
    rarity: 'RARE',
    category: 'activity',
    icon: '🪐',
  },
  {
    id: 'genesis',
    name: 'Genesis',
    description: 'Participate in Season 1 airdrop program',
    xpValue: 0,
    rarity: 'LEGENDARY',
    category: 'activity',
    icon: '🌱',
  },
  {
    id: 'volume_veteran_ii',
    name: 'Volume Veteran II',
    description: 'Trade $10,000 total volume',
    xpValue: 400,
    rarity: 'RARE',
    category: 'activity',
    icon: '📊',
  },
  {
    id: 'volume_veteran_iii',
    name: 'Volume Veteran III',
    description: 'Trade $100,000 total volume',
    xpValue: 1000,
    rarity: 'EPIC',
    category: 'activity',
    icon: '🏆',
  },
];

export const EVENT_BADGES: Omit<Badge, 'earned' | 'earnedAt'>[] = [
  {
    id: 'fomc_trader',
    name: 'FOMC Trader',
    description: 'Trade during an FOMC volatility window',
    xpValue: 400,
    rarity: 'RARE',
    category: 'event',
    icon: '🏛️',
  },
  {
    id: 'earnings_reactor',
    name: 'Earnings Reactor',
    description: 'Trade TSL tokens during a Tesla earnings event',
    xpValue: 450,
    rarity: 'RARE',
    category: 'event',
    icon: '📊',
  },
  {
    id: 'market_bull_trader',
    name: 'Market Bull Trader',
    description: 'Trade SPX3L during a macro bull window',
    xpValue: 500,
    rarity: 'RARE',
    category: 'event',
    icon: '🐂',
  },
  {
    id: 'shift_holder',
    name: 'SHIFT Holder',
    description: 'Hold at least 1 SHIFT token at snapshot',
    xpValue: 350,
    rarity: 'RARE',
    category: 'event',
    icon: '🔷',
  },
  {
    id: 'tech_bear_trader',
    name: 'Tech Bear Trader',
    description: 'Trade SOX3S during a semiconductor downturn event',
    xpValue: 400,
    rarity: 'RARE',
    category: 'event',
    icon: '🐻',
  },
  {
    id: 'market_defensive',
    name: 'Market Defensive',
    description: 'Hold SPX3S during a macro risk-off event',
    xpValue: 450,
    rarity: 'EPIC',
    category: 'event',
    icon: '🛡️',
  },
  {
    id: 'leverage_master',
    name: 'Leverage Master',
    description: 'Trade 3x leverage tokens in 3 different events',
    xpValue: 1500,
    rarity: 'EPIC',
    category: 'event',
    icon: '⚙️',
  },
  {
    id: 'multi_asset_trader',
    name: 'Multi-Asset Trader',
    description: 'Hold positions in 4+ different SHIFT tokens simultaneously',
    xpValue: 2000,
    rarity: 'LEGENDARY',
    category: 'event',
    icon: '🌐',
  },
];

// Merge API-earned badges with static catalog
export function mergeBadges(
  earnedFromApi: Array<{ id?: string; name?: string; badge_name?: string; earned_at?: string }> = []
): { activity: Badge[]; events: Badge[] } {
  const earnedIds = new Set(
    earnedFromApi.map((b) => (b.id || b.badge_name || '').toLowerCase().replace(/\s+/g, '_'))
  );
  const earnedNames = new Set(
    earnedFromApi.map((b) => (b.name || b.badge_name || '').toLowerCase())
  );

  const isEarned = (badge: Omit<Badge, 'earned' | 'earnedAt'>) => {
    return earnedIds.has(badge.id) || earnedNames.has(badge.name.toLowerCase());
  };

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
