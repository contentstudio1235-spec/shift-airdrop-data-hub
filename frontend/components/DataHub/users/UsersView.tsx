"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TOKENS } from '@/lib/chartTokens';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useUsersList, type UsersListFilters } from '@/hooks/useUsersList';
import { UserListPane } from './UserListPane';
import { UserDetailPane } from './UserDetailPane';

const PAGE_SIZE = 50;

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8,
  padding: '8px 12px',
  color: TOKENS.textPrimary,
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
};

const SOURCE_OPTIONS = ['all', 'organic', 'twitter', 'discord', 'telegram', 'kol', 'direct'];

const SOCIAL_FILTER_OPTIONS = [
  { value: 'any', label: 'All users' },
  { value: 'x', label: 'Has X' },
  { value: 'discord', label: 'Has Discord' },
  { value: 'both', label: 'Has X + Discord' },
  { value: 'none', label: 'No social' },
] as const;

type SocialFilter = (typeof SOCIAL_FILTER_OPTIONS)[number]['value'];

export function UsersView() {
  const router = useRouter();
  const params = useSearchParams();

  const initialProfileId = params?.get('profileId') ?? null;
  const initialQuery = params?.get('q') ?? '';
  const initialSource = params?.get('source') ?? 'all';
  const initialSortBy = (params?.get('sortBy') ?? 'last_seen') as NonNullable<UsersListFilters['sortBy']>;
  const initialSortDir = (params?.get('sortDir') === 'asc' ? 'asc' : 'desc') as NonNullable<UsersListFilters['sortDir']>;

  const [filters, setFilters] = useState<UsersListFilters>({
    q: initialQuery || undefined,
    source: initialSource === 'all' ? undefined : initialSource,
    sortBy: initialSortBy,
    sortDir: initialSortDir,
  });

  const [page, setPage] = useState(1);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initialProfileId);
  // Social filter — transient (not URL-synced) but pushed to backend so `total` is correct
  const [socialFilter, setSocialFilter] = useState<SocialFilter>('any');

  // Push hasSocial into the API request so the server filters AND the total matches
  const effectiveFilters: UsersListFilters = {
    ...filters,
    hasSocial: socialFilter === 'any' ? undefined : socialFilter,
  };

  const list = useUsersList(effectiveFilters, page, PAGE_SIZE);

  const rows = list.data?.rows ?? [];
  const displayTotal = list.data?.total ?? 0;

  // Sync state -> URL (replace, no history pollution).
  // Preserve foreign params (e.g. ?view= owned by data-hub page shell) to avoid
  // fighting other URL writers.
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tab', 'users');
    if (selectedProfileId) next.set('profileId', selectedProfileId);
    if (filters.q) next.set('q', filters.q);
    if (filters.source) next.set('source', filters.source);
    if (filters.sortBy && filters.sortBy !== 'last_seen') next.set('sortBy', filters.sortBy);
    if (filters.sortDir && filters.sortDir !== 'desc') next.set('sortDir', filters.sortDir);
    if (typeof window !== 'undefined') {
      const existing = new URLSearchParams(window.location.search);
      const view = existing.get('view');
      if (view) next.set('view', view);
      const target = `/admin/data-hub?${next.toString()}`;
      if (window.location.pathname + window.location.search !== target) {
        router.replace(target, { scroll: false });
      }
    }
  }, [router, selectedProfileId, filters.q, filters.source, filters.sortBy, filters.sortDir]);

  const handleSelect = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setPage(1);
    setSocialFilter('any');
  }, []);

  // Reset page when filters change
  const handleFiltersChange = useCallback((updater: (f: UsersListFilters) => UsersListFilters) => {
    setFilters(updater);
    setPage(1);
  }, []);

  // Sort handler — toggles direction if same column, starts desc on new column
  const handleSort = useCallback((col: string) => {
    handleFiltersChange(f => ({
      ...f,
      sortBy: col as NonNullable<UsersListFilters['sortBy']>,
      sortDir: f.sortBy === col ? (f.sortDir === 'asc' ? 'desc' : 'asc') : 'desc',
    }));
  }, [handleFiltersChange]);

  // Count of active filters for Reset button label
  const activeFilterCount = [
    !!filters.q,
    !!filters.source,
    socialFilter !== 'any',
  ].filter(Boolean).length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      height: 'calc(100vh - 56px - 24px)',
    }}>
      {/* Filter row */}
      <div style={{
        height: 56, flexShrink: 0,
        background: TOKENS.panel, backdropFilter: 'blur(12px)',
        border: `1px solid ${TOKENS.accentBorder}`, borderRadius: 12,
        padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}>
        {/* Search — widened to maxWidth:360 per design doc */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <MagnifyingGlass
            size={14}
            weight="regular"
            style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: TOKENS.textFaint, pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={filters.q ?? ''}
            onChange={e => handleFiltersChange(f => ({ ...f, q: e.target.value || undefined }))}
            placeholder="Search wallet, name, or social handle..."
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 34 }}
          />
        </div>

        {/* Source filter — kept at 200px */}
        <select
          value={filters.source ?? 'all'}
          onChange={e => handleFiltersChange(f => ({
            ...f,
            source: e.target.value === 'all' ? undefined : e.target.value,
          }))}
          style={{ ...inputStyle, width: 200 }}
        >
          {SOURCE_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All sources' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Has Social quick-filter — server-side, 160px */}
        <select
          value={socialFilter}
          onChange={e => {
            setSocialFilter(e.target.value as SocialFilter);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 160 }}
          aria-label="Filter by social connection"
        >
          {SOCIAL_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Reset button — includes socialFilter in active count */}
        {activeFilterCount > 0 && (
          <button
            onClick={handleResetFilters}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              marginLeft: 'auto',
              color: TOKENS.accent,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            Reset ({activeFilterCount})
          </button>
        )}

        {/* Profile count */}
        <div style={{
          marginLeft: activeFilterCount > 0 ? 0 : 'auto',
          fontSize: 11,
          color: TOKENS.textMuted,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>
          {list.loading && !list.data ? (
            'Loading…'
          ) : list.data ? (
            <>
              <span style={{ color: TOKENS.textPrimary, fontWeight: 800 }}>
                {displayTotal.toLocaleString()}
              </span>{' '}
              {socialFilter !== 'any' ? 'shown (filtered)' : 'profiles'}
            </>
          ) : '—'}
        </div>
      </div>

      {/* 2-pane grid */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '70% 1px 1fr', gap: 16,
      }}>
        {/* Left: list */}
        <UserListPane
          rows={rows}
          total={displayTotal}
          page={page}
          pageSize={PAGE_SIZE}
          loading={list.loading}
          error={list.error}
          selectedId={selectedProfileId}
          onSelect={handleSelect}
          onPageChange={setPage}
          onResetFilters={handleResetFilters}
          onRetry={list.refetch}
          sortBy={filters.sortBy ?? 'last_seen'}
          sortDir={filters.sortDir ?? 'desc'}
          onSort={handleSort}
        />

        {/* Phosphor scanline divider */}
        <div
          aria-hidden
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${TOKENS.accentBorder} 20%, ${TOKENS.accentBorder} 80%, transparent 100%)`,
            opacity: 0.5,
          }}
        />

        {/* Right: detail */}
        <UserDetailPane
          profileId={selectedProfileId}
          onProfileMutated={() => list.refetch()}
        />
      </div>
    </div>
  );
}
