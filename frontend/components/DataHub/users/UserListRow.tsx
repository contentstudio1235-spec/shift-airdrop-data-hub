"use client";
import React from 'react';
import { TwitterLogo, DiscordLogo, TelegramLogo } from '@phosphor-icons/react';
import { TOKENS, MOTION, thresholdColor } from '@/lib/chartTokens';
import { fmtUSD, fmtWallet, fmtRelativeTime } from '@/lib/format';
import type { ProfileSummary } from '@/hooks/useUsersList';

// ─── Grid template — single source of truth ──────────────────────────────────
// Exported so UserListPane can import it — ensures header, row, and skeleton
// always use identical column widths and never drift.
export const GRID_COLUMNS = '240px 160px 92px 80px 80px 56px 28px 28px 28px 32px';

export interface UserListRowProps {
  row: ProfileSummary;
  isSelected: boolean;
  onClick: () => void;
  style: React.CSSProperties;
  // ariaAttributes injected by react-window v2 List — not used in visual output
  ariaAttributes?: Record<string, unknown>;
}

export function UserListRow({ row, isSelected, onClick, style }: UserListRowProps) {
  const pillColor = thresholdColor(row.stitchedPct, { red: 0, yellow: 50, green: 80 });
  return (
    <div
      onClick={onClick}
      style={{
        ...style,
        boxSizing: 'border-box',
        height: 56,
        padding: '0 14px 0 12px',
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        columnGap: 10,
        alignItems: 'center',
        borderLeft: isSelected ? `2px solid ${TOKENS.accent}` : '2px solid transparent',
        borderBottom: `1px solid ${isSelected ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.025)'}`,
        background: isSelected ? TOKENS.accentDim : 'transparent',
        cursor: 'pointer',
        transition: `all ${MOTION.fast}`,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = TOKENS.tableRowHover; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* 1: WALLET — 240px, monospace 13px tabular-nums, 8+6 truncation */}
      <span style={{
        fontSize: 13,
        fontWeight: 800,
        color: TOKENS.textPrimary,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'monospace',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {fmtWallet(row.primaryWallet, 8, 6)}
      </span>

      {/* 2: NAME — 160px, dim dash when null */}
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: row.displayName ? TOKENS.textPrimary : TOKENS.textMuted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {row.displayName ?? '—'}
      </span>

      {/* 3: VOLUME — 92px, right-aligned, accent if >0, textFaint if 0 */}
      <span style={{
        textAlign: 'right',
        fontSize: 13,
        fontWeight: 800,
        color: row.lifetimeVolumeUSD > 0 ? TOKENS.accent : TOKENS.textFaint,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtUSD(row.lifetimeVolumeUSD)}
      </span>

      {/* 4: FIRST SEEN — 80px, right-aligned, 11px textFaint */}
      <span style={{
        textAlign: 'right',
        fontSize: 11,
        fontWeight: 600,
        color: TOKENS.textFaint,
      }}>
        {fmtRelativeTime(row.firstSeenAt)}
      </span>

      {/* 5: LAST SEEN — 80px, right-aligned, 11px textFaint */}
      <span style={{
        textAlign: 'right',
        fontSize: 11,
        fontWeight: 600,
        color: TOKENS.textFaint,
      }}>
        {fmtRelativeTime(row.lastSeenAt)}
      </span>

      {/* 6: HOLDINGS — 56px, right-aligned, accent+bold when >0, textSecondary when 0 */}
      <span style={{
        textAlign: 'right',
        fontSize: 13,
        fontWeight: row.holdings > 0 ? 800 : 600,
        color: row.holdings > 0 ? TOKENS.accent : TOKENS.textSecondary,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {row.holdings.toLocaleString()}
      </span>

      {/* 7: X — 28px badge */}
      <span
        role="img"
        aria-label={row.hasX ? 'X linked' : 'X not linked'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 56,
        }}
      >
        <TwitterLogo
          aria-hidden
          size={14}
          weight={row.hasX ? 'fill' : 'regular'}
          style={{
            color: row.hasX ? TOKENS.accent : TOKENS.textFaint,
            transition: `color ${MOTION.fast}`,
            flexShrink: 0,
          }}
        />
      </span>

      {/* 8: DISCORD — 28px badge */}
      <span
        role="img"
        aria-label={row.hasDiscord ? 'Discord linked' : 'Discord not linked'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 56,
        }}
      >
        <DiscordLogo
          aria-hidden
          size={14}
          weight={row.hasDiscord ? 'fill' : 'regular'}
          style={{
            color: row.hasDiscord ? TOKENS.accent : TOKENS.textFaint,
            transition: `color ${MOTION.fast}`,
            flexShrink: 0,
          }}
        />
      </span>

      {/* 9: TG — 28px badge, always regular/dim (no Telegram data — intentional) */}
      <span
        role="img"
        aria-label="Telegram not linked"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 56,
        }}
      >
        <TelegramLogo
          aria-hidden
          size={14}
          weight="regular"
          style={{
            color: TOKENS.textFaint,
            flexShrink: 0,
          }}
        />
      </span>

      {/* 10: STITCH — 32px, threshold dot */}
      <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span aria-hidden style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: pillColor,
          boxShadow: `0 0 6px ${pillColor}`,
        }} />
      </span>
    </div>
  );
}
