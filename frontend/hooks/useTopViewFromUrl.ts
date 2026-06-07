"use client";
import { useEffect } from 'react';
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
 * Contract:
 *   - Valid URL view that differs from current → `setTopView(urlView)`.
 *   - URL view equals current → no-op (prevents render thrash).
 *   - URL view is missing / unrecognized → no-op (guards URL tampering).
 *   - `searchParams` is null (SSR / suspense edge) → no-op.
 */
export function useSyncTopViewFromUrl(
  searchParams: URLSearchParams | null,
  topView: TopView,
  setTopView: (v: TopView) => void,
): void {
  useEffect(() => {
    const urlView = searchParams?.get('view') ?? null;
    if (isValidTopView(urlView) && urlView !== topView) {
      setTopView(urlView);
    }
  }, [searchParams, topView, setTopView]);
}
