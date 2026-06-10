# HARVEST-016 + HARVEST-006+008 RE-TEST (after MR !27)

**Date:** 2026-06-07
**Prior verdicts:** HARVEST-016 FAIL, HARVEST-006+008 SUBTLE
**This verdict:** ✅ PASS on both
**MR !27 commit:** 31afbf9
**Verifier:** Claude controller (Playwright MCP, direct — earlier subagent verifier stalled)

## HARVEST-016 — Pulse hero recalibration

### What I tested
Navigated to https://shift-airdrop-data-hub.vercel.app/admin/data-hub, authenticated, captured Pulse hero KPICards.

### Results

| Card | Pre-MR !27 | Post-MR !27 |
|---|---|---|
| 1 | Registered Users (16,921) | Registered Users (16,921) ✓ unchanged |
| 2 | Active Holders (484) | **Stitch Coverage (29.7%)** ← swap |
| 3 | AUM ($23.0K) | AUM ($23.0K) ✓ unchanged |

DOM probe:
```
pulseHeroLabels: ["Registered Users", "Stitch Coverage", "AUM"]
activeHoldersOnPulse: false
stitchOnPulse: true
stitchValue: "29.7%"
badgeCount: 2
badgeAriaLabels:
  - "pulse.registeredUsers reconciled against second source"
  - "pulse.aumUSD reconciled against second source"
```

Active Holders absent from hero (correct — only available now on Cohorts tab, where M2 actually drills it). Badge count correctly drops to 2 because `pulse.identityLinksPct` is NOT in the reconciliation catalog (no `identityLinksPct.test.ts` yet). Honest representation per the catalog's contract.

### Data concern (separate from MR !27 — flag for reconciliation backlog)

Pulse `stitchPct` shows **29.7%** but earlier Source Attribution "Attribution Signal" (Phase 1 verification HARVEST-015) showed **66.0%** (11,329/17,177). Possible causes:
- Different aggregation window (Pulse may be 24h-only signups, Attribution is all-time)
- Different denominator (Pulse may exclude profiles with no traffic; Attribution counts all profiles)
- Different "stitched" definition (Pulse may require both wallet+UTM; Attribution requires wallet+anything)

Recommendation: file a backlog item for an `identityLinksPct.test.ts` reconciliation test that pins exactly what stitchPct counts. Once shipped, add `PULSE_IDENTITY_LINKS_PCT` to `RECONCILED_METRIC_IDS` per the TODO comment shipped in MR !27.

### HARVEST-016 verdict: ✅ PASS

Pulse hero is no longer 0/3 for M1 — it surfaces the load-bearing trust signal that operators need to interpret every other metric. More aggressive M1 recalibration (full trio) can ship in a follow-up after we see operator behavior in `hub_events` telemetry.

---

## HARVEST-006+008 — KOL drill URL→view sync

### What I tested
Navigated to `?view=attribution`, authenticated, identified KOL Leaderboard panel, clicked first KOL row, observed URL + visible view + profile list state.

### Results

| | Pre-MR !27 (SUBTLE) | Post-MR !27 |
|---|---|---|
| URL after click | `?view=users&referrer=X&referrerType=snag` ✓ | `?view=users&referrer=AXEHEQ&referrerType=snag` ✓ |
| Active visible view | **Source Attribution** ❌ (user had to click Users manually) | **Users** ✓ auto-switched |
| Profile list filtered | n/a (still on attribution) | **512 profiles** filtered by KOL AXEHEQ |
| Source Attribution content gone | n/a | YES (FunnelView/KOL Leaderboard markup gone from DOM) |

DOM probe post-click:
```
url: ?view=users&referrer=AXEHEQ&referrerType=snag
activeTabLabel: "Users"
bodyHasUsersListTitle: true (matches "Search and inspect any user")
bodyStillShowsAttributionContent: false
profileCount: "512"
```

### HARVEST-006+008 verdict: ✅ PASS

The `useSyncTopViewFromUrl` hook now subscribes to URL `?view=` changes and updates the local `topView` state. KOL row click → URL writes `?view=users` → hook detects mismatch → calls `setTopView('users')` → view auto-switches. No more "click row, then click Users tab" 2-step dance.

This also implicitly fixes any future feature that writes `?view=X` via URL (deep links from external docs, drill chains from other components, etc).

---

## Combined: MR !27 fully verified

Both findings closed in prod with the single MR. Two additional notes:

1. **The pre-existing `walletSizeMin=0&walletSizeMax=0` URL pollution** persists (flagged in MR !25 implementer notes — `paramsToFilters` quirk where `Number('') === 0` passes the `>= 0` check). Not a regression of MR !27. One-line guard fix in a future MR.

2. **The `View` state-management refactor opportunity** flagged in MR !27 code review (duplicated `VALID_VIEWS` list in `useTopViewFromUrl.ts` and `data-hub/page.tsx`) is worth tracking but doesn't block anything in current functionality.

## Phase 1.6 status after MR !27

| MR | Closes | Status |
|---|---|---|
| MR !25 | HARVEST-005, HARVEST-014/022 Layers A+B | ✅ shipped + verified |
| MR !25b | HARVEST-014/022 Layer C (UsersView wallet) | ✅ shipped + verified |
| MR !26 | HARVEST-021 (reconciliation badges on Pulse) | ✅ shipped + verified |
| MR !27 | HARVEST-016 + HARVEST-006+008 | ✅ shipped + verified |
| MR !26b | HARVEST-021 Cohorts column badge (backlog) | 📋 deferred |
| MR !27a (potential) | Full M1 trio replacement (Stitch+UTM+Leak) | 📋 conditional on operator feedback |

Verify-not-decoration cluster started 3 FAIL + 3 SUBTLE + 2 PASS. Now: **all 6 FAIL + SUBTLE rows fixed and verified in prod** (with one Cohorts column badge backlog item).

Next-session pivot: HARVEST-001 (score 81 — multi-channel marketing tracking surface for M1) is the biggest Phase 2 piece. That needs a real brainstorm.
