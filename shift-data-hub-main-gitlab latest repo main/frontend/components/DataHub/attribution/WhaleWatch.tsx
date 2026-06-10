"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Eye } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import { linkToProfileByWallet } from '@/lib/navigation';
import type { WhaleEvent } from '@/hooks/useWhaleStream';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface WhaleWatchProps {
  events: WhaleEvent[];
  connected: boolean;
  error: string | null;
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────

function fmtTimeSince(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

// ─── Card shell ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: TOKENS.panel,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  padding: 0,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  height: 480,
  display: 'flex',
  flexDirection: 'column',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function WhaleWatch({ events, connected, error }: WhaleWatchProps) {
  // 30s interval re-render for time-ago updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Track previous event count to identify brand-new events
  const prevCountRef = useRef(events.length);
  useEffect(() => {
    prevCountRef.current = events.length;
  });

  const isEmpty = events.length === 0 && connected;

  return (
    <div style={cardStyle}>
      <style>{`
        @keyframes whale-watch-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,200,150,0.6) }
          70%  { box-shadow: 0 0 0 5px rgba(0,200,150,0) }
          90%  { box-shadow: 0 0 0 0 rgba(0,200,150,0) }
          100% { box-shadow: 0 0 0 0 rgba(0,200,150,0) }
        }
        @keyframes whale-event-enter {
          0%   { transform: translateY(-100%); background: rgba(0,200,150,0.15); }
          10%  { transform: translateY(0);     background: rgba(0,200,150,0.15); }
          100% { transform: translateY(0);     background: transparent; }
        }
        @media (prefers-reduced-motion: reduce) {
          .whale-watch-dot { animation: none !important; }
          .whale-event-new { animation: none !important; }
        }
      `}</style>

      {/* Header strip */}
      <div
        style={{
          height: 52,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${TOKENS.chartGrid}`,
          background: TOKENS.panelDeep,
          flexShrink: 0,
          borderRadius: '16px 16px 0 0',
        }}
      >
        <Eye size={12} weight="bold" color={TOKENS.textFaint} />
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
          Whale Watch
        </div>
        <div style={{ flex: 1 }} />
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="whale-watch-dot"
            aria-label={connected ? 'Connection status: live' : 'Connection status: reconnecting'}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? TOKENS.accent : TOKENS.threshold.red,
              animation: connected ? 'whale-watch-pulse 3000ms ease-out infinite' : 'none',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: connected ? 800 : 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: connected ? TOKENS.accent : TOKENS.threshold.red,
              transition: `color ${MOTION.fast}`,
            }}
          >
            {connected ? 'LIVE' : 'Reconnecting…'}
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 10,
          color: TOKENS.textMuted,
          padding: '6px 20px',
          flexShrink: 0,
          borderBottom: `1px solid ${TOKENS.chartGrid}`,
        }}
      >
        Position opens ≥ $1,000
      </div>

      {/* Event list */}
      <div
        aria-live="polite"
        aria-label="Live whale trade stream"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: `${TOKENS.accentBorder} ${TOKENS.bg}`,
        }}
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          events.map((ev, i) => (
            <EventRow
              key={`${ev.wallet}-${ev.openedAt}-${i}`}
              event={ev}
              isNewest={!ev.isHistorical && i === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event, isNewest }: { event: WhaleEvent; isNewest: boolean }) {
  const timeSince = fmtTimeSince(event.openedAt);
  const profileHref = linkToProfileByWallet(event.wallet);

  return (
    <div
      className={isNewest ? 'whale-event-new' : undefined}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 20px',
        borderBottom: `1px solid ${TOKENS.chartGrid}`,
        animation: isNewest ? 'whale-event-enter 4400ms cubic-bezier(0.4,0,0.2,1) forwards' : 'none',
      }}
    >
      {/* Cell 1 — Time */}
      <div
        style={{
          width: 48,
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          color: TOKENS.textMuted,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          paddingTop: 2,
        }}
      >
        {timeSince}
      </div>

      {/* Cell 2 — Wallet + subline */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <a
          href={profileHref}
          aria-label={`View profile for wallet ${event.walletDisplay}`}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: TOKENS.accent,
            textDecoration: 'none',
            fontVariantNumeric: 'tabular-nums',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: `text-decoration ${MOTION.fast}`,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
        >
          {event.walletDisplay}
        </a>
        <div
          style={{
            fontSize: 10,
            color: TOKENS.textFaint,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 2,
          }}
        >
          {event.source} · {event.asset}
        </div>
      </div>

      {/* Cell 3 — Size + type badge */}
      <div
        style={{
          width: 72,
          flexShrink: 0,
          textAlign: 'right',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: TOKENS.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtUSD(event.sizeUSD)}
        </div>
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: event.type === 'open' ? TOKENS.threshold.green : TOKENS.threshold.yellow,
            marginTop: 2,
          }}
        >
          {event.type === 'open' ? 'OPEN' : 'CLOSE'}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 12,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <Eye size={28} weight="regular" color={TOKENS.textFaint} />
      <div style={{ fontSize: 12, color: TOKENS.textMuted }}>
        Watching for trades ≥ $1,000…
      </div>
    </div>
  );
}
