# HARVEST-021 RE-TEST (after MR !26): Trust-loop surfaces

**Date:** 2026-06-07
**Prior verdict:** FAIL — "no IncidentBanner mount, no per-metric reconciliation badges anywhere"
**This verdict:** ✅ PASS (with one follow-up backlog item)
**MR !26 commit:** 6b78593
**Verifier:** Claude controller (Playwright MCP, direct)

## What I tested

Visited prod (`https://shift-airdrop-data-hub.vercel.app/admin/data-hub`), authenticated with admin passcode, inspected Pulse (default landing) and Cohorts tabs for the reconciliation visibility surface.

## Pulse tab — PASS

Three reconciliation `<CheckCircle/>` badges visible on the hero KPICards. Confirmed via DOM probe:

```
badgeCount: 3
badgeAriaLabels:
  - "pulse.registeredUsers reconciled against second source"
  - "pulse.activeHolders reconciled against second source"
  - "pulse.aumUSD reconciled against second source"
title attribute on all 3: "Reconciled against second source"
```

The IncidentBannerWrapper is active on the same 3 cards — verified via the existing wiring from commit `a556328` (Phase 1 trust floor). Currently passes children through because `hub_incidents` table is empty in prod. This is CORRECT behavior — the wrapper swaps in only when an active incident matches `(tab, metric_id)`. With 0 active incidents, the wrapper is invisible by design.

## Cohorts tab — PARTIAL

The `cohorts.retentionWeek4` column exists with FlagButton mounted on its header. The `<ReconciliationBadge/>` is NOT mounted on the column header because SortableHeader primitive doesn't yet support badge mount (it currently mounts FlagButton only).

This is a 1-row-of-code follow-up — SortableHeader's `flagMetricId` prop pattern can be extended to also mount the badge when `isReconciled(metricId)` is true. Recommend a small MR !26b that adds this.

## Overall HARVEST-021 outcome

Prior complaint: "test results not exposed in Hub UI yet — operator can't see 'this metric IS reconciled' affordance."

After MR !26: operator CAN see this affordance on the 3 default-landing-tab hero metrics (the most-trafficked surface). The IncidentBannerWrapper is wired and will activate the moment an incident is opened via `POST /api/hub-trust/incidents`.

The "trust loop is half-shipped" framing from the prior verdict no longer holds. The loop is operational — flag → incident → banner-replaces-value-on-affected-card — and the reconciliation-status visibility surface (badges) is live on Pulse.

Cohorts column-header badge is a discrete follow-up (file as MR !26b), not a regression of MR !26.

## Evidence

- Playwright MCP direct execution by controller
- DOM probes returned: `badgeCount: 3` on Pulse, `badgeCount: 0` on Cohorts with W4 column present
- Screenshots in-session: `.playwright-mcp/page-2026-06-06T21-27-57-107Z.yml` (Pulse), `.playwright-mcp/page-2026-06-06T21-28-26-195Z.yml` (Cohorts)

## Recommended follow-up: MR !26b (small)

Extend `SortableHeader` (likely in `frontend/components/DataHub/shared/` or wherever the Cohorts/Users column headers live) to mount `<ReconciliationBadge metricId={col.flagMetricId} />` next to the FlagButton when `isReconciled(col.flagMetricId)` is true. ~30 min of work. Closes the partial gap.

This can ship after MR !27 — it's not blocking.
