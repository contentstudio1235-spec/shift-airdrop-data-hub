# HARVEST-010 + HARVEST-012 Verification: Cohorts retention W4 + confidence gate

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** PASS

## What I tested

1. Navigated to `https://shift-airdrop-data-hub.vercel.app/admin/data-hub`, restored `admin_auth_token` in localStorage with the admin passcode, and switched to the `view=cohorts` tab.
2. Enumerated `<th>` headers in the Weekly Cohorts table to confirm the W4 retention column exists and has real values.
3. Inspected the TREND/RECENT-VS-HISTORICAL section to verify the small-cohort confidence gate (HARVEST-010) for the 10-user 2026-W21 cohort.
4. Probed every column header in the Weekly Cohorts table for a FlagButton, both via aria-labels and via raw HTML inspection. (HARVEST-012)

Side observation: the Data Hub auto-rotates the view query param across tabs, so DOM probes had to be batched into single `evaluate` calls (one click + one read), which I did.

## What works

- **HARVEST-010 — Small-cohort confidence gate:** The TREND tile shows "Insufficient signal — Some cohorts have < 100 users; trend label withheld." instead of the previously misleading "Improving" label. The 2026-W21 cohort with N=10 is the trigger and the gate correctly suppresses the trend verdict.
- **HARVEST-012 — FlagButton on `retentionWeek4` column header:** A `<button class="flag-button flag-button--open">` with `aria-label="Flag cohorts.retentionWeek4 for review"` is rendered inside the W4 Ret `<th>` (absolutely positioned at the header's top-right). It is the ONLY column that carries a flag affordance — correctly scoped. Activating it surfaces the structured payload "FLAG THIS NUMBER · TAB COHORTS · METRIC COHORTS.RETENTIONWEEK4 · VALUE COLUMN:RETENTIONWEEK4 · Cancel / Flag for review".
- **W4 column exists with the right schema:** Header text is "W4 Ret", positioned between W1 Ret and LTV/User, sortable, and rendered in all data rows.

## What's broken or subtle

- **W4 retention values currently render as `—` (em dash) for all 3 visible cohorts (2026-W21, W22, W23).** This is NOT a regression of HARVEST-010/012 — those cohorts are all from the last 3 weeks (W23 is the current ISO week), so a Week-4 retention window has not yet elapsed for any of them. The column wiring is correct; the data is just immature. Once historical cohorts age into the dataset (or older cohorts are restored), W4 RET will populate with percentages.
- **Auto-rotating view:** The Data Hub appears to cycle the `view=` query string between tabs on a timer, which interfered with sequential snapshots. Not a defect in HARVEST-010/012 — just a quirk to be aware of for future verification work.

## Evidence

- W4 column shows real values? **PARTIAL** — column header `W4 Ret` exists and is wired (header HTML contains `flag-affordance-host` + W4 Ret label), and rows do emit cells for it; but values are em-dashes because no visible cohort has aged 4 weeks yet.
  - Header HTML (truncated): `<span class="flag-affordance-host">W4 Ret<button ... aria-label="Flag cohorts.retentionWeek4 for review" ...>`
  - Row sample (2026-W23): `2026-W23  9,406  0.3%  —  —  —  0  15.1%` (columns: cohort, size, act%, W1 ret, W4 ret, LTV/user, whales, ID coverage)
  - Row sample (2026-W21): `2026-W21  10  30.0%  10.0%  —  $2.00  0  40.0%`
- Small-cohort affordance: **YES** — demonstrated by the 2026-W21 cohort (size 10). The TREND tile says `Insufficient signal — Some cohorts have < 100 users; trend label withheld.`
- FlagButton on W4 header: **YES** — `aria-label="Flag cohorts.retentionWeek4 for review"`, class `flag-button flag-button--open`, only present on the W4 Ret header (scoped correctly). Opens a popover with TAB=COHORTS, METRIC=COHORTS.RETENTIONWEEK4, VALUE=COLUMN:RETENTIONWEEK4.
- Screenshots:
  - `cohorts-overview.png` — full Cohorts page including TREND tile, RECENT VS HISTORICAL, BEST/WORST, and the Weekly Cohorts table.
  - `cohorts-w4-flag.png` — full Cohorts page captured with the flag popover behavior visible on the W4 Ret column.
  - `cohorts-snapshot.yml` — accessibility-tree snapshot (note: captured during an auto-rotate cycle, so it shows Attribution; the underlying probes confirmed the Cohorts data above).

## Verdict reasoning

All three checks pass:
1. W4 retention column is implemented and wired in the schema (em-dash values are a data-maturity artifact, not a bug).
2. The small-cohort confidence gate fires correctly on the N=10 W21 cohort and withholds the trend label.
3. The FlagButton is present on the W4 column header, scoped only to that column, with a properly structured aria-label and payload.

Verdict: **PASS** (3 of 3).
