"use client";
import { useEffect, useRef } from 'react';
import { isValidTopView, type TopView } from '@/app/admin/data-hub/layout-shell';

/**
 * Sync local `topView` state with the `?view=` URL param. Used by the
 * data-hub page shell so drill-down URL writes (e.g. KOL row click writing
 * `?view=users&referrer=...`, whale row click writing `?view=users&wallet=...`)
 * actually switch the visible view.
 *
 * Closes HARVEST-006 + HARVEST-008 — `data-hub/page.tsx` previously computed
 * `initialView` once at mount; subsequent URL writes updated the address bar
 * but the page-level `topView` state did not react, so the user had to
 * manually click the target tab.
 *
 * IMPORTANT — why `topView` is read via a ref, NOT a dep:
 * The page-shell writeback effect uses `window.history.replaceState` (NOT the
 * Next.js router) to persist topView across AuthGate remounts. That bypasses
 * `useSearchParams`, so after a local tab click:
 *   1. setTopView('pulse') fires
 *   2. writeback writes `?view=pulse` via history API
 *   3. `useSearchParams` still returns the STALE pre-click search string
 * If `topView` were in this hook's deps, step 1 would re-run this effect with
 * stale searchParams, see `urlView !== topView`, and snap topView back to the
 * stale URL value — trapping the user on the previous tab. Reading topView via
 * a ref + only depending on `searchParams` means we react ONLY to external
 * URL changes (KOL drill, whale row click — both router.push / router.replace
 * which DO update searchParams) and never ping-pong against the local writeback.
 *
 * Contract:
 *   - searchParams change to a valid view that differs from current → `setTopView(urlView)`.
 *   - Local topView change → no-op (no snap-back).
 *   - URL view is missing / unrecognized → no-op (guards URL tampering).
 *   - `searchParams` is null (SSR / suspense edge) → no-op.
 */
export function useSyncTopViewFromUrl(
  searchParams: URLSearchParams | null,
  topView: TopView,
  setTopView: (v: TopView) => void,
): void {
  const topViewRef = useRef(topView);
  useEffect(() => {
    topViewRef.current = topView;
  }, [topView]);

  useEffect(() => {
    const urlView = searchParams?.get('view') ?? null;
    if (isValidTopView(urlView) && urlView !== topViewRef.current) {
      setTopView(urlView);
    }
  }, [searchParams, setTopView]);
}
