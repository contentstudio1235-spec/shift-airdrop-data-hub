# Skills Audit — Phases 2 + 3 reviewed against `data-analytics-skills`

**Date:** 2026-06-05
**Status:** Audit complete, fixes proposed (not yet shipped)

## Why this exists

After the Data Hub redesign shipped (MRs !13/!14/!15), Tomer asked whether I'd actually used the `data-analytics-skills` repo installed earlier in the session. I'd used **one** (`dashboard-specification`, for the IA spec). I designed Phases 2 + 3 without reading the domain skills that directly applied. This doc audits what we shipped against three skills that should have informed the design:

- `03-data-analysis-investigation/funnel-analysis`
- `03-data-analysis-investigation/cohort-analysis`
- `01-data-quality-validation/metric-reconciliation`

The work is correct as engineering. The audit checks whether it's *defensible as analytics.*

---

## 1. Funnel analysis (against MR !15 commit `c4a2123` and the existing funnel)

### Skill checklist

| Skill step | Shipped? | Gap |
|---|---|---|
| Define funnel steps + **time window** | Partial | Funnel steps are defined. **No time window** — currently all-time. A user who signed up 6 months ago and never connected a wallet is still "stuck" between stage 1 and 2. That inflates every leak. |
| User-level funnel dataset | ✓ | The backend funnel service builds this correctly. |
| Step-to-step conversion + absolute drops | ✓ | Surfaced in the new leak callout: "−97% drop, 16,388 users" |
| **Time-to-convert (median, P75, P95)** | ✗ | Not computed anywhere. A funnel can look healthy by ratio but have a P75 of "never" — we wouldn't catch it. |
| **Segment by channel / cohort** | Partial | The funnel can be filtered by source manually, but the leak callout doesn't say "for the current filter, this is the biggest leak — for `direct`, the biggest leak is different." |
| **Rank drop-offs by users × revenue impact** | ✗ | We rank by drop %. The skill says rank by absolute users lost × estimated revenue per conversion. We have position-size data — could estimate the financial value of fixing a leak. |

### Concrete refinements worth shipping

| # | Refinement | Effort | Why it matters |
|---|---|---|---|
| F1 | Add an explicit time-window selector to FunnelsView (default: last 30d) + propagate to backend SQL | M | Tells the operator "this leak measurement is for users who landed in the last 30d." Removes the long-tail bias. |
| F2 | Compute revenue impact for the biggest leak: `usersLost × avgPositionSize × leverageMult`. Add as a second line on the AnomalyCallout: "≈$X opportunity if recovered." | S | Lets Tomer prioritize between Funnels leaks and Sources gaps using the same currency (dollars). |
| F3 | When a Sources filter is active, the leak callout should say "Biggest leak for `direct`: ..." not the same global leak. | S | Already filterable, just doesn't read the filter into the callout copy. |

### Worth-deferring

