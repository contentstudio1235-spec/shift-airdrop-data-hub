"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface IdentityLink {
  linkId: string;
  type: 'wallet' | 'ga_client_id' | 'snag_user_id' | 'x_handle' | 'discord_id' | 'telegram_id' | 'email';
  value: string;
  confidence: 'deterministic' | 'probabilistic' | 'manual';
  linkedAt: string;
  linkedBy: string;
  unlinkedAt: string | null;
}

export interface ProfileWithLinks {
  profileId: string;
  primaryWallet: string;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  lastUtmSource: string | null;
  lastUtmMedium: string | null;
  lastUtmCampaign: string | null;
  attributionLockedAt: string | null;
  links: IdentityLink[];
  lifetimeStats?: { xp: number; volumeUSD: number; positions: number; badges: number };
}

export function useUserProfile(profileId: string | null) {
  const [data, setData] = useState<ProfileWithLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchNow = useCallback(async () => {
    if (!profileId) { setData(null); return; }
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<ProfileWithLinks>(`/api/users/${profileId}`, { signal: ctl.signal });
      if (!ctl.signal.aborted) setData(result);
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchNow(); return () => abortRef.current?.abort(); }, [fetchNow]);
  return { data, loading, error, refetch: fetchNow };
}
