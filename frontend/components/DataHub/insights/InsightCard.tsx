"use client";
import React from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface InsightCardProps {
  text: string;
  priority: 'P1' | 'P2' | 'P3';
  onDismiss?: () => void;
}

export function InsightCard({ text, priority, onDismiss }: InsightCardProps) {
  const borderColor =
    priority === 'P1' ? 'rgba(255,90,90,0.4)'
    : priority === 'P2' ? 'rgba(255,154,60,0.4)'
    : TOKENS.accentBorder;

  const dotColor =
    priority === 'P1' ? TOKENS.threshold.red
    : priority === 'P2' ? TOKENS.threshold.yellow
    : TOKENS.accent;

  return (
    <div style={{
      flexShrink: 0,
      minWidth: 320,
      maxWidth: 420,
      padding: '12px 14px',
      background: TOKENS.panel,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      backdropFilter: `blur(${TOKENS.glassBlur})`,
      WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      scrollSnapAlign: 'start',
      transition: `border-color ${MOTION.fast}`,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: dotColor,
        marginTop: 6,
        flexShrink: 0,
      }} />
      <div style={{
        fontSize: 12,
        color: TOKENS.textPrimary,
        lineHeight: 1.45,
        flex: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{text}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: TOKENS.textFaint,
            fontSize: 16,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Dismiss insight"
        >×</button>
      )}
    </div>
  );
}
