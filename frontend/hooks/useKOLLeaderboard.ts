"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface KOLEntry {
  referrer: string;
  source: 'snag_referrals' | 'utm' | 'other';
  users: number;
  holders: number;
  whales: number;
  holderRate: number;
  totalVolumeUSD: number;
  avgVolumePerUserUSD: number;
  score: number;
  firstSeenAt: string;
  lastSeenAt: string;
}
export interface KOLPayload {
  rows: KOLEntry[];
  totals: { totalReferrers: number; activeReferrers: number; };
  computedAt: string;
  dataQuality: string;
}

export function useKOLLeaderboard({ limit = 50 }: { limit?: number } = {}): {
  data: KOLPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<KOLPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    apiGet<KOLPayload>('/api/attribution/kol-leaderboard', { signal: ctrl.signal, query: { limit } })
      .then(setData)
      .catch(err => { if (err?.name !== 'AbortError') setError(err.message ?? 'fetch_failed'); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [tick, limit]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
