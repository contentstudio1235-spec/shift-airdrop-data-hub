"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  LinkSimple,
  ChartLineUp,
} from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import { TabHeader } from '../shared/TabHeader';
import { Card } from '../primitives/Card';
import { AnomalyCallout, type AnomalySeverity } from '../primitives/AnomalyCallout';
import { EmptyState } from '../primitives/EmptyState';
import { KPICard } from './KPICard';
import { AumSparkline } from './AumSparkline';
import { SignupsBar } from './SignupsBar';
import { WhaleFeed } from './WhaleFeed';
import { LaunchThisWeekCard } from './LaunchThisWeekCard';
import { usePulseSnapshot } from '@/hooks/usePulseSnapshot';
import type { PulseAnomaly } from '@/types/pulse';
import { HUB_METRIC_IDS, HUB_TABS } from '@/lib/hubMetricIds';
import { useHubSession } from '@/hooks/useHubSession';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmtCount = (n: number) => n.toLocaleString();

// ─── Anomaly routing ─────────────────────────────────────────────────────────

/** Map an anomaly's `actionView` to the Data Hub query-param URL. */
function anomalyHref(view: PulseAnomaly['actionView']): string {
  return `/admin/data-hub?view=${view}`;
}

/** Map severity to a sensible CTA verb. */
function anomalyActionLabel(severity: AnomalySeverity): string {
  if (severity === 'critical') return 'Investigate';
  if (severity === 'warn') return 'Investigate';
  return 'View';
}

// ─── PulseView ───────────────────────────────────────────────────────────────

/**
 * PulseView — Tab 1 of the redesigned Data Hub. Answers the question
 * "Has anything material changed in the last 24h?" with three hero KPIs
 * (Registered Users, Stitch Coverage, AUM USD), 30-day AUM context,
 * today's signups by source, recent whale activity, and conditional
 * anomaly callouts.
 *
 * Phase 2.1A retired three decoration KPIs from the hero (Identity Links,
 * Activations 24h, Open Whales) per the v2 audit plan Part III — they
 * remain on the API but don't render here. Anomaly checks (D4) still fire.
 *
 * MR !27 (HARVEST-016 + HARVEST-015): swapped Active Holders → Stitch
 * Coverage. Stitch% is the load-bearing trust signal — every per-channel
 * attribution figure becomes suspect when stitch% is low (this is the root
 * of HARVEST-005's "Direct = unattributed" caveat). Active Holders is still
 * available on the Cohorts tab where M2 drills it.
 *
 * Wiring: this component is intentionally NOT mounted in the layout shell here.
 * Phase 2.3 mounts it inside the Data Hub navigation as the default view.
 *
 * Data: pulled from `usePulseSnapshot` which polls /api/pulse/snapshot every 60s.
 *
 * States:
 *   - initial load → grid renders with zero values until first response
 *   - error → an `EmptyState` (variant=stale) replaces the body, with retry
 *   - data → full layout below
 */
