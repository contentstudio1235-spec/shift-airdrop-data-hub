# Persona Harvest Rubric — Categorizing Captured Operator Questions Into Decision-Aligned Gaps

**Date:** 2026-06-06
**Author:** Analytics Reporter agent
**Scope:** RUBRIC only. The UX Researcher sibling owns the CHECKLIST (where to look, what to capture). This document is what Tomer applies AFTER capture to turn raw rows into a prioritized gap list mapped to D1-D8 + explicit "kill / defer" buckets.
**Anchors:** v2 plan Part III (8 decisions D1-D8) and Part VII (Hub vs Adjacent Tools).

---

## 1. Categorization decision tree

Apply to **one harvest row at a time.** A "row" = one operator question, sheet column name, Slack ping, standup talking point, or hand-maintained metric. Answer questions in order. Stop at first terminal bucket.

```
Q1. Does answering this row, by itself, change a budget / spend / outreach / build / cohort / approval / brief decision?
    └── NO  → Q1a. Is it a NUMBER the operator stares at repeatedly without then doing anything?
             ├── YES → BUCKET A1 (CURIOSITY — kill from harvest, do not promote to Hub)
             └── NO  → Q1b. Is it a LEADING INDICATOR (early-warning signal) for one of D1-D8?
                      ├── YES → tag with the downstream D#, BUCKET A2 (INDICATOR — promote only if D# already has a trust-floor metric; else defer)
                      └── NO  → BUCKET A3 (NOT-A-DECISION — log to one-off ledger, do not promote)
    └── YES → Q2. Map row to ONE OF D1-D8 using the table below.

Q2 mapping (deterministic — pick the FIRST that matches, top-down):
    Row mentions paid spend / channel / KOL ROI / signups-per-source / holder-rate-per-source
        → D1
    Row mentions retention / cohort decay / churn / re-engagement / week-N active
        → D2
    Row mentions funnel stage / drop / conversion / step / where-do-we-lose
        → D3
    Row mentions "is this real" / spike / anomaly / sanity-check / sudden change / "X jumped"
        → D4
    Row mentions whale / large wallet / VIP / $5k+ / individual high-value user
        → D5
    Row mentions UTM / source-medium / campaign-tag / new-campaign-approval / violator
        → D6
    Row mentions token series (TSL2L / SOX3L / SPX3S / etc.) lifetime-volume per cohort / kill-listing / greenlight
        → D7
    Row mentions board / quarterly / monthly summary / "for the deck" / "for management"
        → D8
    NONE match → BUCKET B (UNMAPPED DECISION — see Q2b)

    Q2b. Is the decision real AND high-stakes (≥$5k OR reputation OR product direction)?
         ├── YES → BUCKET B1 (NEW DECISION CANDIDATE — flag for Tomer review; possible 9th decision)
         └── NO  → BUCKET A3 (NOT-A-DECISION)

Q3. (Only if mapped to D1-D8.) Can the operator answer this TODAY in the Hub in ≤2 clicks WITHOUT Tomer / sheet / external tool?
    ├── ✓ self-serve         → BUCKET C1 (COVERED — no action; verify v2 plan didn't already demote it as decoration)
    ├── 🟡 multi-step ≥3 clicks OR requires column-arithmetic in head OR cross-tab traversal
                              → BUCKET C2 (FRICTION — Hub has the data, IA is wrong; Phase 2 fit work)
    └── ✗ requires Tomer / sheet / external tool / does not exist anywhere
                              → Q4.

Q4. Where does the answer actually live today?
    ├── Lives in Postgres / on-chain / Snag / GA4 BUT Hub doesn't surface it
                              → BUCKET D1 (HUB FEATURE GAP — Workflow 2 new-metric request, eligible for Phase 2/3)
    ├── Tomer computes it in his head / one-off SQL / Slack reply
                              → BUCKET D2 (PROCESS GAP — data exists, surfacing is missing; Phase 1 telemetry + Phase 2 feature)
    └── Lives ONLY in a specialist tool per v2 Part VII (Twitter Ads / GA4 raw / Birdeye / Discord / Solscan)
                              → Q4a. Does Hub have a UNIQUE JOIN to add (spend × on-chain, identity × campaign, etc.)?
                               ├── YES → BUCKET D3 (JOIN OPPORTUNITY — Hub adds the join, deep-links the source)
                               └── NO  → BUCKET E (SCOPE-CAP — defer to specialist tool; document deep-link only, DO NOT build)
```

