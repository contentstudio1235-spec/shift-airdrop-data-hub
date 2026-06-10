"use client";
// ============================================================
// IncidentBanner — Workflow 1 NODE 3 (the incident-open banner)
//
// Renders ONLY when an active incident exists matching (currentTab, metricId).
// REPLACES the value display for that metric — it does NOT sit above it. This
// is intentional: if the value is known-wrong, showing it next to a banner
// invites operators to use it anyway.
//
// Two surfaces in this file:
//   - IncidentBanner — the raw banner (props-driven, no data fetch)
//   - IncidentBannerWrapper — convenience: checks active incidents; renders
//     banner if matched, otherwise renders children
// ============================================================

import React from 'react';
import { Warning } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { useActiveIncidents, type HubIncident } from '@/hooks/useActiveIncidents';

const SEVERITY_COLORS: Record<HubIncident['severity'], string> = {
  P0: TOKENS.threshold.red,
  P1: TOKENS.threshold.yellow,
  P2: TOKENS.threshold.yellow,
};

// ── Raw banner ──────────────────────────────────────────────

export interface IncidentBannerProps {
  incident: HubIncident;
}

/**
 * Format `since` as "Mon 14:32" — short relative-ish. JSDOM is locale-stable
 * for these formats so tests stay green.
 */
function formatSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${weekday} ${time}`;
}

export function IncidentBanner({ incident }: IncidentBannerProps) {
  const color = SEVERITY_COLORS[incident.severity] ?? TOKENS.threshold.yellow;
  const since = formatSince(incident.openedAt);
  const message = incident.hypothesis ?? 'Hub is showing an unexpected value';

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: 'rgba(255,154,60,0.08)',
    border: `1px solid ${color}`,
    borderRadius: 8,
    color: TOKENS.textPrimary,
    fontSize: 12,
    lineHeight: 1.35,
    fontFamily: 'inherit',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="incident-banner"
      data-severity={incident.severity}
      style={wrapperStyle}
    >
      <span aria-label="incident" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <Warning size={14} weight="fill" color={color} aria-hidden />
      </span>
      <span style={{ flex: 1 }}>
        <strong style={{ fontWeight: 700, marginRight: 6, color }}>
          Under investigation since {since}:
        </strong>
        {message}
      </span>
    </div>
  );
}

// ── Wrapper that swaps children for the banner when matched ─

export interface IncidentBannerWrapperProps {
  /** The canonical tab — checked against `affectedTabs.includes(...)`. */
  tab: string;
  /** The metric id — checked against `affectedMetric === metricId`. */
  metricId: string;
  /** Whatever the cell normally renders. Shown when no incident matches. */
  children: React.ReactNode;
}

/**
 * IncidentBannerWrapper — gates a cell's content on the active-incidents feed.
 * If an incident matches, the children are HIDDEN and the banner takes over.
 * This is the v1 contract: the banner replaces the value entirely.
 *
 * The wrapper polls via useActiveIncidents (30s cadence). One subscription
 * per wrapper instance is fine in Phase 1 — caller volume is ≤9 cells.
 * Phase 1.5 will hoist this into a single provider when we wire dozens of cells.
 */
export function IncidentBannerWrapper({
  tab,
  metricId,
  children,
}: IncidentBannerWrapperProps) {
  const incidents = useActiveIncidents();
  const match = incidents.find(
    i =>
      Array.isArray(i.affectedTabs) &&
      i.affectedTabs.includes(tab) &&
      i.affectedMetric === metricId &&
      !i.resolvedAt,
  );

  if (match) return <IncidentBanner incident={match} />;
  return <>{children}</>;
}