export function PulseView() {
  const router = useRouter();
  const { data, loading, error, refetch } = usePulseSnapshot();
  const { recordEvent } = useHubSession();

  const lastUpdated = data ? new Date(data.computedAt) : null;
  const asOf = data?.computedAt ?? null;

  // Telemetry: refresh = card_click target=refresh on the active tab.
  const handleRefresh = React.useCallback(() => {
    recordEvent('card_click', { tab: HUB_TABS.PULSE, metadata: { target: 'refresh' } });
    refetch();
  }, [recordEvent, refetch]);

  // Header is always rendered so operators have a refresh action available
  // even when the backend is misbehaving.
  const header = (
    <TabHeader
      title="Pulse"
      subtitle="Has anything material changed in the last 24h? 24h compare."
      lastUpdated={lastUpdated}
      liveIndicator={!error && !!data}
      onRefresh={handleRefresh}
      loading={loading}
    />
  );

  // Error state — backend down or first fetch failed before any payload arrived.
  if (error && !data) {
    return (
      <div style={containerStyle}>
        {header}
        <Card>
          <EmptyState variant="stale" lastUpdated="just now" onRetry={refetch} />
        </Card>
      </div>
    );
  }

  // Skeleton — first paint before the first poll resolves.
  if (!data) {
    return (
      <div style={containerStyle}>
        {header}
        <div style={kpiGridStyle}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={kpiSkeletonStyle} />
          ))}
        </div>
      </div>
    );
  }

  const { kpis, trends, whaleActivity24h, anomalies } = data;

  return (
    <div style={containerStyle}>
      {header}

      {/* KPI grid — three hero metrics. Phase 2.1A retired activations24h
          and openWhalesCount per v2 audit plan Part III. MR !27 promoted
          stitchPct (Stitch Coverage) back into the hero in place of
          Active Holders — see component docstring. */}
      <div style={kpiGridStyle}>
        <KPICard
          label="Registered Users"
          value={kpis.registeredUsers.value}
          delta={kpis.registeredUsers.delta24h}
          deltaPct={kpis.registeredUsers.delta24hPct}
          formatValue={fmtCount}
          icon={<Users size={11} weight="fill" color={TOKENS.textFaint} />}
          tab={HUB_TABS.PULSE}
          metricId={HUB_METRIC_IDS.PULSE_REGISTERED_USERS}
          asOf={asOf}
        />
        <KPICard
          label="Stitch Coverage"
          value={kpis.stitchPct.value}
          delta={kpis.stitchPct.delta24h}
          deltaPct={kpis.stitchPct.delta24hPct}
          formatValue={(n) => `${n.toFixed(1)}%`}
          icon={<LinkSimple size={11} weight="fill" color={TOKENS.textFaint} />}
          tab={HUB_TABS.PULSE}
          metricId={HUB_METRIC_IDS.PULSE_IDENTITY_LINKS_PCT}
          asOf={asOf}
        />
        <KPICard
          label="AUM"
          value={kpis.aumUSD.value}
          delta={kpis.aumUSD.delta24h}
          deltaPct={kpis.aumUSD.delta24hPct}
          formatValue={fmtUSD}
          icon={<ChartLineUp size={11} weight="fill" color={TOKENS.textFaint} />}
          tab={HUB_TABS.PULSE}
          metricId={HUB_METRIC_IDS.PULSE_AUM_USD}
          asOf={asOf}
        />
      </div>

      {/* HARVEST-001 (MR !30): "Launch this week" per-channel marketing card.
          Placed between hero KPIs and AUM sparkline per UX Researcher synthesis —
          M1's 9am eye-path: hero (orient) → launch card (act) → sparkline (context).
          The card self-renders nothing when there are no active campaigns this
          week, so non-launch operators see no visual gap. */}
      <LaunchThisWeekCard />

      {/* Two-column: AUM sparkline + signups bar chart */}
      <div style={twoColStyle}>
        <Card padding={18}>
          <AumSparkline points={trends.aum30d} />
        </Card>
        <Card padding={18}>
          <SignupsBar buckets={trends.signupsBySource24h} />
        </Card>
      </div>

      {/* Whale activity feed */}
      <WhaleFeed events={whaleActivity24h} />

      {/* Conditional anomaly callouts — render nothing if there are none */}
      {anomalies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {anomalies.map((a, i) => (
            <AnomalyCallout
              key={`${a.actionView}-${i}`}
              severity={a.severity}
              message={a.message}
              actionLabel={anomalyActionLabel(a.severity)}
              onAction={() => {
                // Telemetry: anomaly CTA = drill_down event (Workflow 1 NODE 1
                // adjacent — captures the "noticed something" → "investigating"
                // transition). Fire-and-forget; navigate immediately.
                recordEvent('drill_down', {
                  tab: HUB_TABS.PULSE,
                  metadata: { from: a.actionView, severity: a.severity },
                });
                router.push(anomalyHref(a.actionView));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: '100%',
};

const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
};

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 12,
};

const kpiSkeletonStyle: React.CSSProperties = {
  height: 120,
  background: TOKENS.panel,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 12,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
  opacity: 0.5,
};
