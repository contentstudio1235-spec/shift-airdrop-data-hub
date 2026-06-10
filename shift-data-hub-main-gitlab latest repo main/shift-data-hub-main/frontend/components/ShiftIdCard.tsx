'use client';

import { useMemo } from 'react';
import Sparkline from './Sparkline';
import { getChartData } from '@/lib/tokens';

interface ShiftIdCardProps {
  handle?: string;
  ticker?: string;
  rank?: number;
  points?: number;
  status?: string;
}

export default function ShiftIdCard({
  handle = 'SHIFT-004271',
  ticker = 'SHIFT',
  rank = 1247,
  points = 0,
  status = 'FOUNDING MEMBER',
}: ShiftIdCardProps) {
  const chartData = useMemo(() => getChartData(ticker, 40), [ticker]);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(38,200,184,0.1) 0%, rgba(7,99,140,0.08) 100%)',
        border: '1px solid rgba(38,200,184,0.25)',
        borderRadius: 16,
        padding: '20px 20px 0',
        position: 'relative',
        overflow: 'hidden',
        maxWidth: 320,
        width: '100%',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(38,200,184,0.15), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            SHIFT ID
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-space)' }}>{handle}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{status}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Rank</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)' }}>
            #{rank.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Points */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-space)', lineHeight: 1 }}>
          {points.toLocaleString()}
          <span style={{ fontSize: 14, color: 'var(--text-dim)', marginLeft: 6, fontWeight: 600 }}>PTS</span>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ margin: '0 -20px' }}>
        <Sparkline data={chartData} height={56} color="var(--mint)" fill={true} />
      </div>
    </div>
  );
}
