"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface AcquisitionResponse {
  stitchedPct?: number;
  attributablePct?: number | null;
}

export function HeroAttributionCoverage({ filters }: { filters: Filters }) {
  const { data, loading, error, refetch } = useFunnelData<AcquisitionResponse>(
    '/api/funnels/acquisition',
    filters,
  );

  if (loading && !data) return <ChartFrame title="Attribution Coverage"><div style={{ height: 110, opacity: 0.5 }} /></ChartFrame>;
  if (error || !data) return <ChartFrame title="Attribution Coverage"><EmptyState variant="stale" onRetry={refetch} /></ChartFrame>;

  const pct = data.attributablePct ?? data.stitchedPct ?? 0;
  const t = getThresholdsForKPI('attribution_coverage_pct');
  const pillColor = thresholdColor(pct, t);
  const isStitchedFallback = data.attributablePct === null || data.attributablePct === undefined;

  const pieData = [
    { name: 'Covered', value: pct },
    { name: 'Uncovered', value: Math.max(0, 100 - pct) },
  ];

  return (
    <ChartFrame
      title="Attribution Coverage"
      subtitle={isStitchedFallback ? 'Stitched proxy (utm_source pending)' : 'attributable / total'}
      thresholdColor={pillColor}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 80, height: 80 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={26}
                outerRadius={38}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive
                animationDuration={600}
              >
                <Cell fill={pillColor} />
                <Cell fill="rgba(255,255,255,0.05)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: TOKENS.textPrimary,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {pct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: TOKENS.textFaint, marginTop: 4 }}>
            red gate ≤ 50%
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}
