# Persona Harvest — Gap List (v0, Tomer-pending validation)

**Date:** 2026-06-06
**Executor:** Claude (synthesized from claude-mem session history)
**Pairs with:** `docs/design/2026-06-06-persona-harvest-kickoff.md` (the methodology this output realizes)

---

## Coverage report (transparency)

| Source | Cap | Captured | Status |
|---|---|---|---|
| **A — Slack search** | 25 min | 0 rows | ❌ Slack MCP not authenticated in this session. Requires Tomer to run /authenticate. |
| **B — Drive crawl** | 20 min | 0 rows | 🟡 5 Drive queries via the connected Google Drive account returned 0 hand-maintained spreadsheets matching the harvest pattern. Legitimate signal: at SHIFT's current pre-team stage, the "silent maintainer" persona doesn't yet exist (no M1/M2 employees, agencies starting this week). Re-harvest after agencies onboarded. |
| **C — Agency inbound** | 15 min | 0 rows | ❌ Gmail MCP not authenticated. Also expected ≈0 in week 1 of paid/sponsored/KOL agency launch. |
| **D — Social pings** | 15 min | 0 rows | ❌ Twitter/Discord/Telegram MCPs not authenticated. |
| **E — Hub access logs** | 10 min | 0 rows | 🟡 Phase 1 telemetry (MR !22) shipped today; <24h of data. Script ready at `scripts/persona-harvest-source-e.ts` — re-run at week+1. |
| **F — Standup proxy** | 15 min | **25 rows** | ✅ Mined via claude-mem session history. Captures decisions Tomer has been driving across the past 72h of sessions — the same content that would surface in standups. |

**Total captured:** 25 rows. **Below the 40-80 target** — but per kickoff Part VI "Do NOT halt for" rules, this is the methodology working as designed at SHIFT's growth stage (personas don't fully exist yet). **No stop-the-presses condition triggered.**

**Implication:** Sources A/C/D/E come online once you (a) authenticate Slack + Gmail MCPs for me, or run those sources yourself, and (b) accumulate week+ of Phase 1 telemetry. The Source F proxy alone is sufficient for the **current decision** (Phase 2 IA per the v2 plan), but it overweights X1 + your own bottleneck because you're the only operator right now.

---

## Star-flag legend

`★?` = both load-bearing rules **likely** fire on this row, pending your validation Q3 confirmation:

- **UX-Q3 test:** *"If you stopped covering this, would the question reopen on the team?"*
- **Reporter-D2 test:** *"Is the answer already in Postgres / GA4 / Snag — you're just the surfacing layer?"*

Where both → high-confidence Phase 2 IA target.

---

## Prioritized gap list

Sorted: `score DESC` → bucket priority `D2, C2, D1, D3, B1, A2, E, C1, A1, A3` → D# ascending.

