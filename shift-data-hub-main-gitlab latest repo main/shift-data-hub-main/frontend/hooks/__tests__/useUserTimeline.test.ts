import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserTimeline } from '../useUserTimeline';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('useUserTimeline', () => {
  beforeEach(() => vi.resetAllMocks());

  it('initial load returns entries array', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValueOnce({
      entries: [
        { id: 1, eventName: 'position_open', occurredAt: '2026-06-03T01:00:00Z',
          source: 'helius', asset: 'TSL2L', valueUSD: 1500, payload: {} },
      ],
    });
    const { result } = renderHook(() => useUserTimeline('p-1'));
    await waitFor(() => expect(result.current.entries.length).toBe(1));
    expect(result.current.entries[0].eventName).toBe('position_open');
  });

  it('null profileId returns empty entries with no fetch', () => {
    const spy = vi.spyOn(api, 'apiGet').mockResolvedValue({ entries: [] });
    const { result } = renderHook(() => useUserTimeline(null));
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('loadMore appends older entries', async () => {
    vi.spyOn(api, 'apiGet')
      .mockResolvedValueOnce({ entries: [{ id: 2, eventName: 'a', occurredAt: '2026-06-03T02:00:00Z', source: null, asset: null, valueUSD: null, payload: {} }] })
      .mockResolvedValueOnce({ entries: [{ id: 1, eventName: 'b', occurredAt: '2026-06-03T01:00:00Z', source: null, asset: null, valueUSD: null, payload: {} }] });
    const { result } = renderHook(() => useUserTimeline('p-1'));
    await waitFor(() => expect(result.current.entries.length).toBe(1));
    await act(async () => { await result.current.loadMore(); });
    await waitFor(() => expect(result.current.entries.length).toBe(2));
  });
});
