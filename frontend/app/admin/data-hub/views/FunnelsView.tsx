"use client";
import React, { useEffect, useMemo, useState } from 'react';
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
import { AnomalyCallout, type AnomalySeverity } from '@/components/DataHub/primitives/AnomalyCallout';
import { ChartFrame } from '@/components/DataHub/primitives/ChartFrame';
import { EmptyState } from '@/components/DataHub/primitives/EmptyState';
import { TabHeader } from '@/components/DataHub/shared/TabHeader';

interface LeakPair {
  fromId: string;
  fromName: string;
  toName: string;
  dropPct: number;
  lost: number;
}

/**
 * Compute biggest + smallest leak between consecutive funnel steps.
 *
 * Only positive drop-offs (next step < previous) are considered — a step that
 * grows or stays flat isn't a "leak". Returns null when fewer than 2 steps
 * exist or when no positive drop-offs are found.
 */
function computeLeaks(steps: FunnelStep[] | undefined): {
  biggest: LeakPair;
  smallest: LeakPair | null;
} | null {
  if (!steps || steps.length < 2) return null;

  const pairs: LeakPair[] = [];
  for (let i = 0; i < steps.length - 1; i += 1) {
    const from = steps[i];
    const to = steps[i + 1];
    if (from.count <= 0) continue;
    const lost = from.count - to.count;
    if (lost <= 0) continue; // not a leak — flat or growing
    const dropPct = (lost / from.count) * 100;
    pairs.push({
      fromId: from.id,
      fromName: from.name,
      toName: to.name,
      dropPct,
      lost,
    });
  }

  if (pairs.length === 0) return null;

  const sorted = [...pairs].sort((a, b) => b.dropPct - a.dropPct);
  const biggest = sorted[0];
  // Smallest = least-bad positive drop, and only worth surfacing if it's a
  // meaningfully different stage from the biggest.
  const smallestCandidate = sorted[sorted.length - 1];
  const smallest =
    sorted.length > 1 && smallestCandidate.fromId !== biggest.fromId
      ? smallestCandidate
      : null;

  return { biggest, smallest };
}

function severityForDrop(dropPct: number): AnomalySeverity {
  if (dropPct > 80) return 'critical';
  if (dropPct > 50) return 'warn';
  return 'info';
}

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

  // Track when the last fetch resolved so the header can show "updated HH:MM:SS".
  // Depend on stable scalars (step count + last step id) instead of the full
  // data object so callers that hand fresh references don't loop.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const stepCount = data?.steps?.length ?? null;
  const lastStepId = data?.steps?.[data.steps.length - 1]?.id ?? null;
  useEffect(() => {
    if (stepCount !== null) setLastUpdated(new Date());
  }, [stepCount, lastStepId]);

  const activeStepIdx = data?.steps?.findIndex(s => s.id === drillStepId) ?? -1;
  const activeStep = activeStepIdx >= 0 ? data!.steps[activeStepIdx] : null;
  const prevStep = activeStepIdx > 0 ? data!.steps[activeStepIdx - 1] : undefined;
  const benchmark = activeStepIdx >= 0 ? getStepBenchmark(activeFunnel, activeStepIdx) : undefined;

  // Biggest/smallest leak — recomputed only when the step set changes.
  // Drives the AnomalyCallout strip above the funnel chart so operators see
  // the worst conversion stage without scanning the bars.
  const leakInsight = useMemo(() => computeLeaks(data?.steps), [data?.steps]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 0: Single-question header strip — sets context before any chart loads */}
      <TabHeader
        title="Funnels"
        subtitle="Where do users drop off between landing and holding an RWA token? Conversion stages and per-source comparison."
        lastUpdated={lastUpdated}
        onRefresh={refetch}
        loading={loading}
      />

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

      {/* Row 2.5: Biggest-leak callout strip — surfaces worst drop-off above the chart */}
      {leakInsight && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnomalyCallout
            severity={severityForDrop(leakInsight.biggest.dropPct)}
            message={`Biggest leak this period: ${leakInsight.biggest.fromName} → ${leakInsight.biggest.toName} (−${leakInsight.biggest.dropPct.toFixed(0)}% drop, ${leakInsight.biggest.lost.toLocaleString()} users)`}
            actionLabel="Investigate"
            actionHref={`/admin/data-hub?view=users&q=${encodeURIComponent(leakInsight.biggest.fromName)}`}
          />
          {leakInsight.smallest && leakInsight.smallest.dropPct > 5 && (
            <AnomalyCallout
              severity="info"
              message={`Smallest leak: ${leakInsight.smallest.fromName} → ${leakInsight.smallest.toName} (−${leakInsight.smallest.dropPct.toFixed(0)}% drop) — your healthiest stage.`}
            />
          )}
        </div>
      )}

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
