# MR !26: Trust loop surfaces — wire IncidentBannerWrapper props + reconciliation badges

> Sub-skill: superpowers:subagent-driven-development.

**Goal:** Close HARVEST-021. The Phase 1 trust-floor infrastructure all exists; what's missing is two surfaces: (1) PulseView's 3 KPICards don't pass `tab` + `metricId` to KPICard, so the already-wired `IncidentBannerWrapper` never activates. (2) No reconciliation pass/fail badge surfaces anywhere — operators have no signal that "this number has a second-source check."

**Reframing of the HARVEST-021 verdict:** The verifier expected a top-of-LayoutShell banner. The codebase's intentional design (per IncidentBanner.tsx file header comment) is per-metric inline value-replacement — "if the value is known-wrong, showing it next to a banner invites operators to use it anyway." We are NOT adding a top-of-page banner. We ARE making the inline pattern actually activate by wiring the missing props.

**Architecture:**
- Front-end only. Backend (`hubIncidentsService`, `GET /api/hub-trust/incidents/active`), the `useActiveIncidents` hook, the `IncidentBanner` + `IncidentBannerWrapper` components, and `KPICard`'s conditional wrapper-on-tab+metricId logic are all already built.
- Three frontend changes: PulseView KPICard call sites + new `ReconciliationBadge` component + static catalog file.

**Tech Stack:** React 19, Next.js 16, Vitest, inline styles, Phosphor icons, NO Tailwind. Read `frontend/AGENTS.md`.

---

## Task 1: Wire tab+metricId on PulseView KPICards + ship ReconciliationBadge

**Files:**
- Modify: `frontend/components/DataHub/pulse/PulseView.tsx` (3 KPICard call sites — Registered Users / Active Holders / AUM — add `tab` + `metricId` props)
- Create: `frontend/lib/reconciliationCatalog.ts` (single source of truth: which metric_ids have passing reconciliation tests)
- Create: `frontend/components/DataHub/primitives/ReconciliationBadge.tsx` (the tiny ✓ affordance)
- Modify: `frontend/components/DataHub/pulse/KPICard.tsx` (mount the badge — guarded by `tab && metricId` like the FlagButton already is)
- Create: `frontend/lib/__tests__/reconciliationCatalog.test.ts`
- Create: `frontend/components/DataHub/primitives/__tests__/ReconciliationBadge.test.tsx`
- Modify: `frontend/components/DataHub/pulse/__tests__/KPICard.test.tsx` (assert badge mounts when metricId is reconciled, absent when not)
- Modify: `frontend/components/DataHub/pulse/__tests__/PulseView.test.tsx` (assert KPICards receive tab+metricId props for the 3 wired metrics)

### Static catalog content

`frontend/lib/reconciliationCatalog.ts`:

```ts
// ============================================================
// SHIFT RWA Data Hub — Reconciliation Catalog
//
// Single source of truth for which Hub metric_ids have a passing
// second-source reconciliation test in src/services/__tests__/reconciliation/.
// Operators see a ✓ next to these metrics via <ReconciliationBadge/>.
//
// To extend: add the HUB_METRIC_IDS constant and reference the test file.
// Removing an entry silently hides the badge — keep this list in sync
// with the actual test catalog.
// ============================================================

import { HUB_METRIC_IDS } from './hubMetricIds';

export const RECONCILED_METRIC_IDS = new Set<string>([
  HUB_METRIC_IDS.PULSE_REGISTERED_USERS,  // registeredUsers.test.ts
  HUB_METRIC_IDS.PULSE_ACTIVE_HOLDERS,    // activeHolders.test.ts
  HUB_METRIC_IDS.PULSE_AUM_USD,           // aumUSD.test.ts
  HUB_METRIC_IDS.PULSE_OPEN_WHALES,       // whaleEvents.test.ts
  HUB_METRIC_IDS.COHORTS_RETENTION_W4,    // cohortRetention.test.ts
]);

export function isReconciled(metricId: string | undefined): boolean {
  if (!metricId) return false;
  return RECONCILED_METRIC_IDS.has(metricId);
}
```

### ReconciliationBadge component design

`frontend/components/DataHub/primitives/ReconciliationBadge.tsx`:

