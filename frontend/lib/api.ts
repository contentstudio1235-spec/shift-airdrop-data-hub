// ============================================================
// SHIFT Airdrop — API Client
// ============================================================

import type {
  DashboardResponse,
  PositionsResponse,
  BadgesResponse,
  LeaderboardResponse,
  EventsResponse,
  HealthResponse,
  ReferralCodeInfo,
  ReferralLinks,
  SetCustomCodeResponse,
  UserReferrals,
} from './types';
import type {
  LevelInfo,
  StreakInfo,
  UserRankInfo,
  LeaderboardEntry,
} from './gamification';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generic fetch with 5-second timeout
async function apiFetch<T>(path: string, timeout = 5000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(`${API_URL}${path}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Exports ────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchHealth(): Promise<HealthResponse | null> {
  return apiFetch<HealthResponse>('/health');
}

export async function fetchDashboard(wallet: string): Promise<DashboardResponse | null> {
  if (!wallet) return null;
  return apiFetch<DashboardResponse>(`/api/dashboard/${wallet}`);
}

export async function fetchPositions(wallet: string): Promise<PositionsResponse | null> {
  if (!wallet) return null;
  return apiFetch<PositionsResponse>(`/api/positions/${wallet}/active`);
}

export async function fetchBadges(wallet: string): Promise<BadgesResponse | null> {
  if (!wallet) return null;
  return apiFetch<BadgesResponse>(`/api/badges/${wallet}`);
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardResponse | null> {
  return apiFetch<LeaderboardResponse>(`/api/leaderboard?limit=${limit}`);
}

export async function fetchEvents(): Promise<EventsResponse | null> {
  return apiFetch<EventsResponse>('/api/events');
}

export async function fetchSnagTasks(wallet: string): Promise<string[] | null> {
  if (!wallet) return null;
  const data = await apiFetch<{ wallet: string; completedTasks: string[] }>(`/api/snag/tasks/${wallet}`);
  return data?.completedTasks ?? null;
}

export async function fetchSnagPoints(wallet: string): Promise<number | null> {
  if (!wallet) return null;
  const data = await apiFetch<{ wallet: string; loyaltyPoints: number }>(`/api/snag/points/${wallet}`);
  return data?.loyaltyPoints ?? null;
}

export async function fetchReferralLinks(wallet: string): Promise<ReferralLinks | null> {
  if (!wallet) return null;
  return apiFetch<{ wallet: string; defaultLink: string; customLink: string | null }>(
    `/api/snag/referral/${wallet}`
  ).then(data => data ? { defaultLink: data.defaultLink, customLink: data.customLink } : null);
}

export async function setCustomReferralCode(
  wallet: string,
  customCode: string
): Promise<SetCustomCodeResponse | null> {
  if (!wallet || !customCode) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/api/snag/referral/${wallet}/custom`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customCode: customCode.toUpperCase() }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to set custom code');
    }

    return (await res.json()) as SetCustomCodeResponse;
  } catch (error) {
    console.error('Failed to set custom referral code:', error);
    return null;
  }
}

/**
 * Resolve a referral code to get bonus info (used by registration flow).
 */
export async function resolveReferralCode(code: string): Promise<ReferralCodeInfo | null> {
  if (!code || code.length < 4) return null;
  return apiFetch<ReferralCodeInfo>(`/api/airdrop/ref/${encodeURIComponent(code)}`);
}

/**
 * Get all referrals made by a wallet.
 */
export async function fetchUserReferrals(wallet: string): Promise<UserReferrals | null> {
  if (!wallet) return null;
  return apiFetch<UserReferrals>(`/api/airdrop/referrals/${wallet}`);
}

// ── Gamification API ───────────────────────────────────────

export async function processDailyCheckin(wallet: string): Promise<{
  streakCount: number;
  xpAwarded: number;
  isNewStreak: boolean;
  message: string;
} | null> {
  if (!wallet) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/api/dashboard/${wallet}/checkin`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

export async function fetchStreakInfo(wallet: string): Promise<StreakInfo | null> {
  if (!wallet) return null;
  return apiFetch<StreakInfo>(`/api/dashboard/${wallet}/streak`);
}

export async function fetchUserLevel(wallet: string): Promise<LevelInfo | null> {
  if (!wallet) return null;
  return apiFetch<LevelInfo>(`/api/dashboard/${wallet}/level`);
}

export async function fetchUserRank(wallet: string): Promise<UserRankInfo | null> {
  if (!wallet) return null;
  return apiFetch<UserRankInfo>(`/api/dashboard/${wallet}/rank`);
}

export async function fetchTopLeaderboard(limit = 100): Promise<{
  count: number;
  entries: LeaderboardEntry[];
} | null> {
  return apiFetch<{ count: number; entries: LeaderboardEntry[] }>(
    `/api/dashboard/leaderboard/top?limit=${limit}`
  );
}

export async function fetchLeaderboardContext(
  wallet: string,
  context = 5
): Promise<{ count: number; entries: LeaderboardEntry[] } | null> {
  if (!wallet) return null;
  return apiFetch<{ count: number; entries: LeaderboardEntry[] }>(
    `/api/dashboard/${wallet}/leaderboard-context?context=${context}`
  );
}

// ── SNAG & Referral Helpers ────────────────────────────────

export function getLoyaltyPageUrl(): string {
  return process.env.NEXT_PUBLIC_SNAG_LOYALTY_URL || 'https://loyalty.shiftrwa.xyz';
}

export function getAirdropUrl(): string {
  return process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz';
}
