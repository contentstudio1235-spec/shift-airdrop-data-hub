# Data Hub Audit Plan — Daily Use by Marketing + Management

**Date:** 2026-06-06
**Status:** Draft plan, awaiting Tomer's intake answers (section B) before execution
**Skills applied:**
- `~/.claude/skills/data-analytics-skills/05-stakeholder-communication/stakeholder-requirements-gathering/SKILL.md`
- `~/.claude/skills/data-analytics-skills/04-data-storytelling-visualization/dashboard-specification/SKILL.md`
- `~/.claude/skills/data-analytics-skills/01-data-quality-validation/metric-reconciliation/SKILL.md`
- `~/.claude/skills/data-analytics-skills/05-stakeholder-communication/analysis-qa-checklist/SKILL.md`
- `~/.claude/skills/data-analytics-skills/06-workflow-optimization/peer-review-template/SKILL.md`

---

## A — Why this exists

The Data Hub was designed for ONE audience: Tomer, the founder/operator. Today's check-in (the listing volume row-multiplication bug — 7× inflation across every stitched user) proves that trust is fragile. Numbers were wrong on the most-visited tab. That's tolerable when the only user is the person who can debug it. It's not tolerable when daily decisions in marketing standups and management reviews flow through the same screens.

Shifting to multi-team daily use changes 5 things:

1. **Trust threshold rises.** A single wrong number wastes everyone's meeting. Pre-row-multiplication, Tomer could spot a weird value and curl the API to verify. Marketing can't and shouldn't.
2. **Question fit splits.** Marketing's daily question ("which channel converted yesterday?") is different from management's ("are we hitting the quarterly cohort target?"). One IA can't optimally serve both.
3. **Speed becomes a feature.** A page that takes 8 seconds to load is unusable when a manager opens it during a meeting and waits in front of 8 people.
4. **Self-serve is mandatory.** Anything that requires "go ask Tomer" is a tax on Tomer + a delay for the team. Marketing should be able to answer ~80% of their own questions without engineering.
5. **Governance emerges.** Who owns the hub? Who approves changes? Who's responsible when a number is wrong? Today: Tomer (implicit). Multi-team needs explicit ownership.

This plan audits the Hub against those 5 dimensions and produces a phased fix list.

---

## B — Intake (before audit execution — Tomer to answer)

Per the `stakeholder-requirements-gathering` skill, the first 30 minutes prevent days of rework. Six questions to confirm before the audit starts:

| # | Question | Why it matters |
|---|---|---|
| B1 | **Marketing team size + roles?** 1 marketer? Agency? 3 in-house + 2 agency contractors? | Determines per-team views, governance burden, training need |
| B2 | **Management team — who, how often, what decisions?** Daily standup? Weekly review? Quarterly board? | Sets refresh cadence + level of detail per audience |
| B3 | **PII / privacy boundary** — does management see full wallet addresses + user counts, or rolled-up aggregates? Does marketing see individual user names? | Permissioning blocks downstream |
| B4 | **Top 3 daily questions for each audience.** What does marketing ask first thing Monday? What does management need at 5pm Friday? | Drives the single-question test per tab |
| B5 | **Existing process** — is anyone already doing this work in spreadsheets / Notion / asking Tomer in Slack? What's the failure mode being replaced? | Defines acceptance criteria |
| B6 | **Hard constraints** — does anyone need this on mobile? Read-only login from agency? Pre-built exports for slides? | Scope guardrails |

**These 6 answers gate the audit.** Without them I'm guessing what to optimize for, and the row-multiplication mess is what guessing produces.

---

## C — Audit dimensions

### C.1 — Trust audit (`metric-reconciliation` skill applied at scale)

The discipline: for EVERY KPI shown anywhere in the Hub, identify its 2+ source-of-truth derivations (SQL query, computed metric, displayed cell). Compare them. Within the variance threshold for the metric class. Top 5 discrepancies become the trust backlog.

**Scope** (every KPI rendered on every tab — counted, not estimated):

