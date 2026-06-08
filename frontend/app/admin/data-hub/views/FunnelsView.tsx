"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useFilters, type FunnelWindow } from '@/hooks/useFilters';
import { useFunnelData } from '@/hooks/useFunnelData';
import { FUNNEL_DISPLAY, getStepBenchmark, type FunnelId } from '@/lib/funnelTaxonomy';
import { TOKENS } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import { InsightStrip } from '@/components/DataHub/insights/InsightStrip';
import { HeroNewHolders } from '@/components/DataHub/heroes/HeroNewHolders';
import { HeroVolume7d } from '@/components/DataHub/heroes/HeroVolume7d';
import { HeroViralK } from '@/components/DataHub/heroes/HeroViralK';
import { HeroAttributionCoverage } from '@/components/DataHub/heroes/HeroAttributionCoverage';
import { FunnelSelector } from '@/components/DataHub/funnels/FunnelSelector';
import { FunnelWindowSelector } from '@/components/DataHub/funnels/FunnelWindowSelector';
import { AnimatedFunnel, type FunnelStep } from '@/components/DataHub/funnels/AnimatedFunnel';
import { PerStepDrillDown } from '@/components/DataHub/funnels/PerStepDrillDown';
import { AnomalyCallout, type AnomalySeverity } from '@/components/DataHub/primitives/AnomalyCallout';
import { ChartFrame } from '@/components/DataHub/primitives/ChartFrame';
import { EmptyState } from '@/components/DataHub/primitives/EmptyState';
import { TabHeader } from '@/components/DataHub/shared/TabHeader';

/**
 * Platform average open position size in USD. Sourced from prod data
 * (sum of position_size_usd / count of open positions across all wallets,
 * snapshot as of 2026-06). Used as a v1 fallback for revenue-impact math on
 * the biggest-leak callout — we don't have a per-funnel avg available in the
 * useFunnel response yet, and the funnel-analysis skill calls for ranking
 * leaks by absolute users × revenue impact. Revisit when the funnel API
 * returns avgPositionUSD per source/cohort.
 */
const AVG_POSITION_USD = 56;

/**
 * Realistic ceiling on recovering lost funnel users (10%). The biggest-leak
 * callout multiplies usersLost × AVG_POSITION_USD × ESTIMATED_CONVERSION to
 * surface the actionable revenue opportunity — not the theoretical max if
 * every lost user converted, which would massively overstate.
 */
const ESTIMATED_CONVERSION = 0.10;

/**
 * MR !29 (F1 funnel time-window selector).
 *
 * - DEFAULT_WINDOW: chosen by synthesis of Analytics Reporter + UX Researcher
 *   recommendations. PM dissented (preferring "all" to protect founder-surprise);
 *   that concern is absorbed by FIRST_LOAD_HINT_MAX_VIEWS below + persistent
 *   "Showing: X" chip in the funnel subtitle.
 * - CONFIDENCE_GATE_N: minimum step denominator before we trust the leak
 *   callout. Matches the Cohorts skill rule (n<100 = grayed/insufficient).
 *   Below this, AnomalyCallout switches to "widen the window" copy instead
 *   of citing a misleading drop percentage.
 * - FIRST_LOAD_HINT_*: first-3-loads dismissable hint absorbs the change
 *   from previous all-time default to new 30d default for stakeholders who
 *   memorized the all-time numbers.
 */
const DEFAULT_WINDOW: FunnelWindow = '30d';
const CONFIDENCE_GATE_N = 100;
const FIRST_LOAD_HINT_MAX_VIEWS = 3;
const FIRST_LOAD_HINT_KEY = 'funnels-window-hint-loads';

const WINDOW_PHRASE: Record<FunnelWindow, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
  'all': 'all-time',
};

const WINDOW_REVENUE_PHRASE: Record<FunnelWindow, string> = {
  '7d': 'weekly revenue',
  '30d': 'monthly revenue',
  '90d': 'quarterly revenue',
  'all': 'lifetime revenue',
};

// Display-only labels for synthetic source values returned by the backend.
// Mirrored from AttributionView so the leak callout reads with the same
// channel naming the rest of the Sources tab uses.
const SOURCE_LABEL: Record<string, string> = {
  snag_referrals: 'Snag Referrals',
  direct: 'Direct',
};

