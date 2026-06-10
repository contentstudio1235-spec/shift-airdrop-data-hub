# Phase 1 Verify-Not-Decoration Cluster — Summary

**Date:** 2026-06-06
**Method:** 8 read-only Playwright MCP verifier subagents, dispatched in parallel against `https://shift-airdrop-data-hub.vercel.app/admin/data-hub`
**Plan:** `docs/superpowers/plans/2026-06-06-phase1-verify-cluster.md`
**Individual reports:** `docs/qa/2026-06-06-phase1-verification/HARVEST-*.md`

---

## Tally

| Verdict | Count | Rows |
|---|---|---|
| **PASS** | 2 | HARVEST-020, HARVEST-010+012 |
| **SUBTLE** | 3 | HARVEST-006+008, HARVEST-014+022, HARVEST-015 |
| **FAIL** | 3 | HARVEST-016, HARVEST-021, HARVEST-005 |

---

## The 3 FAIL findings (immediate Phase 1.6 fix candidates)

### F1 — HARVEST-021: IncidentBanner + reconciliation badges not surfaced

Backend infra shipped today (hub_incidents table, 40 reconciliation tests for 10 metric pairs), frontend has **nothing** wiring them. No banner mounts on any tab. No per-metric pass/fail badge. Same-origin probes for `/api/admin/incidents` and `/reconciliation*` return 404.

**Impact:** The trust crisis from HARVEST-007 (row-multiplication, $4,408 vs $629) drove the entire Phase 1 build. The backend correctness work landed, but the operator-facing payoff is invisible. **Phase 1 is half-shipped.**

**Fix shape:** New backend route `GET /api/admin/hub-incidents` returning open incidents; `<IncidentBanner>` component subscribes and renders at top of `<LayoutShell>`. Recon badges: each KPICard with a known reconciled `metric_id` shows a ✓ (or ⚠️) badge sourced from a static catalog initially, then a `/api/admin/reconciliation/status` endpoint at week+1.

### F2 — HARVEST-016: Pulse hero is calibrated wrong for M1

Pulse hero currently shows: Registered Users (16,921), Active Holders (484), AUM ($23.0K). These are X1/founder stats — none of the three answer M1's daily questions (per-channel CAC, UTM coverage, biggest funnel leak).

**Impact:** Pulse is the default landing tab — the first thing anyone sees. Showing X1 stats to M1 is a daily friction multiplier as paid acquisition ramps.

**Fix shape:** Replace the 3 hero KPIs with M1-shaped trio: **Best Attributed ROI Source** (with caveat — see F3), **UTM Coverage** (already 0.006%, shown as remediation prompt), and **Wallet Connect → First Trade conversion** (the −97% leak from HARVEST-003). Per-persona landing tab follows in Phase 2.4 — but the M1-correct trio is the right default now.

### F3 — HARVEST-005: "Best ROI Source = Direct" has no caveat — operator misled

Card says "Best ROI Source · 30d" = "Direct" with subtitle "412 holders / 5,848 users (7.0% conv)". No body caveat, no tooltip beyond literal value-repeat, no drill-down. "Direct" is the residual unattributed bucket — calling it "Best ROI" is actively misleading.

**Impact:** Marketing operators reading this card may scale Direct-attributed acquisition channels — which IS unknown attribution, not actually direct traffic.

**Fix shape:** Smallest version: append "(unattributed — UTM coverage 0.006%)" to subtitle. Better version: rename card label to "Best Attributed ROI Source" and exclude `Direct` from the calculation entirely (show "—" if no attributed source has cohort N≥50, surface the UTM-coverage remediation prompt instead).

---

## The 3 SUBTLE findings (refinements)

### S1 — HARVEST-006+008: KOL drill URL writes but view doesn't react

MR !24 hotfix verified working — URL gains `?referrer=DYENZ3&referrerType=snag` correctly and back-nav preserves state. **But:** the page stays visually on Source Attribution after the row click. User must manually click the Users tab to see the (correctly filtered) 512-profile subset.

**Class of bug:** URL → view-state synchronization. The URL writer works; the view reader doesn't subscribe to the URL change in this codepath.

**Fix shape:** Either (a) make `view=users` URL change trigger view-switch in `<LayoutShell>` (best), or (b) have the KOL row click handler call both `setView('users')` AND the URL write in the same tick.

### S2 — HARVEST-014+022: Whale Watch row drill uses wrong param name + `wallet` stripped by useFilters

Whale row hrefs use `tab=users&wallet=...`. The router reads `?view=users`, so the click falls back to Pulse and `wallet` is dropped. Even hand-crafted `?view=users&wallet=<wallet>` deep links get the `wallet` param **stripped** by `useFilters` — same class as the `referrer`/`referrerType` bug from MR !24 except `wallet` was never added to `FOREIGN_PARAMS`.

**Class of bug:** Same useFilters foreign-params class. Now confirmed three times (`view`, `referrer/referrerType`, `wallet`). This will keep happening per-param until the root cause is fixed.

**Fix shape:** Layered:
- **Immediate:** Fix Whale row href from `tab=` → `view=`. Add `wallet` to `FOREIGN_PARAMS`.
- **Root cause:** Replace the FOREIGN_PARAMS allowlist pattern with an **owned-params explicit denylist** — `useFilters` only writes the 7 filter params it owns (`from, to, source, asset, cohort, walletSizeMin, walletSizeMax`) and leaves every other param untouched. This eliminates the entire class.

