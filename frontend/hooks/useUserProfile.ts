"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';

export type IdentityType =
  | 'wallet'
  | 'ga_client_id'
  | 'snag_user_id'
  | 'x_handle'
  | 'discord_id'
  | 'telegram_id'
  | 'email';

export type IdentityConfidence = 'deterministic' | 'probabilistic' | 'manual';

export interface IdentityLink {
  linkId: string;
  type: IdentityType;
  value: string;
  confidence: IdentityConfidence;
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

// ─── Wire format returned by GET /api/users/:profileId ───────────────
// The backend serializes link rows with DB-style field names (`id`,
// `identityType`, `identityValue`). The rest of the frontend reads the
// friendlier `linkId`/`type`/`value` shape, so we normalize on read.
interface RawIdentityLink {
  id: number;
  profileId: string;
  identityType: IdentityType;
  identityValue: string;
  confidence: IdentityConfidence;
  evidenceEventId: number | null;
  linkedAt: string;
  linkedBy: string;
  unlinkedAt: string | null;
  unlinkedBy: string | null;
  unlinkReason: string | null;
}

interface RawProfileWithLinks extends Omit<ProfileWithLinks, 'links'> {
  links: RawIdentityLink[];
}

function normalizeLink(raw: RawIdentityLink): IdentityLink {
  return {
    linkId: String(raw.id),
    type: raw.identityType,
    value: raw.identityValue,
    confidence: raw.confidence,
    linkedAt: raw.linkedAt,
    linkedBy: raw.linkedBy,
    unlinkedAt: raw.unlinkedAt,
  };
}

function normalizeProfile(raw: RawProfileWithLinks): ProfileWithLinks {
  const { links, ...rest } = raw;
  return { ...rest, links: links.map(normalizeLink) };
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
      const raw = await apiGet<RawProfileWithLinks>(`/api/users/${profileId}`, { signal: ctl.signal });
      if (!ctl.signal.aborted) setData(normalizeProfile(raw));
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchNow(); return () => abortRef.current?.abort(); }, [fetchNow]);
  return { data, loading, error, refetch: fetchNow };
}
