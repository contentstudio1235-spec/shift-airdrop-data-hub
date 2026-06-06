# Persona Harvest — UX Checklist (Tomer-solo, 2hr total)

**Date:** 2026-06-06
**Author:** UX Researcher agent
**Pairs with:** Analytics Reporter's categorization rubric (separate file). This checklist produces the raw rows; the rubric maps them back to D1-D8.
**Scope guard:** Output of this harvest IS the gap list. Turning gaps into features is Phase 2.3 work.

**Total budget:** 120 minutes wall-clock, Tomer-solo. Per-source time caps are non-negotiable — if a source runs over, stop and move on. The bias mitigations exist precisely because no single source is comprehensive; over-investing in one starves the others.

---

## 1. The six harvest sources (runnable subsections)

### Source A — Slack DM/channel search (25 min cap)

**Serves disproportionately:** M1, M2, X1 (all three — Slack is where ad-hoc data asks land)

**Where to look:**
- Tomer's DMs (all)
- Public channels: `#general`, `#marketing`, `#partnerships`, `#kol`, `#growth`, `#leadership` (use the names that actually exist — Slack search will autocomplete)
- Date range: **last 90 days only.** Older signal is stale given SHIFT's velocity.

**Run these exact queries** (paste verbatim into Slack search bar; Slack treats space-separated terms as OR within the basic search syntax — use the `OR` keyword and parens for clarity):

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

**Bonus filter for highest-leverage rows:** add `from:@tomer` to each query — messages Tomer *himself* sent are pre-emptive answers to questions he expected. That's gold for the verbal-standup proxy (Source F).

**Capture rule:** for each hit that is a *question* about data (not a status update, not a meme), copy the question verbatim into the capture template. Skip pure status posts. Skip duplicates from the same thread (count thread once with frequency = N replies asking variant of the same Q).

**Persona tag heuristic during capture:**
- Mentions ad spend / CTR / budget / "channel X" → M1
- Mentions a specific Twitter handle / Discord user / "who is" → M2
- Mentions "for the board" / "for the deck" / "this quarter" → X1
- Mentions a wallet address with no other context → likely M2 (whale-check) or X1 (founder vetting); mark **unknown** if unsure

---

### Source B — Google Drive crawl: hand-maintained spreadsheets (20 min cap)

**Serves disproportionately:** M1 (weekly reconciliation), X1 (board / monthly close)

