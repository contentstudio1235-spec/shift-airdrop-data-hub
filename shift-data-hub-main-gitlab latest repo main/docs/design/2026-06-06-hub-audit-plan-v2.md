# Data Hub Audit Plan — v2 (Marketing + Management Daily Use)

**Date:** 2026-06-06
**Status:** Synthesized from 4 Agency Agent outputs. v1-DRAFT-SOLO superseded.
**Author:** Claude synthesizing — content authored by Product Manager + UX Researcher + Analytics Reporter + Workflow Architect agents (raw outputs in `docs/design/agent-outputs/`)
**Skill provenance:** dashboard-specification, metric-reconciliation, stakeholder-requirements-gathering, analysis-qa-checklist, peer-review-template

---

## Part I — Strategic Frame

**This is not a dashboard cleanup.** It is de-risking SHIFT's first paid-acquisition quarter by ensuring the people spending money can see what's working in time to act on it. Paid X ads, sponsored content, and KOL deals ship this week. Today's row-multiplication incident (7× inflated user volume on the most-visited tab, caught only because the operator eyeballs numbers) proved the trust ceiling is exactly one person high. Tomorrow that ceiling has to hold a marketing standup.

Three predictable failures land within 30 days if we do nothing:
1. Marketing makes a budget call on wrong numbers — over-invests in a dead channel OR kills a live one.
2. Management starts maintaining a parallel spreadsheet "to be safe," and the Hub becomes irrelevant within a quarter.
3. Every data question routes through Tomer, who becomes the bottleneck on a 5-person org's daily decisions.

**The business outcome we're buying:** decision velocity without decision risk during the most expensive acquisition window the company has ever run.

### Two reframes that broke v1

**Reframe 1 — Audit unit is decisions, not displayed numbers.** v1 said "audit ~150 cells." That's grep-spraying for bugs: thorough, expensive, low-yield. The right unit is the 8 concrete decisions marketing + management will actually make, each with a numeric threshold and an action. Trust budget is finite; spend it on the metrics where being wrong costs money.

**Reframe 2 — Three personas, not two.** "Marketing" contains two materially different decision contexts that cannot be collapsed: the *Paid Acquisition Marketer* (aggregate, ratio-driven, 60-second glances, acts on budget) and the *Community/KOL Manager* (individual-name-driven, event-triggered, acts on relationships). Their primary surfaces are *opposite shaped* (KPI grids vs IdentityCard drill-downs). Collapsing them into one persona produces an IA that serves neither.

---

## Part II — The Three Personas

### M1 — Paid Acquisition Marketer ("channel optimizer")

- **Decision context:** Pre-launch baseline → 24-72h "is this working?" → Friday reconciliation against ad-platform spend.
- **Pressure:** 60-90s glances 4-6× per day during a live campaign; 30-min deep-dive Friday.
- **Acts directly:** Kills/scales budgets in ad platforms based on Hub numbers. Hub → spend decision within hours.
- **Failure cost:** $5-50K of wasted ad spend, discovered 2-4 weeks later when ad-platform reconciliation disagrees with Hub. Permanent loss of trust.
- **Adjacent competitor tools:** Twitter Ads Manager (CTR/CPM truth), Google Ads, GA4 native (sessions truth), spreadsheet pulling CSV from all three.
- **Hub's unique value to M1:** the *only* place tying paid spend → on-chain holding.

### M2 — Community / KOL Manager ("relationship operator")

- **Decision context:** KOL just posted ("did their followers convert?") → whale appeared in Discord/Telegram ("who is this?") → pre-KOL outreach call ("show me who from their audience is already in").
- **Pressure:** 5-10min sessions, event-triggered (not scheduled).
- **Acts directly:** Sends DMs, allocates KOL retainers, decides VIP perks. Reputational damage > financial.
- **Failure cost:** Cold-DMs a whale who's already a holder = embarrassment + trust loss. Pays a KOL who drove 0 holders.
- **Adjacent competitor tools:** Twitter/X native, Snag dashboard, Telegram/Discord member lists, manual Solscan lookups.
- **Hub's unique value to M2:** identity stitch (wallet ↔ Twitter ↔ Snag) in one place. Entry surface is the **KOL Leaderboard**, not Pulse.

