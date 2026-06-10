"use client";

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';

// ──────────────────────────────────────────────────────────────────────────────
// useCampaigns — Campaign log fetcher + creator for the UTM Governance panel
//
// Backend contract (agreed shape):
//   GET  /api/utm/campaigns?active=true&limit=100  → { campaigns: Campaign[] }
//   POST /api/utm/campaigns                        → body: CampaignInput, returns the created Campaign
//
// On successful create, the hook re-fetches the list so the table is in sync
// without forcing the caller to wire its own state machine.
// ──────────────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: number;
  createdAt: string;
  createdBy: string;
  displayName: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  utmTerm: string | null;
  notes: string | null;
  budgetUSD: number | null;
  expectedReach: number | null;
  fullUrl: string;
  shortUrl: string | null;
  isArchived: boolean;
}

export interface CampaignsPayload {
  campaigns: Campaign[];
}

export interface CampaignInput {
  displayName: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string | null;
  utmTerm?: string | null;
  notes?: string | null;
  budgetUSD?: number | null;
  expectedReach?: number | null;
}

export type CreateResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; error: string };

export interface UseCampaignsOptions {
  active?: boolean;
  limit?: number;
}

export interface UseCampaignsReturn {
  data: CampaignsPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  create: (input: CampaignInput) => Promise<CreateResult>;
}

export function useCampaigns(opts: UseCampaignsOptions = {}): UseCampaignsReturn {
  const active = opts.active ?? true;
  const limit = opts.limit ?? 100;

  const [data, setData] = useState<CampaignsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    setError(null);
    apiGet<CampaignsPayload>('/api/utm/campaigns', {
      signal: ctrl.signal,
      query: { active: active ? 'true' : 'false', limit },
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
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [tick, active, limit]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const create = useCallback(async (input: CampaignInput): Promise<CreateResult> => {
    try {
      const created = await apiPost<Campaign>('/api/utm/campaigns', input);
      // Refetch to pick up the newly-inserted row in the correct sort order.
      setTick(t => t + 1);
      return { ok: true, campaign: created };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'create_failed';
      return { ok: false, error: message };
    }
  }, []);

  return { data, loading, error, refetch, create };
}
