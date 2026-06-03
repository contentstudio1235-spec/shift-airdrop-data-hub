import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserProfile } from '../useUserProfile';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('useUserProfile', () => {
  beforeEach(() => vi.resetAllMocks());

  it('initial load when profileId provided', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValueOnce({
      profileId: 'p-1', primaryWallet: 'AbCd', displayName: null,
      firstSeenAt: '2026-06-01T00:00:00Z', lastSeenAt: '2026-06-03T00:00:00Z',
      firstUtmSource: null, firstUtmMedium: null, firstUtmCampaign: null,
      lastUtmSource: null, lastUtmMedium: null, lastUtmCampaign: null,
      attributionLockedAt: null, links: [],
    } as any);
    const { result } = renderHook(() => useUserProfile('p-1'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.profileId).toBe('p-1');
  });

  it('null profileId is a no-op (no fetch)', () => {
    const spy = vi.spyOn(api, 'apiGet').mockResolvedValue({} as any);
    renderHook(() => useUserProfile(null));
    expect(spy).not.toHaveBeenCalled();
  });

  it('refetch function exists', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue({ profileId: 'p-1', primaryWallet: 'X', displayName: null, firstSeenAt: '', lastSeenAt: '', firstUtmSource: null, firstUtmMedium: null, firstUtmCampaign: null, lastUtmSource: null, lastUtmMedium: null, lastUtmCampaign: null, attributionLockedAt: null, links: [] } as any);
    const { result } = renderHook(() => useUserProfile('p-1'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(typeof result.current.refetch).toBe('function');
  });
});