```tsx
"use client";
// ============================================================
// ReconciliationBadge — Phase 1 trust-floor visibility surface
//
// Tiny inline affordance next to a metric label: ✓ when the metric_id is
// listed in reconciliationCatalog's RECONCILED_METRIC_IDS. Communicates
// "this number has a second-source check" without taking layout space.
// Hover tooltip names the reconciliation test.
//
// Render nothing when metric_id is not in the catalog — explicit absence
// is also signal (this metric does NOT have a check).
// ============================================================

import React from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { isReconciled } from '@/lib/reconciliationCatalog';

export interface ReconciliationBadgeProps {
  metricId: string | undefined;
}

export function ReconciliationBadge({ metricId }: ReconciliationBadgeProps) {
  if (!isReconciled(metricId)) return null;
  return (
    <span
      title="Reconciled against second source"
      aria-label={`${metricId} reconciled against second source`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 4,
        color: TOKENS.accent,
        opacity: 0.7,
      }}
    >
      <CheckCircle size={11} weight="fill" />
    </span>
  );
}
```

### KPICard wiring

Inside KPICard.tsx, where the `label` is rendered (near the existing label JSX), mount:

```tsx
<ReconciliationBadge metricId={metricId} />
```

Guard the same way the FlagButton is guarded (`flagEnabled && tab && metricId`) so the badge only renders when telemetry is enabled for this card.

### PulseView wiring

For each of the 3 currently-rendered KPICards (lines reading "Registered Users", "Active Holders", "AUM"):

```tsx
<KPICard
  label="Registered Users"
  // ...existing props
  tab={HUB_TABS.PULSE}
  metricId={HUB_METRIC_IDS.PULSE_REGISTERED_USERS}
  asOf={lastUpdated?.toISOString() ?? null}
/>
```

Same shape for `PULSE_ACTIVE_HOLDERS` and `PULSE_AUM_USD`. `HUB_TABS` and `HUB_METRIC_IDS` are already imported at line ~8 of PulseView (verified). `asOf` should be sourced from existing freshness state (look for `lastUpdated` or similar — if absent, pass `null`).

### Step 1: Write failing tests in this order

**1.1 — reconciliationCatalog**:
```ts
import { describe, it, expect } from 'vitest';
import { isReconciled, RECONCILED_METRIC_IDS } from '../reconciliationCatalog';
import { HUB_METRIC_IDS } from '../hubMetricIds';

describe('reconciliationCatalog', () => {
  it('marks pulse.registeredUsers as reconciled', () => {
    expect(isReconciled(HUB_METRIC_IDS.PULSE_REGISTERED_USERS)).toBe(true);
  });
  it('marks pulse.activeHolders / aumUSD / openWhales as reconciled', () => {
    expect(isReconciled(HUB_METRIC_IDS.PULSE_ACTIVE_HOLDERS)).toBe(true);
    expect(isReconciled(HUB_METRIC_IDS.PULSE_AUM_USD)).toBe(true);
    expect(isReconciled(HUB_METRIC_IDS.PULSE_OPEN_WHALES)).toBe(true);
  });
  it('marks cohorts.retentionWeek4 as reconciled', () => {
    expect(isReconciled(HUB_METRIC_IDS.COHORTS_RETENTION_W4)).toBe(true);
  });
  it('returns false for unknown metric ids', () => {
    expect(isReconciled('does.not.exist')).toBe(false);
    expect(isReconciled(undefined)).toBe(false);
    expect(isReconciled('')).toBe(false);
  });
  it('the catalog has exactly 5 reconciled metrics in Phase 1', () => {
    expect(RECONCILED_METRIC_IDS.size).toBe(5);
  });
});
```

**1.2 — ReconciliationBadge**:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReconciliationBadge } from '../ReconciliationBadge';
import { HUB_METRIC_IDS } from '@/lib/hubMetricIds';

