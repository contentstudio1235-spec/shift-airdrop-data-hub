// ============================================================
// SHIFT RWA Data Hub — Comprehensive Type Definitions
// All API response shapes for the 6-page Data Hub
// ============================================================

// ── Admin Dashboard ───────────────────────────────────────────
export interface AdminDashboard {
  success: boolean;
  metrics: {
    total_users: number;
    total_xp: number;
    badge_count: number;
    certificate_count: number;
    hof_count: number;
    avg_multiplier: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource_type: string;
    admin_wallet: string;
    created_at: string;
  }>;
}

// ── On-Chain Holders ──────────────────────────────────────────
export interface OnchainToken {
  symbol: string;
  name: string;
  mint: string;
  holders: number;
}
export interface OnchainHolders {
  tokens: OnchainToken[];
  uniqueHolders: number;
  totalHolderSlots: number;
  fetchedAt: string;
  cached: boolean;
}

// ── Analytics / Dashboard Stats ──────────────────────────────
export type FunnelTab = 'aum' | 'holder' | 'referral';
export interface FunnelStep {
  name: string;
  count: number;
}
export interface StitchedRecord {
  wallet: string;
  ga_user_id: string | null;
  snag_user_id: string | null;
  total_xp: string;
  updated_at: string;
}
export interface AnalyticsDashboard {
  success: boolean;
  metrics: {
    totalUsers: number;
    stitchedUsers: number;
    activeHolders: number;
    totalVolume: number;
  };
  funnels: {
    aum: FunnelStep[];
    holder: FunnelStep[];
    referral: FunnelStep[];
  };
  recentStitched: StitchedRecord[];
}

// ── Leaderboard ───────────────────────────────────────────────
export interface LeaderboardEntry {
  wallet: string;
  totalSp: number;
  positionSp: number;
  socialSp: number;
  claimMultiplier: number;
  badgeCount: number;
  rank: number;
}
export interface Leaderboard {
  count: number;
  entries: LeaderboardEntry[];
}

// ── GA4 Analytics ────────────────────────────────────────────
export interface GA4ChannelRow {
  channel: string;
  sessions: string;
  activeUsers: string;
  bounceRate?: string;
  avgSessionDuration?: string;
  screenPageViews?: string;
  newUsers?: string;
  eventCount?: string;
  pct?: number;
}
export interface GA4TopPage {
  page: string;
  views: number;
  users: number;
}
export interface GA4DailyPoint {
  date: string;
  activeUsers: number;
  sessions: number;
}
export interface GA4Data {
  available: boolean;
  reason?: string;
  period?: string;
  totals: {
    activeUsers: number;
    sessions: number;
    pageViews?: number;
    screenPageViews?: number;
    newUsers: number;
    bounceRate?: number;
    avgSessionDuration?: number;
    eventCount?: number;
  };
  channels: GA4ChannelRow[];
  topPages?: GA4TopPage[];
  pages?: Array<{ pagePath: string; screenPageViews: string; activeUsers: string }>;
  dailyTrend?: GA4DailyPoint[];
  cachedAt?: string;
}

// ── Aggregated KPIs ───────────────────────────────────────────
export interface AggregatedKPIs {
  aum: {
    totalHolders: number;
    totalSlots: number;
    topToken: string;
    topTokenHolders: number;
  };
  volume: {
    totalUSD: number;
    avgPositionUSD: number;
    openPositions: number;
    allPositions: number;
  };
  growth: {
    newUsersToday: number;
    newUsersWeek: number;
    totalUsers: number;
  };
  engagement: {
    avgStreak: number;
    totalXP: number;
    badgesAwarded: number;
    avgMultiplier: number;
  };
  snag: {
    linkedAccounts: number;
    totalPoints: number;
    avgMultiplier: number;
  };
}

// ── Hub-wide State ────────────────────────────────────────────
export interface HubData {
  admin: AdminDashboard | null;
  onchain: OnchainHolders | null;
  analytics: AnalyticsDashboard | null;
  leaderboard: Leaderboard | null;
  ga4: GA4Data | null;
  kpis: AggregatedKPIs | null;
  lastRefresh: Date | null;
  loading: boolean;
  errors: Record<string, string>;
}

export type HubPage = 'overview' | 'markets' | 'analytics' | 'stitched' | 'portfolios' | 'admin';
