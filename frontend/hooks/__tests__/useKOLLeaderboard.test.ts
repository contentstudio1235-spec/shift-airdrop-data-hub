import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKOLLeaderboard } from '../useKOLLeaderboard';

const sample = {
  rows: [{
    referrer: 'abc123', source: 'snag_referrals', users: 100, holders: 15,
    whales: 1, holderRate: 15, totalVolumeUSD: 4000, avgVolumePerUserUSD: 40,
    score: 42.5, firstSeenAt: '2026-01-01', lastSeenAt: '2026-06-04',
  }],
  totals: { totalReferrers: 1, activeReferrers: 1 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'sprint_2_3_live',
};

describe('useKOLLeaderboard', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
  afterEach(() => fetchSpy.mockRestore());

  it('fetches and exposes rows', async () => {
    const { result } = renderHook(() => useKOLLeaderboard({ limit: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.rows[0].holderRate).toBe(15);
  });

  it('refetches when limit changes', async () => {
    const { rerender, result } = renderHook(({ limit }) => useKOLLeaderboard({ limit }), { initialProps: { limit: 10 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ limit: 20 });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });
});
