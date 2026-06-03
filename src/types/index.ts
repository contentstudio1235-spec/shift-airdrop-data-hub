// ============================================================
// SHIFT Airdrop MVP — TypeScript Type Definitions
// ============================================================

// ── Database Models ──

export interface User {
  wallet: string;
  total_xp: number;
  claim_multiplier: number;
  current_streak: number;
  last_active: Date | null;
  snag_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Position {
  id: string;
  wallet: string;
  asset: string;
  asset_mint: string | null;
  position_size_usd: number;
  token_amount: number | null;
  price_at_open: number | null;
  price_at_close: number | null;
  close_value_usd: number | null;
  opened_at: Date;
  closed_at: Date | null;
  current_multiplier: number;
  xp_generated: number;
  last_xp_calc: Date | null;
  status: PositionStatus;
  tx_signature_open: string;
  tx_signature_close: string | null;
  extracted_at: Date | null;
  created_at: Date;
}

export type PositionStatus = 'open' | 'closed' | 'filtered';

export interface Badge {
  id: string;
  wallet: string;
  badge_name: BadgeName;
  snag_badge_id: string | null;
  earned_at: Date;
}

export type BadgeName = 'first_trade' | 'diamond_hands' | 'earnings_reactor' | 'fomc_trader' | 'shift_holder' | 'fed_day_trade' | 'cpi_bet' | 'news_reactor' | 'earnings_conviction' | 'geopolitical_trade' | 'long_hauler' | 'the_believer';

export interface Event {
  id: string;
  event_name: string;
  event_type: EventType;
  start_time: Date;
  end_time: Date;
  eligible_assets: string[];
  badge_reward: string | null;
  is_active: boolean;
  created_at: Date;
}

export type EventType = 'macro' | 'earnings';

export interface AntiFarmLogEntry {
  id: string;
  wallet: string;
  reason: AntiFarmReason;
  position_id: string | null;
  details: Record<string, unknown>;
  flagged_at: Date;
}

export type AntiFarmReason = 'dust' | 'wash_trade' | 'cooldown' | 'min_hold';

export interface ClaimMultiplierLog {
  id: string;
  wallet: string;
  old_value: number;
  new_value: number;
  reason: string;
  applied_at: Date;
}

// ── Helius Types ──

export interface HeliusWebhookPayload {
  type: string;
  signature: string;
  timestamp: number;
  slot: number;
  fee: number;
  feePayer: string;
  nativeTransfers: HeliusNativeTransfer[];
  tokenTransfers: HeliusTokenTransfer[];
  accountData: HeliusAccountData[];
  description: string;
  source: string;
  events?: {
    swap?: HeliusSwapEvent;
  };
}

export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
  decimals?: number;
}

export interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
  }>;
}

export interface HeliusSwapEvent {
  nativeInput?: { account: string; amount: string };
  nativeOutput?: { account: string; amount: string };
  tokenInputs: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: { tokenAmount: string; decimals: number };
  }>;
  tokenOutputs: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: { tokenAmount: string; decimals: number };
  }>;
  tokenFees: Array<unknown>;
  nativeFees: Array<unknown>;
  innerSwaps: Array<unknown>;
}

// ── Jupiter Price Types ──

export interface JupiterPriceResponse {
  data: Record<string, {
    id: string;
    type: string;
    price: string;
  }>;
  timeTaken: number;
}

// ── Service Return Types ──

export interface AntiFarmResult {
  filtered: boolean;
  reason?: AntiFarmReason;
  details?: Record<string, unknown>;
}

export interface BadgeAward {
  badge_name: BadgeName;
  wallet: string;
}

export interface DashboardData {
  wallet: string;
  totalXP: number;
  claimMultiplier: number;
  currentStreak: number;
  rank: number | null;
  positions: PositionCard[];
  badges: Badge[];
  nextMilestone: MilestoneInfo | null;
}

export interface PositionCard {
  id: string;
  asset: string;
  positionSizeUSD: number;
  weeksHeld: number;
  daysHeld: number;
  currentMultiplier: number;
  xpPerWeek: number;
  xpGenerated: number;
  nextMultiplierIn: string; // "+0.1x in 3 days"
  status: PositionStatus;
}

export interface MilestoneInfo {
  type: 'multiplier' | 'badge' | 'streak';
  description: string; // "Diamond Hands in 12 days"
  progress: number;    // 0-1
  target: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalXP: number;
  multiplier: number;
  badgeCount: number;
}

// ── API Request/Response ──

export interface CreateEventRequest {
  event_name: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  eligible_assets: string[];
  badge_reward?: string;
}

export interface WebhookRoute {
  path: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
}
