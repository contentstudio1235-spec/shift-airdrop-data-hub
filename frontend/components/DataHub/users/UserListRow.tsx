"use client";
import React from 'react';
import { TwitterLogo, DiscordLogo, TelegramLogo } from '@phosphor-icons/react';
import { TOKENS, MOTION, thresholdColor } from '@/lib/chartTokens';
import { fmtUSD, fmtWallet, fmtRelativeTime } from '@/lib/format';
import type { ProfileSummary } from '@/hooks/useUsersList';

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
        gridTemplateColumns: '148px 96px 76px 64px 24px 24px 24px 28px',
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
      {/* WALLET — 148px, monospace truncated */}
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
        {fmtWallet(row.primaryWallet)}
      </span>

      {/* NAME — 96px, dim dash when null */}
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: row.displayName ? TOKENS.textPrimary : TOKENS.textMuted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {row.displayName || '—'}
      </span>

      {/* VOLUME — 76px, right-aligned, accent if >0 */}
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

      {/* LAST SEEN — 64px, right-aligned, faint */}
      <span style={{
        textAlign: 'right',
        fontSize: 11,
        fontWeight: 600,
        color: TOKENS.textFaint,
      }}>
        {fmtRelativeTime(row.lastSeenAt)}
      </span>

      {/* X — 24px badge */}
      <span
        role="img"
        aria-label={row.hasX ? 'X linked' : 'X not linked'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
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

      {/* DISCORD — 24px badge */}
      <span
        role="img"
        aria-label={row.hasDiscord ? 'Discord linked' : 'Discord not linked'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
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

      {/* TG — 24px badge, always regular/dim (no Snag data yet — intentional) */}
      <span
        role="img"
        aria-label="Telegram not linked"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
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

      {/* STITCH-DOT — 28px, threshold pill */}
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
