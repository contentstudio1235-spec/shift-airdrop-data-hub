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
} from './types';

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
