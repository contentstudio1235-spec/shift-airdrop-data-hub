"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import type { SignupSourceBucket } from '@/types/pulse';

export interface SignupsBarProps {
  buckets: SignupSourceBucket[];
}

const ROW_HEIGHT = 22;
const LABEL_WIDTH = 100;

/**
 * SignupsBar — horizontal bar chart of signups by source over the last 24h.
 *
 * Trusts the backend's ordering (top 5 + "other"); does not re-sort.
 * Width-normalized to the largest bucket so the longest bar fills the row.
 */
export function SignupsBar({ buckets }: SignupsBarProps) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: TOKENS.textFaint,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Signups by source (24h)
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: TOKENS.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {total.toLocaleString()}
        </span>
      </div>

      {buckets.length === 0 ? (
        <div
          style={{
            fontSize: 10,
            color: TOKENS.textFaint,
            padding: '12px 0',
          }}
        >
          No signups in last 24h
        </div>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          role="list"
          aria-label="Signups by source"
        >
          {buckets.map((b, i) => {
            const widthPct = (b.count / max) * 100;
            return (
              <div
                key={`${b.source}-${i}`}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: ROW_HEIGHT,
                }}
              >
                <span
                  style={{
                    width: LABEL_WIDTH,
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: TOKENS.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textTransform: 'lowercase',
                  }}
                  title={b.source}
                >
                  {b.source}
                </span>

                <div
                  style={{
                    flex: 1,
                    height: 10,
                    background: TOKENS.accentDim,
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      background: TOKENS.accent,
                      borderRadius: 3,
                    }}
                  />
                </div>

                <span
                  style={{
                    width: 48,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: 700,
                    color: TOKENS.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {b.count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
