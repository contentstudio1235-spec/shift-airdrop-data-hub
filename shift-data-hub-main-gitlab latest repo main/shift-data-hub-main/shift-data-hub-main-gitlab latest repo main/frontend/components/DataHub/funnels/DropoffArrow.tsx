"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export interface DropoffArrowProps {
  dropPct: number;
  dropAbsolute: number;
  thresholdColor?: string;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : n.toLocaleString();

export function DropoffArrow({ dropPct, dropAbsolute, thresholdColor }: DropoffArrowProps) {
  const color = thresholdColor ?? TOKENS.threshold.yellow;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 14px',
      height: 18,
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M7 0 L7 10 M3 7 L7 11 L11 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{
        fontSize: 10,
        color,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        −{dropPct.toFixed(1)}% ({fmt(dropAbsolute)} lost)
      </span>
    </div>
  );
}
