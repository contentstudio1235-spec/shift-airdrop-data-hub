# Persona Harvest Kickoff — Tomer-Solo, 2 Hour Budget

**Date:** 2026-06-06
**Status:** Synthesized from 2 Agency Agent outputs. Ready to execute.
**Author:** Claude synthesizing — content authored by **UX Researcher** + **Analytics Reporter** agents (raw outputs in `docs/design/agent-outputs/`)
**Pairs with:** `docs/design/2026-06-06-hub-audit-plan-v2.md` Part V (Phase 2 fit) + Part VII (self-serve gap discovery)

---

## Part I — Why this exists, what you owe yourself

The v2 audit plan put Phase 2 (Fit per persona) behind a single dependency: **you need to know what each persona is actually trying to ask.** The plan also said the answer doesn't come from 1-hour stakeholder interviews — it comes from harvesting artifacts you already have access to. This doc is the runbook.

**The 2-hour contract.** Total wall-clock budget, you-solo. Per-source caps are non-negotiable. If a source runs over, stop and move on. The bias mitigations exist precisely because no single source is comprehensive; over-investing in one starves the others.

**What the harvest produces.** A single Google Sheet with 40-80 rows. Each row is one operator question (verbatim) captured from one of 6 sources. After the harvest, you apply the categorization rubric (Part IV) and run a 20-minute validation session with yourself (Part V). The output is a prioritized gap list (Part VII) that becomes the input to Phase 2 IA work.

**What the synthesizer wants you to hold in your head while harvesting.** Both agents independently surfaced the same load-bearing test from different angles:

- **UX Researcher's Q3 (standup overlap):** *"What question would the team reopen if you stopped pre-emptively covering it in standup?"*
- **Analytics Reporter's bucket D2 (process gap):** *"You are the surfacing layer for data that already exists in Postgres / GA4 / Snag — the answer isn't missing, the affordance is."*

These detect the **same pattern** — Hub-bypass via Tomer-as-bottleneck. When a row triggers BOTH rules, that's the highest-confidence high-leverage gap in the entire harvest. Flag those rows with a `★` in the notes column.

---

## Part II — The Harvest (90 min total)

Six sources, per-source caps. Open the capture Sheet (Part III) before starting.

### Source A — Slack DM/channel search (25 min cap)

**Serves:** M1, M2, X1 (all — Slack is where ad-hoc data asks land)

**Where:** Your DMs (all) + public channels `#general`, `#marketing`, `#partnerships`, `#kol`, `#growth`, `#leadership` (use names that actually exist — autocomplete will help). Date range: **last 90 days only.**

**Queries — paste verbatim:**

1. `holder OR holders OR holding after:2026-03-08`
2. `signup OR signups OR registered after:2026-03-08`
3. `KOL OR creator OR influencer after:2026-03-08`
4. `whale OR "big wallet" OR "$5k" OR "$10k" after:2026-03-08`
5. `attribution OR UTM OR source OR campaign after:2026-03-08`
6. `volume OR AUM OR "trading volume" after:2026-03-08`
7. `retention OR cohort OR "week 4" after:2026-03-08`
8. `"can you pull" OR "can you check" OR "do we know" after:2026-03-08`
9. `stitch OR "identity match" OR "wallet to twitter" after:2026-03-08`
10. `"how many" OR "what's the" OR "what is the" after:2026-03-08`

**Bonus query for highest-leverage rows:** add `from:@<your-handle>` to each — messages YOU sent are pre-emptive answers (this is the inverse of the verbal-standup proxy in Source F).

**Capture rule:** for each hit that's a *question* about data (not a status, not a meme), copy verbatim into the Sheet. Skip duplicates in the same thread (count thread once, frequency = N replies asking variants).

**Persona-tag heuristic while capturing:**
- Mentions ad spend / CTR / budget / "channel X" → **M1**
- Mentions a specific Twitter handle / Discord user / "who is" → **M2**
- Mentions "for the board" / "for the deck" / "this quarter" → **X1**
- Wallet address with no other context → likely M2 or X1 → mark **unknown** if unsure

### Source B — Google Drive crawl: hand-maintained spreadsheets (20 min cap)

**Serves:** M1 (weekly reconciliation), X1 (board / monthly close)

