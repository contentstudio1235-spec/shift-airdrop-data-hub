import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsersList } from '../useUsersList';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

const sampleResponse = {
  rows: [{
    profileId: 'p-1', primaryWallet: 'AbCd1234', displayName: null,
    firstSeenAt: '2026-01-01T00:00:00Z', lastSeenAt: '2026-06-03T00:00:00Z',
    firstUtmSource: 'twitter', stitchedPct: 95, lifetimeVolumeUSD: 4200,
    holdingsValueUSD: 0, holdings: 2, hasX: true, hasDiscord: false,
  }],
  total: 1, page: 1, pageSize: 50,
};

describe('useUsersList', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial render → loading=true, fires GET /api/users with default pagination', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() => useUsersList({}, 1));
    expect(result.current.loading).toBe(true);
    vi.runAllTimers();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.apiGet).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      query: expect.objectContaining({ page: 1, pageSize: 50 }),
    }));
    expect(result.current.data?.total).toBe(1);
  });

  it('returns response data matching contract shape', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() => useUsersList({}, 1));
    vi.runAllTimers();
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toMatchObject({
      rows: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  it('refetch function triggers a new fetch', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(sampleResponse);
    const { result } = renderHook(() => useUsersList({}, 1));
    vi.runAllTimers();
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const callsBefore = (api.apiGet as any).mock.calls.length;
    result.current.refetch();
    expect((api.apiGet as any).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('threads sortBy and sortDir into the fetch query string', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() =>
      useUsersList({ sortBy: 'volume', sortDir: 'desc' }, 1),
    );
    vi.runAllTimers();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.apiGet).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      query: expect.objectContaining({ sortBy: 'volume', sortDir: 'desc' }),
    }));
  });
});
