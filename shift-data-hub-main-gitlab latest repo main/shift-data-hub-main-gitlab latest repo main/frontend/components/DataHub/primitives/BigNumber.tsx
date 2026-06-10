"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export interface BigNumberProps {
  value: number | string;
  deltaPct?: number;
  deltaLabel?: string;
  formatter?: (n: number) => string;
}

const defaultFmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : n.toLocaleString();

export function BigNumber({ value, deltaPct, deltaLabel = 'WoW', formatter = defaultFmt }: BigNumberProps) {
  const display = typeof value === 'number' ? formatter(value) : value;
  const deltaColor =
    deltaPct === undefined ? TOKENS.textMuted
    : deltaPct >= 0 ? TOKENS.threshold.green
    : TOKENS.threshold.red;
  const sign = deltaPct === undefined ? '' : deltaPct >= 0 ? '+' : '';

  return (
    <div>
      <div style={{
        fontSize: 32,
        fontWeight: 800,
        color: TOKENS.textPrimary,
        lineHeight: 1.0,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </div>
      {deltaPct !== undefined && (
        <div style={{
          fontSize: 11,
          color: deltaColor,
          marginTop: 4,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {sign}{deltaPct.toFixed(1)}% <span style={{ color: TOKENS.textFaint }}>{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}
