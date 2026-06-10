"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Medal,
  CircleNotch,
  Warning,
  Trophy,
  ArrowDown,
  ArrowUp,
  CaretRight,
  CaretDown,
} from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import type { KOLPayload, KOLEntry } from '@/hooks/useKOLLeaderboard';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'users' | 'holderRate';
type SortDir = 'asc' | 'desc';

export interface KOLLeaderboardProps {
  data: KOLPayload | null;
  loading: boolean;
  error: string | null;
}

// ─── Source label mapping ──────────────────────────────────────────────────────

// Backend emits two source bucket labels: `snag_referrals` (matched via
// users.referred_by_code) and `other` (matched via user_profiles.first_utm_source).
// The previous `utm` key is dead — it's never emitted by computeKOLLeaderboard
// in src/services/attributionService.ts — so dropping it (Code Reviewer IMP-2).
const SOURCE_MAP: Record<string, string> = {
  snag_referrals: 'Snag',
};
function fmtSource(src: string): string {
  return SOURCE_MAP[src] ?? 'other';
}

// ─── Referrer display ─────────────────────────────────────────────────────────

function fmtReferrer(r: string): string {
  // Solana wallet: 44 chars, base58
  if (/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(r)) {
    return `${r.slice(0, 4)}...${r.slice(-4)}`;
  }
  return r;
}

// ─── Threshold pill ───────────────────────────────────────────────────────────

function RatePill({ holderRate }: { holderRate: number }) {
  let bg: string;
  let border: string;
  let color: string;

  if (holderRate >= 0.1) {
    bg = 'rgba(94,224,168,0.12)';
    border = '1px solid rgba(94,224,168,0.25)';
    color = TOKENS.threshold.green;
  } else if (holderRate >= 0.03) {
    bg = 'rgba(255,154,60,0.10)';
    border = '1px solid rgba(255,154,60,0.25)';
    color = TOKENS.threshold.yellow;
  } else {
    bg = 'rgba(255,90,90,0.10)';
    border = '1px solid rgba(255,90,90,0.25)';
    color = TOKENS.threshold.red;
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.04em',
        background: bg,
        border,
        color,
      }}
    >
      {(holderRate * 100).toFixed(1)}%
    </span>
  );
}

// ─── Card shell ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: TOKENS.panel,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  padding: 24,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  height: 480,
  display: 'flex',
  flexDirection: 'column',
};

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  key: SortKey | 'referrer';
  label: string;
  width?: number | string;
  align: 'left' | 'right';
  sortable: boolean;
}

