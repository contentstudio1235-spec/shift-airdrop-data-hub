# HARVEST-015 Verification: Whale Origin Sankey + stitch coverage

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** SUBTLE

## What I tested

1. Navigated to https://shift-airdrop-data-hub.vercel.app/admin/data-hub. localStorage already
   carried `admin_auth_token` and `shift_admin_key`, so the gated views rendered without
   re-entering the passcode.
2. Switched to the Source Attribution tab and inspected the Whale Origins Sankey SVG. Counted
   `<path>` elements, enumerated `<text>` labels, sampled path stroke colors, and captured a
   full-page screenshot.
3. Switched back to Pulse and surveyed every label/KPI in the hero strip plus the secondary
   tiles, searching for "stitch", "coverage", "identity", "id links", "id coverage". Captured
   a full-page screenshot.
4. While on Source Attribution and Trader Cohorts, captured the alternate locations that
   surface stitch coverage (Attribution Signal KPI and per-cohort ID Coverage column).

## What works

- **Whale Origin Sankey renders with real data.** The full-width SVG (1523 x 378 px) holds
  12 flow `<path>` elements styled with the emerald palette (`stroke="#5ee0a8"` /
  `stroke="#00c896"`, `fill="none"`) plus 8 `<rect>` nodes and 26 `<text>` labels arranged
  in the three documented columns (SOURCE -> COHORT -> OUTCOME).
- Sankey node values look live and self-consistent:
  - SOURCE: SNAG_REFERRALS 11,328 / DIRECT 5,849 / TRUST_IOS_BROWSER 1
  - COHORT: WHALE 4 / DOLPHIN 481 / FISH 16,693
  - OUTCOME: ACTIVE 16,918 / CHURNED 260
  - Flow labels visible at 7%, 93%, 98%, 99%, 99%, 100%, 100%.
- The Source Attribution tab exposes a real stitch coverage KPI: **Attribution Signal =
  66.0% (11,329 stitched / 17,177 total)** with the caption "Stitching activated Sprint 2.3
  (2026-06-03) - UTM coverage grows daily as new traffic lands."
- The Trader Cohorts tab exposes a per-cohort **ID Coverage** column (2026-W23 = 15.1%,
  2026-W22 = 47.9%, 2026-W21 = 40.0%).

## What's broken or subtle

- **Pulse hero does NOT contain a Stitch Coverage / ID Coverage / Identity Links card.**
  The Pulse hero renders exactly three KPI cards: Registered Users (16,921), Active Holders
  (484), AUM ($23.0K). The secondary row holds AUM (30d), Signups by source (24h), and Whale
  activity (24h). No tile mentions stitching, identity, or coverage. Searches on the live DOM
  for "stitch", "coverage", "identity", "id links", "id coverage" all returned -1 on Pulse.
- The Data Hub auto-rotates the active view (`?view=pulse` -> `funnels` -> `attribution` ->
  `cohorts` -> `users`) roughly every few seconds while "live" mode is active. This is a
  product feature, not a bug, but it makes synchronous verification fragile - direct
  navigation to `?view=attribution` repeatedly bounces back to whatever the rotation timer
  picks. Capturing the Sankey required clicking the Source Attribution tab via Playwright
  and immediately evaluating, before the next rotation tick.
- Pulse also shows a warning banner: "100% of last-24h signups are unattributed - possible
  UTM tracker outage." This is informational and orthogonal to HARVEST-015 but worth
  flagging since the attribution data the Sankey relies on for *new* signups is currently
  flat-lining at 0%.

## Evidence

- Sankey path count: **12**
- Sankey rect (node) count: 8
- Sankey text label count: 26
- Sankey SVG dimensions: 1523 x 378 px
- Stitch coverage value displayed (Source Attribution KPI): **66.0%** (11,329 stitched /
  17,177 total)
- Stitch coverage card label on Source Attribution: **"ATTRIBUTION SIGNAL"**
- Stitch coverage value displayed on Pulse: **NONE** (no such card on Pulse)
- Cohorts ID Coverage values: 2026-W23 15.1% / 2026-W22 47.9% / 2026-W21 40.0%
- Screenshots:
  - `./harvest015-sankey.png` - Source Attribution view with Whale Origin Sankey
  - `./harvest015-pulse-final.png` - Pulse hero with its three KPIs
  - `./harvest015-pulse.png` - earlier Pulse capture confirming the same three KPIs

## Verdict reasoning

The HARVEST-015 brief sets the PASS bar as "Sankey paths > 0 AND stitch coverage real."
- Sankey: 12 path elements with real source -> cohort -> outcome flows tied to live counts.
  PASS unambiguously.
- Stitch coverage: real (66.0%, very close to the 66.1% production reference) AND surfaced
  in two production locations (Source Attribution KPI + Cohorts ID Coverage column). PASS on
  realness.
- However, the brief explicitly expected the stitch coverage card to live in the **Pulse
  hero KPI strip**. It does not. The Pulse hero shows only Registered Users / Active
  Holders / AUM. Whoever wrote the brief was likely working from an earlier or planned
  layout where stitch coverage was on Pulse, but the live build puts it on Source
  Attribution as "Attribution Signal" and on Cohorts as "ID Coverage."

This is a layout/terminology drift, not a data problem, so SUBTLE is the most honest call.
If the brief's intent is "stitch coverage is visible somewhere with a real value," verdict
flips to PASS. If the brief means strictly "on Pulse," verdict is FAIL on that half.

## Contract check

- Sankey has paths (>0)? **YES** (12 paths)
- Stitch coverage card present on Pulse? **NO** - it lives on Source Attribution
  ("Attribution Signal" KPI) and Trader Cohorts ("ID Coverage" column), not on Pulse
- Value is real (not placeholder)? **YES** - 66.0% (11,329 / 17,177), matches the ~66.1%
  production reference within rounding
