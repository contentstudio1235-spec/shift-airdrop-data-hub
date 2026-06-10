"use client";
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api';
import type { IdentityLink, ProfileWithLinks } from './useUserProfile';

type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError | Error };

interface AddLinkPayload {
  type: 'wallet' | 'ga_client_id' | 'snag_user_id' | 'social_x' | 'social_discord' | 'social_telegram';
  value: string;
  confidence?: 'deterministic' | 'probabilistic' | 'manual';
  evidence?: string;
}

async function tryRun<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err };
    if (err instanceof Error) return { ok: false, error: err };
    return { ok: false, error: new Error(String(err)) };
  }
}

export function useIdentityActions() {
  const addLink = useCallback(async (profileId: string, payload: AddLinkPayload): Promise<Result<IdentityLink>> => {
    return tryRun(() => apiPost<IdentityLink>(`/api/users/${profileId}/links`, payload));
  }, []);

  const unlinkIdentity = useCallback(async (profileId: string, linkId: string, reason: string): Promise<Result<{ unlinkedAt: string }>> => {
    if (!reason || reason.trim().length < 10) {
      return { ok: false, error: new Error('reason required (min 10 chars)') };
    }
    return tryRun(() => apiDelete<{ unlinkedAt: string }>(`/api/users/${profileId}/links/${linkId}`, { reason }));
  }, []);

  const mergeProfiles = useCallback(async (winnerId: string, loserId: string, reason: string): Promise<Result<ProfileWithLinks>> => {
    if (!reason || reason.trim().length < 10) {
      return { ok: false, error: new Error('reason required (min 10 chars)') };
    }
    return tryRun(() => apiPost<ProfileWithLinks>(`/api/users/${winnerId}/merge`, { loserProfileId: loserId, reason }));
  }, []);

  const setPrimaryWallet = useCallback(async (profileId: string, wallet: string): Promise<Result<ProfileWithLinks>> => {
    return tryRun(() => apiPatch<ProfileWithLinks>(`/api/users/${profileId}/primary-wallet`, { wallet }));
  }, []);

  const forgetUser = useCallback(async (profileId: string, reason: string): Promise<Result<{ forgottenAt: string }>> => {
    if (!reason || reason.trim().length < 20) {
      return { ok: false, error: new Error('reason required (min 20 chars)') };
    }
    return tryRun(() => apiPost<{ forgottenAt: string }>(`/api/users/${profileId}/forget`, { reason }));
  }, []);

  return { addLink, unlinkIdentity, mergeProfiles, setPrimaryWallet, forgetUser };
}
