# Phase 1 Verify-Not-Decoration Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to dispatch fresh verifier-subagent per task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task is parallel-safe — different report file per task.

**Goal:** Live-verify 8 Phase 1 C1 features that shipped today, separating "actually answering the question" from "decoration." Each verifier subagent uses Playwright MCP against `https://shift-airdrop-data-hub.vercel.app/admin/data-hub`, captures evidence, writes a 1-page report.

**Architecture:** 8 parallel read-only verifiers (Playwright MCP), one report file per task at `docs/qa/2026-06-06-phase1-verification/<HARVEST-ID>.md`. After all return, controller writes SUMMARY.md and promotes/demotes rows in the persona gap list. **No code changes** by verifiers — anything that fails surfaces as a Phase 1.6 fix-plan input.

**Tech Stack:** Playwright MCP (`mcp__plugin_playwright_playwright__browser_*` tools), admin passcode `ShiftRwa2026@@$$Key`, prod URL above.

**Source of rows being verified:** `docs/design/2026-06-06-persona-gap-list.md` — the 8 C1 rows tagged `KILL (verify-not-decoration)`.

---

## Per-task verifier contract (applies to all 8)

Every verifier subagent MUST:

1. Open Playwright browser, navigate to the prod URL
2. Authenticate with admin passcode (paste into the gate)
3. Navigate to the specified tab + element
4. Take a screenshot
5. Perform the specified interactions
6. Write a report at the specified path with sections: **What I tested / What works / What's broken or subtle / Evidence (screenshots referenced) / Verdict (PASS / FAIL / SUBTLE)**
7. Report status DONE / DONE_WITH_CONCERNS / BLOCKED back to controller

Verifiers MUST NOT:
- Modify any source files
- Call any prod write endpoints (no POST/DELETE)
- Stay logged in beyond the verification (close browser at end)

---

### Task 1: HARVEST-020 — FlagButton end-to-end

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-020-flagbutton.md`

- [ ] **Step 1: Navigate + auth**

Use Playwright MCP:
- `browser_navigate` → `https://shift-airdrop-data-hub.vercel.app/admin/data-hub`
- `browser_fill_form` admin passcode `ShiftRwa2026@@$$Key`
- `browser_snapshot` to confirm hub loaded

- [ ] **Step 2: Locate any FlagButton instance**

Look on Pulse tab for KPICard with a flag affordance (the `🚩` icon or similar). Hover or click to open the dialog. Capture `browser_take_screenshot`.

- [ ] **Step 3: Verify dialog UX**

Confirm: dialog mounts, ESC closes it, optional comment field present, submit button visible. **Do NOT submit** (read-only).

- [ ] **Step 4: Write report**

Write the report file with verdict PASS / SUBTLE / FAIL. Cite which tab + metric had the FlagButton, which Phosphor icon, what happened on ESC.

---

### Task 2: HARVEST-021 — IncidentBanner mounts when hub_incidents has rows

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-021-incidentbanner.md`

- [ ] **Step 1: Navigate + auth (same)**

- [ ] **Step 2: Look for IncidentBanner on Pulse + each tab**

Scan top of view for any banner element. Capture state. If no banner shows, that's expected if `hub_incidents` table is empty.

- [ ] **Step 3: Probe whether the UI surfaces reconciliation pass/fail badges next to metrics**

Look at any KPI card — is there ANY affordance showing "this metric IS reconciled with X"? Per the gap list, HARVEST-021 was flagged as "test results not exposed in Hub UI yet" — verifier confirms whether that's still true.

- [ ] **Step 4: Write report**

Report file documents: is the banner wired? is there ANY metric-level trust affordance? what's missing. Verdict PASS if both wired; SUBTLE if banner wired but no metric badge; FAIL if neither.

---

### Task 3: HARVEST-006 + HARVEST-008 — KOL Leaderboard drill-down round-trip

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-006-008-kol-drilldown.md`

- [ ] **Step 1: Navigate + auth → Source Attribution tab**

URL probably has `?view=attribution`. Verify KOL Leaderboard renders (rows present, scores visible).

- [ ] **Step 2: Click top KOL row (expected: DYENZ3)**

`browser_click` on the row. Capture URL after click. EXPECTED: URL preserves `?view=attribution` AND adds `?referrer=DYENZ3&referrerType=<snag|utm>`. Per the persona-harvest summary, this contract was just fixed in MR !24.

- [ ] **Step 3: Verify Users view filters to those referred users**

After navigation, capture the Users list — it should show only users attributed to DYENZ3. NOT the full 16,951.

- [ ] **Step 4: Navigate back to Attribution**

Use the LayoutShell tab nav. Verify URL preserves filters and view state. Capture screenshot.

- [ ] **Step 5: Write report**

Verdict PASS if all 3 steps clean; FAIL if drill-down strips referrer; SUBTLE if drill-down works but back-nav loses state.

---

