"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { BigNumber } from '../primitives/BigNumber';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS } from '@/lib/chartTokens';

interface ChannelROIResponse {
  rows: Array<{
    source: string;
    totalVolumeUSD: number;
    holders: number;
  }>;
  dataQuality?: string;
}

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`;

export function HeroVolume7d({ filters }: { filters: Filters }) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useFunnelData<ChannelROIResponse>(
    '/api/attribution/channel-roi',
    { ...filters, from: sevenDaysAgo },
  );

  if (loading && !data) {
    return <ChartFrame title="7d Volume"><div style={{ height: 80, opacity: 0.5 }} /></ChartFrame>;
  }
  if (error || !data) {
    return <ChartFrame title="7d Volume"><EmptyState variant="stale" onRetry={refetch} /></ChartFrame>;
  }

  const total = (data.rows ?? []).reduce((acc, r) => acc + r.totalVolumeUSD, 0);
  const top5 = (data.rows ?? []).slice(0, 5);
  const isPlaceholder = data.dataQuality === 'sprint_0_placeholder';

  return (
    <ChartFrame title="7d Volume" subtitle={isPlaceholder ? 'Source: referred_by_code (v1)' : 'Source: utm_source'}>
      <BigNumber value={total} formatter={fmtUSD} />
      <div style={{ marginTop: 12, height: 64 }}>
        <ResponsiveContainer>
          <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="source" hide />
            <Bar dataKey="totalVolumeUSD" fill={TOKENS.accent} radius={[4, 4, 4, 4]} maxBarSize={10}>
              {top5.map((_, i) => (
                <Cell key={i} fill={TOKENS.accent} fillOpacity={1 - i * 0.18} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
