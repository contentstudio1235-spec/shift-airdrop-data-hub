"use client";
import React, { useEffect, useRef, useState } from 'react';
import { List } from 'react-window';
import { ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { UserListRow } from './UserListRow';
import { EmptyState } from '../primitives/EmptyState';
import { CaretLeft, CaretRight, MagnifyingGlass } from '@phosphor-icons/react';
import type { ProfileSummary } from '@/hooks/useUsersList';

const ROW_HEIGHT = 56;

// Grid template shared by header and rows — single source of truth
const GRID_TEMPLATE = '148px 96px 76px 64px 24px 24px 24px 28px';
const GRID_GAP = 10;

// ─── SortableHeader ───────────────────────────────────────────────────────────

interface SortableHeaderColumn {
  key: string;
  label: string;
  width: string;
  align?: 'left' | 'right' | 'center';
  sortKey?: 'last_seen' | 'volume' | 'x' | 'discord' | 'wallet_alpha';
}

interface SortableHeaderProps {
  columns: SortableHeaderColumn[];
  activeSortKey: string | undefined;
  activeSortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}

function SortableHeader({ columns, activeSortKey, activeSortDir, onSort }: SortableHeaderProps) {
  return (
    <>
      {/* Focus ring CSS for sortable header buttons */}
      <style>{`
        .sh-header-btn:focus-visible {
          outline: 2px solid ${TOKENS.accent};
          outline-offset: 2px;
        }
      `}</style>
      <div
        style={{
          height: 36,
          padding: '0 14px 0 12px',
          display: 'grid',
          gridTemplateColumns: GRID_TEMPLATE,
          columnGap: GRID_GAP,
          alignItems: 'center',
          background: TOKENS.panel,
          borderBottom: `1px solid ${TOKENS.chartGrid}`,
          flexShrink: 0,
        }}
      >
        {columns.map((col) => {
          const isActive = activeSortKey === col.sortKey && col.sortKey !== undefined;
          const labelStyle: React.CSSProperties = {
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: col.align ?? 'left',
            userSelect: 'none',
          };

          // WALLET: design calls for sortable (wallet_alpha) but backend safelist
          // not yet updated — render as static span until backend follow-up.
          // Any column without sortKey gets a static span.
          if (!col.sortKey) {
            return (
              <span
                key={col.key}
                style={{ ...labelStyle, color: TOKENS.textFaint }}
              >
                {col.label}
              </span>
            );
          }

          return (
            <button
              key={col.key}
              className="sh-header-btn"
              onClick={() => onSort(col.sortKey!)}
              aria-sort={isActive ? (activeSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              style={{
                all: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                gap: 4,
                cursor: 'pointer',
                ...labelStyle,
                color: isActive ? TOKENS.textPrimary : TOKENS.textFaint,
                padding: '4px 0',
                borderRadius: 3,
                transition: `color ${MOTION.fast}`,
                outline: 'none',
                width: '100%',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = TOKENS.tableRowHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {col.label}
              {isActive && (
                activeSortDir === 'asc'
                  ? <ArrowUp size={10} weight="bold" />
                  : <ArrowDown size={10} weight="bold" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// Column definitions — WALLET has sortKey omitted (backend dep — static for now)
const HEADER_COLUMNS: SortableHeaderColumn[] = [
  { key: 'wallet',    label: 'Wallet',    width: '148px', align: 'left' },
  { key: 'name',      label: 'Name',      width: '96px',  align: 'left' },
  { key: 'volume',    label: 'Volume',    width: '76px',  align: 'right',  sortKey: 'volume' },
  { key: 'last_seen', label: 'Last Seen', width: '64px',  align: 'right',  sortKey: 'last_seen' },
  { key: 'x',        label: 'X',         width: '24px',  align: 'center', sortKey: 'x' },
  { key: 'discord',  label: '◆',         width: '24px',  align: 'center', sortKey: 'discord' },
  { key: 'tg',       label: 'TG',        width: '24px',  align: 'center' },
  { key: 'stitch',   label: '',          width: '28px',  align: 'center' },
];

export interface UserListPaneProps {
  rows: ProfileSummary[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (profileId: string) => void;
  onPageChange: (page: number) => void;
  onResetFilters?: () => void;
  onRetry?: () => void;
  // Sort props threaded from UsersView
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

// react-window v2 rowProps type — cannot contain ariaAttributes, index, or style
// These are the extra props passed through to rowComponent beyond the injected ones
type RowExtraProps = {
  rows: ProfileSummary[];
  selectedId: string | null;
  onSelect: (profileId: string) => void;
};

function useResizeObserver(ref: React.RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return height;
}

function PaginationFooter({ total, page, pageSize, onPageChange }: { total: number; page: number; pageSize: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const btnStyle = (active: boolean): React.CSSProperties => ({
    minWidth: 28, height: 28, padding: '0 6px', borderRadius: 4,
    background: active ? TOKENS.accentDim : 'transparent',
    color: active ? TOKENS.accent : TOKENS.textMuted,
    border: active ? `1px solid ${TOKENS.accentBorder}` : '1px solid transparent',
    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
    transition: `all ${MOTION.fast}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  // Visible page numbers: 1, page-1, page, page+1, totalPages (deduped)
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages].filter(p => p >= 1 && p <= totalPages))).sort((a, b) => a - b);
  return (
    <div style={{
      height: 48, padding: '0 16px',
      borderTop: `1px solid ${TOKENS.accentBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, background: 'rgba(8,18,14,0.95)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: TOKENS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={{ ...btnStyle(false), opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
          <CaretLeft size={14} />
        </button>
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && pages[i - 1] !== p - 1 && <span style={{ color: TOKENS.textFaint, fontSize: 11 }}>…</span>}
            <button onClick={() => onPageChange(p)} style={btnStyle(p === page)} aria-label={`Go to page ${p}`}>
              {p}
            </button>
          </React.Fragment>
        ))}
        <button aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
          <CaretRight size={14} />
        </button>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      <style>{`@keyframes users-skeleton-shimmer { 0% { opacity: 0.3 } 50% { opacity: 0.5 } 100% { opacity: 0.3 } }`}</style>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ height: ROW_HEIGHT, padding: '0 14px 0 12px', display: 'grid', gridTemplateColumns: GRID_TEMPLATE, columnGap: GRID_GAP, alignItems: 'center', borderBottom: `1px solid ${TOKENS.chartGrid}` }}>
          <div style={{ height: 12, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '50%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  );
}

// Row renderer for react-window v2 List
// receives { ariaAttributes, index, style } + rowProps (rows, selectedId, onSelect)
function VirtualRow({
  ariaAttributes,
  index,
  style,
  rows,
  selectedId,
  onSelect,
}: {
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
  index: number;
  style: React.CSSProperties;
  rows: ProfileSummary[];
  selectedId: string | null;
  onSelect: (profileId: string) => void;
}) {
  const row = rows[index];
  if (!row) return null;
  return (
    <UserListRow
      row={row}
      isSelected={row.profileId === selectedId}
      onClick={() => onSelect(row.profileId)}
      style={style}
      ariaAttributes={ariaAttributes}
    />
  );
}

export function UserListPane({
  rows,
  total,
  page,
  pageSize,
  loading,
  error,
  selectedId,
  onSelect,
  onPageChange,
  onResetFilters,
  onRetry,
  sortBy,
  sortDir = 'desc',
  onSort,
}: UserListPaneProps) {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const height = useResizeObserver(listContainerRef);

  // Accessible sort announcement for screen readers
  const [sortAnnouncement, setSortAnnouncement] = useState('');
  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
    const col = HEADER_COLUMNS.find(c => c.sortKey === key);
    const newDir = sortBy === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
    setSortAnnouncement(`Sorted by ${col?.label ?? key} ${newDir === 'asc' ? 'ascending' : 'descending'}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowProps = { rows, selectedId, onSelect } as any;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: TOKENS.panel, border: `1px solid ${TOKENS.accentBorder}`,
      borderRadius: 16, backdropFilter: 'blur(12px)', overflow: 'hidden',
    }}>
      {/* aria-live region for sort change announcements */}
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1, height: 1,
          padding: 0, margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {sortAnnouncement}
      </span>

      {/* Pinned sortable header — NOT inside the scroll viewport */}
      <SortableHeader
        columns={HEADER_COLUMNS}
        activeSortKey={sortBy}
        activeSortDir={sortDir}
        onSort={handleSort}
      />

      {/* Body */}
      <div ref={listContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {error ? (
          <div style={{ padding: 24 }}>
            <EmptyState variant="stale" onRetry={onRetry} />
          </div>
        ) : loading && rows.length === 0 ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%' }}>
            <MagnifyingGlass size={32} color={TOKENS.textFaint} />
            <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.textPrimary, opacity: 0.7 }}>No profiles match these filters</div>
            <div style={{ fontSize: 11, color: TOKENS.textMuted }}>Try widening your criteria</div>
            {onResetFilters && (
              <button onClick={onResetFilters} style={{
                marginTop: 8, background: 'transparent', border: `1px solid ${TOKENS.accentBorder}`,
                color: TOKENS.accent, borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>Reset filters</button>
            )}
          </div>
        ) : (
          <List
            rowComponent={VirtualRow}
            rowProps={rowProps}
            rowCount={rows.length}
            rowHeight={ROW_HEIGHT}
            defaultHeight={height}
            style={{ height: '100%' }}
          />
        )}
      </div>

      <PaginationFooter total={total} page={page} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
