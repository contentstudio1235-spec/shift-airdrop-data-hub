"use client";

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { CohortsSnapshot } from '@/types/cohort';

/**
 * 5-minute poll. Cohort data is "fresh enough" at minute-level — backend cache
 * is 60s, so anything tighter than that just thrashes the server-side cache
 * without ever hitting a new row.
 */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * useCohortsSnapshot — fetches GET /api/cohorts/snapshot once on mount, then
 * re-polls every 5 minutes. Pattern mirrors usePulseSnapshot.
 *
 * `refetch` forces an immediate re-fetch by bumping an internal counter.
 */
export function useCohortsSnapshot(): {
  data: CohortsSnapshot | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<CohortsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    const fetchOnce = () => {
      setError(null);
      apiGet<CohortsSnapshot>('/api/cohorts/snapshot', { signal: ctrl.signal })
        .then(payload => {
          if (cancelled) return;
          setData(payload);
        })
        .catch(err => {
          if (cancelled) return;
          if (err?.name !== 'AbortError') setError(err.message ?? 'fetch_failed');
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    };

    fetchOnce();
    const id = setInterval(fetchOnce, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      ctrl.abort();
    };
  }, [tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