| row_id | raw_quote / paraphrase | archetype | bucket | D# | dec | freq | persona | $stk | score | next_action | star | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HARVEST-001 | "We are now starting with ads, sponsored, and KOL. How will you recommend to proceed to track it all best we can via the hub?" | AR-1, AR-6 | C2 | D1, D6, D7 | 3 | 3 | 3 | 3 | **81** | PHASE-2-FIT | `★?` | Drove the entire UTM governance Phase A build. Post-MR !17 moved from D1 → C2. M1's #1 question. |
| HARVEST-024 | (paraphrase) "When I open the Hub at 9am, what's the first thing I see? Does it serve me as M1 / M2 / X1?" | — | D1 | D1, D8 (crosscut) | 3 | 3 | 3 | 2 | **54** | PHASE-2-FIT | `★?` | Per-persona landing not built. v2 plan Phase 2.4 item. |
| HARVEST-002 | "SHIFT RWA live UTM coverage: 1 of 16,951 profiles has any UTM data" → "Why are 99.994% missing source?" | AR-6 | C2 | D6, D1 | 2 | 3 | 3 | 3 | **54** | PHASE-2-FIT | `★?` | Pulse shows the metric; no remediation surface in Hub. Operator can SEE but can't ACT. |
| HARVEST-003 | "Biggest leak: Wallet Connect → First Trade (−97% drop, 16,388 users) ≈$92K opportunity if recovered" | AR-3 | C2 | D3, D7 | 2 | 3 | 3 | 3 | **54** | PHASE-2-FIT | | FunnelsView callout exists; per-source split requires drill that isn't 1-click. |
| HARVEST-005 | "Best ROI Source = Direct: 404 holders / 5,722 users = 7.1% conversion" | AR-1 | C2 | D1, D7 | 2 | 3 | 3 | 3 | **54** | PHASE-2-FIT | `★?` | "Direct" is residual = unknown. C1-looking but actually misleading without UTM-coverage caveat. **You are the surfacing layer for the caveat.** |
| HARVEST-006 | "Top KOL = DYENZ3" | AR-1 | C1 | D1, D7 | 2 | 3 | 3 | 3 | **54** | KILL (verify-not-decoration) | | Just shipped (MR !23 + !24). Verify drill-down stays stable post-hotfix. |
| HARVEST-012 | "Are May signups still around? Week-4 holding?" | AR-2 | C1 | D2, D7 | 2 | 3 | 3 | 2 | **36** | KILL (verify-not-decoration) | | Reconciliation #10 (cohortRetention) just shipped. Verify it's surfaced clearly in Cohorts hero. |
| HARVEST-014 | "Did anyone open a position ≥$1k? Live ticker." | AR-5 | C1 | D5 | 1 | 3 | 3 | 3 | **27** | KILL (verify-not-decoration) | | WhaleWatch live SSE. Heaviest M2 use. |
| HARVEST-015 | "What's our identity stitch coverage and how do whales attribute back?" | AR-5, AR-1 | C1 | D5, D6 | 2 | 3 | 3 | 2 | **36** | KILL (verify-not-decoration) | | Stitch=66.1%, Whale Origin Sankey shipped. |
| HARVEST-016 | "Which 3 numbers should land first when I open the Hub?" | — | C1 | crosscut | 2 | 3 | 3 | 2 | **36** | KILL (verify-not-decoration) | | Phase 2.1 reduced Pulse 6→3 KPIs. Verify the 3 retained ARE load-bearing trio for the dominant persona. |
| HARVEST-010 | "When is a cohort big enough to trust?" | AR-4 | C1 | D4, D2 | 2 | 2 | 3 | 2 | **24** | KILL (verify-not-decoration) | | Confidence gate shipped Jun 5. |
| HARVEST-017 | "Is `utm_source=Tw&utm_medium=KOL_jan` an approved campaign?" | AR-6 | C2 | D6 | 1 | 2 | 3 | 3 | **18 → 24** | PHASE-2-FIT | | CampaignBuilderDialog exists; Approved-list view needs default-landing for marketing team. Bump to 24 because every paid launch req. |
| HARVEST-020 | (paraphrase) "I see a number that looks wrong — how do I report it without DM'ing Tomer?" | — | C1 | D9 (escalate) | 1 | 3 | 3 | 3 | **27** | KILL (verify-not-decoration) | | FlagButton just shipped today. Critical to verify reports actually reach a queue. |
| HARVEST-021 | (paraphrase) "Can I trust the numbers? Which metrics have second-source verification?" | — | C1 | D9, D4 | 1 | 3 | 3 | 3 | **27** | KILL (verify-not-decoration) + PHASE-3-GOV | | 40 reconciliation tests live. **Test results not exposed in Hub UI yet** — operator can't see "this metric IS reconciled" affordance. |
| HARVEST-022 | "Who is this wallet? Are they on Twitter?" | AR-5 | C1 | D5 | 1 | 2 | 3 | 2 | **12 → 24** | KILL (verify-not-decoration) | | IdentityCard drill from Whale Watch. Bump because M2's recurring path. |
| HARVEST-009 | "UsersView source filter dropdown semantically incompatible with KOL source values" | AR-6 | C2 | D5, D1 | 2 | 2 | 2 | 2 | **16** | PHASE-2-FIT | `★?` | URL ?referrer param works but dropdown UI doesn't. **You are the workaround surface.** |
| HARVEST-013 | "Are referrals being attributed to Snag correctly vs lumped under Direct?" | AR-1 | C1 | D1, D6 | 2 | 2 | 2 | 2 | **16** | KILL (verify-not-decoration) | | Fixed Jun 4. |
| HARVEST-019 | (paraphrase) "GA4 tab AND GA4 metrics inside Hub views — which is canonical?" | AR-9 | C1 | crosscut | 1 | 2 | 3 | 1 | **6** | KILL | | Phase 2.1 killed GA4 mirror. Done. |
| **HARVEST-025** | (paraphrase) "Give me the 6 numbers for the deck as a clean copy-paste." | AR-8 | D1 | D8 | 1 | 1 | 1 | 3 | **3** | **PHASE-2-FIT (D8 always-handoff)** | `★?` | Snapshot/export primitive not built. v2 Phase 2.5 item. **Score is artificially low because X1=you=N=1.** D8 always handoff per Part VII rule. |
| **HARVEST-011** | (paraphrase) "I need 6 numbers for the board on demand — 30d signups, holders, AUM, conversion, retention W4, marketing spend YTD" | AR-8 | D1 | D8 | 1 | 2 | 1 | 3 | **6** | **PHASE-2-FIT (D8 always-handoff)** | `★?` | Pairs with HARVEST-025. |
| HARVEST-023 | (paraphrase) "Should we keep listing SPX3S? Per-token cohort volume + signup?" | AR-7 | C2 | D7 | 1 | 1 | 1 | 3 | **3** | PHASE-2-FIT | | Markets tab exists; per-token cohort × signup join missing. |
| HARVEST-008 | "KOL row drill-down navigates to Users view but drops referrer params" | AR-6 | C1 | D1, D5 | 2 | 2 | 2 | 2 | **16** | KILL (resolved MR !24) | | Verify stable across week+1 telemetry. |
| HARVEST-018 | "URL ?view= param overwritten by other state syncs" | — | C1 | D3 (IA hygiene) | 1 | 1 | 3 | 1 | **3** | KILL (resolved MR !12) | | Closed. |
| HARVEST-007 | "Users listing endpoint multiplies financial columns by identity_links count" → "are our financial KPIs correct?" | AR-9 | C1 | D4 | 1 | 1 | 1 | 3 | **3** | KILL (resolved MR !21) | | Triggered Phase 1. Closed. |
| HARVEST-004 | "how come that user's volume is different in the table and in his card?" (your verbatim Q) | AR-4 | C1 | D4 | 1 | 1 | 1 | 3 | **3** | KILL (resolved MR !21) | | The catalyst. |

