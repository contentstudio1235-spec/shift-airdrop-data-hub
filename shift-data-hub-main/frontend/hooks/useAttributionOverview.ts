"use client";

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface ChannelROIRow {
  source: string;
  users: number;
  stitchedUsers: number;
  holders: number;
  whales: number;
  totalVolumeUSD: number;
  avgPositionUSD: number;
  attribution: 'first_touch' | 'last_touch' | 'multi_touch';
}

export interface TopCampaignRow {
  campaign: string;
  source: string | null;
  medium: string | null;
  profiles: number;
}

export interface AttributionCoverage {
  total: number;
  withUtm: number;
  withReferralOnly: number;
  neither: number;
  percentWithSignal: number;
  percentWithUtm: number;
}

export interface AttributionOverview {
  channels: ChannelROIRow[];
  campaigns: TopCampaignRow[];
  coverage: AttributionCoverage;
  computedAt: string;
  dataQuality: string;
  note?: string;
}

export function useAttributionOverview(): {
  data: AttributionOverview | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<AttributionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    apiGet<AttributionOverview>('/api/attribution/overview', { signal: ctrl.signal })
      .then(payload => setData(payload))
      .catch(err => {
        if (err?.name !== 'AbortError') setError(err.message ?? 'fetch_failed');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
