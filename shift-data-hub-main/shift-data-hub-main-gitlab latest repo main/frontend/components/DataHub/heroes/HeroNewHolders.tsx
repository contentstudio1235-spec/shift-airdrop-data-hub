"use client";
import React from 'react';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { BigNumber } from '../primitives/BigNumber';
import { Sparkline } from '../primitives/Sparkline';
import { EmptyState } from '../primitives/EmptyState';
import { thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface AcquisitionResponse {
  steps: Array<{ id: string; count: number; vs7dDelta?: number }>;
  dailyTrend?: Array<{ date: string; value: number }>;
}

export function HeroNewHolders({ filters }: { filters: Filters }) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useFunnelData<AcquisitionResponse>(
    '/api/funnels/acquisition',
    { ...filters, from: sevenDaysAgo },
  );

  if (loading && !data) {
    return (
      <ChartFrame title="New Holders (7d)" subtitle="Wallets with ≥1 trade">
        <div style={{ height: 80, opacity: 0.5 }} />
      </ChartFrame>
    );
  }

  if (error || !data) {
    return (
      <ChartFrame title="New Holders (7d)">
        <EmptyState variant="stale" onRetry={refetch} />
      </ChartFrame>
    );
  }

  const newHoldersStep = data?.steps?.find(s => s.id === 'first_trade');
  const count = newHoldersStep?.count ?? 0;
  const delta = newHoldersStep?.vs7dDelta;
  const t = getThresholdsForKPI('new_holders_7d_wow');
  const pillColor = delta !== undefined ? thresholdColor(delta, t) : undefined;

  return (
    <ChartFrame title="New Holders (7d)" subtitle="Wallets with ≥1 trade" thresholdColor={pillColor}>
      <BigNumber value={count} deltaPct={delta} deltaLabel="WoW" />
      {data.dailyTrend && data.dailyTrend.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Sparkline data={data.dailyTrend} />
        </div>
      )}
    </ChartFrame>
  );
}
