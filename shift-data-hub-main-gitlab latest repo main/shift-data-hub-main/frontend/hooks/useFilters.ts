"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type FunnelWindow = '7d' | '30d' | '90d' | 'all';

export const FUNNEL_WINDOWS: readonly FunnelWindow[] = ['7d', '30d', '90d', 'all'] as const;

export function isFunnelWindow(v: string | null | undefined): v is FunnelWindow {
  return !!v && (FUNNEL_WINDOWS as ReadonlyArray<string>).includes(v);
}

export interface Filters {
  from?: string;
  to?: string;
  source?: string;
  asset?: string;
  cohort?: 'day' | 'week' | 'month';
  walletSizeMin?: number;
  walletSizeMax?: number;
  // F1 / MR !29: funnel time window. Backend derives `from` from this when
  // present (queryParams.ts). Lives on Filters so it round-trips via the same
  // URL + localStorage machinery the rest of the filter state uses, and so it
  // survives view switches via the FOREIGN_PARAMS allowlist below.
  fwindow?: FunnelWindow;
  // MR !33: decoupled position-time window for the channel-roi volume fix.
  // Only HeroVolume7d uses it today (passes volumeFrom=NOW-7d) — kept off the
  // URL writer/reader since it's a derived ephemeral param, not an operator-
  // chosen filter. Type-only so TS allows callers to pass it through
  // useFunnelData's query-spread without complaint.
  volumeFrom?: string;
  volumeTo?: string;
}

const STORAGE_KEY = 'shift-data-hub-filters';

function readStorage(): Filters {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(filters: Filters): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch { /* quota — ignore */ }
}

function paramsToFilters(p: URLSearchParams): Filters {
  const f: Filters = {};
  const from = p.get('from'); if (from) f.from = from;
  const to = p.get('to'); if (to) f.to = to;
  const source = p.get('source'); if (source) f.source = source;
  const asset = p.get('asset'); if (asset) f.asset = asset;
  const cohort = p.get('cohort');
  if (cohort === 'day' || cohort === 'week' || cohort === 'month') f.cohort = cohort;
  // Gate on URLSearchParams.get() !== null BEFORE parsing — `Number(null)` is 0,
  // which would phantom-inject `walletSizeMin=0&walletSizeMax=0` on every
  // writeback when the URL had no such params (re-render loop in prod).
  const minRaw = p.get('walletSizeMin');
  if (minRaw !== null) {
    const min = Number(minRaw);
    if (Number.isFinite(min) && min >= 0) f.walletSizeMin = min;
  }
  const maxRaw = p.get('walletSizeMax');
  if (maxRaw !== null) {
    const max = Number(maxRaw);
    if (Number.isFinite(max) && max >= 0) f.walletSizeMax = max;
  }
  const fwin = p.get('fwindow');
  if (isFunnelWindow(fwin)) f.fwindow = fwin;
  return f;
}

function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.source) p.set('source', f.source);
  if (f.asset) p.set('asset', f.asset);
  if (f.cohort) p.set('cohort', f.cohort);
  if (f.walletSizeMin !== undefined) p.set('walletSizeMin', String(f.walletSizeMin));
  if (f.walletSizeMax !== undefined) p.set('walletSizeMax', String(f.walletSizeMax));
  if (f.fwindow) p.set('fwindow', f.fwindow);
  return p;
}

export function useFilters(): [Filters, (next: Partial<Filters>) => void, () => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>({});  // always empty on first render
  const [hydrated, setHydrated] = useState(false);

  // Mount-time hydration from URL → localStorage fallback
  useEffect(() => {
    const fromUrl = paramsToFilters(new URLSearchParams(searchParams?.toString() ?? ''));
    const initial = Object.keys(fromUrl).length > 0 ? fromUrl : readStorage();
    setFilters(initial);
    setHydrated(true);
  }, []);  // intentionally empty — run once on mount

  // Sync filter changes back to URL + localStorage, but only after hydration.
  // Preserve foreign params (e.g. ?view= owned by data-hub page shell) so we
  // don't fight other URL writers and create a re-render loop.
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(filters);
    const p = filtersToParams(filters);
    const existing = new URLSearchParams(searchParams?.toString() ?? '');
    // Preserve foreign params owned by other URL writers (data-hub shell + per-tab
    // drill-down filters). Add new names here when wiring new owners.
    const FOREIGN_PARAMS = ['view', 'referrer', 'referrerType', 'wallet', 'profileId', 'q'] as const;
    for (const name of FOREIGN_PARAMS) {
      const value = existing.get(name);
      if (value) p.set(name, value);
    }
    const next = p.toString();
    const current = existing.toString();
    if (next !== current) {
      router.replace(`?${next}`, { scroll: false });
    }
  }, [filters, hydrated, router, searchParams]);

  const update = useCallback((next: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => setFilters({}), []);

  return [filters, update, reset];
}
