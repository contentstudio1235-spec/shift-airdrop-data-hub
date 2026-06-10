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

export function UsersView() {
  const router = useRouter();
  const params = useSearchParams();

  const initialProfileId = params?.get('profileId') ?? null;
  const initialQuery = params?.get('q') ?? '';
  const initialSource = params?.get('source') ?? 'all';

  const [filters, setFilters] = useState<UsersListFilters>({
    q: initialQuery || undefined,
    source: initialSource === 'all' ? undefined : initialSource,
  });

  const [page, setPage] = useState(1);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initialProfileId);

  const list = useUsersList(filters, page, PAGE_SIZE);

  // Sync state -> URL (replace, no history pollution)
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tab', 'users');
    if (selectedProfileId) next.set('profileId', selectedProfileId);
    if (filters.q) next.set('q', filters.q);
    if (filters.source) next.set('source', filters.source);
    const target = `/admin/data-hub?${next.toString()}`;
    if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== target) {
      router.replace(target, { scroll: false });
    }
  }, [router, selectedProfileId, filters.q, filters.source]);

  const handleSelect = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  // Reset page when filters change
  const handleFiltersChange = useCallback((updater: (f: UsersListFilters) => UsersListFilters) => {
    setFilters(updater);
    setPage(1);
  }, []);

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
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
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

        <select
          value={filters.source ?? 'all'}
          onChange={e => handleFiltersChange(f => ({
            ...f,
            source: e.target.value === 'all' ? undefined : e.target.value,
          }))}
          style={inputStyle}
        >
          {SOURCE_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All sources' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: 11, color: TOKENS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {list.data ? (
            <>
              <span style={{ color: TOKENS.textPrimary, fontWeight: 800 }}>
                {list.data.total.toLocaleString()}
              </span>{' '}
              profiles
            </>
          ) : list.loading ? 'Loading…' : '—'}
        </div>
      </div>

      {/* 2-pane grid */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '40% 1px 1fr', gap: 16,
      }}>
        {/* Left: list */}
        <UserListPane
          rows={list.data?.rows ?? []}
          total={list.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          loading={list.loading}
          error={list.error}
          selectedId={selectedProfileId}
          onSelect={handleSelect}
          onPageChange={setPage}
          onResetFilters={handleResetFilters}
          onRetry={list.refetch}
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
