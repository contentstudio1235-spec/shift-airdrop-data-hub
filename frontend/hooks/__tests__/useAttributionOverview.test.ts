import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAttributionOverview } from '../useAttributionOverview';

const samplePayload = {
  channels: [{ source: 'twitter', users: 100, stitchedUsers: 30, holders: 10, whales: 1, totalVolumeUSD: 5000, avgPositionUSD: 500, attribution: 'first_touch' as const }],
  campaigns: [{ campaign: 'airdrop-q1', source: 'twitter', medium: 'social', profiles: 50 }],
  coverage: { total: 1000, withUtm: 100, withReferralOnly: 200, neither: 700, percentWithSignal: 30, percentWithUtm: 10 },
  computedAt: '2026-06-03T20:00:00Z',
  dataQuality: 'sprint_2_3_live',
  note: 'UTM-first attribution.',
};

describe('useAttributionOverview', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(samplePayload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
  afterEach(() => fetchSpy.mockRestore());

  it('fetches and exposes payload', async () => {
    const { result } = renderHook(() => useAttributionOverview());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.channels).toHaveLength(1);
    expect(result.current.data?.campaigns).toHaveLength(1);
    expect(result.current.data?.coverage.percentWithUtm).toBe(10);
    expect(result.current.error).toBeNull();
  });

  it('exposes error on http failure', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    const { result } = renderHook(() => useAttributionOverview());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/500/);
    expect(result.current.data).toBeNull();
  });

  it('passes admin key header', async () => {
    renderHook(() => useAttributionOverview());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-admin-key']).toBeDefined();
  });
});
