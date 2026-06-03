"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface TimelineEntry {
  id: number;
  eventName: string;
  occurredAt: string;
  source: string | null;
  asset: string | null;
  valueUSD: number | null;
  payload: Record<string, unknown>;
}

export function useUserTimeline(profileId: string | null) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (before?: string, append = false) => {
    if (!profileId) { setEntries([]); return; }
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<{ entries: TimelineEntry[] }>(
        `/api/users/${profileId}/timeline`,
        { signal: ctl.signal, query: { limit: 30, before } },
      );
      if (ctl.signal.aborted) return;
      setEntries(prev => append ? [...prev, ...result.entries] : result.entries);
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [profileId]);

  const loadMore = useCallback(async () => {
    const oldest = entries[entries.length - 1];
    if (!oldest) return;
    await fetchPage(oldest.occurredAt, true);
  }, [entries, fetchPage]);

  useEffect(() => {
    if (profileId) fetchPage();
    else setEntries([]);
    return () => abortRef.current?.abort();
  }, [profileId, fetchPage]);

  return { entries, loading, error, loadMore, refetch: () => fetchPage() };
}
