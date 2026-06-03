"use client";
import React from 'react';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface ReferralResponse {
  steps: Array<{ id: string; count: number; conversionFromPrev: number }>;
}

export function HeroViralK({ filters }: { filters: Filters }) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useFunnelData<ReferralResponse>(
    '/api/funnels/referral',
    { ...filters, from: thirtyDaysAgo },
  );

  if (loading && !data) return <ChartFrame title="Viral K (30d)"><div style={{ height: 110, opacity: 0.5 }} /></ChartFrame>;
  if (error || !data) return <ChartFrame title="Viral K (30d)"><EmptyState variant="stale" onRetry={refetch} /></ChartFrame>;

  const stepBy = (id: string) => data.steps?.find(s => s.id === id);
  const kGen = (stepBy('code_generated')?.conversionFromPrev ?? 0) / 100;
  const kClicks = (stepBy('referral_clicked')?.conversionFromPrev ?? 0) / 100;
  const kConvert = (stepBy('referral_traded')?.conversionFromPrev ?? 0) / 100;
  const K = kGen * kClicks * kConvert;

  const codeCount = stepBy('code_generated')?.count ?? 0;
  const clickCount = stepBy('referral_clicked')?.count ?? 0;
  if (codeCount < 20 || clickCount < 10) {
    return (
      <ChartFrame title="Viral K (30d)" subtitle="K_gen × K_clicks × K_convert">
        <EmptyState variant="insufficient" actualN={codeCount} requiredN={20} />
      </ChartFrame>
    );
  }

  const t = getThresholdsForKPI('viral_k_30d');
  const pillColor = thresholdColor(K, t);

  const radius = 50;
  const value = Math.min(K, 1.5);
  const angle = (value / 1.5) * 180 - 180;
  const x = 60 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 60 + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <ChartFrame title="Viral K (30d)" subtitle="K_gen × K_clicks × K_convert" thresholdColor={pillColor}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="120" height="70" viewBox="0 0 120 70" aria-hidden>
          <path d="M 10 60 A 50 50 0 0 1 110 60" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
          <path
            d={`M 10 60 A 50 50 0 0 ${value > 0.75 ? 1 : 0} ${x} ${y}`}
            stroke={pillColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="60" y1="10" x2="60" y2="20" stroke={TOKENS.textFaint} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
        <div style={{
          fontSize: 32,
          fontWeight: 800,
          color: TOKENS.textPrimary,
          marginTop: -4,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {K.toFixed(2)}
        </div>
        <div style={{
          fontSize: 10,
          color: TOKENS.textFaint,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {(kGen * 100).toFixed(0)}% × {(kClicks * 100).toFixed(0)}% × {(kConvert * 100).toFixed(0)}%
        </div>
      </div>
    </ChartFrame>
  );
}
