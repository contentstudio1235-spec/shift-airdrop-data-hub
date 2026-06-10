import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdentityActions } from '../useIdentityActions';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiPost: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  };
});

describe('useIdentityActions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('addLink 201 returns { ok: true, data }', async () => {
    (api.apiPost as any).mockResolvedValueOnce({ linkId: '42', type: 'wallet', value: 'A' });
    const { result } = renderHook(() => useIdentityActions());
    let r: any;
    await act(async () => {
      r = await result.current.addLink('p-1', { type: 'wallet', value: 'AbCd' });
    });
    expect(r.ok).toBe(true);
    expect(r.data.linkId).toBe('42');
  });

  it('addLink 409 returns { ok: false, error: ApiError } with existingProfileId', async () => {
    const err = new ApiError(409, '/api/users/p-1/links', { error: 'identity_conflict', existingProfileId: 'p-other', suggestion: 'merge' });
    (api.apiPost as any).mockRejectedValueOnce(err);
    const { result } = renderHook(() => useIdentityActions());
    let r: any;
    await act(async () => {
      r = await result.current.addLink('p-1', { type: 'wallet', value: 'AbCd' });
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBeInstanceOf(ApiError);
    expect(r.error.body.existingProfileId).toBe('p-other');
  });

  it('mergeProfiles 400 surfaces error', async () => {
    (api.apiPost as any).mockRejectedValueOnce(new ApiError(400, '/api/users/p-1/merge', { error: 'merge_requires_reason' }));
    const { result } = renderHook(() => useIdentityActions());
    let r: any;
    await act(async () => {
      r = await result.current.mergeProfiles('p-1', 'p-2', 'too short');
    });
    expect(r.ok).toBe(false);
  });

  it('forgetUser throws client-side guard before fetch when reason empty', async () => {
    const { result } = renderHook(() => useIdentityActions());
    let r: any;
    await act(async () => {
      r = await result.current.forgetUser('p-1', '');
    });
    expect(r.ok).toBe(false);
    expect(r.error?.message).toMatch(/reason/i);
    expect(api.apiPost).not.toHaveBeenCalled();
  });

  it('setPrimaryWallet PATCHes correct body', async () => {
    (api.apiPatch as any).mockResolvedValueOnce({ profileId: 'p-1', primaryWallet: 'XyZ', links: [] });
    const { result } = renderHook(() => useIdentityActions());
    await act(async () => { await result.current.setPrimaryWallet('p-1', 'XyZ'); });
    expect(api.apiPatch).toHaveBeenCalledWith('/api/users/p-1/primary-wallet', { wallet: 'XyZ' });
  });
});