**Buckets summary (the exhaustive 9 destinations):**

| Bucket | Meaning | Action |
|---|---|---|
| **A1** | Curiosity, no decision | Drop |
| **A2** | Leading indicator for a D# | Tag + defer unless trust-floor metric exists |
| **A3** | Not a decision, low stakes | Drop / one-off ledger |
| **B1** | High-stakes unmapped decision | Escalate — possible D9 |
| **C1** | Already self-serve | No-op (verify not Part III decoration) |
| **C2** | Self-serve with friction | Phase 2 IA fix |
| **D1** | Hub feature gap (data exists in our stores) | Phase 2/3 build |
| **D2** | Process gap (Tomer is the surfacing layer) | Phase 1 telemetry + Phase 2 self-serve |
| **D3** | Specialist source but Hub-unique join available | Build join + deep-link |
| **E** | Hub shouldn't try | Document deep-link, scope-cap |

**Determinism check:** rubric uses ONE keyword match per Q2 row (top-down first match) and binary Y/N for Q1/Q3/Q4. Two operators applying it to the same row should land in the same bucket >80% of the time. The known fuzzy edge is Q1b vs Q2 mapping when an indicator IS a downstream decision metric — resolve by asking "does the operator act on THIS number or on a downstream rollup?"

---

## 2. Decision-weighted scoring formula

Adapts the v2 Part VI priority formula to harvest gaps. Used to **sort** the prioritized gap list and to decide what goes into the next-session handoff vs gets killed.

```
gap_priority = decisions_blocked × (frequency × persona_weight) × dollar_stakes
```

**Multiplier definitions (use these exact values — no judgment scoring):**

| Factor | Value | When to assign |
|---|---|---|
| **decisions_blocked** | 1 | maps to exactly one of D1-D8 |
| | 2 | maps to two D# (e.g. holder-rate serves D1 + D7 + D8 → count distinct = 3) |
| | 3+ | three or more D# served (cap at 3 for sanity) |
| | 0 | bucket A1 / A3 / E — automatically deprioritized |
| **frequency** | 1 | rare (monthly or less) |
| | 2 | weekly |
| | 3 | daily / per-session-during-active-campaign |
| **persona_weight** | 1 | X1 only (founder/exec) |
| | 2 | M2 only (community/KOL) |
| | 3 | M1 only OR any two personas OR all three |
| **dollar_stakes** | 1 | <$1k impact if wrong, or reputational only |
| | 2 | $1k-$10k or one bad weekly decision |
| | 3 | ≥$10k or compounding (board slide / pause-or-scale call / kill-token-series) |

Max possible score = 3 × 3 × 3 × 3 = **81.** Anything <6 is presumptive kill / defer. Anything ≥24 enters the next-session handoff.

### Worked examples

**Example 1 — Sheet column "spend / 7d signups" maintained by hand**
- Buckets: C2 (friction — data exists in Hub for signups, spend lives in ad platform → Hub-unique join)
- D# mapping: D1 (channel scale/cut), D8 (board CAC)
- Multipliers: decisions=2 × (frequency=3 daily during campaign × persona_weight=3 M1+X1) × stakes=3
- **Score = 2 × 9 × 3 = 54.** Handoff: top of list.

**Example 2 — Slack ping "is the bounce-rate dashboard accurate?"**
- Q1: yes — drives D4 (anomaly confirm/deny). Q2 → D4. Q3 → ✗ requires Tomer.
- BUT Q4 → answer lives ONLY in GA4. Q4a: is there a Hub join? NO (bounce-rate is single-source GA4).
- Bucket: **E (SCOPE-CAP).** Per v2 Part VII: kill the GA4-mirror tab, deep-link out.
- Score: decisions=1 × (1 × 1) × 1 = **1.** Drop. Deep-link only, do not build.

