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
