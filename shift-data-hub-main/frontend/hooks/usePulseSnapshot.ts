"use client";

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { PulseSnapshot } from '@/types/pulse';

/** Poll interval for the Pulse snapshot. 60s matches the freshness budget in the IA spec. */
const POLL_INTERVAL_MS = 60_000;

/**
 * usePulseSnapshot — fetches GET /api/pulse/snapshot once on mount, then re-polls
 * every 60 seconds. Mirrors the pattern from useAttributionOverview.
 *
 * The returned `refetch` increments an internal counter to force an immediate
 * re-fetch without waiting for the next interval tick.
 */
export function usePulseSnapshot(): {
  data: PulseSnapshot | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<PulseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    const fetchOnce = () => {
      setError(null);
      apiGet<PulseSnapshot>('/api/pulse/snapshot', { signal: ctrl.signal })
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
