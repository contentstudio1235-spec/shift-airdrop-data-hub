# HARVEST-021 Verification: IncidentBanner + reconciliation visibility

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** FAIL

## What I tested
Navigated the live Data Hub at `https://shift-airdrop-data-hub.vercel.app/admin/data-hub`, authenticated with the admin passcode, and scanned the top of each tab (Pulse, Funnels, Source Attribution, Trader Cohorts) for any IncidentBanner element backed by `hub_incidents`. Then inspected KPI cards on Pulse and metric tiles across all tabs for any per-metric reconciliation affordance (badge, icon, tooltip, footer text). Confirmed by full-DOM regex scan and by probing same-origin proxy paths for an incidents/reconciliation API.

## What works
- Auth gate accepts the passcode and the Data Hub renders all five tabs in the navigation (Pulse, Funnels, Source Attribution, Trader Cohorts, Users).
- Funnels does surface two **legacy** soft warning chips at the top: "Attribution coverage at 20% — 10019 wallet_connects in last 7d had no resolved source." and "Viral K reached 0.00 (red) — driven by K_clicks at 1865%." (both dismissible with an x). These are pre-Phase-1 anomaly notices, not the new IncidentBanner.
- Pulse shows a narrow inline alert under the SIGNUPS BY SOURCE tile: "100% of last-24h signups are unattributed — possible UTM tracker outage — Investigate." Again, this is the pre-existing anomaly-detection copy, not the hub_incidents-backed component.
- Tooltips exist on many tiles (e.g. "% of profiles with any attribution signal (UTM tag or referral source)" on the Attribution Signal KPI), but none reference reconciliation, second sources, or test results.

## What's broken or subtle
- **No IncidentBanner anywhere.** Full-DOM text scans across Pulse, Funnels, Source Attribution, and Trader Cohorts returned zero matches for any of: `incident`, `reconcil`, `banner`, `discrepancy`, `mismatch`, `parity`, `verified`, `cross-check`, `second source`, `two-source`, `data quality`, `last reconciled`, `auto-check`. Searched both rendered `innerText` and full `outerHTML`. The component is not on the page in any tab — neither shown nor hidden-but-rendered.
- **No metric-level reconciliation badges.** Inspected the Pulse KPI cards (REGISTERED USERS, ACTIVE HOLDERS, AUM, AUM 30D, SIGNUPS BY SOURCE 24H, WHALE ACTIVITY 24H) and the Source Attribution KPI cards (BEST ROI SOURCE, TOP KOL, ATTRIBUTION SIGNAL): no checkmark, no "reconciled" footer, no info-icon-with-test-status. Zero affordance telling the operator "this metric IS cross-checked against a second source." Same for the Cohorts trend / recent-vs-historical tiles.
- **API surface missing or unproxied.** Probed same-origin paths `/api/admin/incidents`, `/api/admin/hub-incidents`, `/api/admin/reconciliation`, `/api/admin/reconciliation-results` — all return 404 (Next.js fallback HTML). The frontend has no incidents-feed endpoint wired up, so even if the component existed in the bundle it has nothing to call.
- **Test pass/fail invisible.** The 40 reconciliation tests covering the 10 metric pairs (Signups by Source, Active Holders, cohortRetentionWeek4, etc.) are executed somewhere off-stage; the operator cannot tell from the Hub whether any given metric is reconciled, when it was last cross-checked, or whether a test currently fails.

## Evidence
- `harvest021-pulse-top.png` — Pulse tab top region (KPI strip, no banner, no reconciliation badges).
- `harvest021-funnels-top.png` — Funnels tab top region showing the two legacy anomaly chips (these are not the new IncidentBanner).

## Verdict reasoning
The gap-list flagged HARVEST-021 with the note "test results NOT exposed in Hub UI yet — operator can't see 'this metric IS reconciled' affordance." Verification on the live Vercel deploy confirms this exactly: no banner element renders on any of the four tabs accessible during the session, no KPI card carries any reconciliation indicator, and no client-side endpoint exists to feed an incidents component. The 40 tests in MR !22 are running in CI but their pass/fail state is not surfaced in the operator UI. Per scoring (PASS = banner wired + per-metric affordance; SUBTLE = banner wired but no per-metric affordance; FAIL = neither), the verdict is **FAIL** because neither half exists in the shipped UI.

## Specific gap-list finding confirmation
Was the gap-list's claim ("test results not exposed in Hub UI yet") confirmed by this verification? **YES** — zero IncidentBanner DOM presence, zero per-metric reconciliation affordances, and no client-reachable incidents/reconciliation API across any of the verified tabs.