| Tab | KPI count to audit (rough) |
|---|---|
| Pulse | 6 KPI cards + 30d sparkline + signup bar + whale feed + anomalies = ~10 distinct metrics |
| Funnels | 5 stages × per-stage conversion + leak callout + revenue impact = ~7 |
| Source Attribution | 3 hero KPIs + Channels card + Sankey nodes/links + KOL leaderboard 8 cols + Whale Watch = ~25 |
| Trader Cohorts | 12 cohorts × 8 cols + summary 3 cards + heatmap = ~100 cells |
| Users | 11-col list × N rows + IdentityCard 4 cards × 10 cells = ~20 distinct metrics |
| Engineering / UTM | violations / campaigns / approved values = ~5 |

**~150 distinct displayed numbers across the hub.** Audit each:

1. Identify the SQL that produces it
2. Identify the API field it lands in
3. Identify the frontend display
4. Compare to at least 1 alternative source (different endpoint, different SQL, manual calc against the same DB)
5. Variance > class threshold? → trust backlog item

**Variance thresholds (skill defaults):**
- Financial metrics (volume, AUM, revenue): <0.1%
- User counts (registered, holders, activations): <2%
- Behavioral metrics (clicks, page views): <5%
- Percentages (stitch %, conversion %): ≤0.5pp

**This is where today's row-multiplication bug would have been caught at audit time, not customer time.** Estimate: 1 day of focused work for the full sweep with 1 Data Engineer agent + reconciliation tests added as we go.

### C.2 — Fit audit per audience (`dashboard-specification` skill applied per persona)

For each audience (marketing, management), and each tab, run the single-question test:

> "When [audience] opens [tab], the question they're trying to answer is: ______. After 10 seconds on this tab, they can act on the answer."

