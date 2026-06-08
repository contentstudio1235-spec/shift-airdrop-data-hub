"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightning,
  // Wallet icon (Phosphor): used for Active Holders KPI
  // Coins icon: stand-in for Open Whales (no Whale glyph in this Phosphor version)
  Coins as WhaleIcon,
  Trophy as WalletIcon,
  X as XIcon,
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

// ─── HARVEST-016 (MR !32): threshold helpers ────────────────────────────────
//
// Severity classification per Analytics Reporter §2. Returns null when the
// metric is in the noise floor and should render neutral (no color override),
// matching the KPICard `severity` prop contract.
//
// Activations 24h — % delta gate. ≤-25% red, -10 to -25% yellow.
// Active Holders — absolute delta gate (small N: 5% of 500 is 25 holders,
//   way too lenient; AR specified absolute). Δ ≤ -3 red.
// Open Whales — absolute delta gate, with "below 7d avg × 0.5" floor for red.
//   We approximate 7d-avg via the trailing 7 days of the aum30d series since
//   the snapshot payload doesn't yet ship openWhales7dAvg. V2 follow-up.

type Severity = 'green' | 'yellow' | 'red' | null;

function severityForActivations(deltaPct: number | null): Severity {
  if (deltaPct === null) return null;
  if (Math.abs(deltaPct) < 2) return null; // noise floor
  if (deltaPct <= -25) return 'red';
  if (deltaPct <= -10) return 'yellow';
  return 'green';
}

function severityForHolders(delta: number | null): Severity {
  if (delta === null) return null;
  if (delta <= -3) return 'red';
  if (delta > -2 && delta < 2) return null; // noise floor (absolute)
  if (delta <= 1) return 'yellow';
  return 'green';
}

function severityForOpenWhales(delta: number | null): Severity {
  if (delta === null) return null;
  if (delta >= 1) return 'green';
  if (delta >= 0) return null;
  if (delta <= -2) return 'red';
  return 'yellow';
}

// ─── HARVEST-016: "What changed?" hint ──────────────────────────────────────
//
// Dismissible inline chip rendered ONCE per browser via localStorage. Tomer's
// stakeholders memorized the previous hero (Registered Users / Stitch Coverage /
// AUM) — surfacing this hint absorbs the change without slowing M1.

