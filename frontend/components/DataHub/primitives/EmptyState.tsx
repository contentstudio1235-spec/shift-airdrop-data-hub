"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export type EmptyVariant = 'insufficient' | 'stale' | 'gated';

export interface EmptyStateProps {
  variant: EmptyVariant;
  actualN?: number;
  requiredN?: number;
  lastUpdated?: string;
  coveragePct?: number;
  coverageRequired?: number;
  lastGoodValue?: string;
  onRetry?: () => void;
}

export function EmptyState({
  variant, actualN, requiredN, lastUpdated, coveragePct, coverageRequired, lastGoodValue, onRetry,
}: EmptyStateProps) {
  let headline = '';
  let subtext = '';

  if (variant === 'insufficient') {
    headline = 'Insufficient data';
    subtext = actualN !== undefined && requiredN !== undefined
      ? `n = ${actualN}, minimum ${requiredN}`
      : 'Sample size below threshold';
  } else if (variant === 'stale') {
    headline = 'Data temporarily unavailable';
    subtext = lastUpdated ? `Last updated ${lastUpdated} ago` : 'Endpoint not responding';
  } else if (variant === 'gated') {
    headline = 'Awaiting attribution coverage';
    subtext = coveragePct !== undefined && coverageRequired !== undefined
      ? `Coverage at ${coveragePct.toFixed(0)}% — ${coverageRequired}% required`
      : 'Attribution coverage insufficient';
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      minHeight: 110,
      gap: 4,
      position: 'relative',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.textPrimary, opacity: 0.85 }}>
        {headline}
      </div>
      <div style={{ fontSize: 11, color: TOKENS.textMuted }}>{subtext}</div>
      {variant === 'stale' && lastGoodValue && (
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          color: TOKENS.textPrimary,
          opacity: 0.4,
          marginTop: 6,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {lastGoodValue}
        </div>
      )}
      {onRetry && variant === 'stale' && (
        <button onClick={onRetry} style={{
          background: 'transparent',
          color: TOKENS.accent,
          border: `1px solid ${TOKENS.accentBorder}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          position: 'absolute',
          bottom: 0,
          right: 0,
        }}>Retry</button>
      )}
    </div>
  );
}