// USERS column header label: backend `users` is LIFETIME — see
// computeKOLLeaderboard() in src/services/attributionService.ts. Date filter
// only narrows when ?from/?to are passed; the Source Attribution tab loads
// the default (unbounded) window. Labeling honestly so the operator isn't
// misled into thinking it's a recent-7d cohort. Backend-side 7d window is
// deferred to Phase 2.1C.
const COLUMNS: ColDef[] = [
  { key: 'referrer',   label: 'REFERRER',         width: undefined, align: 'left',  sortable: false },
  { key: 'users',      label: 'USERS (LIFETIME)', width: 96,        align: 'right', sortable: true  },
  { key: 'holderRate', label: 'RATE',             width: 80,        align: 'right', sortable: true  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function KOLLeaderboard({ data, loading, error }: KOLLeaderboardProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('users');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  // Only one row expanded at a time → stable key = `${source}|${referrer}`.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortedRows = useMemo<KOLEntry[]>(() => {
    if (!data?.rows) return [];
    const rows = [...data.rows];
    rows.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const isEmpty = !loading && !error && data !== null && data.rows.length === 0;

  // Row drill-down → Users tab pre-filtered by the row's referrer string.
  //
  // Contract (Phase 2.1B fix):
  //   ?referrer=<string>&referrerType=snag|utm
  //
  // The previous `?source=snag_referrals` was a backend bucket label — NOT a
  // value present in any row's first_utm_source — so the old filter landed on
  // an empty Users tab. And `?utmSource=` was never read by UsersView.
  //
  // referrerType maps to which column the backend filters against:
  //   - 'snag' → users.referred_by_code via EXISTS subquery (joined by user_profile_id)
  //   - 'utm'  → user_profiles.first_utm_source = $referrer
  const handleRowNavigate = useCallback(
    (row: KOLEntry) => {
      const referrerType = row.source === 'snag_referrals' ? 'snag' : 'utm';
      const params = new URLSearchParams();
      params.set('view', 'users');
      params.set('referrer', row.referrer);
      params.set('referrerType', referrerType);
      router.push(`/admin/data-hub?${params.toString()}`);
    },
    [router],
  );

  const handleToggleExpand = useCallback((key: string) => {
    setExpandedKey((current) => (current === key ? null : key));
  }, []);

  return (
    <div style={cardStyle}>
      {/* Title strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Medal size={12} weight="bold" color={TOKENS.textFaint} />
        <div
          role="heading"
          aria-level={3}
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: TOKENS.textFaint,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          KOL Leaderboard
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 11,
          color: TOKENS.textMuted,
          marginTop: 4,
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        Referrers with 5+ referred users · click row to drill into filtered Users
      </div>

      {/* Body */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <div
          tabIndex={0}
          aria-label="KOL leaderboard table"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: `${TOKENS.accentBorder} ${TOKENS.bg}`,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              {/* Expand-chevron column (fixed narrow) */}
              <col style={{ width: 28 }} />
              {/* REFERRER (flex) */}
              <col />
              {/* USERS */}
              <col style={{ width: 96 }} />
              {/* RATE */}
              <col style={{ width: 80 }} />
              {/* Drill-down chevron column (fixed narrow) */}
              <col style={{ width: 20 }} />
            </colgroup>
            <thead>
              <tr style={{ padding: '10px 0', borderBottom: `1px solid ${TOKENS.chartGrid}` }}>
                {/* Empty header above expand-chevron column */}
                <th
                  scope="col"
                  aria-label="Expand row"
                  style={{
                    padding: '10px 0',
                    borderBottom: `1px solid ${TOKENS.chartGrid}`,
                  }}
                />
                {COLUMNS.map((col) => {
                  const isActive = col.key === sortKey;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        col.sortable && isActive
                          ? sortDir === 'desc'
                            ? 'descending'
                            : 'ascending'
                          : undefined
                      }
                      style={{
                        textAlign: col.align,
                        padding: '10px 0',
                        fontSize: 9,
                        fontWeight: 800,
                        color: isActive && col.sortable ? TOKENS.textSecondary : TOKENS.textFaint,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        borderBottom: `1px solid ${TOKENS.chartGrid}`,
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.sortable ? (
                        <button
                          onClick={() => handleSort(col.key as SortKey)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            font: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            letterSpacing: 'inherit',
                            textTransform: 'inherit',
                            fontFamily: 'inherit',
                          }}
                        >
                          {col.label}
                          {isActive && (
                            sortDir === 'desc'
                              ? <ArrowDown size={10} weight="bold" aria-hidden="true" />
                              : <ArrowUp size={10} weight="bold" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
                {/* Empty header above drill-down chevron column */}
                <th
                  scope="col"
                  aria-label="Drill down"
                  style={{
                    padding: '10px 0',
                    borderBottom: `1px solid ${TOKENS.chartGrid}`,
                  }}
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => {
                const rowKey = `${row.source}|${row.referrer}`;
                return (
                  <TableRow
                    key={`${rowKey}-${i}`}
                    row={row}
                    expanded={expandedKey === rowKey}
                    onToggleExpand={() => handleToggleExpand(rowKey)}
                    onNavigate={() => handleRowNavigate(row)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Table row ─────────────────────────────────────────────────────────────────

interface TableRowProps {
  row: KOLEntry;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
}

function TableRow({ row, expanded, onToggleExpand, onNavigate }: TableRowProps) {
  const [hovered, setHovered] = useState(false);
  const display = fmtReferrer(row.referrer);

  // Chevron click expands inline; everything else navigates. stopPropagation
  // on the chevron keeps the two click targets cleanly separated.
  const handleChevronClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onToggleExpand();
    },
    [onToggleExpand],
  );

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNavigate();
      }
    },
    [onNavigate],
  );

  const rowBg = expanded
    ? TOKENS.tableRowHover
    : hovered
      ? TOKENS.tableRowHover
      : 'transparent';

  return (
    <>
      <tr
        role="button"
        tabIndex={0}
        aria-label={`Drill into ${display} (${row.source})`}
        aria-expanded={expanded}
        style={{
          padding: '10px 0',
          borderBottom: `1px solid ${TOKENS.chartGrid}`,
          background: rowBg,
          transition: `background ${MOTION.fast}`,
          cursor: 'pointer',
          outline: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onNavigate}
        onKeyDown={handleRowKeyDown}
      >
        {/* EXPAND CHEVRON */}
        <td
          style={{
            padding: '10px 0',
            verticalAlign: 'middle',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            aria-label={expanded ? `Collapse ${row.referrer} details` : `Expand ${row.referrer} details`}
            aria-expanded={expanded}
            onClick={handleChevronClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: TOKENS.textFaint,
            }}
          >
            {expanded
              ? <CaretDown size={12} weight="regular" aria-hidden="true" />
              : <CaretRight size={12} weight="regular" aria-hidden="true" />}
          </button>
        </td>

        {/* REFERRER */}
        <td
          style={{ padding: '10px 0', maxWidth: 0, overflow: 'hidden' }}
          title={row.referrer}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: TOKENS.textPrimary,
              fontFamily: 'inherit',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {display}
          </div>
          <div
            style={{
              fontSize: 10,
              color: TOKENS.textFaint,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fmtSource(row.source)}
          </div>
        </td>

        {/* USERS */}
        <td
          style={{
            padding: '10px 0',
            textAlign: 'right',
            fontSize: 12,
            fontWeight: 700,
            color: TOKENS.textSecondary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {row.users.toLocaleString()}
        </td>

        {/* RATE */}
        <td style={{ padding: '10px 0', textAlign: 'right' }}>
          <RatePill holderRate={row.holderRate} />
        </td>

        {/* DRILL-DOWN HINT */}
        <td
          style={{
            padding: '10px 0',
            textAlign: 'right',
            verticalAlign: 'middle',
          }}
        >
          <CaretRight
            size={12}
            weight="regular"
            color={TOKENS.textFaint}
            aria-hidden="true"
          />
        </td>
      </tr>

      {expanded && (
        <tr
          aria-hidden={false}
          style={{
            background: TOKENS.tableRowHover,
            borderBottom: `1px solid ${TOKENS.chartGrid}`,
          }}
        >
          <td />
          <td colSpan={4} style={{ padding: '8px 0 14px 0' }}>
            <DetailGrid row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Detail grid (5 collapsed columns) ────────────────────────────────────────

function DetailGrid({ row }: { row: KOLEntry }) {
  // Definition-list pairs for the 5 detail columns moved out of the primary
  // table per Analytics Reporter Phase 2.1 spec (D1: cut to 3 cols).
  const items: Array<{ label: string; value: string }> = [
    { label: 'HOLDERS',  value: row.holders.toLocaleString() },
    { label: 'WHALES',   value: row.whales.toLocaleString() },
    { label: 'VOLUME',   value: fmtUSD(row.totalVolumeUSD) },
    { label: 'AVG/USER', value: fmtUSD(row.avgVolumePerUserUSD) },
    { label: 'SCORE',    value: row.score.toFixed(2) },
  ];

  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
        margin: 0,
        padding: '4px 12px',
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <dt
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: TOKENS.textFaint,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {item.label}
          </dt>
          <dd
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              color: item.label === 'SCORE' ? TOKENS.accent : TOKENS.textSecondary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ─── States ────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <style>{`@keyframes kol-spin { to { transform: rotate(360deg) } }`}</style>
      <CircleNotch
        size={16}
        weight="bold"
        color={TOKENS.textMuted}
        style={{ animation: 'kol-spin 800ms linear infinite' }}
      />
      <span style={{ fontSize: 12, color: TOKENS.textMuted }}>Loading leaderboard…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <Trophy size={28} weight="regular" color={TOKENS.textFaint} />
      <div style={{ fontSize: 12, color: TOKENS.textMuted }}>
        No referrers with 5+ referred users yet.
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Warning size={24} weight="regular" color={TOKENS.threshold.red} />
      <span style={{ fontSize: 12, color: TOKENS.threshold.red, fontWeight: 700 }}>{message}</span>
    </div>
  );
}