**Example 3 — Standup talking point "did KOL @x's followers convert?"**
- Q1 yes (D5 individual whale-track AND D1 channel ROI). Q2 → D1 (KOL is a channel — top-down match).
- Q3 → 🟡 multi-step (KOL leaderboard exists but no drill-down to filter Users by source — v2 Part III names this exact gap).
- Bucket: **C2 (FRICTION).** Phase 2 IA fix: KOL row click → Users pre-filtered.
- Multipliers: decisions=3 (D1, D5, D8) × (frequency=2 weekly × persona=3 M2+M1) × stakes=3
- **Score = 3 × 6 × 3 = 54.** Top of list, identical priority band to Example 1.

---

## 3. Pattern library — common harvest archetypes

Eight archetypes covering >90% of expected harvest rows. Each row gets tagged with archetype FIRST, then run through the decision tree. Archetype tag pre-populates Q2 mapping for speed.

| # | Archetype | Example utterance | D# served | Expected freq | Hub intervention |
|---|---|---|---|---|---|
| **AR-1** | Channel ROI | "what did KOL X / paid X ad / sponsored thread deliver in holders per dollar?" | D1, D7, D8 | daily during campaign | DEEPEN — surface cost-per-holder via spend INPUT join (Part VII row "Cost-per-holder per creative" = 🟡 conditional) |
| **AR-2** | Cohort retention threshold | "are the May signups still around? what's week-4 holding?" | D2, D7 | weekly | DEEPEN — retention curve already in plan; ensure cohort >100 threshold visible |
| **AR-3** | Funnel drop diagnosis | "we lost N% between Stage 2 and Stage 3 — why?" | D3, D8 | bi-weekly | DEEPEN — stage diff + per-source breakdown drill-down |
| **AR-4** | Anomaly clarification | "this number jumped / dropped — is it real?" | D4 | daily AM scan | DEEPEN — reconciliation evidence link next to flagged cell (Workflow 1 NODE 1 + Phase 1 trust floor) |
| **AR-5** | Whale identification | "who is wallet 0xABC? are they on twitter? do we know them?" | D5 | event-triggered, daily-ish | DEEPEN — IdentityCard drill-down from Whale Watch (v2 names IdentityCard as "most defensible surface") |
| **AR-6** | UTM violation triage | "is `?utm_source=Tw&utm_medium=KOL_jan` a thing? did we approve this?" | D6 | on-demand ≤24h SLA | RENAME + DEEPEN — approved-list view + violator queue |
| **AR-7** | Token series health | "should we keep listing SPX3S? cohorts are flat" | D7 | monthly | DEEPEN — per-token cohort lifetimeVolume / signup (the metric the row-multiplication bug shipped on — already trust-priority #1) |
| **AR-8** | Board snapshot | "give me the 6 numbers for the deck" | D8 | quarterly + ad-hoc | DEEPEN — snapshot/export primitive (X1's biggest gap per v2) |
| **AR-9** | Cross-source reconciliation | "Hub says 16,000 users, sheet says 17,000 — which is right?" | crosscuts all | weekly-ish | RENAME + workflow — Workflow 3 trigger + arbiter table tooltip |
| **AR-10** | Specialist deep-link | "show me CTR on this ad / bounce rate / Discord joins this week / token price" | none — defer | varies | KILL — defer to specialist tool, deep-link only (v2 Part VII) |

**Tagging rule:** assign one and only one archetype per row. If a row matches two, pick the one whose D# has the higher decisions_blocked count in §2. **AR-9 and AR-10 are NOT D# bucket entries** — they route to BUCKET A2/D2 (workflow trigger) and BUCKET E (scope-cap) respectively.

---

## 4. Output schema — the prioritized gap list

After applying the rubric to all captured rows, Tomer produces ONE markdown table. Cheap (<30 min) to assemble.

**Required columns (in order):**

```
| row_id | raw_quote | archetype | bucket | D# | decisions_blocked | freq | persona | $stakes | score | next_action | owner |
```

| Column | Values | Notes |
|---|---|---|
| `row_id` | H-001, H-002 ... | Sequential. Stable across revisions. |
| `raw_quote` | verbatim from harvest | <80 chars. Truncate, don't paraphrase. |
| `archetype` | AR-1 ... AR-10 | From §3. Exactly one. |
| `bucket` | A1 / A2 / A3 / B1 / C1 / C2 / D1 / D2 / D3 / E | From §1. Exactly one. |
| `D#` | D1-D8, or "—" for A1/A3/E | Comma-separated if multiple (e.g. "D1,D8") |
| `decisions_blocked` | 0-3 | Count of distinct D# |
| `freq` | 1/2/3 | §2 values |
| `persona` | M1 / M2 / X1 / multi | §2 weight is derived from this column |
| `$stakes` | 1/2/3 | §2 values |
| `score` | computed integer | `decisions_blocked × (freq × persona_weight) × $stakes` |
| `next_action` | one of: KILL / WORKFLOW-2-ONE-OFF / PHASE-1-RECON / PHASE-2-FIT / PHASE-3-GOV / DEEP-LINK / D9-ESCALATE | Deterministic from bucket — see mapping below |
| `owner` | Tomer / Marketing Lead / Founder / TBD-triage-owner | Per Part VIII RACI |

### bucket → next_action mapping (deterministic)

| Bucket | next_action |
|---|---|
| A1, A3 | KILL |
| A2 | KILL unless paired with a C2/D1/D2 row on the same D# (then ride along) |
| B1 | D9-ESCALATE |
| C1 | KILL (verify not decoration first) |
| C2 | PHASE-2-FIT |
| D1 | PHASE-2-FIT or PHASE-3-GOV depending on Phase 2 backlog |
| D2 | PHASE-1-RECON (telemetry) + PHASE-2-FIT (surface) |
| D3 | PHASE-2-FIT (the join is the unique value) |
| E | DEEP-LINK |

### Sort order

- **Primary:** `score` DESC
- **Secondary:** `bucket` in this priority order: D2, C2, D1, D3, B1, A2, E, C1, A1, A3 (process gaps and friction first — they have the highest leverage relative to effort; scope-caps and curiosity last)
- **Tertiary:** `D#` ascending (D1 before D8 to align with v2 plan reading order)

### Visualization recommendation

**Just a single markdown table** in the next-session handoff doc. Reasoning:
- A Notion DB view tempts ongoing curation Tomer won't sustain
- A ranked list loses the multipliers needed to defend score on disagreement
- Markdown table renders in the synthesis doc, in Slack, in GitHub PR descriptions — zero tooling tax

If the harvest produces >40 rows, add a second collapsed section per `next_action` value (KILL items in a `<details>` block) so the active backlog is the visible default.

### Handoff vs kill cutline

| Score band | Treatment |
|---|---|
| **≥24** | Next-session handoff. These row IDs explicitly named in synthesis doc. Maximum 12 rows promoted — if more cross threshold, cut to top-12 by score. |
| **6-23** | Backlog. Live in the markdown table but NOT in the synthesis-doc summary. Re-scored at monthly Workflow 1 NODE 8 pattern review. |
| **<6** | KILL on first pass. Move to a `<details>killed-this-round</details>` block at the bottom of the gap list for audit traceability, not for active backlog. |
| **next_action = DEEP-LINK** | Always handoff regardless of score — these are IA decisions, not build work. Goes to the v2 Part VII table as additions, not to engineering backlog. |
| **next_action = D9-ESCALATE** | Always handoff regardless of score — possible 9th decision. Tomer must triage in synthesis session. |

---

## Constraint sanity-check

- **1-2 pages:** delivered, dense.
- **Deterministic:** every Q is binary or top-down-first-match; every multiplier has a fixed value. Two operators applying it should agree >80% on bucket and within ±1 multiplier slot on score.
- **D1-D8 IDs only:** no new decision IDs invented. The escape valve is the explicit B1 bucket → D9-ESCALATE, which sends ambiguous high-stakes rows back to Tomer rather than minting a D9 in this rubric.
- **No engineering features proposed:** all "next_action" values point to phases in the v2 plan or to documentation outcomes (DEEP-LINK, KILL).
- **Out of UX Researcher's lane:** no checklist of where-to-look; rubric assumes capture is done.