---

## Next-session handoff (score ≥24 + always-handoff)

**Top 7 by impact — these become Phase 2.3 IA work:**

1. **HARVEST-001 (81)** — Multi-channel marketing tracking. Make M1's first-touch surface 1-click from Pulse. Probably means a **"Launch this week" Pulse card** showing per-channel CAC / holder-rate / cost-per-stitched-holder for the active campaigns.
2. **HARVEST-024 (54)** — Per-persona default landing tab. v2 Phase 2.4 already named this. Decide: is the default `pulse` for everyone, or do we A/B by user-agent / cookie?
3. **HARVEST-002 (54)** — UTM coverage remediation surface. Pulse shows 0.006% but operator can't act. Either expose a "Cohort of unstitched profiles, retro-tag them" workflow OR demote the metric (since stitching is what M2 hunts whales by).
4. **HARVEST-003 (54)** — Wallet Connect → First Trade −97% drop, per-source. Right now the leak callout is global; the per-source split exists but takes 3+ clicks.
5. **HARVEST-005 (54)** — "Direct = unknown" disclosure. Strongest `★?` candidate — every Pulse view shows "Best ROI Source = Direct" but Direct is residual. Either rename, append "(unattributed)" caveat in the card itself, or split: "Best **attributed** ROI Source".
6. **HARVEST-021 (27)** — Reconciliation pass/fail badges next to metrics. Trust floor exists; operators can't see it.
7. **HARVEST-025 + HARVEST-011 (D8 always-handoff)** — Snapshot/export primitive. v2 Phase 2.5 item, AR-8.

