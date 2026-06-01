// ============================================================
// SHIFT RWA Cross-Channel Data Hub — Shared Types
// Full data model from all 4 live API endpoints
// ============================================================

// --- /api/admin/dashboard ---
export interface AdminDashboardMetrics {
  total_users: number;
  total_xp: number;
  badge_count: number;
  certificate_count: number;
  hof_count: number;
  avg_multiplier: number;
}

export interface AdminDashboard {
  success: boolean;
  metrics: AdminDashboardMetrics;
  recentActivity: any[];
}

// --- /api/admin/onchain-holders ---
export interface TokenHolder {
  symbol: string;
  name: string;
  mint: string;
  holders: number;
}

export interface OnchainHolders {
  tokens: TokenHolder[];
  uniqueHolders: number;
  totalHolderSlots: number;
  fetchedAt: string;
  cached: boolean;
}

// --- /api/analytics/dashboard-stats ---
export interface AnalyticsMetrics {
  totalUsers: number;
  stitchedUsers: number;
  activeHolders: number;
  totalVolume: number;
}

export interface FunnelStep {
  name: string;
  count: number;
}

export interface StitchedProfile {
  wallet: string;
  ga_user_id: string;
  snag_custom_referral_code: string | null;
  total_xp: number;
  snag_points: number;
  updated_at: string;
}

export interface AnalyticsDashboard {
  success: boolean;
  metrics: AnalyticsMetrics;
  funnels: {
    aum: FunnelStep[];
    holder: FunnelStep[];
    referral: FunnelStep[];
  };
  recentStitched: StitchedProfile[];
}

// --- /api/leaderboard ---
export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalSp: number;
  positionSp: number;
  socialSp: number;
  totalXP: number;
  multiplier: number;
  badgeCount: number;
}

export interface Leaderboard {
  leaderboard: LeaderboardEntry[];
}

// --- Combined hub state ---
export interface HubData {
  admin: AdminDashboard | null;
  onchain: OnchainHolders | null;
  analytics: AnalyticsDashboard | null;
  leaderboard: Leaderboard | null;
}

export type FunnelTab = 'aum' | 'holder' | 'referral';
