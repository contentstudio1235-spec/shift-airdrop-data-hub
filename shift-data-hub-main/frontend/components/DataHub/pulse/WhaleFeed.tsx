"use client";
import React from 'react';
import { Waveform } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { fmtUSD, fmtWallet, fmtRelativeTime } from '@/lib/format';
import type { WhaleActivityEvent } from '@/types/pulse';

export interface WhaleFeedProps {
  events: WhaleActivityEvent[];
}

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 6;
const MAX_ENTRIES = 20;

/**
 * WhaleFeed — last-24h whale activity panel for the Pulse view.
 *
 * Visual:
 *   - Title strip + scrollable list
 *   - 240px tall (6 rows × 40px = 240); scrolls vertically for more
 *   - Caps at 20 entries even if backend returns more
 *
 * Why not react-window:
 *   - Hard ceiling of 20 rows; DOM cost is negligible
 *   - Simpler, fewer moving parts than a virtual list
 *
 * Empty state: centered Phosphor `Waveform` + caption when events=[].
 */
export function WhaleFeed({ events }: WhaleFeedProps) {
  const sliced = events.slice(0, MAX_ENTRIES);
  const listHeight = ROW_HEIGHT * VISIBLE_ROWS;

  return (
    <div
      style={{
        background: TOKENS.panel,
        border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 12,
        backdropFilter: `blur(${TOKENS.glassBlur})`,
        WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Title strip */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${TOKENS.chartGrid}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: TOKENS.panelDeep,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: TOKENS.textFaint,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Whale activity (24h)
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: TOKENS.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {sliced.length}
        </span>
      </div>

      {/* List body */}
      <div
        style={{
          height: listHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: `${TOKENS.accentBorder} ${TOKENS.bg}`,
        }}
        role="list"
        aria-label="Whale activity in the last 24 hours"
      >
        {sliced.length === 0 ? (
          <EmptyFeed />
        ) : (
          sliced.map((ev, i) => (
            <WhaleRow key={`${ev.wallet}-${ev.occurredAt}-${i}`} event={ev} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function WhaleRow({ event }: { event: WhaleActivityEvent }) {
  const isOpen = event.event === 'open';
  return (
    <div
      role="listitem"
      style={{
        height: ROW_HEIGHT,
        boxSizing: 'border-box',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: `1px solid ${TOKENS.chartGrid}`,
      }}
    >
      <span
        style={{
          width: 48,
          flexShrink: 0,
          fontSize: 11,
          color: TOKENS.textFaint,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtRelativeTime(event.occurredAt)}
      </span>

      <span
        style={{
          width: 100,
          flexShrink: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          color: TOKENS.textMuted,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={event.wallet}
      >
        {fmtWallet(event.wallet)}
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          color: TOKENS.textSecondary,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {event.asset}
      </span>

      <span
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          color: TOKENS.textPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtUSD(event.sizeUSD)}
      </span>

      <span
        style={{
          flexShrink: 0,
          width: 48,
          textAlign: 'right',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: isOpen ? TOKENS.threshold.green : TOKENS.textMuted,
        }}
      >
        {isOpen ? 'OPEN' : 'CLOSE'}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: TOKENS.textFaint,
      }}
    >
      <Waveform size={28} weight="regular" color={TOKENS.textFaint} />
      <span style={{ fontSize: 11, color: TOKENS.textMuted }}>
        No whale activity in last 24h
      </span>
    </div>
  );
}
