"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Filters } from './useFilters';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFunnelData<T>(path: string, filters: Filters): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(path, {
        signal: ctl.signal,
        query: filters as Record<string, string | number | undefined>,
      });
      if (!ctl.signal.aborted) setData(result);
    } catch (err) {
      if (!ctl.signal.aborted) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(filters)]); // stringify is intentional: filters is a shallow obj

  useEffect(() => {
    fetchOnce();
    return () => abortRef.current?.abort();
  }, [fetchOnce]);

  return { data, loading, error, refetch: fetchOnce };
}
