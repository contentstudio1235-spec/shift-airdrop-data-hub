import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSyncTopViewFromUrl } from '../useTopViewFromUrl';

/**
 * useSyncTopViewFromUrl — closes HARVEST-006+008. data-hub/page.tsx computes
 * initialView once at mount; subsequent URL `?view=` writes (e.g. KOL drill
 * row click writing `?view=users&referrer=...`) must reactively update the
 * page-level topView state, otherwise the user sees a stale tab.
 *
 * These tests pin the hook's contract:
 *   - Valid view change → setTopView called once with the new value.
 *   - Same view as current → no-op (prevents render thrash).
 *   - Invalid view name → no-op (guards against URL tampering).
 *   - Null searchParams → no-op (SSR / suspense edge case).
 */
describe('useSyncTopViewFromUrl', () => {
  it('calls setTopView when URL ?view= changes to a different valid view', () => {
    const setTopView = vi.fn();
    const params = new URLSearchParams('view=users');
    renderHook(() => useSyncTopViewFromUrl(params, 'pulse', setTopView));
    expect(setTopView).toHaveBeenCalledWith('users');
    expect(setTopView).toHaveBeenCalledTimes(1);
  });

  it('does NOT call setTopView when URL view matches current view', () => {
    const setTopView = vi.fn();
    const params = new URLSearchParams('view=pulse');
    renderHook(() => useSyncTopViewFromUrl(params, 'pulse', setTopView));
    expect(setTopView).not.toHaveBeenCalled();
  });

  it('does NOT call setTopView for invalid view names', () => {
    const setTopView = vi.fn();
    const params = new URLSearchParams('view=garbage');
    renderHook(() => useSyncTopViewFromUrl(params, 'pulse', setTopView));
    expect(setTopView).not.toHaveBeenCalled();
  });

  it('handles null searchParams gracefully (no-op)', () => {
    const setTopView = vi.fn();
    renderHook(() => useSyncTopViewFromUrl(null, 'pulse', setTopView));
    expect(setTopView).not.toHaveBeenCalled();
  });
});
