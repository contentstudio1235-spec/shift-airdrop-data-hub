"use client";
import React, { useState } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import type { Icon } from '@phosphor-icons/react';
import {
  TrendUp, TrendDown, Trophy, LinkSimple, Wallet, Eye,
  MagnifyingGlass, ShieldWarning, ArrowsMerge, LinkBreak, DotOutline,
} from '@phosphor-icons/react';
import { fmtUSD, fmtRelativeTime } from '@/lib/format';
import type { TimelineEntry as TimelineEntryType } from '@/hooks/useUserTimeline';

const EVENT_ICONS: Record<string, Icon> = {
  position_open:   TrendUp,
  position_close:  TrendDown,
  badge_earn:      Trophy,
  snag_link:       LinkSimple,
  wallet_connect:  Wallet,
  landing:         Eye,
  utm_touch:       MagnifyingGlass,
  gdpr_forget:     ShieldWarning,
  identity_merge:  ArrowsMerge,
  identity_link:   LinkSimple,
  identity_unlink: LinkBreak,
};

const SOURCE_PILL_COLORS: Record<string, string> = {
  helius:  TOKENS.accent,
  snag:    'rgba(159,181,170,0.6)',
  ga4:     'rgba(159,181,170,0.6)',
  system:  'rgba(159,181,170,0.4)',
  manual:  TOKENS.threshold.yellow,
};

function humanizeEvent(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function TimelineEntry({ entry }: { entry: TimelineEntryType }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = EVENT_ICONS[entry.eventName] ?? DotOutline;
  const sourceColor = entry.source ? (SOURCE_PILL_COLORS[entry.source] ?? TOKENS.textMuted) : null;
  const valueColor = entry.valueUSD == null
    ? TOKENS.textMuted
    : entry.eventName === 'position_close' && entry.valueUSD < 0
      ? TOKENS.threshold.red
      : entry.valueUSD > 0 ? TOKENS.threshold.green : TOKENS.accent;
  return (
    <div onClick={() => setExpanded(e => !e)} style={{
      display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px 64px',
      columnGap: 12, alignItems: 'center', padding: '8px 4px',
      borderBottom: `1px solid ${TOKENS.chartGrid}`, cursor: 'pointer',
      transition: `background ${MOTION.fast}`,
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,150,0.04)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={18} weight="regular" color={TOKENS.textPrimary} />
      <div>
        <div style={{ fontSize: 12, color: TOKENS.textPrimary, fontWeight: 700 }}>
          {humanizeEvent(entry.eventName)}
        </div>
        {entry.asset && (
          <div style={{ fontSize: 10, color: TOKENS.textFaint, marginTop: 2 }}>{entry.asset}</div>
        )}
      </div>
      <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: valueColor, fontVariantNumeric: 'tabular-nums' }}>
        {entry.valueUSD == null ? '—' : (entry.valueUSD > 0 ? '+' : '') + fmtUSD(entry.valueUSD)}
      </span>
      <span style={{ textAlign: 'right', fontSize: 11, color: TOKENS.textFaint }}>
        {fmtRelativeTime(entry.occurredAt)}
      </span>
      {sourceColor && (
        <span style={{
          padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
          background: sourceColor.replace(/[\d.]+\)$/, '0.15)'),
          border: `1px solid ${sourceColor.replace(/[\d.]+\)$/, '0.3)')}`,
          color: sourceColor, textAlign: 'center',
        }}>
          {entry.source}
        </span>
      )}
      {expanded && (
        <pre style={{
          gridColumn: '1 / -1', marginTop: 8, padding: 8,
          fontSize: 10, fontFamily: 'monospace', color: TOKENS.textMuted,
          background: 'rgba(0,0,0,0.3)', borderRadius: 6, maxHeight: 200, overflowY: 'auto',
          border: `1px solid ${TOKENS.chartGrid}`,
        }}>
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