describe('ReconciliationBadge', () => {
  it('renders ✓ when metricId is in the reconciliation catalog', () => {
    render(<ReconciliationBadge metricId={HUB_METRIC_IDS.PULSE_REGISTERED_USERS} />);
    expect(screen.getByLabelText(/reconciled against second source/i)).toBeInTheDocument();
  });
  it('renders nothing when metricId is not in catalog', () => {
    const { container } = render(<ReconciliationBadge metricId="random.metric" />);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders nothing when metricId is undefined', () => {
    const { container } = render(<ReconciliationBadge metricId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

**1.3 — KPICard with badge**:
Add to `frontend/components/DataHub/pulse/__tests__/KPICard.test.tsx`:
```tsx
it('mounts ReconciliationBadge when tab+metricId are passed and metricId is reconciled', () => {
  render(<KPICard label="Active Holders" value={484} tab="pulse" metricId={HUB_METRIC_IDS.PULSE_ACTIVE_HOLDERS} />);
  expect(screen.getByLabelText(/reconciled against second source/i)).toBeInTheDocument();
});
it('does NOT mount ReconciliationBadge when metricId is not reconciled', () => {
  render(<KPICard label="Identity Links" value={66} tab="pulse" metricId={HUB_METRIC_IDS.PULSE_IDENTITY_LINKS_PCT} />);
  expect(screen.queryByLabelText(/reconciled against second source/i)).toBeNull();
});
```

**1.4 — PulseView passes the props**:
Add to `frontend/components/DataHub/pulse/__tests__/PulseView.test.tsx`:
```tsx
it('passes tab+metricId to the 3 hero KPICards (Registered Users / Active Holders / AUM)', () => {
  render(<PulseView />);
  // After mount + data resolve, query for the 3 expected ReconciliationBadge instances
  const badges = screen.queryAllByLabelText(/reconciled against second source/i);
  expect(badges.length).toBeGreaterThanOrEqual(3);
});
```

Run: `cd frontend && npx vitest run` — expect failures in all 4 test files.

### Step 2: Implement in this order

2.1 — `reconciliationCatalog.ts` (the static catalog + helper).
2.2 — `ReconciliationBadge.tsx` (the component).
2.3 — `KPICard.tsx` — add `<ReconciliationBadge metricId={metricId} />` near the label, guarded by `tab && metricId` (same guard pattern as FlagButton).
2.4 — `PulseView.tsx` — add `tab={HUB_TABS.PULSE}` + `metricId={HUB_METRIC_IDS.PULSE_REGISTERED_USERS}` (and ACTIVE_HOLDERS / AUM_USD) to the 3 KPICard call sites.

### Step 3: Re-run tests — expect green

### Step 4: Sanity gates

```bash
cd frontend && npx vitest run    # expect: all green except 3 pre-existing RegisterContent failures
cd frontend && npx next build    # expect: no TS errors
```

### Step 5: Commit

```bash
git add frontend/lib/reconciliationCatalog.ts frontend/lib/__tests__/reconciliationCatalog.test.ts frontend/components/DataHub/primitives/ReconciliationBadge.tsx frontend/components/DataHub/primitives/__tests__/ReconciliationBadge.test.tsx frontend/components/DataHub/pulse/KPICard.tsx frontend/components/DataHub/pulse/__tests__/KPICard.test.tsx frontend/components/DataHub/pulse/PulseView.tsx frontend/components/DataHub/pulse/__tests__/PulseView.test.tsx
git commit -m "feat(hub): wire trust-loop surfaces — reconciliation badges + IncidentBannerWrapper activation

MR !26 — closes HARVEST-021 (docs/qa/2026-06-06-phase1-verification/SUMMARY.md).

The Phase 1 trust-floor infrastructure (hub_incidents table, listActive route,
useActiveIncidents hook, IncidentBanner / IncidentBannerWrapper components,
KPICard's tab+metricId conditional wrapping) was all built and shipped — but
PulseView's 3 KPICards never passed the tab+metricId props, so the wrapper
never activated.

Three changes:

1. lib/reconciliationCatalog.ts — single source of truth mapping hub metric_ids
   to passing reconciliation tests in src/services/__tests__/reconciliation/.
   5 metrics in Phase 1: PULSE_REGISTERED_USERS, PULSE_ACTIVE_HOLDERS,
   PULSE_AUM_USD, PULSE_OPEN_WHALES, COHORTS_RETENTION_W4.

2. components/DataHub/primitives/ReconciliationBadge.tsx — tiny inline
   CheckCircle next to a metric label. Hover tooltip 'Reconciled against
   second source'. Renders null when metric is not in catalog (explicit
   absence is also signal).

3. PulseView's 3 hero KPICards now pass tab=HUB_TABS.PULSE + the matching
   PULSE_* metric_id. This activates BOTH the existing IncidentBannerWrapper
   (the value-replacement on open incidents) AND the new ReconciliationBadge
   (the trust ✓ when reconciled).

Adds 5 catalog tests + 3 badge tests + 2 KPICard tests + 1 PulseView test.

NOT in scope: top-of-LayoutShell banner. The intentional design (per
IncidentBanner.tsx file header) is per-metric inline value-replacement,
not a top-of-page banner — 'if the value is known-wrong, showing it next
to a banner invites operators to use it anyway.'

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

### Step 6: Report

DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED + test counts + commit SHA + any concerns.

DO NOT:
- Add a top-of-LayoutShell banner (out of scope — intentional design choice)
- Touch backend code (route already exists)
- Refactor surrounding code
- Use --no-verify
- Skip TDD steps
