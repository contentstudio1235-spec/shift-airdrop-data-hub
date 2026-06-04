"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export type SankeyNodeKind = 'source' | 'cohort' | 'outcome';
export interface SankeyNode { id: string; label: string; kind: SankeyNodeKind; value: number; }
export interface SankeyEdge { from: string; to: string; value: number; }
export interface WhaleOriginsPayload {
  nodes: SankeyNode[];
  edges: SankeyEdge[];
  totals: { sourceUsers: number; whales: number; whaleVolumeUSD: number; };
  computedAt: string;
  dataQuality: string;
}

export function useWhaleOrigins(): {
  data: WhaleOriginsPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<WhaleOriginsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    apiGet<WhaleOriginsPayload>('/api/attribution/whale-origins', { signal: ctrl.signal })
      .then(setData)
      .catch(err => {
        if (err?.name !== 'AbortError') setError(err.message ?? 'fetch_failed');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