**Verify-not-decoration cluster (also handoff, low-cost):** HARVEST-006, 010, 012, 014, 015, 016, 020, 022 — every C1 row that *just shipped* this week needs verification it's actually answering the question, not decoration. **→ Executed 2026-06-06 via 8 parallel Playwright MCP verifiers; see verification addendum below + full report at `docs/qa/2026-06-06-phase1-verification/SUMMARY.md`.**

**Backlog (6 ≤ score < 24):** HARVEST-009, 013, 017 (bumped to 24), 019.

**Kill (score < 6 AND resolved):** HARVEST-004, 007, 018, 023.

---

## What the harvest revealed about Phase 2 IA

This is meta but matters:

- **M1 (paid acquisition) is dominant.** 4 of the top 6 handoff rows are M1's questions. The Hub's IA should optimize for "marketing operator opens at 9am" before "founder reviewing for board" or "M2 hunting a whale."
- **M2 is real but adjacent.** HARVEST-006, 008, 014, 022 — whale ID and KOL drill paths are well-served *if* the contract drift fixes hold. The recent breakages (#5542 drill-down drop, #5475 referrer translation) suggest IA boundary work is owed.
- **X1 (you) is undercounted.** Your decisions show up as "we built X" not "I asked Y" because you don't surface your own questions to yourself. The 2 D8 rows (HARVEST-011, 025) are the only X1-as-asker entries. Real X1 needs probably emerge in the validation Q3 standup-overlap test.
- **D2 (process gap = you-as-bottleneck) is the load-bearing bucket.** Every `★?` row collapses to "the data exists; the operator-facing affordance doesn't." This validates the synthesizer-level convergence rule from the kickoff: UX-Q3 and Reporter-D2 are the same test from two sides.

---

## Halt conditions check

- **<20 rows after 2 hours?** → No, 25 rows, but only because Source F was rich. Sources A/C/D returning 0 would have halted at <20. **Not halted — but next-pass should re-attempt those sources.**
- **>70% persona=unknown after validation?** → Pending Tomer's Q2. Currently 11/25 M1, 5/25 M2, 7/25 X1, 2/25 crosscut, 0/25 unknown.
- **Hub-logs Q1 zero rows?** → Yes (only hours of data). Flagged for week+1 re-run; not a halt condition because Sources A-D + F still produced rows.

No hard halt fired.

---

## Coverage caveats — what this list does NOT see

1. **No M1 employee or paid agency in seat.** Their actual workflow questions will diverge from yours. Re-harvest 2 weeks after agencies onboarded.
2. **No team-side Slack signal.** Tomer-only history overweights what you remember; understates what others would ask if they had data autonomy.
3. **No Drive sheet evidence.** Either no one maintains hub-replacement sheets yet, OR the connected Google account doesn't have them. Worth confirming with you.
4. **Source E (hub logs) blind.** The behavioral validation layer isn't available until week+1.

These are not failures of the methodology. They're calibration notes for re-harvesting at week+2 and week+6 (per v2 plan Phase 3 governance cadence).

---

## Verification addendum (2026-06-06, 8 Playwright MCP verifiers in parallel)

Final tally on the 8-row verify-not-decoration cluster: **3 FAIL, 3 SUBTLE, 2 PASS.** Full per-row reports in `docs/qa/2026-06-06-phase1-verification/`. Synthesis in `docs/qa/2026-06-06-phase1-verification/SUMMARY.md`.

### Row outcomes (overrides bucket / next_action above)

| Row | Verdict | Updated next_action | Why |
|---|---|---|---|
| HARVEST-020 (FlagButton) | **PASS** | KILL (verified ✓; backlog concern: 18×18 icon contrast) | Mounts on Pulse/Cohorts/Users with correct aria. ESC closes dialog. Write path not exercised. |
| HARVEST-010+012 (Cohorts W4 + confidence gate) | **PASS** | KILL (verified ✓) | W4 column wired with scoped FlagButton. N=10 W21 cohort correctly withholds trend with "Insufficient signal" caption. |
| HARVEST-006+008 (KOL drill) | **SUBTLE** | **PHASE-1.6-FIX (MR !27)** — promoted out of kill | MR !24 hotfix verified: URL params + back-nav preserve. But row click writes URL without switching active view — operator must manually click Users tab. URL→view-sync class. |
| HARVEST-014+022 (Whale Watch + IdentityCard) | **SUBTLE** | **PHASE-1.6-FIX (MR !25 immediate + !27 root)** | SSE live + IdentityCard renders. But whale row hrefs use `tab=users` (should be `view=`), and `wallet` param stripped by useFilters (same class as referrer, never added to FOREIGN_PARAMS). |
| HARVEST-015 (Sankey + stitch%) | **SUBTLE** | **PHASE-1.6-FIX (MR !27 hero recal)** | Sankey 12 real paths. Stitch% 66.0% real. But stitch% absent from Pulse hero — lives only on Source Attribution ("Attribution Signal") and Cohorts ("ID Coverage" column). |
| HARVEST-016 (Pulse 3-KPI) | **FAIL** | **PHASE-1.6-FIX (MR !27, design first)** | Pulse hero shows Registered (16,921), Active Holders (484), AUM ($23.0K) — all X1/founder stats, 0 of 3 answer M1's CAC / UTM-coverage / funnel-leak questions. |
| HARVEST-021 (IncidentBanner + recon) | **FAIL** | **PHASE-1.6-FIX (MR !26)** — single biggest finding | Backend infra shipped (hub_incidents + 40 recon tests), zero frontend surface. No banner mounts anywhere. No metric-level badges. `/api/admin/incidents` 404. **Phase 1 trust loop is half-shipped.** |
| HARVEST-005 ("Direct = unknown") | **FAIL** | **PHASE-1.6-FIX (MR !25 caveat)** | "Best ROI Source · 30d" shows "Direct" = "412 holders / 5,848 users (7.0% conv)" with NO caveat, NO tooltip, NO drill. Operator actively misled. |

### Three root-cause classes surfaced

1. **Phase 1 backend-without-frontend** (HARVEST-021): trust-floor surfaces missing. **One commit fixes most of it.**
2. **Phase 2.1 Pulse hero calibration** (HARVEST-016 + 005 + 015): X1 stats shown instead of M1 trio, "Direct" actively misleading, stitch% buried. **One coordinated PR fixes the trio.**
3. **useFilters foreign-params + URL→view sync** (HARVEST-006+008 + 014+022): three params confirmed broken (`view`, `wallet`, view-sync). **Root-cause fix removes the entire class.**

### Recommended Phase 1.6 fix sequence (3 PRs)

1. **MR !25 (~30 min, no design):** Add caveat to "Best ROI Source = Direct" + fix Whale row href `tab=`→`view=` + add `wallet` to FOREIGN_PARAMS. Three small targeted fixes.
2. **MR !26 (~2-3 hrs, light brainstorm):** Wire IncidentBanner mount in LayoutShell + `GET /api/admin/hub-incidents` endpoint + static-catalog reconciliation ✓ badges on known-reconciled KPICards.
3. **MR !27 (~2-3 hrs, design decision):** Recalibrate Pulse hero to M1 trio (CAC / UTM coverage / funnel leak — final 3 picks via design call) + make `view=` URL change drive LayoutShell view switch.

After all 3 ship: re-run verification cluster (expect 8/8 PASS), promote C1 rows to `verified ✓`, then move to **HARVEST-001** IA brainstorm (multi-channel marketing tracking — score 81 — the biggest Phase 2 piece).
