"use client";

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

// ──────────────────────────────────────────────────────────────────────────────
// useUtmViolations — Polling hook for the UTM Governance panel
//
// Mirrors the shape of useAttributionOverview: { data, loading, error, refetch }.
// Polls `/api/utm/violations` every 60 seconds so the Engineering operator sees
// new violations land in near-real-time without manual refresh.
//
// Backend contract (agreed shape):
//   GET /api/utm/violations?since=ISO&limit=50&reason=<filter>
//     → { violations: UtmViolation[] }
//
// Failure mode: when the backend isn't deployed yet, `error` will populate with
// the 4xx/5xx message from apiGet, and `data` stays null. The panel renders an
// empty / error state — no console explosion.
// ──────────────────────────────────────────────────────────────────────────────

export type UtmViolationField =
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_content'
  | 'utm_term';

export interface UtmViolation {
  id: number;
  occurredAt: string;
  profileId: string | null;
  rawUrl: string;
  rejectedField: UtmViolationField;
  rejectedValue: string;
  reason: string;
}

export interface UtmViolationsPayload {
  violations: UtmViolation[];
}

const POLL_INTERVAL_MS = 60_000;

export interface UseUtmViolationsOptions {
  /** ISO timestamp — only violations after this point. Default: 7 days ago. */
  since?: string;
  limit?: number;
  reason?: string;
}

export interface UseUtmViolationsReturn {
  data: UtmViolationsPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUtmViolations(
  opts: UseUtmViolationsOptions = {},
): UseUtmViolationsReturn {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since = opts.since ?? sevenDaysAgo;
  const limit = opts.limit ?? 50;
  const reason = opts.reason;

  const [data, setData] = useState<UtmViolationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    const run = () => {
      setError(null);
      apiGet<UtmViolationsPayload>('/api/utm/violations', {
        signal: ctrl.signal,
        query: { since, limit, reason },
      })
        .then(payload => {
          if (cancelled) return;
          setData(payload);
        })
        .catch(err => {
          if (cancelled || err?.name === 'AbortError') return;
          setError(err?.message ?? 'fetch_failed');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    run();
    const id = setInterval(run, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      ctrl.abort();
    };
    // tick triggers manual refetch; option changes re-arm the poller.
  }, [tick, since, limit, reason]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  };
}
