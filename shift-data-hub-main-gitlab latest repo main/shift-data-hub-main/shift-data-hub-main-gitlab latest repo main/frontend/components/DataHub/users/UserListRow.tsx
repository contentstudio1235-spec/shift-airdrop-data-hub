"use client";
import React from 'react';
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
        gridTemplateColumns: '140px 100px 90px 80px 20px',
        columnGap: 14,
        alignItems: 'center',
        borderLeft: isSelected ? `2px solid ${TOKENS.accent}` : '2px solid transparent',
        borderBottom: `1px solid ${isSelected ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.025)'}`,
        background: isSelected ? TOKENS.accentDim : 'transparent',
        cursor: 'pointer',
        transition: `all ${MOTION.fast}`,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,200,150,0.04)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, color: TOKENS.textPrimary, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {fmtWallet(row.primaryWallet)}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: row.displayName ? TOKENS.textPrimary : TOKENS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.displayName || '—'}
      </span>
      <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: row.lifetimeVolumeUSD > 0 ? TOKENS.accent : TOKENS.textFaint, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
        {fmtUSD(row.lifetimeVolumeUSD)}
      </span>
      <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: TOKENS.textFaint }}>
        {fmtRelativeTime(row.lastSeenAt)}
      </span>
      <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span aria-hidden style={{
          width: 8, height: 8, borderRadius: '50%',
          background: pillColor, boxShadow: `0 0 6px ${pillColor}`,
        }} />
      </span>
    </div>
  );
}
