import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock next/navigation BEFORE importing the hook. We mutate `currentSearch`
// between tests to simulate the page mounting with different URL params, and
// capture every router.replace call to assert the URL writer preserves the
// foreign params owned by other URL writers (data-hub shell + Users search).

let currentSearch = '';
const replaceSpy = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceSpy, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { useFilters } from '../useFilters';

beforeEach(() => {
  replaceSpy.mockReset();
  currentSearch = '';
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom — ignore */
  }
});

/**
 * Helper: drive the hook through hydration + a filter change, then return the
 * last URL written via router.replace.
 */
async function mountAndChangeFilter(initialSearch: string): Promise<string | null> {
  currentSearch = initialSearch;
  const { result } = renderHook(() => useFilters());

  // Trigger a filter mutation so useFilters runs its URL writer effect.
  act(() => {
    const update = result.current[1];
    update({ source: 'twitter' });
  });

  // Effect fires asynchronously after state update.
  await waitFor(() => {
    expect(replaceSpy).toHaveBeenCalled();
  });

  const lastCall = replaceSpy.mock.calls.at(-1);
  return lastCall ? (lastCall[0] as string) : null;
}

describe('useFilters preserves foreign params on URL writes', () => {
  it('does not strip wallet from URL when filters update', async () => {
    const url = await mountAndChangeFilter(
      'view=users&wallet=11111111111111111111111111111111'
    );
    expect(url).not.toBeNull();
    expect(url!).toContain('wallet=11111111111111111111111111111111');
    expect(url!).toContain('view=users');
  });

  it('does not strip profileId from URL when filters update', async () => {
    const url = await mountAndChangeFilter('view=users&profileId=profile-abc');
    expect(url).not.toBeNull();
    expect(url!).toContain('profileId=profile-abc');
    expect(url!).toContain('view=users');
  });

  it('does not strip q from URL when filters update', async () => {
    const url = await mountAndChangeFilter('view=users&q=tomer');
    expect(url).not.toBeNull();
    expect(url!).toContain('q=tomer');
    expect(url!).toContain('view=users');
  });
});

describe('useFilters round-trips funnel time-window (fwindow)', () => {
  // MR !29: fwindow is the F1 funnel time-window selector value. It must:
  // (a) parse from URL on mount, (b) serialize back to URL when written, and
  // (c) survive view switches by joining the foreign-params allowlist when
  // OTHER views write their own filter state (verified separately by the
  // FOREIGN_PARAMS tests above — fwindow is owned by useFilters itself).
  it('parses fwindow=7d from URL and re-emits it on writeback', async () => {
    currentSearch = 'view=funnels&fwindow=7d';
    const { result } = renderHook(() => useFilters());
    await waitFor(() => {
      expect(result.current[0].fwindow).toBe('7d');
    });
    // Trigger a different filter change; fwindow should still be in URL.
    act(() => {
      result.current[1]({ source: 'twitter' });
    });
    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalled();
    });
    const lastUrl = replaceSpy.mock.calls.at(-1)?.[0] as string;
    expect(lastUrl).toContain('fwindow=7d');
    expect(lastUrl).toContain('source=twitter');
  });

  it('writes fwindow to URL when set via update()', async () => {
    const url = await mountAndChangeFilter('view=funnels');
    expect(url).not.toBeNull();
    // Initial: no fwindow in either source or output.
    expect(url!).not.toContain('fwindow');

    // Now set fwindow explicitly via a second update.
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current[1]({ fwindow: '30d' });
    });
    await waitFor(() => {
      const calls = replaceSpy.mock.calls;
      const lastCall = calls.at(-1)?.[0] as string;
      expect(lastCall).toContain('fwindow=30d');
    });
  });

  it('ignores invalid fwindow values from URL', async () => {
    currentSearch = 'view=funnels&fwindow=garbage';
    const { result } = renderHook(() => useFilters());
    await waitFor(() => {
      // hydration completes; fwindow rejected
      expect(result.current[0].fwindow).toBeUndefined();
    });
  });

  it('accepts fwindow=all as a valid value', async () => {
    currentSearch = 'view=funnels&fwindow=all';
    const { result } = renderHook(() => useFilters());
    await waitFor(() => {
      expect(result.current[0].fwindow).toBe('all');
    });
  });
});

describe('useFilters does NOT inject phantom walletSize params on URL writeback', () => {
  // Regression pin for MR !28 Fix 1. The previous paramsToFilters used
  // `Number(p.get('walletSizeMin'))` which coerces null → 0, so a URL without
  // those params would still write `walletSizeMin=0&walletSizeMax=0` back on
  // every filter change. In prod this caused 181 console errors in a single
  // session from re-fetch loops.
  it('paramsToFilters: does NOT set walletSizeMin in URL writeback when param is absent', async () => {
    const url = await mountAndChangeFilter('view=users');
    expect(url).not.toBeNull();
    expect(url!).not.toContain('walletSizeMin');
  });

  it('paramsToFilters: does NOT set walletSizeMax in URL writeback when param is absent', async () => {
    const url = await mountAndChangeFilter('view=users');
    expect(url).not.toBeNull();
    expect(url!).not.toContain('walletSizeMax');
  });
});
