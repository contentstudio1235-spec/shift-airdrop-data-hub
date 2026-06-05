"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import type { AumTrendPoint } from '@/types/pulse';

export interface AumSparklineProps {
  points: AumTrendPoint[];
}

// Internal SVG viewport — width is scaled to container via preserveAspectRatio.
const VIEW_W = 280;
const VIEW_H = 80;          // chart area inside the SVG; outer wrapper is 100px tall
const PAD_X = 4;
const PAD_Y = 6;

/**
 * AumSparkline — lightweight inline SVG sparkline (no Recharts).
 *
 * Visual:
 *   - 280×100 wrapper; SVG fills horizontally
 *   - Title row above SVG: "AUM (30d)" + current value + delta (first→last)
 *   - Single accent polyline through normalized points
 *   - 2 dots: first (faint), last (accent, larger)
 *
 * Empty state: renders a quiet placeholder if `points.length < 2`.
 */
export function AumSparkline({ points }: AumSparklineProps) {
  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 280,
    height: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  // Edge cases — need at least 2 points to draw a line.
  if (!points || points.length < 2) {
    return (
      <div style={wrapperStyle}>
        <SparklineHeader current={null} first={null} last={null} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: TOKENS.textFaint,
          }}
        >
          Not enough data
        </div>
      </div>
    );
  }

  const values = points.map(p => p.value);
  const first = values[0];
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // guard against flat series

  const xStep = (VIEW_W - PAD_X * 2) / (values.length - 1);
  const norm = (v: number) =>
    VIEW_H - PAD_Y - ((v - min) / range) * (VIEW_H - PAD_Y * 2);

  const pathPoints = values.map((v, i) => `${PAD_X + i * xStep},${norm(v)}`);
  const polylinePoints = pathPoints.join(' ');

  const firstPoint = pathPoints[0].split(',').map(Number);
  const lastPoint = pathPoints[pathPoints.length - 1].split(',').map(Number);

  return (
    <div style={wrapperStyle}>
      <SparklineHeader current={last} first={first} last={last} />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={VIEW_H}
        preserveAspectRatio="none"
        role="img"
        aria-label={`AUM trend over 30 days, ending at ${fmtUSD(last)}`}
        style={{ display: 'block' }}
      >
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={TOKENS.accent}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* First-point dot — faint */}
        <circle
          cx={firstPoint[0]}
          cy={firstPoint[1]}
          r={2}
          fill={TOKENS.textFaint}
        />
        {/* Last-point dot — accent, larger */}
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r={3.5}
          fill={TOKENS.accent}
        />
      </svg>
    </div>
  );
}

/** Header row above the sparkline: title + current value + delta vs first point. */
function SparklineHeader({
  current,
  first,
  last,
}: {
  current: number | null;
  first: number | null;
  last: number | null;
}) {
  const hasDelta = first !== null && last !== null && first !== 0;
  const delta = hasDelta ? last! - first! : null;
  const deltaPct = hasDelta ? ((last! - first!) / first!) * 100 : null;
  const deltaColor =
    delta === null || delta === 0
      ? TOKENS.textMuted
      : delta > 0
        ? TOKENS.threshold.green
        : TOKENS.threshold.red;
  const sign = delta === null ? '' : delta > 0 ? '+' : delta < 0 ? '−' : '';

  return (
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
        AUM (30d)
      </span>
      <span style={{ flex: 1 }} />
      {current !== null && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: TOKENS.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtUSD(current)}
        </span>
      )}
      {deltaPct !== null && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: deltaColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {sign}
          {Math.abs(deltaPct).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
