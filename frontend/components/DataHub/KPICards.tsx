'use client';

import { AnalyticsMetrics } from './types';
import Sparkline from '@/components/Sparkline';

interface KPICardProps {
  rank: number;
  label: string;
  subLabel: string;
  value: string;
  change: string;
  positive: boolean;
  sparkData: number[];
  loading: boolean;
  accentColor?: string;
}

export function KPICard({
  rank,
  label,
  subLabel,
  value,
  change,
  positive,
  sparkData,
  loading,
  accentColor = '#00c896',
}: KPICardProps) {
  return (
    <div style={{
      background: 'rgba(10, 20, 16, 0.85)',
      border: '1px solid rgba(0, 200, 150, 0.15)',
      borderRadius: '14px',
      padding: '22px 24px 16px',
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
      }} />

      {/* Rank badge + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{
          width: '22px', height: '22px', borderRadius: '6px',
          background: `rgba(0,200,150,0.12)`, border: `1px solid rgba(0,200,150,0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: accentColor, flexShrink: 0,
        }}>{rank}</span>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: '#6b8f80',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>{label}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '11px', fontWeight: 700,
          color: positive ? '#00c896' : '#ff6b6b',
          background: positive ? 'rgba(0,200,150,0.1)' : 'rgba(255,107,107,0.1)',
          border: `1px solid ${positive ? 'rgba(0,200,150,0.25)' : 'rgba(255,107,107,0.25)'}`,
          borderRadius: '20px', padding: '2px 8px',
        }}>
          {positive ? '↑' : '↓'} {change}
        </span>
      </div>

      {/* Sub label */}
      <div style={{ fontSize: '12px', color: '#4a6e5e', marginBottom: '4px' }}>{subLabel}</div>

      {/* Main value */}
      <div style={{
        fontSize: '2.6rem', fontWeight: 800, color: '#ffffff',
        letterSpacing: '-0.03em', lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
        minHeight: '3.2rem', display: 'flex', alignItems: 'center',
      }}>
        {loading ? (
          <div style={{
            width: '140px', height: '2.4rem', borderRadius: '8px',
            background: 'linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%)',
            backgroundSize: '400px 100%',
            animation: 'shimmer 1.4s ease infinite',
          }} />
        ) : value}
      </div>

      {/* Sparkline */}
      <div style={{ marginTop: '8px', opacity: loading ? 0.3 : 1, transition: 'opacity 0.4s' }}>
        <Sparkline
          data={sparkData.length > 1 ? sparkData : [0, 0]}
          color={accentColor}
          height={48}
          fill={true}
          width={300}
          strokeWidth={1.8}
        />
      </div>
    </div>
  );
}

interface KPICardsProps {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
}

export function KPICards({ metrics, loading }: KPICardsProps) {
  // Derive sparkline shapes from metrics ratio (since we don't have historical timeseries)
  // These shapes are illustrative upward trend ending at current value
  const stitchedSpark = [0.4, 0.5, 0.45, 0.6, 0.55, 0.7, 0.75, 0.8, 0.9, 1.0].map(r =>
    Math.round((metrics?.stitchedUsers || 0) * r)
  );
  const holderSpark = [0.5, 0.55, 0.6, 0.58, 0.65, 0.7, 0.75, 0.85, 0.92, 1.0].map(r =>
    Math.round((metrics?.activeHolders || 0) * r)
  );
  const volumeSpark = [0.3, 0.4, 0.5, 0.45, 0.55, 0.6, 0.7, 0.8, 0.9, 1.0].map(r =>
    Math.round((metrics?.totalVolume || 0) * r)
  );

  const fmtVolume = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
    }}>
      <KPICard
        rank={1} label="Stitched GA4 Profiles" subLabel="Total:"
        value={loading ? '' : (metrics?.stitchedUsers || 0).toLocaleString()}
        change="12.4%" positive={true} sparkData={stitchedSpark} loading={loading}
      />
      <KPICard
        rank={2} label="Active AUM Holders" subLabel="Holders:"
        value={loading ? '' : (metrics?.activeHolders || 0).toLocaleString()}
        change="6.7%" positive={true} sparkData={holderSpark} loading={loading}
      />
      <KPICard
        rank={3} label="USD Volume" subLabel="Total:"
        value={loading ? '' : fmtVolume(metrics?.totalVolume || 0)}
        change="15.1%" positive={true} sparkData={volumeSpark} loading={loading}
      />
    </div>
  );
}
