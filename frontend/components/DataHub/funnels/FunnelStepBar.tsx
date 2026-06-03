"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface FunnelStepBarProps {
  name: string;
  count: number;
  widthPct: number;
  stepIndex?: number;             // for stagger
  conversionFromPrev?: number;
  thresholdColor?: string;
  onClick?: () => void;
  active?: boolean;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : n.toLocaleString();

export function FunnelStepBar({
  name, count, widthPct, stepIndex = 0, conversionFromPrev, thresholdColor, onClick, active,
}: FunnelStepBarProps) {
  const barColor = thresholdColor ?? TOKENS.accent;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: '10px 14px',
        borderRadius: 10,
        background: active ? TOKENS.accentDim : 'transparent',
        border: `1px solid ${active ? TOKENS.accentBorder : 'transparent'}`,
        transition: `all ${MOTION.fast}`,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: TOKENS.textPrimary,
        }}>{name}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color: barColor,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}>{fmt(count)}</span>
      </div>
      <div style={{
        position: 'relative',
        width: '100%',
        height: 8,
        background: TOKENS.chartFill,
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
            delay: stepIndex * 0.08,
          }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
            borderRadius: 4,
          }}
        />
      </div>
      {conversionFromPrev !== undefined && (
        <div style={{
          fontSize: 10,
          color: TOKENS.textFaint,
          marginTop: 4,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {conversionFromPrev.toFixed(1)}% from previous step
        </div>
      )}
    </div>
  );
}
