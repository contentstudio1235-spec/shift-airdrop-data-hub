"use client";
import React, { useEffect, useRef, useState } from 'react';
import { List } from 'react-window';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { UserListRow } from './UserListRow';
import { EmptyState } from '../primitives/EmptyState';
import { CaretLeft, CaretRight, MagnifyingGlass } from '@phosphor-icons/react';
import type { ProfileSummary } from '@/hooks/useUsersList';

const ROW_HEIGHT = 56;

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
        <div key={i} style={{ height: ROW_HEIGHT, padding: '0 14px 0 12px', display: 'grid', gridTemplateColumns: '140px 100px 90px 80px 20px', columnGap: 14, alignItems: 'center', borderBottom: `1px solid ${TOKENS.chartGrid}` }}>
          <div style={{ height: 12, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '50%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
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

export function UserListPane({ rows, total, page, pageSize, loading, error, selectedId, onSelect, onPageChange, onResetFilters, onRetry }: UserListPaneProps) {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const height = useResizeObserver(listContainerRef);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowProps = { rows, selectedId, onSelect } as any;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: TOKENS.panel, border: `1px solid ${TOKENS.accentBorder}`,
      borderRadius: 16, backdropFilter: 'blur(12px)', overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        height: 32, padding: '0 14px 0 12px', display: 'grid',
        gridTemplateColumns: '140px 100px 90px 80px 20px', columnGap: 14, alignItems: 'center',
        borderBottom: `1px solid ${TOKENS.accentBorder}`, flexShrink: 0,
      }}>
        {(['WALLET', 'NAME', 'VOLUME', 'LAST SEEN', ''] as const).map((label, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: i >= 2 && i <= 3 ? 'right' : 'left' }}>{label}</span>
        ))}
      </div>

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