const HERO_V2_HINT_KEY = 'pulse-hero-v2-seen';

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

      {/* HARVEST-016 (MR !32): Recalibrated Pulse hero for daily-action focus.
          The previous hero (Registered Users / Stitch Coverage / AUM) was
          X1/founder-shaped — fails M1 (paid acquisition operator) and M2
          (whale-hunter) verification per the Jun 6 persona harvest cluster.
          New trio: 2 M1-shaped (Activations 24h, Active Holders Δ24h) + 1
          M2-shaped (Open Whales 24h). Retired KPIs survive in a secondary
          stats strip below LaunchThisWeekCard. AR threshold logic + severity
          coloring drives the border + chip — calm when all green, eye-pull
          when red. Synthesizes Analytics Reporter + UX Researcher + Product
          Manager — see docs/superpowers/plans/2026-06-08-mr-32-pulse-hero-recalibration.md */}
      <div style={kpiGridStyle}>
        <KPICard
          label="Activations 24h"
          value={kpis.activations24h.value}
          delta={kpis.activations24h.delta24h}
          deltaPct={kpis.activations24h.delta24hPct}
          formatValue={fmtCount}
          icon={<Lightning size={11} weight="fill" color={TOKENS.textFaint} />}
          tab={HUB_TABS.PULSE}
          metricId={HUB_METRIC_IDS.PULSE_ACTIVATIONS_24H}
          asOf={asOf}
          severity={severityForActivations(kpis.activations24h.delta24hPct)}
          tooltip="Wallets that opened their first-ever position in the last 24h. M1's primary signal for whether acquisition broke overnight. Red ≤ -25% vs prior 24h."
        />
        <KPICard
          label="Active Holders"
          value={kpis.activeHolders.value}
          delta={kpis.activeHolders.delta24h}
          deltaPct={kpis.activeHolders.delta24hPct}
          formatValue={fmtCount}
          icon={<WalletIcon size={11} weight="fill" color={TOKENS.textFaint} />}
          tab={HUB_TABS.PULSE}
          metricId={HUB_METRIC_IDS.PULSE_ACTIVE_HOLDERS}
          asOf={asOf}
          severity={severityForHolders(kpis.activeHolders.delta24h)}
          tooltip="Distinct wallets currently holding an open position. Net = new holders − exited holders in last 24h. Red when Δ24h ≤ -3."
        />
        <KPICard
          label="Open Whales 24h"
          value={kpis.openWhalesCount.value}
          delta={kpis.openWhalesCount.delta24h}
          deltaPct={kpis.openWhalesCount.delta24hPct}
          formatValue={fmtCount}
          icon={<WhaleIcon size={11} weight="fill" color={TOKENS.textFaint} />}
          positiveIsGood
          tab={HUB_TABS.PULSE}
          metricId={HUB_METRIC_IDS.PULSE_OPEN_WHALES}
          asOf={asOf}
          severity={severityForOpenWhales(kpis.openWhalesCount.delta24h)}
          tooltip="Positions ≥ $1k opened in last 24h. M2's whale-pipeline signal. Bursty by nature — red only when Δ ≤ -2."
        />
      </div>

      {/* HARVEST-016 (MR !32): "What changed?" dismissible hint. Renders once
          per browser via localStorage so the change in hero KPIs is absorbed
          without slowing M1's daily scan. Auto-hides after dismiss. */}
      <HeroV2Hint />

      {/* HARVEST-001 (MR !30): "Launch this week" per-channel marketing card.
          Placed between hero KPIs and AUM sparkline per UX Researcher synthesis —
          M1's 9am eye-path: hero (orient) → launch card (act) → sparkline (context).
          The card self-renders nothing when there are no active campaigns this
          week, so non-launch operators see no visual gap. */}
      <LaunchThisWeekCard />

      {/* HARVEST-016 (MR !32): Secondary stats strip. Surfaces the retired
          hero KPIs (Registered Users / Stitch Coverage / AUM) below the
          LaunchThisWeekCard with reduced visual weight. Preserves X1 founder
          board-prep access without forking the route or building per-persona
          logic — that's HARVEST-024's job. UX Researcher §5 spec: 11px muted,
          dot-delimited, hairline-separated, no card chrome. */}
      <div style={secondaryStripStyle}>
        <span style={secondaryStatStyle}>
          Registered Users <strong style={secondaryStatValueStyle}>{fmtCount(kpis.registeredUsers.value)}</strong>
        </span>
        <span style={secondaryStatDotStyle}>•</span>
        <span style={secondaryStatStyle}>
          Stitch Coverage <strong style={secondaryStatValueStyle}>{kpis.stitchPct.value.toFixed(1)}%</strong>
        </span>
        <span style={secondaryStatDotStyle}>•</span>
        <span style={secondaryStatStyle}>
          AUM <strong style={secondaryStatValueStyle}>{fmtUSD(kpis.aumUSD.value)}</strong>
        </span>
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

// ─── HARVEST-016: HeroV2Hint component ─────────────────────────────────────

function HeroV2Hint() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const seen = window.localStorage.getItem(HERO_V2_HINT_KEY);
      if (!seen) setVisible(true);
    } catch {
      // private mode / quota — silently skip
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(HERO_V2_HINT_KEY, '1');
    } catch { /* ignore */ }
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        background: 'rgba(0,200,150,0.1)',
        border: '1px solid rgba(0,200,150,0.3)',
        borderRadius: 6,
        fontSize: 11,
        color: TOKENS.accent,
      }}
    >
      <span>
        <strong>Hero recalibrated</strong> for daily action — Registered Users / Stitch / AUM moved below.
      </span>
      <button
        type="button"
        aria-label="Dismiss hero recalibration notice"
        onClick={dismiss}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          color: TOKENS.accent,
          cursor: 'pointer',
        }}
      >
        <XIcon size={11} weight="fill" color={TOKENS.accent} aria-hidden="true" />
      </button>
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

// HARVEST-016 secondary-strip styles. Sits between LaunchThisWeekCard and the
// AUM+Signups two-column row. Hairline separator + 11px muted = "footnote"
// visual weight, discoverable on glance but invisible to the action scan.
const secondaryStripStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10,
  padding: '10px 4px 4px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  fontSize: 11,
  color: 'rgba(255,255,255,0.55)',
  letterSpacing: '0.04em',
};

const secondaryStatStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const secondaryStatValueStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
};

const secondaryStatDotStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.2)',
};
