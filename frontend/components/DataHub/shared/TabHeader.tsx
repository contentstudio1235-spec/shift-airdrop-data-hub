"use client";
import React from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';

/**
 * TabHeader — single-question header strip for Data Hub tabs.
 *
 * Pattern mirrors the existing AttributionView Header: each tab sets ONE clear
 * question/answer in the subtitle so users know what this view is FOR before
 * any chart loads. Right side shows last-updated timestamp + Refresh button.
 *
 * Usage:
 *   <TabHeader
 *     title="Funnels"
 *     subtitle="Where do users drop off..."
 *     lastUpdated={lastUpdated}
 *     onRefresh={refetch}
 *     loading={loading}
 *   />
 *
 * For non-polling tabs (e.g. UsersView), pass `liveIndicator` instead of
 * `lastUpdated` to show a green "live" dot.
 */
export interface TabHeaderProps {
  title: string;
  subtitle: string;
  lastUpdated?: Date | null;
  liveIndicator?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString();
}

export function TabHeader({
  title,
  subtitle,
  lastUpdated,
  liveIndicator,
  onRefresh,
  loading = false,
}: TabHeaderProps) {
  return (
    <div
      style={{
        background: TOKENS.panel,
        backdropFilter: `blur(${TOKENS.glassBlur})`,
        border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: TOKENS.textPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: TOKENS.textMuted,
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>

      {liveIndicator ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: TOKENS.textFaint,
            letterSpacing: '0.05em',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: TOKENS.accent,
              boxShadow: `0 0 6px ${TOKENS.accent}`,
            }}
          />
          live
        </div>
      ) : lastUpdated ? (
        <div
          style={{
            fontSize: 11,
            color: TOKENS.textFaint,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          updated {formatTime(lastUpdated)}
        </div>
      ) : null}

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh"
          style={{
            background: 'transparent',
            border: `1px solid ${TOKENS.accentBorder}`,
            borderRadius: 8,
            color: TOKENS.accent,
            padding: '6px 10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            transition: `all ${MOTION.fast}`,
          }}
        >
          <ArrowClockwise size={12} weight="bold" />
          Refresh
        </button>
      )}
    </div>
  );
}
