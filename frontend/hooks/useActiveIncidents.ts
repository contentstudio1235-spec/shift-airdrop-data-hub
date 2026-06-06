"use client";
// ============================================================
// useActiveIncidents — Phase 1 Hub-Trust incident polling hook
//
// Polls GET /api/hub-trust/incidents/active every 30s. Returns the list of
// currently-open incidents. Consumers (IncidentBanner) filter by tab + metric.
//
// Failure mode: returns an empty array on any error. The banner simply
// doesn't render — there's no "could not load incidents" UI, because the
// banner is itself the canonical incident UI.
// ============================================================

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'ShiftRwa2026@@$$Key';

const POLL_INTERVAL_MS = 30_000;

export interface HubIncident {
  id: number;
  openedAt: string;
  openedBy: string;
  severity: 'P0' | 'P1' | 'P2';
  affectedTabs: string[];
  affectedMetric: string;
  hypothesis: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  fixCommitSha: string | null;
}

interface ActiveIncidentsResponse {
  incidents: HubIncident[];
}

export function useActiveIncidents(): HubIncident[] {
  const [incidents, setIncidents] = useState<HubIncident[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const tick = () => {
      fetch(`${API_BASE}/api/hub-trust/incidents/active`, {
        headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
        signal: ctrl.signal,
      })
        .then(r => (r.ok ? (r.json() as Promise<ActiveIncidentsResponse>) : null))
        .then(data => {
          if (cancelled || !data) return;
          setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
        })
        .catch(() => {
          /* silent — no incident UI is correct UI when API is down */
        });
    };

    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearInterval(id);
    };
  }, []);

  return incidents;
}