**Where to look:**
- `drive.google.com/drive/my-drive` and **Shared with me**
- File types: Google Sheets only (`.xlsx` if Tomer's team also uses Excel — usually no)

**Drive search operators** (paste in Drive search bar):
1. `type:spreadsheet owner:me modified:7d` — Tomer's own active sheets
2. `type:spreadsheet sharedwithme=true modified:30d` — what others actively maintain
3. `type:spreadsheet title:KOL OR title:campaign OR title:report OR title:weekly OR title:tracker`
4. `type:spreadsheet title:holder OR title:wallet OR title:volume OR title:AUM`
5. `type:spreadsheet title:board OR title:investor OR title:quarterly` — X1 surface

**"Is this a hub-replacement spreadsheet?" — fast classifier** (apply in <30s per file):
- ✓ **YES, capture columns:** sheet has rows of users/wallets/campaigns/cohorts with computed metrics; has a "last updated" timestamp; column headers match Hub vocabulary (holders, signups, sources, AUM)
- 🟡 **Maybe:** template/blank; one-off pull from 60+ days ago; clearly imported CSV nobody touches
- ✗ **NO, skip:** finance/legal/HR; meeting notes; design briefs; one-tab "scratch math" with no recurring use

**Capture for each YES sheet:**
- File name + last modified date
- **All column headers** — these ARE the persona's mental model verbatim
- Which columns the Hub already produces (✓) vs misses (✗)
- Frequency proxy: how often is the file edited? Daily → frequency 6+; weekly → 2-5; one-shot → 1

---

### Source C — Agency inbound: paid + sponsored + KOL agency requests (15 min cap)

**Serves disproportionately:** M1 (paid agency), M2 (KOL/sponsored agencies)

**Context:** Tomer notes paid + sponsored + KOL agencies start this week. Inbound from them is the leading edge of M1/M2's question stream — even before SHIFT hires those personas internally, the agencies ARE acting in those roles.

**Where to look:**
- Gmail inbox + sent (Tomer + any shared marketing alias)
- Google Calendar last 14 days + next 14 days

**Gmail searches** (paste in Gmail search bar):
1. `from:(agency-domain.com OR kol-agency-domain.com OR paid-agency-domain.com) newer_than:30d` — substitute actual agency domains as Tomer signs them
2. `subject:(reporting OR weekly OR campaign OR creative OR brief) newer_than:30d`
3. `"can you confirm" OR "can you send" OR "do you have data" newer_than:30d`
4. `attachment:xlsx OR attachment:csv OR attachment:pdf newer_than:30d from:-(@shiftrwa.xyz)` — inbound files from outside the org are usually reporting requests or templates

**Calendar searches:**
- Search calendar titles for: `kickoff`, `weekly`, `recap`, `KOL`, `agency`, `campaign review`
- Note the **recurring meetings** — recurrence implies recurring data-prep need

**Capture rule:** for each agency thread, capture the *first data request they make* and any "btw can you also send" follow-ups. Tag M1 vs M2 by agency type. Frequency = how many threads asked the same Q.

**Special instruction:** if Tomer has NOT yet had a single inbound from an agency (week 1), mark this source `N=0` and **proceed** — it's the bias-mitigation flag for Blind Spot #2 below.

---

### Source D — Twitter/Discord/Telegram pings about data (15 min cap)

**Serves disproportionately:** M2 (relationship-driven, event-triggered), some X1

**Where to look:**
- **Twitter/X:** Tomer's notifications + DMs. Search his own DMs UI: filter by "mentions of data terms"
- **Discord:** SHIFT's server + any KOL servers Tomer is in. Use Discord search bar.
- **Telegram:** any channel Tomer is added to as the SHIFT contact

**Twitter/X searches** (in the Twitter web search bar; restrict by `from:` and `to:`):
1. `to:@tomer_handle (holder OR holders OR wallet OR whale) since:2026-03-08`
2. `to:@tomer_handle (campaign OR KOL OR creative OR ad) since:2026-03-08`
3. Tomer's own DM inbox — manual scroll, look for any data question. ~5 min cap.

**Discord searches** (per server):
1. `from:Tomer's-username` with date range 30d — Tomer's answers reveal questions
2. Server-wide search: `holder`, `whale`, `volume`, `data`, `dashboard` — last 30d

**Telegram searches:** Telegram's search is poor; do a 5-min manual scan of the 2-3 most active channels Tomer is in. Look for `@Tomer ...?` patterns.

**Capture rule:** these are the highest-signal M2 rows because they're event-triggered ("just saw this whale — who are they?"). Capture the trigger context too (e.g. "after KOL post X went live"). Trigger context goes in the "why this matters" note column.

---

### Source E — Hub access logs (10 min cap)

**Serves disproportionately:** M1 (heaviest current Hub user — paid metrics), some X1

**Critical context:** Phase 1 MR !22 just shipped `hub_sessions` + `hub_events` tables. **The instrumentation IS live now.** Tomer just runs the queries.

**Run these against the Render Postgres** (use the `psql` command from the project CLAUDE.md, OR paste into a Postgres GUI):

**Q1 — Tabs opened then closed <5s without interaction (the v2 Part VII signal: "didn't answer their question"):**

```sql
WITH tab_visits AS (
  SELECT
    session_id,
    viewer,
    properties->>'tab' AS tab,
    occurred_at,
    LEAD(occurred_at) OVER (PARTITION BY session_id ORDER BY occurred_at) AS next_event_at,
    LEAD(event_name) OVER (PARTITION BY session_id ORDER BY occurred_at) AS next_event
  FROM hub_events
  WHERE event_name = 'tab_opened'
    AND occurred_at > NOW() - INTERVAL '14 days'
)
SELECT
  tab,
  COUNT(*) AS bounce_count,
  COUNT(DISTINCT viewer) AS distinct_viewers
FROM tab_visits
WHERE next_event_at IS NOT NULL
  AND EXTRACT(EPOCH FROM (next_event_at - occurred_at)) < 5
  AND next_event = 'tab_opened'  -- left to another tab, no interaction
GROUP BY tab
ORDER BY bounce_count DESC;
```

**Q2 — Most-clicked KPI cards (what M1 actually reaches for):**

```sql
SELECT
  properties->>'card_id' AS card,
  COUNT(*) AS clicks,
  COUNT(DISTINCT viewer) AS distinct_viewers
FROM hub_events
WHERE event_name IN ('kpi_card_clicked', 'kpi_drilldown_opened')
  AND occurred_at > NOW() - INTERVAL '14 days'
GROUP BY 1
ORDER BY clicks DESC
LIMIT 20;
```

**Q3 — Most common navigation paths (where users go when they DON'T bounce):**

```sql
WITH paths AS (
  SELECT
    session_id,
    STRING_AGG(properties->>'tab', ' -> ' ORDER BY occurred_at) AS path
  FROM hub_events
  WHERE event_name = 'tab_opened'
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
- Bounced tabs (Q1) → ✗ self-serve status; one row per tab, "Question being asked" = "[implied by tab name]", "why this matters" = "users went here expecting an answer, left in <5s"
- Top KPI cards (Q2) → ✓ self-serve; these are the questions the Hub IS already answering well — capture for negative space (Tomer should NOT redesign these)
- Navigation paths (Q3) → if a path is `Pulse → Funnels → Pulse → Sources`, the user is hunting — capture as "Question hunt across 3+ tabs" with persona tag based on which tabs

**Note on schema:** if MR !22's column names differ from `event_name`/`properties`/`viewer` — adjust query. The intent is what matters: bounce <5s, click counts, path concat.

---

### Source F — Tomer's verbal-standup-coverage self-report (15 min cap)

**Serves disproportionately:** X1 (founder's lens), M1 (most teamwide standup content is paid/growth)

**Why this proxy works:** what Tomer pre-emptively covers in standups is precisely the set of questions he knows the team would otherwise ask. It's the inverse of Source A — Slack captures the unanswered, standup captures the pre-answered.

**Two passes:**

**Pass 1 — Documented record (5 min):**
- Notion / Google Docs search: `weekly`, `standup`, `Monday`, `update`, `recap` — last 60 days
- Calendar: find recurring standup meetings; check notes attached
- Recent recordings: if Tomer records Loom/Granola for standup, list the last 4
- Capture every recurring data point Tomer reports verbally — verbatim phrasing

**Pass 2 — Forced self-report (10 min):**
- Tomer sits down, opens the capture template, and answers these 5 prompts in writing. **Do not skip — even if Pass 1 yielded a lot.** This catches the "I cover this because I always have to" muscle-memory items that don't show up in docs.

1. **"What 5 numbers do I say in every Monday standup?"** (write the numbers + the source you mentally pull from)
2. **"What 3 anomalies have I flagged for the team in the last 30 days?"** (write each anomaly + how you found it)
3. **"What questions does the team ask me in standup that I have to look up live?"** (write the questions even if you've never been able to answer fast)
4. **"What did I cover this week that I would NOT have covered 4 weeks ago?"** (catches the moving frontier as paid spend ramps)
5. **"What number am I afraid to be wrong about in front of the team?"** (the trust-floor question; flags load-bearing Phase 1 metrics)

**Capture rule:** each answer becomes 1-5 rows. Persona = X1 for #1, #2, #5; M1 for #4; varies for #3.

---

## 2. Capture template — single Google Sheet

**Format choice:** Google Sheet, single tab, named `Persona Harvest 2026-06-06`. Chose Sheet over Notion/markdown because: (a) Analytics Reporter's rubric will programmatically tag rows — needs structured cells, not prose; (b) Tomer has Drive open already for Source B; (c) frequency/status columns benefit from filter views; (d) the 20-min validation session needs sort-by-frequency in real time.

**Columns (exact order, fill left-to-right as you go):**

| Col | Header | Type | Required | Values |
|-----|--------|------|----------|--------|
| A | `row_id` | text | auto | `HARVEST-001`, `HARVEST-002`, ... (sequential) |
| B | `source` | dropdown | yes | `slack`, `drive_sheet`, `agency`, `social_ping`, `hub_log`, `standup` |
| C | `persona` | dropdown | yes | `M1`, `M2`, `X1`, `unknown` |
| D | `question_verbatim` | text | yes | operator's exact words (or your paraphrase if from Hub logs / your own standup) |
| E | `frequency` | dropdown | yes | `1x`, `2-5x`, `6+` |
| F | `date_range` | text | yes | `2026-04-10` or `2026-04-10 to 2026-05-20` |
| G | `why_it_matters` | text | yes | 1-line free text — trigger / context / what they were trying to decide |
| H | `self_serve_status` | dropdown | yes | `✓ in-hub`, `🟡 multi-step`, `✗ needs-tomer-or-external` |
| I | `current_workaround` | text | optional | "asks Tomer", "pulls from GA4", "manual SQL", etc. |
| J | `decision_tag` | text | leave blank | **Reserved for Analytics Reporter's rubric — D1..D8 or `decoration` or `new-decision`** |
| K | `validation_status` | dropdown | leave blank | `unreviewed` / `confirmed` / `demoted` / `killed` / `promoted` — filled during 20-min Tomer session |
| L | `notes` | text | optional | anything else |

**Header row protection:** freeze row 1, freeze col A, add data validation dropdowns for B/C/E/H/K so Tomer can't typo categories.

**Pre-populate cell L1 with this rule reminder:** *"Capture the question verbatim. Don't reword. Don't summarize. The point is to preserve the operator's mental model, not yours."*

**Target row count for the 2hr harvest:** 40-80 rows. <30 → you skipped a source or under-captured Slack. >120 → you captured non-questions (status updates, opinions); re-filter to questions only before the validation session.

---

## 3. 20-minute Tomer validation session — structured script

**Run within 24 hours of completing the harvest.** Otherwise Tomer's memory of context decays and validation drifts to opinion.

### Pre-session (5 min Tomer prep, asynchronous, day before)

Send Tomer the Sheet link + this exact message:

> *"Harvest done. ~[N] rows. Tagged with Analytics Reporter's decision rubric in col J. Open the Sheet and apply filter: Frequency = `6+` OR Self-Serve Status = `✗`. That's the validation set (~15-25 rows). Tomorrow we'll go through them in 20 min — I'll ask 4 questions. Don't pre-fill col K; we do that live."*

Filter pre-config: save a filter view called `validation-set` with `frequency=6+ OR self_serve_status=✗`, sorted by `frequency` desc then `decision_tag` asc.

### During session (20 min, 5 min per question, scripted)

**Q1 (5 min) — Frequency reality check:**
> *"Top 5 rows by frequency are [list 5 verbatim]. For each, true or false: this is still being asked weekly. If false, what changed?"*

Why: Slack search captures the past 90 days. Some questions died because Tomer answered them once and changed something. Kill those rows.

**Q2 (5 min) — Persona assignment audit:**
> *"I tagged [N] rows as `unknown` persona. Top 3 are [list 3]. Who's actually asking?"*

Why: persona ambiguity bleeds into Phase 2 IA work. Force a decision now or kill the row.

**Q3 (5 min) — Standup overlap test:**
> *"You self-reported these 5 things from standup [list 5 from Source F]. For each, what specific question is the team NOT asking precisely because you cover it? Is the question still open if you stopped covering it?"*

Why: this is the v2 Part VII insight — Tomer's verbal coverage is a proxy for questions the team has. If a question would NOT be re-asked when Tomer stops covering it, the Hub doesn't need to answer it. **Kill those rows** even though they look high-frequency.

**Q4 (5 min) — What's missing:**
> *"Scan the Sheet for 60 seconds. What question that you KNOW marketing/management will ask in the next 30 days is NOT on this list? Add up to 3 rows live."*

Why: every harvest methodology has blind spots. This is the explicit override for them.

### Post-session: harvest list update (10 min, Tomer-solo right after)

Walk the rows. Fill col K (`validation_status`) per these rules:

| Q result | Action | col K value |
|----------|--------|-------------|
| Q1: true (still asked) | keep | `confirmed` |
| Q1: false + reason was permanent change | remove from gap list | `killed` |
| Q1: false + reason was temporary | keep but de-prioritize | `demoted` |
| Q2: persona resolved | update col C, keep | `confirmed` |
| Q2: persona cannot be resolved after thought | flag for re-capture next round | `demoted` |
| Q3: question reopens if Tomer stops covering | keep at current priority | `confirmed` |
| Q3: question dies if Tomer stops covering | mark and exclude from Phase 2 | `killed` |
| Q4: new rows added | tag persona, frequency=`unknown-emerging`, freq=`2-5x` placeholder | `promoted` |

**Outputs from the validation session** (zero new artifacts — just the same Sheet with col K filled):
- Confirmed rows feed Analytics Reporter's categorization rubric for Phase 2 IA work
- Killed rows go in a separate tab `killed-with-reason` for the audit trail (Workflow 2 one-off ledger)
- Promoted rows trigger one more mini-harvest pass for any source not yet covered (typically Source D or E since they're event-triggered)

---

## 4. Bias mitigations — known blind spots + halts

### Blind spot 1 — Slack undersamples silent users

**The bias:** People who don't ask in Slack don't show up in Source A. The new agency contractor who doesn't know SHIFT's Slack norms, the management-side reviewer who treats Slack as too informal for data Qs, and any silent power-user are all invisible.

**Mitigation:** Source B (Drive crawl) is the explicit counterweight. Silent users **maintain spreadsheets** instead of asking. If Source B returns <5 hand-maintained sheets AND M1/M2/X1 personas all exist as employees → halt and add a 15-min "what's the spreadsheet you maintain?" async ask to each persona before proceeding to validation.

### Blind spot 2 — Behavioral proxies oversample what the Hub is currently shaped for

**The bias:** Source E (Hub logs) can only see what users do *given the current Hub IA.* If the Hub has no KOL drill-down, the logs will never show "user wanted KOL drill-down." Source E confirms existing patterns; it cannot reveal absent ones.

**Mitigation:** weight Source D (social pings) and Source C (agency inbound) more heavily for M2-flavored questions. These sources capture intent **before** it routes through the Hub. **Concretely:** during the validation session, if ≥60% of confirmed rows came from Source E, halt the validation and re-run a 15-min Source D + C pass focused only on M2 triggers.

### Blind spot 3 — Tomer's self-report is the noisiest source

**The bias:** Source F (verbal-standup-coverage) depends on Tomer's memory and self-honesty. He will over-report what he wishes he covered and under-report habitual answers he gives without thinking. Confirmation bias is high.

**Mitigation:** the Pass 1 documented-record check before the forced self-report (Source F prompt 1 vs documented standup notes) gives ground truth. **Discrepancy rule:** if Pass 1 yields 0 documented standup artifacts AND Pass 2 yields ≥10 self-reported items, halt — Tomer is filling from imagination, not memory. Replace Source F with a single recorded standup that week and harvest from the transcript next round.

### Stop-the-presses condition (single halt)

**Halt and re-plan if any of:**

1. Total harvest produces **<20 rows** after 2 hours — the methodology isn't working for this stage of SHIFT's growth (likely M1/M2 don't yet exist as functions); revisit in 2 weeks with agency inbound (Source C) as the dominant source.
2. **>70% of rows are persona = `unknown`** even after the validation session Q2 — the personas are not yet differentiable; pause Phase 2 IA work until the first M1 and M2 contributors actually exist (employees or agencies), then re-harvest.
3. The hub-logs Q1 query (Source E, the bounce-tab signal) **returns zero rows** — instrumentation isn't actually recording bounces; this means MR !22 didn't capture the event we need; tag this for Phase 1 follow-up and proceed using only Sources A-D + F (Source E gets re-run after instrumentation fix).

**Do NOT halt for** (these are the methodology working as designed):
- A source yielding 0 rows when the corresponding persona doesn't exist yet (e.g. Source C = 0 in week 1 of agencies)
- The persona split looking lopsided (60% M1, 30% X1, 10% M2) — that's an honest reflection of current decision pressure, not a bug
- Tomer disagreeing with several rows during validation — that's literally what the validation session is for

---

## File location

Save the harvest Sheet to `Tomer's Google Drive → /SHIFT Airdrop/Persona Harvest 2026-06-06`. Link it from the bottom of `docs/design/2026-06-06-hub-audit-plan-v2.md` Part IX as the artifact backing the "within 1 week" step.
