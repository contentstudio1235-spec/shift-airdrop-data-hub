"use client";

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ──────────────────────────────────────────────────────────────────────────────
// useApprovedUtmValues — Fetches the locked approved-values lists for sources
// and mediums. Both endpoints are hit in parallel via Promise.all.
//
// No polling — the lists change rarely (only via the governance exception
// process described in docs/design/2026-06-05-utm-attribution-a-to-z.md §I).
// A manual `refetch()` is exposed for the rare case where the operator wants
// to pick up a freshly-added source mid-session.
//
// Backend contract:
//   GET /api/utm/approved-sources  → string[]
//   GET /api/utm/approved-mediums  → string[]
// ──────────────────────────────────────────────────────────────────────────────

export interface UseApprovedUtmValuesReturn {
  sources: string[];
  mediums: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApprovedUtmValues(): UseApprovedUtmValuesReturn {
  const [sources, setSources] = useState<string[]>([]);
  const [mediums, setMediums] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    setError(null);
    setLoading(true);

    Promise.all([
      apiGet<string[]>('/api/utm/approved-sources', { signal: ctrl.signal }),
      apiGet<string[]>('/api/utm/approved-mediums', { signal: ctrl.signal }),
    ])
      .then(([s, m]) => {
        if (cancelled) return;
        setSources(Array.isArray(s) ? s : []);
        setMediums(Array.isArray(m) ? m : []);
      })
      .catch(err => {
        if (cancelled || err?.name === 'AbortError') return;
        setError(err?.message ?? 'fetch_failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  return { sources, mediums, loading, error, refetch };
}