function formatSource(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

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
  const [filters, setFilters] = useFilters();
  const [activeFunnel, setActiveFunnel] = useState<FunnelId>('acquisition');
  const [drillStepId, setDrillStepId] = useState<string | null>(null);

  // F1 (MR !29): pure render-time fallback. We deliberately do NOT auto-write
  // the default to the URL on mount because:
  //   (1) useFilters hydrates from URL/localStorage in its own effect; if both
  //       fired during the same React commit, the functional `setFilters`
  //       update could merge over the hydrated URL value and clobber an
  //       explicit `?fwindow=7d` deep link to `30d`. Reviewer-caught race.
  //   (2) Keeps the URL clean — only writes `fwindow=` when the operator
  //       deliberately picks a window. Sharing `?view=funnels` shows whatever
  //       DEFAULT_WINDOW resolves to for the recipient (future-proof for
  //       HARVEST-024 per-persona default landing).
  //   (3) `activeWindow` is the single source of truth read by selector,
  //       subtitle chip, AnomalyCallout copy, and first-load hint logic.
  const activeWindow: FunnelWindow = filters.fwindow ?? DEFAULT_WINDOW;

  // First-3-loads hint: localStorage counter only on the client; SSR-safe.
  // Increments once per mount. After 3 mounts (or after the dismiss click),
  // hint stays hidden forever.
  const [showFirstLoadHint, setShowFirstLoadHint] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FIRST_LOAD_HINT_KEY);
      const loads = raw ? Number(raw) : 0;
      const safeLoads = Number.isFinite(loads) ? loads : 0;
      if (safeLoads < FIRST_LOAD_HINT_MAX_VIEWS) {
        setShowFirstLoadHint(true);
        window.localStorage.setItem(FIRST_LOAD_HINT_KEY, String(safeLoads + 1));
      }
    } catch {
      // quota / private mode — silently skip the hint
    }
  }, []);

  const dismissFirstLoadHint = () => {
    setShowFirstLoadHint(false);
    try {
      window.localStorage.setItem(FIRST_LOAD_HINT_KEY, String(FIRST_LOAD_HINT_MAX_VIEWS));
    } catch { /* ignore */ }
  };

  // Pass the *effective* window to the backend even when the URL has none —
  // otherwise the UI would show "Showing: last 30 days" while the backend
  // returned all-time data, which is exactly the trust-floor violation Phase 1
  // shipped to prevent. The URL stays clean (no auto-write); the API call
  // explicitly carries the resolved window so backend SQL filters match the
  // label the operator sees.
  const effectiveFilters = useMemo(
    () => ({ ...filters, fwindow: activeWindow }),
    [filters, activeWindow],
  );

  const { data, loading, error, refetch } = useFunnelData<FunnelResponse>(
    `/api/funnels/${activeFunnel}`,
    effectiveFilters,
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

  // Biggest/smallest leak — recomputed only when the step set or the active
  // source filter changes. Drives the AnomalyCallout strip above the funnel
  // chart so operators see the worst conversion stage without scanning bars.
  //
  // The memo also pre-builds the biggest-leak `message` string (filter-aware
  // copy + revenue impact) so it's stable when the inputs are — avoids
  // re-renders churning AnomalyCallout's aria-live region.
  const sourceFilter =
    filters.source && filters.source !== 'all' ? filters.source : null;

  // F1 (MR !29): confidence-gated leak insight.
  //
  // (1) Compute the leak structurally first (computeLeaks).
  // (2) If the leak's source step has fewer than CONFIDENCE_GATE_N users
  //     in the active window, suppress the percentage citation and surface
  //     a "widen the window" prompt instead — surfacing a 95% drop based on
  //     n=12 users would be actively misleading per funnel-analysis Step 3.
  // (3) Otherwise build the window-aware message:
  //     "Biggest leak in last {window} is {step_from} → {step_to}
  //      ({drop_pct}% drop). Recovering 10% of these users would unlock
  //      ~${opportunity} in {window_revenue_label}."
  const leakInsight = useMemo(() => {
    const leaks = computeLeaks(data?.steps);
    if (!leaks) return null;

    const { biggest, smallest } = leaks;

    // Find the step the biggest leak originates from to gate on its count.
    const fromStep = data?.steps?.find(s => s.id === biggest.fromId);
    const denominator = fromStep?.count ?? 0;
    const insufficient = denominator < CONFIDENCE_GATE_N;

    const windowPhrase = WINDOW_PHRASE[activeWindow];
    const revenuePhrase = WINDOW_REVENUE_PHRASE[activeWindow];

    if (insufficient) {
      // Suppress per-source caveat when the gate trips — the operator's
      // actionable hint is "widen the window," not "your filter is narrow."
      const tryWiderWindow = activeWindow === 'all' ? null : (
        activeWindow === '7d' ? '30d' : activeWindow === '30d' ? '90d' : 'all-time'
      );
      const widenHint = tryWiderWindow
        ? ` Try ${tryWiderWindow} →`
        : '';
      const biggestMessage =
        `Not enough volume in ${windowPhrase} to identify a meaningful leak ` +
        `(n=${denominator.toLocaleString()} at ${biggest.fromName}).${widenHint}`;
      return {
        biggest,
        smallest: null,
        revenueOpportunity: 0,
        sourceFilter,
        biggestMessage,
        insufficient: true as const,
      };
    }

    const revenueOpportunity =
      biggest.lost * AVG_POSITION_USD * ESTIMATED_CONVERSION;

    const sourceClause = sourceFilter
      ? ` for \`${formatSource(sourceFilter)}\``
      : '';

    const biggestMessage =
      `Biggest leak in ${windowPhrase}${sourceClause}: ` +
      `${biggest.fromName} → ${biggest.toName} ` +
      `(−${biggest.dropPct.toFixed(0)}% drop, ${biggest.lost.toLocaleString()} users) ` +
      `≈${fmtUSD(revenueOpportunity)} in ${revenuePhrase} if 10% recovered`;

    return {
      biggest,
      smallest,
      revenueOpportunity,
      sourceFilter,
      biggestMessage,
      insufficient: false as const,
    };
  }, [data?.steps, sourceFilter, activeWindow]);

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

      {/* Row 0.5: First-3-loads hint absorbs default-change surprise (PM concern).
          Renders only when localStorage counter < FIRST_LOAD_HINT_MAX_VIEWS. */}
      {showFirstLoadHint && activeWindow !== 'all' && (
        <AnomalyCallout
          severity="info"
          message={`Now showing ${WINDOW_PHRASE[activeWindow]} by default. Older "all-time" numbers may differ.`}
          actionLabel="View all-time"
          onAction={() => {
            dismissFirstLoadHint();
            setFilters({ fwindow: 'all' });
          }}
          dismissible
        />
      )}

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

      {/* Row 2.5: Biggest-leak callout strip — window-aware. When the active
          window has fewer than CONFIDENCE_GATE_N users at the leaking step,
          AnomalyCallout swaps to "widen the window" copy instead of citing
          a misleading drop percentage (funnel-analysis Step 3 discipline). */}
      {leakInsight && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnomalyCallout
            severity={leakInsight.insufficient ? 'info' : severityForDrop(leakInsight.biggest.dropPct)}
            message={leakInsight.biggestMessage}
            actionLabel={leakInsight.insufficient ? undefined : 'Investigate'}
            actionHref={
              leakInsight.insufficient
                ? undefined
                : `/admin/data-hub?view=users&q=${encodeURIComponent(leakInsight.biggest.fromName)}`
            }
          />
          {!leakInsight.insufficient && leakInsight.smallest && leakInsight.smallest.dropPct > 5 && (
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
          subtitle={`${FUNNEL_DISPLAY[activeFunnel].description} · Showing: ${WINDOW_PHRASE[activeWindow]}`}
          rightActions={
            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <FunnelWindowSelector
                value={activeWindow}
                onChange={(w) => setFilters({ fwindow: w })}
              />
              <FunnelSelector
                active={activeFunnel}
                onChange={(f) => { setActiveFunnel(f); setDrillStepId(null); }}
              />
            </div>
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