- Time-to-convert percentiles (real backend work, requires events table that may not exist today)
- A/B-friendly MDE calculator (we don't run A/B tests on this dashboard)

---

## 2. Cohort analysis (against MR !15 commit `b9b692e`)

### Skill checklist

| Skill step | Shipped? | Gap |
|---|---|---|
| Define cohort grouping | ✓ | Weekly by signup week, ISO format `YYYY-Www` |
| Define retention event | ✓ | Position opened in the target week window |
| Cohort × period membership table | ✓ | `cohort_positions` CTE in `cohortService.ts` |
| Retention matrix | Partial | W1 + W4 surfaced as table columns; collapsible 12×12 heatmap for the full matrix. **Skill recommends a curves chart** in addition (cohort retention curves over time) — we only have the matrix. |
| **Minimum cohort size threshold (skill recommends ≥100)** | ✗ | Our cohorts are large enough today (~5,000/week), but if signup rate drops, small cohorts will show noisy retention. No warning rendered. |
| **Statistical significance for "improving/declining" trend** | ✗ | Threshold is a hardcoded ±3pp delta. No confidence interval. With small samples this trend label is misleading. |
| **Secondary segmentation** (by channel, plan, geography) | ✗ | Cohorts are only by signup week. Real value comes from `signup-week × source` or `signup-week × KOL-attributed`. |
| Reference metrics glossary | ✗ | No glossary doc — what we call "activation" / "retention" isn't defined in user-facing copy. |

### Concrete refinements worth shipping

| # | Refinement | Effort | Why it matters |
|---|---|---|---|
| C1 | Show cohort size as a confidence indicator: if `size < 100`, gray out the row and add aria-label "Small cohort — retention noisy." Skill's standard threshold. | S | Defends against showing fake-precise rates from a 12-user cohort. |
| C2 | Add a 1-line definition to the TabHeader subtitle: "Retention = at least one position opened in the target week." | S | Currently the heatmap cells could mean anything. Pure copy fix. |
| C3 | Add a per-cohort `topSource` column showing the dominant first-touch source for that cohort. Lets operator spot "Snag cohort vs Direct cohort" patterns. | M | Backend SQL already has the data via `first_utm_source` join; just need to surface. |
| C4 | If sample size is below confidence threshold, render the trend card as "Insufficient signal" not "Stable." | S | Honesty about uncertainty. |

### Worth-deferring

- Retention curves chart (the heatmap covers this need for now)
- Full segmentation matrix (4-dimensional cohort table — complex UI, defer until we hit a question that needs it)

---

## 3. Metric reconciliation (against the whole hub)

This is where the audit hit the biggest gap. We have **three different definitions of "stitched"** across the Data Hub, all rendered as similar-looking metrics:

| Where | Metric label | Computation | Result today |
|---|---|---|---|
| Pulse | `Stitch %` | `% profiles with ≥2 identity_links` | 29.3% |
| Cohorts | `STITCH%` column | `% profiles with ≥2 DISTINCT identity_types` | per-cohort |
| Sources | `Stitch Coverage` | `% profiles with attribution signal (UTM OR referral)` | 66.1% |

These are three valid metrics measuring three different things. But to an operator scanning the hub, they all look like "stitch rate." Pulse says 29% and Sources says 66% — same word, +37 percentage points apart. That's a reconciliation failure waiting to confuse.

Similar smaller mismatches:

| Where | Label | What it actually measures |
|---|---|---|
| Pulse `Active Holders` | "Active Holders" | DISTINCT wallets with status='open' positions |
| Dashboard (legacy) `Total AUM Holders` | "Total AUM Holders" | Same — but the label differs |
| Pulse `aumUSD` | "AUM" | SUM(position_size_usd) WHERE status='open' |
| Markets (legacy) `Trading Volume` | "Trading Volume" | Different metric again (lifetime SUM) |

### Concrete refinements worth shipping

| # | Refinement | Effort | Why it matters |
|---|---|---|---|
| R1 | **Rename the three "stitch" metrics** so they're distinguishable at a glance:<br>• Pulse → "Identity Links" (% with ≥2 links)<br>• Cohorts → "Identity Coverage" (% with ≥2 types)<br>• Sources → "Attribution Signal" (% with UTM/referral)<br>And add a hover tooltip showing the exact formula. | S | One-pass naming sweep. Stops the operator wondering why two cards labeled the same thing show 29% and 66%. |
| R2 | Write a metric definitions appendix at `docs/design/metric-definitions.md` listing every KPI displayed in the hub with its source table, exact SQL, and refresh cadence. | M | One canonical reference, eliminates "what does this number mean" rounds. |
| R3 | Verify that Pulse's `delta24h` for `aumUSD` matches what the user can derive by hand from position events. Set up the reconciliation check the skill describes (Source 1 = aumUSD KPI, Source 2 = SUM derived from raw positions). Build it as a CI test if reconciliation is within 0.5%. | M | Catches the next instance of "this number lies" before the user does. |

---

## Summary of proposed follow-up PR

If shipped as a single MR, scope is:

**Small fixes (drop in this week):**
- F2: revenue-impact on the leak callout
- F3: filter-aware leak callout copy
- C1: small-cohort confidence gate
- C2: retention definition in TabHeader
- C4: "Insufficient signal" trend wording
- R1: stitch-metric naming sweep (1-pass rename across 3 components + tooltips)

**Medium (worth doing, but their own discussion):**
- F1: 30-day window selector for Funnels (UX + backend)
- C3: per-cohort topSource column (backend SQL + frontend column)
- R2: metric definitions appendix doc

**Deferred:**
- Time-to-convert percentiles (Funnels)
- Retention curves chart (Cohorts)
- Per-source cohort matrix (4-dimensional UI)
- Real CI reconciliation test (R3)

---

## Honest meta-note

The audit produced more findings than I expected. None of them break the live product — Tomer can use Pulse + Cohorts + Sources today and they tell him useful things. But the three "stitch" definitions reading as the same metric is exactly the kind of subtle-but-confusing bug Tomer would normally catch and resent. Worth fixing before he stumbles on it.
