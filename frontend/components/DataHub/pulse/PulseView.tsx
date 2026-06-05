"use client";
import React from 'react';
import {
  Users,
  Wallet,
  ChartLineUp,
  LinkSimple,
  Lightning,
  Fish,
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
import { usePulseSnapshot } from '@/hooks/usePulseSnapshot';
import type { PulseAnomaly } from '@/types/pulse';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
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
 * "Has anything material changed in the last 24h?" with six hero KPIs,
 * 30-day AUM context, today's signups by source, recent whale activity,
 * and conditional anomaly callouts.
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
  const { data, loading, error, refetch } = usePulseSnapshot();

  const lastUpdated = data ? new Date(data.computedAt) : null;

  // Header is always rendered so operators have a refresh action available
  // even when the backend is misbehaving.
  const header = (
    <TabHeader
      title="Pulse"
      subtitle="Has anything material changed in the last 24h? 24h compare."
      lastUpdated={lastUpdated}
      liveIndicator={!error && !!data}
      onRefresh={refetch}
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
          {Array.from({ length: 6 }).map((_, i) => (
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

      {/* KPI grid — six hero metrics */}
      <div style={kpiGridStyle}>
        <KPICard
          label="Registered Users"
          value={kpis.registeredUsers.value}
          delta={kpis.registeredUsers.delta24h}
          deltaPct={kpis.registeredUsers.delta24hPct}
          formatValue={fmtCount}
          icon={<Users size={11} weight="fill" color={TOKENS.textFaint} />}
        />
        <KPICard
          label="Active Holders"
          value={kpis.activeHolders.value}
          delta={kpis.activeHolders.delta24h}
          deltaPct={kpis.activeHolders.delta24hPct}
          formatValue={fmtCount}
          icon={<Wallet size={11} weight="fill" color={TOKENS.textFaint} />}
        />
        <KPICard
          label="AUM"
          value={kpis.aumUSD.value}
          delta={kpis.aumUSD.delta24h}
          deltaPct={kpis.aumUSD.delta24hPct}
          formatValue={fmtUSD}
          icon={<ChartLineUp size={11} weight="fill" color={TOKENS.textFaint} />}
        />
        <KPICard
          label="Identity Links"
          value={kpis.stitchPct.value}
          delta={kpis.stitchPct.delta24h}
          deltaPct={kpis.stitchPct.delta24hPct}
          formatValue={fmtPct}
          icon={<LinkSimple size={11} weight="fill" color={TOKENS.textFaint} />}
          tooltip="% of profiles with 2+ identity links (loose: counts duplicate types as separate links)"
        />
        <KPICard
          label="Activations (24h)"
          value={kpis.activations24h.value}
          delta={kpis.activations24h.delta24h}
          deltaPct={kpis.activations24h.delta24hPct}
          formatValue={fmtCount}
          icon={<Lightning size={11} weight="fill" color={TOKENS.textFaint} />}
        />
        <KPICard
          label="Open Whales"
          value={kpis.openWhalesCount.value}
          delta={kpis.openWhalesCount.delta24h}
          deltaPct={kpis.openWhalesCount.delta24hPct}
          formatValue={fmtCount}
          positiveIsGood={false}
          icon={<Fish size={11} weight="fill" color={TOKENS.textFaint} />}
        />
      </div>

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
              actionHref={anomalyHref(a.actionView)}
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
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 12,
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