Score 1-5 per (audience × tab) pair. Anything below 3 is a candidate for either:
- Re-arrangement (their Level-1 metric is buried at Level-3 today)
- Filter/preset (their default view should be different)
- Removal (this tab doesn't serve them — Engineering toggle level)

**Output:** matrix of (audience × tab) with score + recommendation per cell. 30 cells (5 tabs × 2 audiences × 3 evaluation criteria).

### C.3 — Speed audit

For each tab + each KPI fetch endpoint, measure:
- First contentful paint
- Time-to-interactive
- Largest contentful paint
- API response time (p50, p95)
- Reload cadence (auto-refresh interval)

**Targets** (daily-meeting context):
- First contentful paint <1.5s
- All KPI cards populated <3s
- Full tab interactive <5s
- API p95 <500ms for KPI endpoints, <2s for heavy aggregates

Cohorts heatmap and Sankey are the most likely speed offenders. Pulse is the most opened tab — its p95 matters most.

**Output:** tab-by-tab timing table + 3-5 specific optimizations (likely candidates: missing indexes, N+1 query patterns, JSON serialization overhead, no client-side cache).

### C.4 — Self-serve audit

Which questions, today, require "ask Tomer in Slack"? Examples to evaluate:
- "Which KOL drove the most converted holders last week?" → can be answered today? probably yes via KOL Leaderboard
- "Which paid X ad creative had the lowest cost per holder?" → no, no cost data in hub
- "How many users from the @cobie campaign held >7 days?" → no, no cross-tab filter
- "Show me everyone who signed up in the last 24h from `utm_source=hackernoon`" → yes via Users tab social filter (sort of)

Mark each top-N question as: ✓ self-serve / 🟡 self-serve with effort (multi-step) / ✗ requires engineering. Anything >20% in the ✗ column is a self-serve gap.

**Output:** list of top 10 questions per audience + serve-mode + fix needed for the gaps.

### C.5 — Governance audit

Today's state (implicit):
- Owner: Tomer
- Change review: code review by Claude/agents
- Audit cadence: ad-hoc when something breaks
- Exception process: PR to docs/

Multi-team needs (explicit):
- **Owner** — Tomer initially, escalates to a named PM/analyst when team scales beyond 5
- **Change review** — every PR that adds/modifies a KPI requires a peer-review pass per `peer-review-template` skill + a reconciliation test
- **Audit cadence** — monthly trust audit (run section C.1 selectively), quarterly fit re-audit (C.2)
- **Exception process** — adding a new metric → PR to a new `docs/design/metric-definitions.md` (the R2 follow-up that's been deferred)
- **Trust incidents** — when a wrong number ships (today's case), file an incident note: what was wrong, who caught it, root cause, prevention

**Output:** 1-page governance doc to live at `docs/design/hub-governance.md`.

---

## D — Recommended phased execution

| Phase | Work | Effort | Audience |
|---|---|---|---|
| **A** | Intake interview — Tomer's answers to B1-B6 | 30 min | Tomer |
| **B** | Trust audit (C.1) on the 5 highest-traffic KPIs first — Pulse 6 cards, Funnels conversion %s, top KOL on Sources | 1 day | 1 Data Engineer agent |
| **C** | Fit audit (C.2) per audience, focused on the 3 most-opened tabs | 1 day | 1 UX Researcher + 1 Frontend Developer agent |
| **D** | Speed audit (C.3) with Playwright timing + Render p95 logs | 0.5 day | 1 Performance agent |
| **E** | Self-serve audit (C.4) using B4 questions | 0.5 day | review + 1 Frontend Developer for gap analysis |
| **F** | Governance doc draft (C.5) + metric-definitions appendix | 0.5 day | Tomer + Claude |
| **G** | Consolidated recommendations report + prioritized 3-phase fix plan (small/med/large bucketing) | 0.5 day | Claude |

**Total to ship the audit report: 4 days of focused work**, ~3 days agent time, 1 day Tomer's review + interview + sign-off.

After the report, fixes ship in their own MRs sequenced by impact × effort.

---

## E — What the audit will likely uncover (predictions to validate)

Hypotheses to test:

1. **Trust gaps:** Other row-multiplication or JOIN-cardinality bugs in `getProfileWithLinks` lifetimeStats (XP via `users.total_xp` JOIN), in `kolService` (referrer leaderboard might double-count users with multiple identities), and in Pulse's `activeHolders.delta24h` approximation (already documented as approximate, but the magnitude of the approximation hasn't been quantified).

2. **Fit gaps:** Marketing's first question is probably channel-attribution-by-day; today they have to click through Source Attribution → Channels card → mental math. Should be Level-1 on a marketing-default view.

3. **Speed gaps:** Cohorts heatmap renders 144 cells with per-cell color computation — could be slow on lower-end hardware. Whale Watch SSE stream may have connection issues if the team uses corporate VPNs.

4. **Self-serve gaps:** "Pull a list of users who signed up via campaign X" requires URL hacking (`?source=...`) because the Users tab filter doesn't have a `utm_campaign` filter. Easy add.

5. **Governance gaps:** No `metric-definitions.md` yet (the R2 deferred from the skills audit). Operator can't onboard a marketer without a glossary.

---

## F — Open questions for Tomer beyond B1-B6

Specific to this audit, not the broader product:

1. Is there a budget to add a paid metric-monitoring tool (e.g. Sentry-style for data quality), or should reconciliation tests live entirely inside the existing test suite?
2. When marketing and management disagree on a number ("you said 16k users, the slide said 17k"), what's the escalation path? Today: ping Tomer. Future: ?
3. Should the audit run on a public read-only mirror of prod data, or directly against prod?
4. Are agency contractors allowed in the Engineering view (UTM Governance lives there)?
5. What's the appetite for a v2 UI split into "marketing view" + "exec view" + "ops view" with different defaults — vs a single shared view with smart presets?

---

## G — Next step

If approved, the immediate next action is: **Tomer answers B1-B6** (~30 min), and I dispatch the Data Engineer agent for the trust audit on the 5 highest-traffic KPIs. Each subsequent phase is a clean handoff from the prior.

If Tomer wants to compress: skip the formal interview, give me 3 sentences each on (marketing daily questions, management daily questions, hardest known data dispute), and the audit proceeds with assumption flags. Lower confidence, faster turnaround.

Either way, **the trust audit (C.1) is the first phase that should ship regardless of B answers** — finding the next row-multiplication bug is independent of audience.
