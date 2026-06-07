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

  // REGRESSION: the page-shell writeback uses window.history.replaceState
  // (bypasses Next.js router) so useSearchParams stays stale across a local
  // tab click. If this hook fires on `topView` change with stale searchParams
  // it snaps the view back, trapping the user on the previous tab.
  // Reproducer: visit Funnels → click any other tab → tab nav appears locked
  // on Funnels and only a manual URL reset frees it.
  it('does NOT snap back when topView changes locally but searchParams is stale', () => {
    const setTopView = vi.fn();
    const staleParams = new URLSearchParams('view=funnels');
    const { rerender } = renderHook(
      ({ params, view }: { params: URLSearchParams | null; view: 'pulse' | 'funnels' | 'attribution' | 'cohorts' | 'users' | 'raw' }) =>
        useSyncTopViewFromUrl(params, view, setTopView),
      { initialProps: { params: staleParams, view: 'funnels' as const } },
    );
    // Initial sync: searchParams view matches topView, no setter call.
    expect(setTopView).not.toHaveBeenCalled();

    // Simulate the tab click: topView flips to 'pulse' BEFORE Next.js searchParams
    // can catch up (because page.tsx writeback used window.history.replaceState).
    rerender({ params: staleParams, view: 'pulse' as const });

    // The hook MUST NOT call setTopView with the stale 'funnels' value.
    // Pre-fix, this is exactly the bug: setTopView would be called with 'funnels',
    // snapping the user back to Funnels.
    expect(setTopView).not.toHaveBeenCalled();
  });

  // Conversely: when searchParams genuinely change (e.g. KOL drill via router.push),
  // the hook must sync.
  it('syncs when searchParams change externally even if topView did not', () => {
    const setTopView = vi.fn();
    const { rerender } = renderHook(
      ({ params, view }: { params: URLSearchParams | null; view: 'pulse' | 'funnels' | 'attribution' | 'cohorts' | 'users' | 'raw' }) =>
        useSyncTopViewFromUrl(params, view, setTopView),
      { initialProps: { params: new URLSearchParams('view=attribution'), view: 'attribution' as const } },
    );
    expect(setTopView).not.toHaveBeenCalled();

    // External URL change (KOL drill writes ?view=users via router.push):
    rerender({ params: new URLSearchParams('view=users&referrer=DYENZ3'), view: 'attribution' as const });

    expect(setTopView).toHaveBeenCalledWith('users');
    expect(setTopView).toHaveBeenCalledTimes(1);
  });
});