### Task 4: HARVEST-014 + HARVEST-022 — Whale Watch live ticker + IdentityCard drill

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-014-022-whalewatch.md`

- [ ] **Step 1: Navigate + auth → Source Attribution tab**

Locate Whale Watch SSE ticker. Capture initial state.

- [ ] **Step 2: Wait ≥30 seconds, capture again**

If ticker is live, expect new rows OR a "no new events" pulse. Confirm no JS errors via `browser_console_messages`.

- [ ] **Step 3: Click an existing whale row (or test wallet `droskou75` from gap list)**

Confirm navigation to Users view AND IdentityCard renders for that wallet. Capture.

- [ ] **Step 4: Write report**

Verdict PASS if SSE alive + drill works; SUBTLE if SSE works but drill broken; FAIL if SSE not connecting.

---

### Task 5: HARVEST-015 — Whale Origin Sankey + stitch coverage

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-015-sankey.md`

- [ ] **Step 1: Navigate + auth → Source Attribution tab**

Locate the Whale Origin Sankey. Capture.

- [ ] **Step 2: Verify it renders — not just an empty SVG**

`browser_evaluate` to count `<path>` elements in the Sankey SVG. Should be >0. Capture screenshot of the Sankey at min 50% zoom.

- [ ] **Step 3: Verify stitch coverage card on Pulse shows the 66.1% number (or current)**

Navigate to Pulse, find the Stitch Coverage card, capture value.

- [ ] **Step 4: Write report**

Verdict PASS if Sankey has paths AND stitch coverage card has a real value; FAIL if either empty.

---

### Task 6: HARVEST-016 — Pulse 3-KPI hero (which 3?)

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-016-pulse-3kpi.md`

- [ ] **Step 1: Navigate + auth → Pulse tab (default landing)**

- [ ] **Step 2: Identify the 3 hero KPI cards**

Capture their `metric_id` (via DOM inspection if possible) + displayed value + label.

- [ ] **Step 3: Judgment: are these 3 load-bearing for M1?**

Per the gap list, M1's top 3 daily questions are likely: per-channel CAC, UTM coverage, biggest funnel leak. Compare against the 3 retained. Capture mismatch if any.

- [ ] **Step 4: Write report**

Verdict PASS if 3 cards match what M1 would want at 9am; SUBTLE if 2 of 3 match; FAIL if Pulse hero is showing things M1 wouldn't ask.

---

### Task 7: HARVEST-010 + HARVEST-012 — Cohort confidence gate + retention W4

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-010-012-cohorts.md`

- [ ] **Step 1: Navigate + auth → Cohorts tab**

- [ ] **Step 2: Verify retention W4 column shows real values**

Capture the table. Should be one row per cohort, with W4 retention %.

- [ ] **Step 3: Verify small-cohort confidence gate**

Look for a Cohort with N<100 — should have a confidence affordance (greyed, footnote, ⚠️ icon, etc.) indicating low confidence.

- [ ] **Step 4: Verify FlagButton on retentionWeek4 column header**

Per gap list HARVEST-012, Phase 1.5 wired this. Confirm visible.

- [ ] **Step 5: Write report**

Verdict PASS if all 3 work; FAIL if any silent.

---

### Task 8: HARVEST-005 — "Best ROI Source = Direct" check

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/HARVEST-005-direct-roi.md`

- [ ] **Step 1: Navigate + auth → Pulse or Source Attribution tab**

Find the "Best ROI Source" card (or equivalent — could be on SourceKPIRow on Attribution view).

- [ ] **Step 2: Capture the metric**

If it says "Direct" without any disclaimer, that's the BUG per HARVEST-005 — Direct is residual = unknown, and the card is misleading.

- [ ] **Step 3: Hover / drill to see if there's a tooltip explaining "Direct"**

If yes, SUBTLE (caveat hidden); if no, FAIL (operator misled).

- [ ] **Step 4: Write report**

Verdict PASS if card has a clear "(unattributed)" caveat; SUBTLE if hover tooltip exists; FAIL if no caveat anywhere.

---

## Synthesis (controller, after all 8 return)

**Files:**
- Create: `docs/qa/2026-06-06-phase1-verification/SUMMARY.md`

- [ ] **Step 1: Collect all 8 reports**

Read each file. Tally: PASS / SUBTLE / FAIL counts.

- [ ] **Step 2: Update persona gap list (`docs/design/2026-06-06-persona-gap-list.md`)**

For each PASS row, change `KILL (verify-not-decoration)` → `KILL (verified ✓)`. For each FAIL, change to `PHASE-1.6-FIX`. For each SUBTLE, change to `PHASE-2-FIT (refinement)`.

- [ ] **Step 3: Write SUMMARY.md**

Format: top tally (X PASS, Y SUBTLE, Z FAIL) + the FAIL list with proposed fix shape + the SUBTLE list with proposed refinement.

- [ ] **Step 4: Commit + push**

```bash
git add docs/qa/2026-06-06-phase1-verification/ docs/design/2026-06-06-persona-gap-list.md
git commit -m "qa: phase 1 verify-not-decoration verification — N/8 PASS

<one-line list of FAIL rows>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```
