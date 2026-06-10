# HARVEST-021 column-header badge RE-TEST (after MR !26b)

**Date:** 2026-06-07
**MR !26b commit:** f71053f
**Verdict:** ✅ PASS
**Verifier:** Claude controller (Playwright MCP, direct)

## What I tested

Navigated to https://shift-airdrop-data-hub.vercel.app/admin/data-hub, authenticated, switched to Trader Cohorts then to Users tab, probed for ReconciliationBadge instances on column headers.

## Cohorts tab — PASS (positive case)

```
url: ?view=cohorts
activeTab: "Trader Cohorts"
badgeCount: 1
badgeAriaLabels: ["cohorts.retentionWeek4 reconciled against second source"]
w4Match: true
```

Exactly 1 badge, mounted on the W4 Ret column header, with correct aria-label. Matches the catalog state (`cohorts.retentionWeek4` is the only Cohorts column with both a `flagMetricId` AND a reconciliation test entry).

## Users tab — PASS (negative case)

```
url: ?view=users (auto-switched via MR !27 URL→view sync hook)
badgeCount: 0
badgeAriaLabels: []
hasVolumeColumn: true
hasValueColumn: true
```

0 badges despite both Volume and Value columns being present + having `flagMetricId` set. Confirms the intentional absence — neither `users.list.lifetimeVolumeUSD` nor `users.list.holdingsValueUSD` has a reconciliation test, so neither is in `RECONCILED_METRIC_IDS`, so neither badge renders. The catalog is the single source of truth, honored end-to-end.

## Full reconciliation surface — now complete

Across all 6 tabs:

| Surface | Reconciled metrics | Badges visible |
|---|---|---|
| Pulse hero | registeredUsers, aumUSD (stitchPct not in catalog yet) | 2 ✓ |
| Cohorts table | retentionWeek4 | 1 ✓ |
| Users column headers | (none — Volume/Value not in catalog) | 0 ✓ correct |
| Other tabs | (no flag-enabled metric_ids yet) | 0 |

Total: 3 badges live across Pulse + Cohorts. Phase 1 RECONCILED_METRIC_IDS catalog has 5 entries; the 2 not currently visible (`PULSE_ACTIVE_HOLDERS` — was on the hero pre-MR !27 swap, now displaced; `PULSE_OPEN_WHALES` — no Pulse card rendered for it post Phase 2.1 trim) reflect the actual Phase 2.1 IA choices.

## Phase 1.6 final status

| MR | Closes | Verified in prod |
|---|---|---|
| MR !25 (`bcd5ed7`) | HARVEST-005 + HARVEST-014/022 A+B | ✅ |
| MR !25b (`aa2fde6`) | HARVEST-014/022 C (UsersView wallet) | ✅ |
| MR !26 (`6b78593`) | HARVEST-021 KPICard badges | ✅ |
| MR !26b (`f71053f`) | HARVEST-021 column-header badges | ✅ |
| MR !27 (`31afbf9`) | HARVEST-016 + HARVEST-006+008 | ✅ |

**5 MRs shipped today**, each with implementer + spec review + code quality review + prod verification. All 6 FAIL+SUBTLE rows from the verify-not-decoration cluster fixed and verified. Phase 1 trust loop fully operational on the visible UI surfaces.

## Side observation (separate from MR !26b)

Console errors jumped from 1 → 181 after tab switch in this session. Likely caused by repeated re-fetches triggered by the `walletSizeMin=0&walletSizeMax=0` URL pollution (the `paramsToFilters` quirk flagged earlier — `Number('')` → 0 → passes `>= 0` finite check). Worth a one-line guard fix in `useFilters.ts` `paramsToFilters` as a follow-up (already in backlog).

## Next-session opening move

HARVEST-001 (score 81) — multi-channel marketing tracking surface for M1. The biggest Phase 2 piece. Needs a real brainstorm. Phase 1.6 has done its job: the operator-facing trust loop is operational, the IA contract is consistent, the Pulse hero carries one M1-relevant metric. Now we build the surface that actually answers M1's daily acquisition questions.
