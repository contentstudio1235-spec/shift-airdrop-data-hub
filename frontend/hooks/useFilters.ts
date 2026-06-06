"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface Filters {
  from?: string;
  to?: string;
  source?: string;
  asset?: string;
  cohort?: 'day' | 'week' | 'month';
  walletSizeMin?: number;
  walletSizeMax?: number;
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
  const min = Number(p.get('walletSizeMin'));
  if (Number.isFinite(min) && min >= 0) f.walletSizeMin = min;
  const max = Number(p.get('walletSizeMax'));
  if (Number.isFinite(max) && max >= 0) f.walletSizeMax = max;
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
    const FOREIGN_PARAMS = ['view', 'referrer', 'referrerType'] as const;
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