### X1 — Founder/Exec Reviewer

- **Decision context:** Monday 9am week-prior review → Friday 4pm week-just-ended → monthly board prep.
- **Pressure:** 5-15min Mon/Fri; 1-2hrs monthly close.
- **Acts indirectly (relays):** translates Hub → Slack post, slide, 1:1. Every external number becomes a contract.
- **Failure cost:** Wrong number in a board slide. Discovered weeks later. Forces "we have to recompute" email that erodes founder credibility.
- **Adjacent tools:** spreadsheets (perennial truth-of-record for narrative), Snag dashboard, last-week's Slack posts.
- **Hub's unique value to X1:** AUM + holder cohorts + WoW trend in one screen that doesn't require Tomer to assemble. Replaces the Slack-post-from-Tomer ritual, not the spreadsheet.

### Daily-journey friction summary (current Hub, by persona)

Every persona's weekly review currently requires **3+ tab traversal to answer one question.** The Hub's IA is decomposed by data model (Pulse=KPIs, Funnels=conversion, Sources=attribution…) when it should be at least partially decomposed by **persona job-to-be-done** (M1's weekly review, M2's KOL drilldown, X1's snapshot). The Engineering gear is the only persona-shaped affordance in the entire Hub today.

**M1's biggest gap:** Hub gives the holders numerator but not the spend denominator. Cost-per-holder is the actual question.
**M2's biggest gap:** KOL Leaderboard has no drill-down. The most valuable click in the Hub is missing.
**X1's biggest gap:** No snapshot/export primitive. Friday output today is a screenshot.

---

## Part III — The Eight Decisions

The Hub exists to support these eight. Anything else is decoration.

| # | Decision | Decider | Cadence | Threshold | Action |
|---|---|---|---|---|---|
| **D1** | Cut / scale a KOL or paid channel | Marketing Lead | Weekly (Mon AM) | 7d holder-rate <3% AND ≥30 attributed signups → cut. ≥6% AND ≥50 → 2× budget. | Pause/reassign in ad platform |
| **D2** | Trigger re-engagement push to a cohort | Marketing Lead | Weekly | Week-4 retention <25% for cohort ≥100 signups | Email + Snag XP boost to cohort wallets |
| **D3** | Fix the worst funnel leak this sprint | Founder + Eng | Bi-weekly | Stage with largest revenue impact AND WoW ratio dropped ≥3pp | File ticket, assign capacity |
| **D4** | Confirm/deny anomaly (real vs glitch) | Founder | Daily AM scan | Any red-tier anomaly (stitch ≥5pp drop, whale ≥3σ surge, direct ≥2× 7d-median) | Reconciliation playbook → escalate only after pass |
| **D5** | High-touch concierge convo with a whale candidate | Founder/BD | Daily | New wallet opens ≥$5k OR cumulative ≥$25k AND any social link present | DM via linked channel, log in CRM |
| **D6** | Approve new UTM campaign / reject violator | Marketing Lead | On-demand (≤24h SLA) | Campaign not in approved list OR malformed source/medium pair | Add to approved list OR reject + notify |
| **D7** | Greenlight / kill token series based on cohort traction | Founder | Monthly | Cohort lifetimeVolume / signup < $X for 2 consecutive cohorts on same asset | Decision memo on listing continuation |
| **D8** | Brief management on quarterly health | Founder | Quarterly | Reporting (no threshold) | Snapshot 6 numbers: registered, holders, AUM, 30d AUM Δ, blended CAC-by-source, retention curve |

### Decoration to retire from Level-1 surfaces

These drive zero decisions and currently consume hero real estate:

- **`stitchPct`** on Pulse and per-cohort — engineering hygiene metric. Move to Engineering as an SLO. (D4 anomaly stays.)
- **`openWhalesCount (Δ24h)`** — no one acts on the *count.* They act on individual whales via D5. Demote to Whale Watch context, kill from Pulse hero.
- **`activations24h`** on Pulse — redundant with the funnel.
- **Whale Origin Sankey** — high cognitive load, low decision support. Kill or demote to Diagnostics.
- **8-column KOL leaderboard** — D1 needs 3 columns (source, 7d signups, 7d holder-rate). Collapse rest to expandable detail.

### High-leverage metrics (load-bearing for multiple decisions)

These are the trust-priority list:
- `holderRate` per source — D1, D7, D8 (indirect)
- `lifetimeVolumeUSD` per user + per cohort — D5, D7, D8 *(the metric that just shipped the 7× bug)*
- Funnel stage counts — D3, D8
- Signups by source (24h/7d) — D1, D4 anomaly, D8

---

## Part IV — The Three Workflows

Trust isn't a property of the system; it's a property of the workflows around the system. Three trees must exist before marketing/management use the Hub daily.

### Workflow 1 — "Wrong number"

**The bottleneck is the discovery edge, not the fix edge.** The row-multiplication bug was fixable in <2h once seen; it lived 24h+ because no in-Hub flagging affordance existed and no Slack channel surfaced the wrongness.

Nodes (abbreviated; full tree in `agent-outputs/2026-06-06-workflow-architect-angle.md`):

1. **Discovery** — every numeric cell gets a flag affordance on hover. <30s from notice to queue. Pre-fills tab/metric/value/asOf + viewer.
2. **Triage** — rotating owner. Three branches: viewer-wrong / data-delayed / Hub-wrong. <2 business hours.
3. **Incident open** — banner replaces value on affected cell + ping to `#hub-incidents`. <5 min after incident-open. P0 = default-tab Level-1.
4. **Diagnose & fix** — existing engineering chain (Agency Agents → Code Reviewer → MR → deploy). P0: deployed <24h. Tomer-async wait is the dominant latency.
5. **Verify** — diff old API vs new vs source-of-record. <30 min post-deploy.
6. **Communication closure** — Slack post in same channel + reply on original flag thread + 7-day "fixed {ts}" annotation on the cell.
7. **Audit trail ledger** — one row per incident. Visible in monthly review.
8. **Pattern review (monthly)** — calendar-scheduled. Repeated root-cause classes → prevention tickets.
9. **Prevention** — CI reconciliation test that fails the build if class re-emerges. Incident cannot close Closed-permanent without a prevention ticket linked.

### Workflow 2 — "Marketing needs a new metric"

**The BRANCH-B exit edge is what keeps the Hub from becoming a graveyard of half-used dashboards.** Without an explicit "this is a one-off, here's the answer, it does NOT become a Hub feature" path, every request becomes a feature, backlog explodes.

Nodes (abbreviated):

1. **Intake** — one channel only (#hub-requests OR Notion form). Not DMs to Tomer.
2. **Triage** — same owner as workflow 1. Four branches: already-exists / one-off pull / feature request / out-of-scope.
3. **Spec** (feature branch only) — one-page: formula, source, IA placement, acceptance criteria, **reconciliation test definition.** Signed off by requester.
4. **Implementation** — existing engineering chain. PR cannot merge without the reconciliation test attached.
5. **QA + acceptance** — original requester confirms.
6. **Announcement** — `#hub-announcements` (separate from incidents to keep noise distinct).
7. **One-off ledger** — appended for BRANCH-B exits. Monthly review: if asked 3+ times, reopens as a feature candidate.

### Workflow 3 — "Management vs marketing disagree on a number"

**The arbiter table must exist BEFORE the first disagreement, not after.** If the synthesis ships without a per-metric-class arbiter assignment, the first disagreement is resolved by social authority, not data authority, and Hub-as-source-of-truth dies in that single meeting.

Nodes (abbreviated):

1. **Detection** — pre-agreed rule: material to decision → pause; directional → proceed and file async.
2. **Arbiter lookup** — pre-decided arbiter table per metric class (see RACI). <60s. NOT a discussion.
3. **Arbiter run** — canonical query against source of record. In-meeting <10 min for Postgres/chain; async <2h for GA4/Snag.
4. **Resolution branches** — Hub-was-right / Management-was-right (→ workflow 1 as P0) / both-wrong-different-definitions (→ workflow 2 as feature).
5. **Loser's number cleanup** — fix the source artifact (deck template, saved query, scheduled email), not just one slide.
6. **Political de-risk** — founder/PM explicitly normalizes the process in the room: "we have a process, the arbiter is X, we are not relitigating."

---

## Part V — Plan: Three Phases

Sequence matters. Trust → Fit → Governance is the only order that compounds. Fit before Trust is lipstick on a wrong number. Governance before Fit governs the wrong thing.

### Phase 1 — Earn the right to be opened (Trust Floor)

**Outcome:** Marketing and management can open the Hub Monday morning without Tomer pre-flighting.

**Success criteria:**
- Zero P0 data-correctness incidents during a 2-week internal soak period.
- Every Level-1 number on the default tab has a documented derivation + a CI reconciliation test that fails if the number drifts beyond its variance threshold.
- "Last validated" timestamp visible on the highest-traffic tab.

**Scope (decision-weighted, NOT cell-weighted):**
1. Audit the 10 high-leverage metrics from Part VI within 1 week.
2. Add reconciliation tests for each — fail-on-deploy.
3. Ship the discovery edge (Workflow 1 NODE 1): in-Hub "flag this number" affordance on every numeric cell.
4. Stand up `#hub-incidents` + incident-open banner (Workflow 1 NODE 3).
5. Self-instrument the Hub (telemetry): hub-sessions-per-user, time-to-answer, tab-open-bounce-rate. PM's leading indicators depend on this.

**Dependencies:** None. Independent of audience research. Runs in parallel with Phase 2 discovery.
**Effort:** M (engineering-heavy but scoped — top 10 metrics, not all 150).
**Risk if skipped:** The next row-multiplication ships to a marketer in a meeting. Trust lost in one incident takes a quarter to rebuild. **Non-negotiable.**

### Phase 2 — Make it answer the right question for the right person (Fit)

**Outcome:** M1 can answer "what did our paid spend deliver yesterday, by source?" in <30s without asking Tomer. X1 can answer "are we on cohort target this quarter?" in <30s.

**Success criteria:**
- 100% of marketing's top-5 daily questions are self-serve.
- 100% of management's top-3 weekly questions are self-serve.
- Each persona's default landing tab answers their #1 question above the fold.
- Hub session telemetry: marketing reaches answer in ≤2 clicks for ≥80% of sessions.

**Scope:**
1. Persona interviews (UX research methodology in Part VII — proxy-driven, lightweight Tomer ask).
2. Kill the GA4-mirror tab. Replace with deep-links + the joins the Hub uniquely produces. (See Part VII decision tree.)
3. Wire drill-downs that close M2's biggest gap: KOL Leaderboard row click → Users tab pre-filtered by source.
4. Per-persona default-landing-tab via URL parameter or admin role.
5. Snapshot/export primitive for X1 (Monday & Friday digest, board-prep CSV).
6. Retire the decoration KPIs identified in Part III from Level-1 surfaces.

**Dependencies:** Phase 1 trust floor must be stable. Persona interviews can start in parallel with Phase 1.
**Effort:** L (per-persona views + currently-buried metrics surfaced).
**Risk if skipped:** Users open the Hub once, can't find their answer, never return. Adoption dies silently.

### Phase 3 — Make it survive being shared (Governance + Self-serve)

**Outcome:** Marketing can onboard a new agency contributor in <30 min from documentation alone. Management can present a Hub screen in a board meeting and answer "where does that number come from?" without calling Tomer.

**Success criteria:**
- Published metric glossary covers 100% of Level-1 KPIs (definition, SQL, refresh cadence, owner).
- Documented change-control for any displayed-number modification, with named owner.
- Documented incident process with named on-call.
- Read-only role with PII boundaries enforced for at least one external user (agency contractor).
- "Where did this come from?" link on every Level-1 KPI card.
- Arbiter table populated and visible on metric tooltips (Workflow 3 NODE 2).

**Scope:**
1. Publish `docs/design/metric-definitions.md` (the R2 follow-up that's been deferred since the original skills audit).
2. Build the arbiter table — one row per metric class, mapping to RACI in Part VIII.
3. Workflow 2 intake channel + SLA + one-off ledger.
4. PII-masked read-only role for agencies.
5. Workflow 1 monthly pattern review on calendar.
6. RACI transition state from Part VIII.

**Dependencies:** Phase 1 + Phase 2 stable. Tomer ratifies the ownership model.
**Effort:** S (mostly docs + access controls + one PR per affected card).
**Risk if skipped:** Hub reverts to Tomer-shaped tribal knowledge the moment one new person joins.

### What we are NOT doing (explicit scope guards)

- Mobile-responsive Hub (Tomer's existing call — desktop is correct).
- Real-time Slack alerts on every threshold cross (noise > signal).
- Multi-tenant views (premature).
- A custom dashboard builder.
- Ad-platform spend ingestion (deferred to a separate future project; Phase 2 export-to-spreadsheet legitimizes the current workflow).

---

## Part VI — Trust Audit Priority List (the actual top 10)

Priority = (decisions served) × (cadence weight: daily 3 / weekly 2 / monthly 1) × (dollar stakes 1-3).

| # | Metric | Decisions | Score | Reconciliation pattern | Variance threshold |
|---|---|---|---|---|---|
| 1 | `users.lifetimeVolumeUSD` (detail) | D5, D7, D8 | 18 | Cross-check vs listing's `volume` per row + vs sum-of-per-position rows. **The bug that just shipped.** | <0.1% hard |
| 2 | `listing.lifetimeVolumeUSD` (Users list) | D5, D8 | 18 | Per-row equality with detail. Diff > $0.01 → block ship. *(Just shipped MR !21 — reconciliation test in place.)* | <0.1% |
| 3 | `holderRate` per source (KOL/UTM) | D1, D7, D8 | 18 | Manual SQL audit grouped by source vs displayed cell. Spot-check 3. | ≤0.5pp |
| 4 | Funnel stage counts (5 stages) | D3, D8 | 15 | Adjacent-stage diff = leak; Stage-1 total = `registeredUsers` Pulse card | <2% |
| 5 | `registeredUsers` + Δ24h | D8, anomalies | 12 | Must equal Stage-1 funnel exactly. Δ24h = yesterday minus day-before. | exact |
| 6 | `activeHolders` + Δ24h | D8, D5 | 12 | Cross-check vs on-chain holder count. >2% variance = stitching issue. | <2% off-chain / <5% on-chain |
| 7 | `aumUSD` + 30d sparkline | D8 (board) | 12 | Sparkline endpoint at today's date = current card. | <0.1% |
| 8 | `signupsBySource24h` | D1, D4 | 12 | Sum of source counts = Pulse `registeredUsers Δ24h`. Hard equality. | exact |
| 9 | Whale Watch position events | D5 | 9 | Replay 24h of stream events vs SELECT FROM positions. Counts match. | missing D5-eligible whales = block |
| 10 | Cohort `retentionWeek4` | D2, D7 | 9 | Recompute for 2 historical cohorts in a notebook; compare displayed. | ≤0.5pp |

Everything else (Sankey link weights, IdentityCard confidence sub-scores, GA4 page-view counts, KOL columns 5-8, per-cell heatmap shading) defers to "Engineering" or "Diagnostics" and audits when capacity allows.

### KPI hygiene principles (enforceable rules)

1. **Every displayed KPI declares its time window in the label, not just the tooltip.** "Signups (24h)" not "Signups."
2. **Every decision-serving KPI (D1-D8) has a CI reconciliation test.** Test failure blocks deploy. The row-multiplication antibody.
3. **Every KPI has a named owner in a `kpis.yaml` registry.** Fields: name, SQL, decision served, variance threshold, owner, last-audited date. No decision-served entry → 30 days to acquire one or remove.
4. **Every delta shows the snapshot baseline.** "+47 (vs 2026-06-05 23:59 UTC)" not "+47 ▲".
5. **No KPI ships to a customer-facing view without a reconciliation against a second source.** Can't name the second source → stays in Engineering tab marked unverified.

---

## Part VII — Hub vs Adjacent Tools (the IA decision)

**Principle:** Hub is authoritative on **joins** (identity stitch, attribution × holding, spend × outcome). Hub defers and deep-links on **specialist single-source views** (GA4, Snag, Twitter Ads, Solscan).

| Question | Hub authoritative? | Why |
|---|---|---|
| Total / weekly users | ✓ flagship | Only join of registered × stitched × on-chain. |
| AUM | ✓ flagship | Only aggregator of 6-token portfolio. |
| Bounce rate / session duration | ✗ defer to GA4 | GA4 is source; Hub mirror is 1h stale → trust collision. **Kill the GA4 tab.** |
| CTR / CPM / spend on Twitter Ads X | ✗ defer to ad platform | Hub accepts spend as INPUT for joins; doesn't duplicate. |
| Snag quest completion | ✗ defer to Snag | Hub links out with pre-filter. |
| Snag points × on-chain × Twitter for one user | ✓ flagship | Only IdentityCard does this. **Most defensible surface.** |
| Which KOL drove most holders | ✓ flagship | Only join of UTM × on-chain. |
| Cost-per-holder per creative | 🟡 conditional | Requires spend ingest. Defer; spreadsheet workflow legitimate. |
| WoW cohort retention | ✓ flagship | Only Hub has position × identity. |
| Wallet bot/sybil classification | 🟡 partial | Hub knows identity + positions, not transaction graph. Defer. |
| Last month's holder count for board slide | ✓ with provenance | Authoritative — but needs snapshot/export primitive (X1 gap). |
| TSL2L current price | ✗ defer to Birdeye/Jupiter | Hub is not a price oracle. |
| Who joined Discord this week | ✗ defer to Discord | No ingest, don't pretend. |

**Second principle: acknowledge spreadsheets as legitimate.** M1's Friday reconciliation will live in a spreadsheet for the foreseeable future. The Hub's job is to make exporting to that spreadsheet trivial and well-defined (column headers, units, time ranges) — not replace it.

### Self-serve gap discovery — methodology without 1-hour interviews

Tomer is unlikely to sit a marketer down for an hour; M1/M2 may not exist yet as employees. The methodology runs on artifacts:

1. **Slack DM/channel search** (highest signal) — search 90 days for `holder|user|count|whale|KOL|signup|volume|attribution|campaign|source`. Histogram of question types = the gap list.
2. **Spreadsheets people maintain by hand** — Google Drive crawl. Column headers are persona mental models; any column the Hub doesn't produce = gap.
3. **Agency inbound requests** — weekly "can you pull X" emails.
4. **Twitter/Discord/Telegram pings to Tomer about data** — same pattern.
5. **Hub's own access logs** (requires Phase 1 telemetry instrumentation). Tabs opened then closed <5s without action = "didn't answer their question."
6. **What Tomer pre-emptively answers in standup** — verbal coverage of gaps. What he says IS the marketer's daily question.

Apply: harvest artifacts (1-2 hrs), categorize into ~10 archetypes, route each through current Hub, mark ✓/🟡/✗, validate with 20-min Tomer session ("is this list right and what did I miss"). NOT a 1-hour interview.

---

## Part VIII — Governance, RACI, Measurement

### RACI transition (today → multi-team)

Full matrix in `agent-outputs/2026-06-06-workflow-architect-angle.md` section 4. Highlights:

- **Today (Tomer-only):** Tomer is R+A on every row. Matrix is aspirational.
- **+30 days (marketing onboarded):** Marketing Lead R on KPI thresholds; `#hub-incidents` + `#hub-requests` exist; in-Hub flag affordance shipped.
- **+60 days (management uses Hub for decisions):** Arbiter table mandatory and visible on every metric tooltip.
- **+90 days (analytics-lite seat exists OR Claude-routine fills it):** Triage R moves off founder; monthly pattern review on calendar.

**The single highest-leverage role to fill (human or agent-driven) is "analytics-lite triage owner."** It is load-bearing across all three workflows: triages incidents (W1 N2), triages requests (W2 N2), maintains the arbiter table (W3 N2). If unfilled, the multi-team Hub has a single-point-of-failure baked in.

### Outcome measurement framework

**Leading indicators** (predict trouble; the first 3 require Phase 1 self-instrumentation):

| # | Indicator | Source | Threshold for concern |
|---|---|---|---|
| L1 | Hub sessions per marketer per week | Hub telemetry | <3/week by week 4 = adoption failing |
| L2 | Slack/DM volume to Tomer asking "what does this number mean?" | Manual tally | >5/week post-Phase-3 = governance docs aren't working |
| L3 | Time-to-answer for top daily questions | Hub telemetry | >60s median by week 4 = fit failing |
| L4 | "Shadow analytics" artifacts spotted in Slack/Notion/sheets | Weekly scan | >2 new/month = Hub doesn't serve a real need |
| L5 | Trust incidents per month | Incident ledger | >0 P0 after Phase 1 = trust floor not actually built |

**Lagging indicators** (confirm value at 90d):

| # | Indicator | Target |
|---|---|---|
| G1 | % of paid-channel budget decisions traceable to a Hub view | ≥80% |
| G2 | Tomer's hours/week on data Q&A | ↓ ≥50% vs baseline |
| G3 | Stakeholder NPS for the Hub (30/60/90d survey) | ≥+30 by 90d |

**Most important measurement decision:** instrument the Hub itself in Phase 1, before anyone uses it. Cannot evaluate rollout from vibes. No second chance to set a baseline.

### Top 5 stakeholder alignment risks (political/operational, not technical)

1. **CEO-vs-spreadsheet trust war.** Trust is asymmetric; the spreadsheet wins by default. Mitigation: Phase 1 ships with on-screen reconciliation evidence ("How we count users" link next to the number).
2. **"Another tool I didn't ask for" from marketing.** They already use GA4 + X analytics + spreadsheets. Mitigation: Phase 2 interviews lead with questions they currently *can't* answer in any tool.
3. **Shadow analytics from feature gaps.** Marketer builds Notion page → becomes truth → Hub bypassed in 6 weeks. Mitigation: Workflow 2 intake with public SLA (even if SLA is "we'll respond in 5 days"). Queue *visibility* prevents shadow tooling, not delivery speed.
4. **Agency contractor access vs PII exposure.** Hub today shows wallets + names + identity stitch. Giving agency a passcode = compliance issue. Mitigation: Phase 3 ships PII-masked read-only role — may need to land in Phase 2 if agency onboarding is on critical path for paid-spend ramp.
5. **Management wants a PDF, not a Hub.** CEO doesn't open URLs; wants Friday email or slide. Mitigation: Phase 2 includes async digest (weekly email / auto-slide) sourced from the Hub. Hub is source; digest is interface for users who won't open a tab.

All five are political/operational. **Zero are solved by better engineering.** Each risk needs a named owner in the rollout plan.

---

## Part IX — Next Step

If Tomer approves this v2, the immediate sequence:

1. **Now (this session if there's time, or next):** Phase 1 work begins. Dispatch a Data Engineer agent for the top-10 reconciliation tests + Hub self-instrumentation. Independent of audience answers.

2. **Within 1 week (Tomer's calendar):** ~2 hour artifact harvest per Part VII methodology — Slack search + spreadsheet crawl + Twitter/Discord pings + Tomer's verbal-standup-coverage list. Produces the gap candidate list.

3. **Within 2 weeks:** Persona interviews (or proxies). Phase 2 IA work begins after that.

4. **Within 4 weeks:** Phase 1 trust floor shipped + soaked 2 weeks with zero P0. Phase 3 governance writing starts.

**What I need from you to actually kick off Phase 1 now:**
- Authorization to proceed with reconciliation tests + Hub self-instrumentation (a few agents, 1-2 small PRs, ~half a day)
- Naming the channel where `#hub-incidents` will live (Slack? Telegram? Discord?)
- One sentence on who plays the "analytics-lite triage owner" role until a hire exists — Tomer-shadow, Claude-routine, or explicit deferral

If we want to compress: just say "ship Phase 1" and I dispatch the reconciliation + instrumentation work without waiting on the other two answers. They can be resolved by the time Phase 1 ships.

---

## Appendix — Source agent outputs

- `docs/design/agent-outputs/2026-06-06-pm-angle.md` — strategic intent, phased plan, outcome measurement, 5 stakeholder risks
- `docs/design/agent-outputs/2026-06-06-ux-research-angle.md` — 3 personas, daily journeys, self-serve methodology, Hub-vs-adjacent decision tree
- `docs/design/agent-outputs/2026-06-06-analytics-reporter-angle.md` — 8 decisions inventory, decision→metric mapping, top-10 trust audit, 5 hygiene principles
- `docs/design/agent-outputs/2026-06-06-workflow-architect-angle.md` — 3 workflow trees (wrong-number / new-metric / disagreement), RACI transition matrix

v1-DRAFT-SOLO superseded: `docs/design/2026-06-06-hub-audit-plan-v1-DRAFT-SOLO.md`. Kept for traceability of the synthesis process.
