import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWhaleOrigins } from '../useWhaleOrigins';

const sample = {
  nodes: [{ id: 'src:direct', label: 'direct', kind: 'source', value: 5408 }],
  edges: [],
  totals: { sourceUsers: 5408, whales: 3, whaleVolumeUSD: 21311 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'sprint_2_3_live',
};

describe('useWhaleOrigins', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
  afterEach(() => fetchSpy.mockRestore());

  it('fetches and exposes data', async () => {
    const { result } = renderHook(() => useWhaleOrigins());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.whales).toBe(3);
  });

  it('exposes error on http failure', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    const { result } = renderHook(() => useWhaleOrigins());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/500/);
  });
});
