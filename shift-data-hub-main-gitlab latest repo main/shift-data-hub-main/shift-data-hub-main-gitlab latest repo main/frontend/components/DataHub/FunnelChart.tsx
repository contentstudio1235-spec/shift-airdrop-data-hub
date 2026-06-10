'use client';

import { FunnelStep, FunnelTab } from './types';

interface FunnelChartProps {
  steps: FunnelStep[];
  loading: boolean;
  activeTab: FunnelTab;
}

export function FunnelChart({ steps, loading, activeTab }: FunnelChartProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', color: '#3a6e5a', fontSize: '13px', gap: '8px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00c896', display: 'inline-block', animation: 'livePulse 1.2s ease infinite' }} />
        Computing conversion pathways...
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', color: '#3a6e5a', fontSize: '13px' }}>
        No funnel data available.
      </div>
    );
  }

  const maxVal = Math.max(...steps.map(s => Number(s.count))) || 1;

  // 3D perspective funnel: each layer is a trapezoid using SVG polygon
  // Total funnel area: centered, tapering from wide to narrow
  const SVG_W = 520;
  const SVG_H = 300;
  const TOP_WIDTH = 420;
  const BOTTOM_WIDTH = 160;
  const FUNNEL_TOP_Y = 16;
  const FUNNEL_BOTTOM_Y = SVG_H - 16;
  const FUNNEL_HEIGHT = FUNNEL_BOTTOM_Y - FUNNEL_TOP_Y;
  const CX = SVG_W / 2;

  const EMERALD = '#00c896';
  const EMERALD_DIM = 'rgba(0,200,150,0.12)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '32px', alignItems: 'center' }}>
      {/* 3D SVG Funnel */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="funnelFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0,200,150,0.18)" />
              <stop offset="100%" stopColor="rgba(0,200,150,0.04)" />
            </linearGradient>
            <linearGradient id="funnelStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,200,150,0.1)" />
              <stop offset="50%" stopColor="rgba(0,200,150,0.8)" />
              <stop offset="100%" stopColor="rgba(0,200,150,0.1)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {steps.map((step, idx) => {
            const ratio = Number(step.count) / maxVal;
            const nextRatio = steps[idx + 1] ? Number(steps[idx + 1].count) / maxVal : ratio * 0.7;

            const segH = FUNNEL_HEIGHT / steps.length;
            const topY = FUNNEL_TOP_Y + idx * segH;
            const bottomY = topY + segH;

            const curW = TOP_WIDTH - (TOP_WIDTH - BOTTOM_WIDTH) * (idx / steps.length);
            const nextW = TOP_WIDTH - (TOP_WIDTH - BOTTOM_WIDTH) * ((idx + 1) / steps.length);

            const x1 = CX - curW / 2;
            const x2 = CX + curW / 2;
            const x3 = CX + nextW / 2;
            const x4 = CX - nextW / 2;

            const pts = `${x1},${topY} ${x2},${topY} ${x3},${bottomY} ${x4},${bottomY}`;

            // Left-side drop-off annotation
            const prevCount = idx > 0 ? Number(steps[idx - 1].count) : null;
            const dropPct = prevCount ? ((Number(step.count) / prevCount) * 100).toFixed(1) : null;
            const midY = (topY + bottomY) / 2;

            return (
              <g key={step.name}>
                {/* Glass layer */}
                <polygon
                  points={pts}
                  fill="url(#funnelFill)"
                  stroke="url(#funnelStroke)"
                  strokeWidth="1"
                />
                {/* Neon top edge glow */}
                {idx === 0 && (
                  <line
                    x1={x1} y1={topY} x2={x2} y2={topY}
                    stroke={EMERALD} strokeWidth="2" filter="url(#glow)"
                  />
                )}
                {/* Bottom edge of each segment */}
                <line
                  x1={x4} y1={bottomY} x2={x3} y2={bottomY}
                  stroke={`rgba(0,200,150,${0.15 + idx * 0.15})`}
                  strokeWidth="1.5"
                  filter="url(#glow)"
                />

                {/* Center value label */}
                <text
                  x={CX} y={midY + 5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="15"
                  fontWeight="800"
                  fontFamily="'Space Grotesk', monospace"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {Number(step.count).toLocaleString()}
                </text>

                {/* Left drop-off % */}
                {dropPct && (
                  <>
                    <line
                      x1={x1 - 8} y1={midY}
                      x2={x1 - 50} y2={midY}
                      stroke="rgba(0,200,150,0.3)" strokeWidth="1" strokeDasharray="3 3"
                    />
                    <text
                      x={x1 - 56} y={midY + 4}
                      textAnchor="end"
                      fill={EMERALD}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="'Space Grotesk', monospace"
                    >
                      {dropPct}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Right: Stage labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {steps.map((step, idx) => {
          const prevCount = idx > 0 ? Number(steps[idx - 1].count) : null;
          const pct = prevCount ? ((Number(step.count) / prevCount) * 100).toFixed(1) : null;
          return (
            <div
              key={step.name}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '10px 0',
                borderLeft: `2px solid rgba(0,200,150,${0.1 + idx * 0.1})`,
                paddingLeft: '16px',
              }}
            >
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#4a7a68', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                {step.name}
                {pct && (
                  <span style={{ marginLeft: '6px', color: '#00c896' }}>→ {pct}%</span>
                )}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {Number(step.count).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
