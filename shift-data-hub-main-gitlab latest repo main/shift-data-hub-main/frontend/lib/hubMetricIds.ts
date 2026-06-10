// ============================================================
// SHIFT RWA Data Hub — Metric ID Registry
//
// Every flag-capable cell + incident-banner-wrapped cell needs a STABLE
// metric identifier. This file is the single source of truth.
//
// Naming convention: `{tab}.{path.to.metric}` — dot-delimited, lowerCamelCase
// past the tab segment. Backend incident records use these same strings in
// `HubIncident.affectedMetric`, so any rename must be coordinated with the
// data-engineering sibling.
//
// Phase 1 scope: 6 Pulse KPIs + 2 Users-list columns + 1 Cohorts column = 9 cells.
// Phase 1.5+ will extend this map as more cells get flagging enabled.
// ============================================================

export const HUB_METRIC_IDS = {
  // ── Pulse (Workflow 1 NODE 1 — the discovery edge for default-tab cells) ─
  PULSE_REGISTERED_USERS: 'pulse.registeredUsers',
  PULSE_ACTIVE_HOLDERS: 'pulse.activeHolders',
  PULSE_AUM_USD: 'pulse.aumUSD',
  PULSE_IDENTITY_LINKS_PCT: 'pulse.identityLinksPct',
  PULSE_ACTIVATIONS_24H: 'pulse.activations24h',
  PULSE_OPEN_WHALES: 'pulse.openWhales',

  // ── Users (the row-multiplication-bug surface) ──────────────────────────
  USERS_LIST_VOLUME: 'users.list.lifetimeVolumeUSD',
  USERS_LIST_VALUE: 'users.list.holdingsValueUSD',
  USERS_DETAIL_VOLUME: 'users.detail.lifetimeVolumeUSD',

  // ── Cohorts ────────────────────────────────────────────────────────────
  COHORTS_RETENTION_W4: 'cohorts.retentionWeek4',
  COHORTS_ACTIVATION_PCT: 'cohorts.activationPct',

  // … extend as more cells get flag-enabled in Phase 1.5
} as const;

export type HubMetricId = (typeof HUB_METRIC_IDS)[keyof typeof HUB_METRIC_IDS];

// ── Tabs (canonical names for HubIncident.affectedTabs entries) ──────────
export const HUB_TABS = {
  PULSE: 'pulse',
  FUNNELS: 'funnels',
  ATTRIBUTION: 'attribution',
  COHORTS: 'cohorts',
  USERS: 'users',
} as const;

export type HubTab = (typeof HUB_TABS)[keyof typeof HUB_TABS];
