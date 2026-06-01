// ============================================================
// SHIFT RWA Cross-Channel Data Hub — Shared Types
// ============================================================

export interface DashboardMetrics {
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

export interface DashboardStats {
  success: boolean;
  metrics: DashboardMetrics;
  funnels: {
    aum: FunnelStep[];
    holder: FunnelStep[];
    referral: FunnelStep[];
  };
  recentStitched: StitchedProfile[];
}

export type FunnelTab = 'aum' | 'holder' | 'referral';
