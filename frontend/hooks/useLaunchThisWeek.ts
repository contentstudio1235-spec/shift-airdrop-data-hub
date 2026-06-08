"use client";

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { LaunchThisWeekSnapshot } from '@/types/pulse';

/** Poll interval — matches usePulseSnapshot's 60s for consistency. */
const POLL_INTERVAL_MS = 60_000;

/**
 * useLaunchThisWeek (HARVEST-001 / MR !30) — fetches
 * GET /api/pulse/launch-this-week once on mount, then re-polls every
 * 60 seconds. Mirrors `usePulseSnapshot` pattern.
 *
 * Backed by a 60s in-memory cache on the server, so polling more often
 * than that would only burn bandwidth without freshening the data.
 */
export function useLaunchThisWeek(): {
  data: LaunchThisWeekSnapshot | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<LaunchThisWeekSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    const fetchOnce = () => {
      setError(null);
      apiGet<LaunchThisWeekSnapshot>('/api/pulse/launch-this-week', { signal: ctrl.signal })
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
      ctrl.abort();
      clearInterval(id);
    };
  }, [tick]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  };
}
