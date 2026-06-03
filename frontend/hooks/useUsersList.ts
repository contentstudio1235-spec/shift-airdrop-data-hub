"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface UsersListFilters {
  q?: string;
  source?: string;
  stitchPctMin?: number;
  walletSizeMin?: number;
  activitySince?: string;
  sortBy?: 'last_seen' | 'volume' | 'holdings' | 'x' | 'discord' | 'referral_source';
  sortDir?: 'asc' | 'desc';
}

export interface ProfileSummary {
  profileId: string;
  primaryWallet: string;
  displayName: string | null;
  lastSeenAt: string;
  firstUtmSource: string | null;
  stitchedPct: number;
  lifetimeVolumeUSD: number;
  holdings: number;
  hasX: boolean;
  hasDiscord: boolean;
}

interface UsersListResponse {
  rows: ProfileSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export function useUsersList(filters: UsersListFilters, page: number, pageSize = 50) {
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNow = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<UsersListResponse>('/api/users', {
        signal: ctl.signal,
        query: { ...filters, page, pageSize } as Record<string, string | number | undefined>,
      });
      if (!ctl.signal.aborted) setData(result);
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [JSON.stringify(filters), page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchNow, filters.q ? 250 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [fetchNow, filters.q]);

  return { data, loading, error, refetch: fetchNow };
}
