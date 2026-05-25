// ============================================================
// SHIFT Airdrop — Shared TypeScript Interfaces
// ============================================================

export interface DashboardResponse {
  wallet: string;
  totalXp: number;
  loyaltyPoints: number;
  claimMultiplier: number;
  rank: number;
  activePositions: number;
  currentStreak: number;
  projectedAllocation: string;
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
}

export interface PositionsResponse {
  positions: Position[];
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
  totalXP: number;
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

export type WalletType = 'phantom' | 'backpack' | 'solflare' | 'magiceden' | 'metamask' | null;
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
  connectMetaMask: () => Promise<void>;
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