### S3 — HARVEST-015: Sankey real but stitch coverage absent from Pulse hero

Sankey renders 12 real paths (SNAG_REFERRALS / DIRECT / TRUST_IOS_BROWSER → WHALE / DOLPHIN / FISH → ACTIVE / CHURNED). Stitch% real (66.0% = 11,329/17,177). Both are correct on the deep tabs — Source Attribution shows it as "Attribution Signal" and Cohorts as "ID Coverage" column.

**The friction:** stitch% is a load-bearing trust signal but lives 2 clicks deep. M1 doesn't see it. X1 sees it only via drill.

**Fix shape:** Folds into F2's Pulse hero recalibration — stitch% (or a derived "Attribution Confidence") should be ONE of the 3 hero KPIs.

---

## The 2 PASS confirmations

### P1 — HARVEST-020: FlagButton chrome works correctly

Mounts on Pulse / Cohorts / Users with correct aria-labels. Dialog opens with Tab + Metric + Value pre-populated. Optional comment textarea. ESC closes. **Concerns:** icon 18×18 with low contrast (discoverability risk — operators may not find it). Actual `hub_flags` write path wasn't exercised (read-only mandate). **Logical pair with F1:** FlagButton is the IN side of the trust loop; without IncidentBanner (the OUT side), filed flags vanish into a queue nobody reads.

### P2 — HARVEST-010+012: Cohort W4 + small-cohort confidence gate

Retention W4 column wired with FlagButton (aria-label "Flag cohorts.retentionWeek4 for review", correctly scoped). Confidence gate withholds the trend on the N=10 W21 cohort with explicit caption "Insufficient signal — Some cohorts have <100 users." The yesterday sparse-cohort fix is solid in prod.

---

## Three classes of root-cause issue surfaced

The verifiers independently triangulated three patterns:

1. **Phase 1 backend-without-frontend** (F1) — Trust-floor surfaces missing. **One commit fixes most of it.**
2. **Phase 2.1 Pulse hero calibration** (F2, F3, S3) — Hero shows X1 stats and an actively misleading "Direct" card; load-bearing stitch% buried. **One coordinated PR fixes the trio.**
3. **useFilters foreign-params class of bug** (S1, S2) — `view`, `referrer/referrerType`, `wallet` — each new param tracked through URL has needed a per-param fix. **Root-cause fix removes the entire class.**

The verify-not-decoration cluster did its job: it identified that Phase 1 backend correctness IS solid (Cohorts gate P2, FlagButton chrome P1), but the operator-facing IA + URL plumbing have load-bearing gaps. These don't need new architecture — they need finishing the half-shipped surfaces.

---

## Recommended next action: Phase 1.6 fix-plan

**Three PRs, in this order:**

1. **MR !25 (small):** Add caveat to "Best ROI Source = Direct" card (F3). Fix Whale row href `tab=`→`view=` (S2 immediate). Add `wallet` to FOREIGN_PARAMS (S2 immediate). **~30 min, single PR.**
2. **MR !26 (medium):** Wire IncidentBanner mount in LayoutShell + `GET /api/admin/hub-incidents` endpoint + static-catalog reconciliation badges on known-reconciled KPICards (F1). **~2-3 hours, brainstorm first.**
3. **MR !27 (medium):** Recalibrate Pulse hero to M1 trio + add stitch% prominence (F2 + S3). Make `view=` URL change drive LayoutShell view switch (S1). **~2-3 hours, design decision needed for the 3 retained KPIs.**

After all 3 ship: re-run verification cluster (will be 8/8 PASS), promote the C1 rows in gap list to `verified ✓`, then move to HARVEST-001 IA brainstorm (multi-channel marketing tracking surface — score 81 — the biggest Phase 2 piece).

---

## Updates to apply to `docs/design/2026-06-06-persona-gap-list.md`

| Row | Was | Now |
|---|---|---|
| HARVEST-020 | KILL (verify-not-decoration) | KILL (verified ✓; concern: icon contrast — backlog) |
| HARVEST-010+012 | KILL (verify-not-decoration) | KILL (verified ✓) |
| HARVEST-021 | KILL (verify-not-decoration) + PHASE-3-GOV | **PHASE-1.6-FIX** (MR !26) |
| HARVEST-016 | KILL (verify-not-decoration) | **PHASE-1.6-FIX** (MR !27, design first) |
| HARVEST-005 | PHASE-2-FIT | **PHASE-1.6-FIX** (MR !25 caveat) — promoted to Phase 1.6 because it's actively misleading |
| HARVEST-006+008 | KILL (verify-not-decoration) | **PHASE-1.6-FIX** (MR !27 view-sync) — promoted out of kill |
| HARVEST-014+022 | KILL (verify-not-decoration) | **PHASE-1.6-FIX** (MR !25 immediate; root-cause MR !27 view-sync) — promoted out of kill |
| HARVEST-015 | KILL (verify-not-decoration) | **PHASE-1.6-FIX** (MR !27 hero recalibration includes stitch%) |

**Net:** 2 rows verified-and-killed cleanly. 6 rows promoted from "kill" to "fix" — because the verification was honest about half-shipped surfaces instead of rubber-stamping them.
