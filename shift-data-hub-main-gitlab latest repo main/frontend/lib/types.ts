// ============================================================
// SHIFT Airdrop — Shared TypeScript Interfaces
// ============================================================

export interface DashboardResponse {
  wallet: string;
  // Combined SP (position holding + social/referral)
  totalSp: number;
  positionSp: number;
  socialSp: number;
  hasSnagAccount: boolean;
  // Legacy fields kept for backwards-compat
  totalXp: number;
  loyaltyPoints: number;
  claimMultiplier: number;
  rank: number;
  activePositions: number;
  currentStreak: number;
  projectedAllocation: string;
  // P&L summary (new)
  totalUnrealizedPnL?: number;
  totalRealizedPnL?: number;
  totalPnLUsd?: number;
  totalPnLPct?: number;
}

export interface Position {
  id: string;
  asset: string;
  positionSizeUsd: number;
  weeksHeld: number;
  daysHeld: number;
  currentMultiplier: number;
  nextMultiplier: number;
  xpPerWeek: number;
  progressionHook: string;
  status: 'open' | 'closed';
  openedAt: string;
  // P&L fields (new)
  priceAtOpen?: number;
  currentPrice?: number;
  pnlUsd?: number;
  pnlPct?: number;
}

export interface PositionsResponse {
  positions: Position[];
}

export interface HistoryPosition {
  id: string;
  asset: string;
  positionSizeUsd: number;
  openedAt: string;
  closedAt: string | null;
  weeksHeld: number;
  finalMultiplier: number;
  xpPerWeek: number;
  totalSpEarned: number;
  status: 'closed';
  // P&L fields (new)
  priceAtOpen?: number;
  priceAtClose?: number;
  pnlUsd?: number;
  pnlPct?: number;
}

export interface PositionHistoryResponse {
  positions: HistoryPosition[];
}

export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type BadgeCategory = 'activity' | 'event';

export interface Badge {
  id: string;
  name: string;
  description: string;
  xpValue: number;
  earned: boolean;
  earnedAt?: string | null;
  rarity: BadgeRarity;
  category: BadgeCategory;
  icon?: string;
  count?: number;
}

export interface BadgesResponse {
  badges: Badge[];
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalSp?: number;       // Combined score (positionSp + socialSp) — main display
  positionSp?: number;    // From holding SHIFT positions
  socialSp?: number;      // From SNAG tasks + referrals
  totalXP: number;        // Legacy: same as positionSp
  multiplier: number;
  badgeCount: number;
  tier?: string;
  tierKey?: string;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface ShiftEvent {
  id: string;
  event_name: string;
  event_type: 'twitter' | 'fomc' | 'earnings' | 'macro' | 'ai';
  start_time: string;
  end_time: string;
  eligible_assets: string[];
  badge_reward: string;
  is_active: boolean;
  created_at?: string;
}

export interface EventsResponse {
  events: ShiftEvent[];
}

// ── Referral API Types ──────────────────────────────────────────────────

export interface ReferralCodeInfo {
  code: string;
  displayName: string | null;
  isKol: boolean;
  multiplierBonus: number;
  multiplierType: 'dynamic' | 'permanent' | 'none';
}

export interface ReferralLinks {
  defaultLink: string;
  customLink: string | null;
}

export interface SetCustomCodeResponse {
  success: boolean;
  customLink: string;
}

export interface UserReferrals {
  wallet: string;
  referrals: Array<{
    wallet: string;
    codeUsed: string;
    isKol: boolean;
    bonusMultiplier: number;
    bonusType: string;
    referredAt: string;
    refereeXp: number;
  }>;
  totalReferrals: number;
}

export type WalletType = 'phantom' | 'backpack' | 'solflare' | 'magiceden' | 'metamask-solana' | 'metamask' | 'trustwallet' | 'jupiter' | null;
export type WalletChain = 'solana' | 'evm' | null;

export interface WalletContextValue {
  wallet: string | null;
  walletType: WalletType;
  walletChain: WalletChain;
  connecting: boolean;
  connectPhantom: () => Promise<void>;
  connectBackpack: () => Promise<void>;
  connectSolflare: () => Promise<void>;
  connectMagicEden: () => Promise<void>;
  connectMetaMaskSolana: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  connectTrustWallet: () => Promise<void>;
  connectJupiter: () => Promise<void>;
  disconnect: () => void;
  shortWallet: (addr: string) => string;
}

export interface TokenDefinition {
  sym: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  direction: 'up' | 'down';
  mint: string;
  baseMultiplier: number;
  description: string;
  // Official CSV data
  imageUrl: string;
  alpacaSymbol: string;
  underlyingEtf: string;
  isin: string;
  solscanUrl: string;
  explorerUrl: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  env: string;
  uptime: number;
}