**Where:** `drive.google.com/drive/my-drive` and **Shared with me**. Google Sheets only.

**Drive search operators:**

1. `type:spreadsheet owner:me modified:7d` — your own active sheets
2. `type:spreadsheet sharedwithme=true modified:30d` — what others actively maintain
3. `type:spreadsheet title:KOL OR title:campaign OR title:report OR title:weekly OR title:tracker`
4. `type:spreadsheet title:holder OR title:wallet OR title:volume OR title:AUM`
5. `type:spreadsheet title:board OR title:investor OR title:quarterly`

**Fast classifier (<30s per file): is this a hub-replacement spreadsheet?**
- **✓ YES, capture columns:** rows of users/wallets/campaigns/cohorts with computed metrics; "last updated" timestamp; column headers match Hub vocabulary (holders, signups, sources, AUM)
- **🟡 Maybe:** template/blank; one-off pull from 60+ days ago; clearly imported CSV nobody touches
- **✗ NO, skip:** finance/legal/HR; meeting notes; design briefs; one-tab scratch math with no recurring use

**Capture for each YES sheet:** filename + last-modified date + **all column headers** (these ARE the persona's mental model verbatim) + which columns Hub produces (✓) vs misses (✗) + edit frequency proxy (daily → freq 6+; weekly → 2-5; one-shot → 1).

### Source C — Agency inbound: paid + sponsored + KOL agency requests (15 min cap)

**Serves:** M1 (paid agency), M2 (KOL/sponsored agencies)

**Why now:** You're starting paid + sponsored + KOL this week. The agencies ARE acting as M1/M2 until you hire those personas internally. Their inbound is the leading-edge question stream.

**Where:** Gmail inbox + sent (you + any shared marketing alias) + Google Calendar last 14 days + next 14 days.

**Gmail searches:**

1. `from:(agency-domain.com OR kol-agency-domain.com OR paid-agency-domain.com) newer_than:30d` — substitute actual agency domains as you sign them
2. `subject:(reporting OR weekly OR campaign OR creative OR brief) newer_than:30d`
3. `"can you confirm" OR "can you send" OR "do you have data" newer_than:30d`
4. `attachment:xlsx OR attachment:csv OR attachment:pdf newer_than:30d from:-(@shiftrwa.xyz)`

**Calendar:** search titles for `kickoff`, `weekly`, `recap`, `KOL`, `agency`, `campaign review`. Note recurring meetings — recurrence implies recurring data-prep need.

**Capture rule:** for each agency thread, capture the *first* data request + any "btw can you also send" follow-ups. Tag M1 vs M2 by agency type. Frequency = how many threads asked the same Q.

**Special case:** if you've had ZERO agency inbound (week 1 — likely), mark this source `N=0` and proceed — it's the bias-mitigation flag for Blind Spot #2 (Part VI).

### Source D — Twitter/Discord/Telegram pings about data (15 min cap)

**Serves:** M2 (relationship-driven, event-triggered), some X1

**Where:** Twitter notifications + DMs; SHIFT's Discord server + any KOL servers you're in; Telegram channels you're added to.

**Twitter/X searches** (in Twitter web search bar):

1. `to:@<your-handle> (holder OR holders OR wallet OR whale) since:2026-03-08`
2. `to:@<your-handle> (campaign OR KOL OR creative OR ad) since:2026-03-08`
3. Your DMs — manual scroll. 5-min cap.

**Discord** (per server): `from:<your-username>` filtered to 30d (your answers reveal questions); server-wide search for `holder`, `whale`, `volume`, `data`, `dashboard` last 30d.

**Telegram:** search is poor; 5-min manual scan of the 2-3 most active channels. Look for `@<you> ...?` patterns.

**Capture rule:** these are M2's highest-signal rows because event-triggered ("just saw this whale — who are they?"). Capture the trigger context too in the "why this matters" column.

### Source E — Hub access logs (10 min cap)

**Serves:** M1 (heaviest current user — paid metrics), some X1

**Critical context:** Phase 1 (MR !22) just shipped `hub_sessions` + `hub_events`. Instrumentation IS live but the data window is hours-to-days — re-run these after ≥7 days of telemetry. Use the executable script at `scripts/persona-harvest-source-e.ts` (reuses `src/db/pool.ts`).

**Actual `hub_events` schema (from migration 022):** `session_id, occurred_at, event_type, tab, metadata`. `event_type` is one of `tab_open, tab_close, card_click, filter_change, drill_down, answer_reached, flag_filed`. `tab` is top-level; everything else lives in `metadata` JSONB.

**Q1 — Tabs visited without `answer_reached` (better than bounce — we instrument the positive case):**

```sql
WITH session_tabs AS (
  SELECT DISTINCT session_id, tab
  FROM hub_events
  WHERE event_type = 'tab_open' AND tab IS NOT NULL
    AND occurred_at > NOW() - INTERVAL '14 days'
),
session_answers AS (
  SELECT DISTINCT session_id, tab
  FROM hub_events
  WHERE event_type = 'answer_reached' AND tab IS NOT NULL
    AND occurred_at > NOW() - INTERVAL '14 days'
)
SELECT st.tab,
       COUNT(*) AS visits_without_answer,
       (SELECT COUNT(*) FROM session_tabs st2 WHERE st2.tab = st.tab) AS total_visits,
       ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM session_tabs st2 WHERE st2.tab = st.tab),0), 1) AS unresolved_pct
FROM session_tabs st
LEFT JOIN session_answers sa ON sa.session_id = st.session_id AND sa.tab = st.tab
WHERE sa.session_id IS NULL
GROUP BY st.tab
ORDER BY visits_without_answer DESC;
```

**Q2 — Most-clicked metric cards (with flag rate side-by-side):**

```sql
SELECT metadata->>'metric_id' AS metric_id,
       COUNT(*) FILTER (WHERE event_type = 'card_click') AS clicks,
       COUNT(*) FILTER (WHERE event_type = 'drill_down') AS drills,
       COUNT(*) FILTER (WHERE event_type = 'flag_filed') AS flags,
       COUNT(DISTINCT session_id) AS distinct_sessions
FROM hub_events
WHERE event_type IN ('card_click','drill_down','flag_filed')
  AND metadata->>'metric_id' IS NOT NULL
  AND occurred_at > NOW() - INTERVAL '14 days'
GROUP BY 1
ORDER BY clicks DESC
LIMIT 20;
```

**Q3 — Most common navigation paths (a multi-tab path looks like a question hunt):**

```sql
WITH paths AS (
  SELECT session_id, STRING_AGG(tab, ' -> ' ORDER BY occurred_at) AS path
  FROM hub_events
  WHERE event_type = 'tab_open' AND tab IS NOT NULL
    AND occurred_at > NOW() - INTERVAL '14 days'
  GROUP BY session_id
  HAVING COUNT(*) BETWEEN 2 AND 6
)
SELECT path, COUNT(*) AS sessions
FROM paths
GROUP BY path
ORDER BY sessions DESC
LIMIT 15;
```

**Capture rule:**
- **Bounced tabs (Q1)** → one row per tab, `self_serve_status = ✗`, `why_it_matters = "users went here expecting an answer, left in <5s"`
- **Top KPI cards (Q2)** → `self_serve_status = ✓` — these are the questions Hub IS answering well. Capture as negative-space (don't redesign these)
- **Nav paths (Q3)** → if a path is `Pulse → Funnels → Pulse → Sources`, the user is hunting. One row: "Question hunt across 3+ tabs"

**Note:** if Q1 returns zero rows, the instrumentation isn't capturing what we need. Tag for Phase 1 follow-up; proceed using Sources A-D + F.

### Source F — Your verbal-standup-coverage self-report (15 min cap)

**Serves:** X1 (founder's lens), M1 (most teamwide standup content is paid/growth)

**Why it works:** What you pre-emptively cover in standups is precisely the set of questions you know the team would otherwise ask. **Inverse of Source A:** Slack captures unanswered, standup captures pre-answered.

**Pass 1 — Documented record (5 min):** Notion / Google Docs search for `weekly`, `standup`, `Monday`, `update`, `recap` last 60 days. Calendar recurring standup notes. Last 4 Loom/Granola recordings if you record. Capture every recurring data point you report verbally, verbatim.

**Pass 2 — Forced self-report (10 min):** sit down, open the Sheet, answer these 5 prompts in writing. **Don't skip even if Pass 1 yielded a lot.** This catches muscle-memory items that don't show up in docs.

1. *"What 5 numbers do I say in every Monday standup?"* (write the numbers + the source you pull from)
2. *"What 3 anomalies have I flagged for the team in the last 30 days?"* (each + how you found it)
3. *"What questions does the team ask me in standup that I have to look up live?"*
4. *"What did I cover this week that I would NOT have covered 4 weeks ago?"* (catches the paid-spend ramp frontier)
5. *"What number am I afraid to be wrong about in front of the team?"* (flags load-bearing Phase 1 metrics)

**Capture rule:** each answer = 1-5 rows. Persona = X1 for #1, #2, #5; M1 for #4; varies for #3.

---

## Part III — Capture template (single Google Sheet)

**Format:** one Google Sheet, one tab, named `Persona Harvest 2026-06-06`. Save to `Tomer's Google Drive → /SHIFT Airdrop/Persona Harvest 2026-06-06`.

**Columns (exact order, fill left-to-right as you go):**

| Col | Header | Type | Required | Values |
|-----|--------|------|----------|--------|
| A | `row_id` | text | auto | `HARVEST-001`, `HARVEST-002`, ... |
| B | `source` | dropdown | yes | `slack`, `drive_sheet`, `agency`, `social_ping`, `hub_log`, `standup` |
| C | `persona` | dropdown | yes | `M1`, `M2`, `X1`, `unknown` |
| D | `question_verbatim` | text | yes | operator's exact words (or your paraphrase if from Hub logs / your own standup) |
| E | `frequency` | dropdown | yes | `1x`, `2-5x`, `6+` |
| F | `date_range` | text | yes | `2026-04-10` or `2026-04-10 to 2026-05-20` |
| G | `why_it_matters` | text | yes | 1-line free text — trigger / context / decision being made |
| H | `self_serve_status` | dropdown | yes | `✓ in-hub`, `🟡 multi-step`, `✗ needs-tomer-or-external` |
| I | `current_workaround` | text | optional | "asks Tomer", "pulls from GA4", "manual SQL" |
| J | `decision_tag` | text | leave blank | Reserved for rubric (Part IV) — D1..D8 or `decoration` |
| K | `validation_status` | dropdown | leave blank | `unreviewed`/`confirmed`/`demoted`/`killed`/`promoted` — filled during validation (Part V) |
| L | `notes` | text | optional | the `★` flag goes here (see Part I) |

**Setup:** freeze row 1, freeze col A, add data validation dropdowns for B/C/E/H/K.

**Cell L1 reminder text:** *"Capture the question verbatim. Don't reword. Don't summarize."*

**Target row count:** 40-80. <30 → you skipped a source or under-captured Slack. >120 → you captured non-questions; re-filter to questions only before validation.

---

## Part IV — Categorization Rubric (apply AFTER harvest, before validation)

For each captured row, walk the decision tree top-to-bottom. Stop at first terminal bucket. Tag col J + (separately) col L's archetype.

### Decision tree

```
Q1. Does answering this row, by itself, change a budget / spend / outreach / build / cohort / approval / brief decision?
    └── NO  → Q1a. Is it a NUMBER the operator stares at without acting?
             ├── YES → BUCKET A1 (CURIOSITY — kill)
             └── NO  → Q1b. Is it a LEADING INDICATOR for a downstream D#?
                      ├── YES → tag downstream D#, BUCKET A2 (INDICATOR — promote only if D# has trust-floor metric)
                      └── NO  → BUCKET A3 (NOT-A-DECISION — log to one-off ledger)
    └── YES → Q2. Top-down keyword match:

      Mentions paid spend / channel / KOL ROI / signups-per-source / holder-rate-per-source → D1
      Mentions retention / cohort decay / churn / re-engagement / week-N active → D2
      Mentions funnel stage / drop / conversion / step / where-do-we-lose → D3
      Mentions "is this real" / spike / anomaly / sanity-check / "X jumped" → D4
      Mentions whale / large wallet / VIP / $5k+ / individual high-value user → D5
      Mentions UTM / source-medium / campaign-tag / new-campaign-approval / violator → D6
      Mentions token series (TSL2L/SOX3L/SPX3S etc.) lifetime-volume / kill-listing / greenlight → D7
      Mentions board / quarterly / monthly summary / "for the deck" / "for management" → D8
      NONE match → BUCKET B (UNMAPPED) → Q2b: high-stakes? YES → B1 (D9-ESCALATE); NO → A3

Q3. Mapped to D1-D8. Can the operator answer TODAY in Hub in ≤2 clicks WITHOUT you / sheet / external tool?
    ├── ✓ self-serve → BUCKET C1 (COVERED — no-op; verify not decoration)
    ├── 🟡 multi-step ≥3 clicks / cross-tab traversal → BUCKET C2 (FRICTION — Phase 2 IA fix)
    └── ✗ requires you / sheet / external → Q4.

Q4. Where does the answer actually live today?
    ├── Postgres / on-chain / Snag / GA4, Hub doesn't surface → BUCKET D1 (HUB FEATURE GAP)
    ├── You compute in head / one-off SQL / Slack reply → BUCKET D2 (PROCESS GAP — you are the surfacing layer)
    └── Specialist tool only (Twitter Ads / GA4 raw / Birdeye / Discord / Solscan) →
              Hub has UNIQUE JOIN to add? YES → BUCKET D3 (JOIN OPPORTUNITY)
                                          NO  → BUCKET E (SCOPE-CAP — deep-link, don't build)
```

### The nine destination buckets

| Bucket | Meaning | Action |
|---|---|---|
| **A1** | Curiosity, no decision | Drop |
| **A2** | Leading indicator | Drop unless paired with C2/D1/D2 on same D# |
| **A3** | Not a decision | Drop / one-off ledger |
| **B1** | High-stakes unmapped | D9-ESCALATE |
| **C1** | Self-serve | No-op (verify not decoration) |
| **C2** | Self-serve with friction | PHASE-2-FIT |
| **D1** | Hub feature gap | PHASE-2-FIT or PHASE-3-GOV |
| **D2** | Process gap (you are surfacing layer) | PHASE-1-RECON + PHASE-2-FIT |
| **D3** | Hub-unique join opportunity | PHASE-2-FIT |
| **E** | Scope-cap | DEEP-LINK only |

### The 10 archetypes (tag in col L for speed; one and only one per row)

| # | Archetype | Example utterance | D# | Hub intervention |
|---|---|---|---|---|
| **AR-1** | Channel ROI | "what did KOL X / paid X / sponsored thread deliver in holders per dollar?" | D1, D7, D8 | DEEPEN — cost-per-holder via spend INPUT join |
| **AR-2** | Cohort retention threshold | "are the May signups still around? week-4 holding?" | D2, D7 | DEEPEN — retention curve already planned |
| **AR-3** | Funnel drop diagnosis | "we lost N% between Stage 2 and 3 — why?" | D3, D8 | DEEPEN — stage diff + per-source drill |
| **AR-4** | Anomaly clarification | "this jumped/dropped — is it real?" | D4 | DEEPEN — reconciliation link next to flagged cell |
| **AR-5** | Whale identification | "who is wallet 0xABC? are they on twitter?" | D5 | DEEPEN — IdentityCard drill from Whale Watch |
| **AR-6** | UTM violation triage | "is `utm_source=Tw&utm_medium=KOL_jan` a thing?" | D6 | RENAME + DEEPEN — approved-list view |
| **AR-7** | Token series health | "should we keep listing SPX3S?" | D7 | DEEPEN — per-token cohort volume/signup |
| **AR-8** | Board snapshot | "give me the 6 numbers for the deck" | D8 | DEEPEN — snapshot/export primitive |
| **AR-9** | Cross-source reconciliation | "Hub says 16k, sheet says 17k — which?" | crosscuts | RENAME — Workflow 3 trigger + arbiter table |
| **AR-10** | Specialist deep-link | "show me CTR / bounce rate / Discord joins / token price" | none | KILL — defer to specialist tool |

### Scoring formula

```
gap_priority = decisions_blocked × (frequency × persona_weight) × dollar_stakes
```

| Factor | Values |
|---|---|
| **decisions_blocked** | 1 (one D#) / 2 (two D#) / 3 (three+ D#, cap) / 0 (A1/A3/E buckets) |
| **frequency** | 1 (monthly) / 2 (weekly) / 3 (daily / per-session-during-campaign) |
| **persona_weight** | 1 (X1 only) / 2 (M2 only) / 3 (M1 only OR ≥2 personas) |
| **dollar_stakes** | 1 (<$1k or reputational only) / 2 ($1k-$10k or one bad weekly decision) / 3 (≥$10k or compounding — board slide / pause-or-scale / kill-token) |

**Max = 81.** Bands: **≥24 = next-session handoff** (cap at top 12). **6-23 = backlog**. **<6 = kill on first pass.**

---

## Part V — 20-minute validation session (you-with-yourself, within 24 hours)

**Pre-session (5 min, day-before, async):**

Open the Sheet, apply filter `Frequency = 6+ OR Self-Serve Status = ✗`. Save as filter view `validation-set`, sorted by `frequency` desc then `decision_tag` asc. ~15-25 rows.

**During session (20 min, 5 min per question, scripted):**

**Q1 (5 min) — Frequency reality check.**
> *"Top 5 rows by frequency are [list 5 verbatim]. For each, true or false: this is still being asked weekly. If false, what changed?"*

**Q2 (5 min) — Persona assignment audit.**
> *"I tagged [N] rows as `unknown` persona. Top 3 are [list 3]. Who's actually asking?"*

**Q3 (5 min) — Standup overlap test. ← THE LOAD-BEARING QUESTION.**
> *"From Source F, these 5 things I self-reported as standup coverage [list 5]. For each, what specific question is the team NOT asking precisely because I cover it? Is the question still open if I stop covering it?"*

If the answer is "no, it dies when I stop covering it" → KILL the row even at high frequency.
If the answer is "yes, the question reopens" AND the row is in bucket D2 (process gap) → **flag with `★` in col L**. These are the highest-leverage Phase 2 candidates.

**Q4 (5 min) — What's missing.**
> *"Scan the Sheet for 60 seconds. What question that you KNOW marketing/management will ask in the next 30 days is NOT on this list? Add up to 3 rows live."*

**Post-session (10 min, immediately):** fill col K per this mapping:

| Q result | col K |
|---|---|
| Q1 true (still asked) | `confirmed` |
| Q1 false + permanent change | `killed` |
| Q1 false + temporary | `demoted` |
| Q2 persona resolved | `confirmed` (update col C) |
| Q2 persona unresolvable | `demoted` |
| Q3 question reopens if I stop covering | `confirmed` (+ `★` if D2) |
| Q3 question dies if I stop covering | `killed` |
| Q4 added rows | `promoted` (placeholder freq=`2-5x`) |

---

## Part VI — Bias mitigations + stop-the-presses conditions

### Blind spot 1 — Slack undersamples silent users

People who don't ask in Slack don't show up in Source A. The agency contractor unfamiliar with SHIFT's Slack norms, the management-side reviewer who treats Slack as informal — all invisible.

**Mitigation:** Source B (Drive crawl) is the explicit counterweight. Silent users **maintain spreadsheets** instead of asking. If Source B returns <5 hand-maintained sheets AND M1/M2/X1 personas exist as employees → halt and add a 15-min "what's the spreadsheet you maintain?" async ask to each persona before validation.

### Blind spot 2 — Behavioral proxies oversample what Hub is currently shaped for

Source E (Hub logs) can only see what users do GIVEN the current IA. No KOL drill-down → logs never show "user wanted KOL drill-down." Source E confirms; it cannot reveal absences.

**Mitigation:** weight Source D (social pings) and Source C (agency inbound) more heavily for M2-flavored questions — these capture intent BEFORE it routes through Hub. **Concretely:** if ≥60% of confirmed rows came from Source E, halt and re-run a 15-min Source D + C pass focused only on M2 triggers.

### Blind spot 3 — Your self-report is the noisiest source

Source F depends on your memory and self-honesty. You'll over-report what you wish you covered, under-report habitual answers given without thinking.

**Mitigation:** Pass 1 documented-record check before Pass 2 forced self-report. **Discrepancy rule:** if Pass 1 yields 0 documented standup artifacts AND Pass 2 yields ≥10 self-reported items → halt. You're filling from imagination. Replace Source F with a single recorded standup that week, harvest from transcript next round.

### Stop-the-presses (single halt)

Halt and re-plan if:

1. **<20 rows after 2 hours** — methodology isn't working for this growth stage (M1/M2 likely don't exist as functions yet); revisit in 2 weeks with Source C dominant.
2. **>70% of rows persona=`unknown` after validation Q2** — personas not yet differentiable; pause Phase 2 IA until first M1 and M2 contributors actually exist (employees or agencies), then re-harvest.
3. **Hub-logs Q1 returns zero rows** — instrumentation isn't recording bounces; tag as Phase 1 follow-up; proceed with Sources A-D + F.

### Do NOT halt for (these are the methodology working as designed)

- A source yielding 0 rows when the corresponding persona doesn't exist yet (e.g., Source C = 0 in week 1 of agencies)
- Persona split looking lopsided (60% M1, 30% X1, 10% M2) — honest reflection of current decision pressure
- You disagreeing with several rows during validation — that's literally what validation is for

---

## Part VII — Output format & handoff

After applying the rubric + validation, produce **ONE markdown table** in the handoff doc. Reasoning per Analytics Reporter: Notion DB tempts curation you won't sustain; ranked list loses the multipliers; markdown table renders everywhere with zero tooling tax.

### Required columns

```
| row_id | raw_quote | archetype | bucket | D# | decisions_blocked | freq | persona | $stakes | score | next_action | owner |
```

### bucket → next_action (deterministic)

| Bucket | next_action |
|---|---|
| A1, A3 | KILL |
| A2 | KILL unless paired with C2/D1/D2 on same D# |
| B1 | D9-ESCALATE |
| C1 | KILL (verify not decoration first) |
| C2 | PHASE-2-FIT |
| D1 | PHASE-2-FIT or PHASE-3-GOV |
| D2 | PHASE-1-RECON + PHASE-2-FIT |
| D3 | PHASE-2-FIT |
| E | DEEP-LINK |

### Sort order

- **Primary:** `score` DESC
- **Secondary:** bucket priority `D2, C2, D1, D3, B1, A2, E, C1, A1, A3` (process gaps + friction first — highest leverage relative to effort)
- **Tertiary:** D# ascending

### Handoff cut-line

| Band | Treatment |
|---|---|
| **score ≥24** | Next-session handoff. Top 12 named explicitly. |
| **6-23** | Backlog. In the table but not in summary. Re-scored monthly. |
| **<6** | KILL. Collapsed `<details>` block at bottom for audit. |
| **next_action = DEEP-LINK** | Always handoff regardless of score — IA decision, not build |
| **next_action = D9-ESCALATE** | Always handoff regardless of score — possible 9th decision |

### `★`-flagged rows (the synthesizer convergence signal)

The rows where BOTH UX Researcher's Q3 standup-overlap test AND Analytics Reporter's D2 bucket fire get a `★` in col L. These are the **highest-confidence high-leverage rows in the entire harvest** — they detect the same Hub-bypass-via-Tomer-as-bottleneck pattern from two independent angles. **Always handoff** regardless of score.

---

## Part VIII — When you're done, send this back

Three artifacts for the next session:

1. **Link to the filled Google Sheet** (`/SHIFT Airdrop/Persona Harvest 2026-06-06`)
2. **The prioritized gap list markdown table** (Part VII format) — paste into Slack or commit as `docs/design/2026-06-06-persona-gap-list.md`
3. **A 3-bullet note** answering:
   - Did any of the 3 stop-the-presses conditions fire?
   - Did the `★` synthesizer-convergence rule flag any rows? How many?
   - Anything surprised you?

Once you ship those three, next session resumes with Phase 2.3 (turn the prioritized gap list into Phase 2 IA features), Phase 2.4 (per-persona default landing tab), and Phase 2.5 (snapshot/export primitive for X1 — which Analytics Reporter pre-named as AR-8).

---

## Appendix — Source agent outputs

- `docs/design/agent-outputs/2026-06-06-persona-harvest-ux-checklist.md` — UX Researcher: 6 sources + capture template + validation session + bias mitigations
- `docs/design/agent-outputs/2026-06-06-persona-harvest-rubric.md` — Analytics Reporter: decision tree + scoring + archetypes + output schema

The strongest convergence between them: **UX Researcher's standup-overlap test (Q3) and Analytics Reporter's D2 process-gap bucket detect the same pattern** — Hub-bypass via you-as-bottleneck. When both fire on the same row, that's the highest-confidence signal in the entire methodology. The `★` flag rule in Part VII enforces this convergence.
