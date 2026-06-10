"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Build a URL anchor for deep-linking to a user profile.
 * Used by funnel rows + RealtimeLedger to wrap wallet/identity cells.
 */
export function linkToProfile(profileId: string | null | undefined): string | null {
  if (!profileId) return null;
  return `/admin/data-hub?tab=users&profileId=${encodeURIComponent(profileId)}`;
}

export function linkToProfileByWallet(wallet: string): string {
  return `/admin/data-hub?tab=users&wallet=${encodeURIComponent(wallet)}`;
}

/**
 * Hook for navigating to a profile from inside the data-hub.
 * Updates URL search params without a full page reload.
 */
export function useProfileDeepLink() {
  const router = useRouter();
  const params = useSearchParams();

  return useCallback((profileId: string) => {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.set('tab', 'users');
    next.set('profileId', profileId);
    router.push(`/admin/data-hub?${next.toString()}`);
  }, [router, params]);
}
