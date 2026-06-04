"use client";
import React, { useState, useMemo } from 'react';
import { Medal, CircleNotch, Warning, Trophy, ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import type { KOLPayload, KOLEntry } from '@/hooks/useKOLLeaderboard';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'users' | 'holders' | 'holderRate' | 'totalVolumeUSD' | 'avgVolumePerUserUSD' | 'score';
type SortDir = 'asc' | 'desc';

export interface KOLLeaderboardProps {
  data: KOLPayload | null;
  loading: boolean;
  error: string | null;
}

// ─── Source label mapping ──────────────────────────────────────────────────────

const SOURCE_MAP: Record<string, string> = {
  snag_referrals: 'Snag',
  utm: 'UTM',
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

const COLUMNS: ColDef[] = [
  { key: 'referrer',           label: 'REFERRER',  width: undefined, align: 'left',  sortable: false },
  { key: 'users',              label: 'USERS',     width: 56,        align: 'right', sortable: true  },
  { key: 'holders',            label: 'HOLDERS',   width: 64,        align: 'right', sortable: true  },
  { key: 'holderRate',         label: 'RATE',      width: 72,        align: 'right', sortable: true  },
  { key: 'totalVolumeUSD',     label: 'VOLUME',    width: 88,        align: 'right', sortable: true  },
  { key: 'avgVolumePerUserUSD',label: 'AVG/USER',  width: 80,        align: 'right', sortable: true  },
  { key: 'score',              label: 'SCORE',     width: 56,        align: 'right', sortable: true  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function KOLLeaderboard({ data, loading, error }: KOLLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
        Referrers with 5+ referred users
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
              <col />
              {[56, 64, 72, 88, 80, 56].map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr style={{ padding: '10px 0', borderBottom: `1px solid ${TOKENS.chartGrid}` }}>
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
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => (
                <TableRow key={`${row.referrer}-${i}`} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Table row ─────────────────────────────────────────────────────────────────

function TableRow({ row }: { row: KOLEntry }) {
  const [hovered, setHovered] = useState(false);
  const display = fmtReferrer(row.referrer);
  const isWallet = display !== row.referrer;

  return (
    <tr
      style={{
        padding: '10px 0',
        borderBottom: `1px solid ${TOKENS.chartGrid}`,
        background: hovered ? TOKENS.tableRowHover : 'transparent',
        transition: `background ${MOTION.fast}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

      {/* HOLDERS */}
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
        {row.holders.toLocaleString()}
      </td>

      {/* RATE */}
      <td style={{ padding: '10px 0', textAlign: 'right' }}>
        <RatePill holderRate={row.holderRate} />
      </td>

      {/* VOLUME */}
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
        {fmtUSD(row.totalVolumeUSD)}
      </td>

      {/* AVG/USER */}
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
        {fmtUSD(row.avgVolumePerUserUSD)}
      </td>

      {/* SCORE */}
      <td
        style={{
          padding: '10px 0',
          textAlign: 'right',
          fontSize: 13,
          fontWeight: 800,
          color: TOKENS.accent,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {row.score.toFixed(2)}
      </td>
    </tr>
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
