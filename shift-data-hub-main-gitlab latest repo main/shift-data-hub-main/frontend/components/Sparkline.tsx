'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  width?: number;
  strokeWidth?: number;
}

export default function Sparkline({
  data,
  color = 'var(--mint)',
  height = 60,
  fill = true,
  width = 240,
  strokeWidth = 1.5,
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return { line: '', area: '' };

    const W = width;
    const H = height;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.07;
      return { x, y };
    });

    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    const area =
      `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L0,${H} Z`;

    return { line, area };
  }, [data, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {fill && (
        <defs>
          <linearGradient id={`sparkGrad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
      )}
      {fill && (
        <path
          d={path.area}
          fill={`url(#sparkGrad-${color.replace(/[^a-z]/gi, '')})`}
        />
      )}
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
