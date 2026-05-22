import posthog from 'posthog-js';

// Custom event tracking for SHIFT gamification
export const trackEvent = {
  // Wallet & Auth
  walletConnected: (wallet: string) =>
    posthog.capture('wallet_connected', { wallet: wallet.slice(0, 8) }),
  walletDisconnected: () => posthog.capture('wallet_disconnected'),

  // Trading
  tradeInitiated: (tokenSymbol: string, amount: number) =>
    posthog.capture('trade_initiated', { token: tokenSymbol, amount }),
  positionOpened: (tokenSymbol: string, sizeUSD: number) =>
    posthog.capture('position_opened', { token: tokenSymbol, size_usd: sizeUSD }),
  positionClosed: (tokenSymbol: string, holding_hours: number) =>
    posthog.capture('position_closed', { token: tokenSymbol, holding_hours }),

  // Gamification
  dailyCheckinCompleted: (streak: number) =>
    posthog.capture('daily_checkin', { streak }),
  missionCompleted: (missionId: string, missionName: string) =>
    posthog.capture('mission_completed', { mission_id: missionId, mission_name: missionName }),
  missionRewardClaimed: (missionId: string, xpAmount: number) =>
    posthog.capture('mission_reward_claimed', { mission_id: missionId, xp_amount: xpAmount }),
  badgeEarned: (badgeName: string, rarity: string) =>
    posthog.capture('badge_earned', { badge_name: badgeName, rarity }),
  levelUp: (newLevel: number) =>
    posthog.capture('level_up', { new_level: newLevel }),

  // Referrals
  referralCodeShared: (referralCount: number) =>
    posthog.capture('referral_code_shared', { referral_count: referralCount }),
  referralCompleted: (referrerWallet: string) =>
    posthog.capture('referral_completed', { referrer: referrerWallet.slice(0, 8) }),

  // Engagement
  leaderboardViewed: (context: 'xp' | 'referrals') =>
    posthog.capture('leaderboard_viewed', { context }),
  badgeGalleryOpened: () => posthog.capture('badge_gallery_opened'),
  missionsWidgetOpened: () => posthog.capture('missions_widget_opened'),

  // Custom user properties
  setUserProperties: (wallet: string, level: number, xp: number, streak: number) =>
    posthog.people.set({
      wallet: wallet.slice(0, 8),
      level,
      total_xp: xp,
      daily_streak: streak,
      last_update: new Date().toISOString(),
    }),
};
