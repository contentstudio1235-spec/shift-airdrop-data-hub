"use client";
import React, { useState } from 'react';
import { useFilters } from '@/hooks/useFilters';
import { useFunnelData } from '@/hooks/useFunnelData';
import { FUNNEL_DISPLAY, getStepBenchmark, type FunnelId } from '@/lib/funnelTaxonomy';
import { TOKENS } from '@/lib/chartTokens';
import { InsightStrip } from '@/components/DataHub/insights/InsightStrip';
import { HeroNewHolders } from '@/components/DataHub/heroes/HeroNewHolders';
import { HeroVolume7d } from '@/components/DataHub/heroes/HeroVolume7d';
import { HeroViralK } from '@/components/DataHub/heroes/HeroViralK';
import { HeroAttributionCoverage } from '@/components/DataHub/heroes/HeroAttributionCoverage';
import { FunnelSelector } from '@/components/DataHub/funnels/FunnelSelector';
import { AnimatedFunnel, type FunnelStep } from '@/components/DataHub/funnels/AnimatedFunnel';
import { PerStepDrillDown } from '@/components/DataHub/funnels/PerStepDrillDown';
import { ChartFrame } from '@/components/DataHub/primitives/ChartFrame';
import { EmptyState } from '@/components/DataHub/primitives/EmptyState';

interface FunnelResponse {
  funnelId: FunnelId;
  steps: FunnelStep[];
}

export function FunnelsView() {
  const [filters] = useFilters();
  const [activeFunnel, setActiveFunnel] = useState<FunnelId>('acquisition');
  const [drillStepId, setDrillStepId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useFunnelData<FunnelResponse>(
    `/api/funnels/${activeFunnel}`,
    filters,
  );

  const activeStepIdx = data?.steps?.findIndex(s => s.id === drillStepId) ?? -1;
  const activeStep = activeStepIdx >= 0 ? data!.steps[activeStepIdx] : null;
  const prevStep = activeStepIdx > 0 ? data!.steps[activeStepIdx - 1] : undefined;
  const benchmark = activeStepIdx >= 0 ? getStepBenchmark(activeFunnel, activeStepIdx) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Insight strip (full width) */}
      <InsightStrip filters={filters} />

      {/* Row 2: 4 hero KPI cards (3/12 each) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        <HeroNewHolders filters={filters} />
        <HeroVolume7d filters={filters} />
        <HeroViralK filters={filters} />
        <HeroAttributionCoverage filters={filters} />
      </div>

      {/* Row 3: Funnel selector + selected funnel chart (8/12) + Whale Watch slot (4/12) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
        gap: 12,
      }}>
        <ChartFrame
          title={FUNNEL_DISPLAY[activeFunnel].name}
          subtitle={FUNNEL_DISPLAY[activeFunnel].description}
          rightActions={
            <FunnelSelector
              active={activeFunnel}
              onChange={(f) => { setActiveFunnel(f); setDrillStepId(null); }}
            />
          }
          padding={24}
        >
          {loading && !data ? (
            <div style={{ height: 200, opacity: 0.5 }} />
          ) : error || !data ? (
            <EmptyState variant="stale" onRetry={refetch} />
          ) : data.steps.length === 0 ? (
            <EmptyState variant="insufficient" actualN={0} requiredN={1} />
          ) : (
            <AnimatedFunnel
              funnelId={activeFunnel}
              steps={data.steps}
              activeStepId={drillStepId ?? undefined}
              onStepClick={(id) => setDrillStepId(prev => prev === id ? null : id)}
            />
          )}
        </ChartFrame>

        {/* Row 3 right: Whale Watch ticker placeholder (Sprint 3 ships live UI) */}
        <ChartFrame title="Whale Watch" subtitle="Live trades ≥ $1K (Sprint 3)">
          <div style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TOKENS.textFaint,
            fontSize: 11,
            fontStyle: 'italic',
          }}>
            SSE backend stream live; UI ticker in Sprint 3
          </div>
        </ChartFrame>
      </div>

      {/* Below-fold: per-step drill-down (inline, not modal) */}
      {activeStep && (
        <PerStepDrillDown
          step={activeStep}
          stepIndex={activeStepIdx}
          prevStep={prevStep}
          benchmark={benchmark}
        />
      )}
    </div>
  );
}
