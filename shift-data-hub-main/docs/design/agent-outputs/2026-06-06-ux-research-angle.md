# UX Research Angle — Hub Audit v2

**Date:** 2026-06-06
**Author:** UX Researcher agent
**Scope:** Audience modeling input for v2 synthesis. Persona depth > breadth.

---

## 1 — Persona Dimensions

Three personas, not two. The "marketing" team contains two materially different decision contexts that should not be collapsed.

### Persona M1 — Paid Acquisition Marketer ("the channel optimizer")

| Dimension | Value |
|---|---|
| **Decision context** | Opens Hub when (a) launching a campaign and needs a baseline, (b) a campaign has been live 24-72h and they need to know "is this working," (c) end-of-week reconciliation against ad-platform spend. Mental state: spreadsheet-brained, comparing CAC across channels. |
| **Time pressure** | 60-90s glances 4-6× per day during a live campaign. One 30-min deep-dive each Friday. |
| **Authority** | Acts directly — kills/scales budgets in Twitter Ads, Google Ads, KOL contracts, based on what they see. Hub number → spend decision within hours. |
| **Technical depth** | Medium. Knows UTMs cold. Reads % and ratios fluently. Does NOT read SQL. Has heard of p95 but doesn't care. Confused by "stitched %" terminology. |
| **Failure mode** | Wrong number → wastes $5-50K of ad spend on a misattributed channel, OR pulls budget from a channel that was actually working. Discovers the error 2-4 weeks later when ad platform reconciliation disagrees with Hub. Loss of trust is permanent. |
| **Adjacent tools competing for the same job** | Twitter Ads Manager (truth for CTR, CPM, spend), Google Ads (same), GA4 native (truth for sessions/channel), spreadsheet that pulls CSV from all three. The Hub is the ONLY place that ties paid spend → on-chain holding. That is its unique value. Everywhere else can give them sessions; only Hub can give them holders-per-channel. |

### Persona M2 — Community / KOL Manager ("the relationship operator")

| Dimension | Value |
|---|---|
| **Decision context** | Opens Hub when (a) preparing for a KOL outreach call ("show me who's already onboard from your audience"), (b) after a KOL posts ("did their followers actually convert"), (c) sniffing for whales / VIPs to DM personally. Mental state: human-pattern-matching, looking at individuals, not aggregates. |
| **Time pressure** | Mostly 5-10min sessions, triggered by an external event (KOL posted, whale appeared in Telegram, Discord question). Not on a schedule. |
| **Authority** | Acts directly — sends DMs, allocates KOL retainers, decides who gets whitelisted/VIP perks. Decisions are reputational, not financial — but reputational damage is harder to undo than a bad ad spend. |
| **Technical depth** | Low-to-medium. Reads dollar amounts and wallet activity. Doesn't read SQL or % deltas. Wants names, handles, recency, and "is this person legit." Doesn't know what stitching is, just knows "did you find their Twitter." |
| **Failure mode** | Wrong number → cold-DMs a whale who's already a holder ("hey try us out") = embarrassment + lost trust. Or pays a KOL who drove 0 holders thinking they drove 200. |
| **Adjacent tools competing** | Twitter/X native (truth for who said what), Snag dashboard (truth for who completed which quest), Telegram/Discord member lists, manual wallet checks on Solscan. The Hub's unique value: identity stitch (wallet ↔ twitter ↔ Snag) in one place. KOL Leaderboard is their primary entry point, not Pulse. |

### Persona X1 — Founder/Exec Reviewer (management, single persona for now)

The "management team" today is Tomer + a handful of advisors/investors who read summaries. As management expands, the persona that matters is the **non-founder executive doing weekly/monthly review** — the future Head of Growth, COO, or investor-rep who reads the Hub instead of being briefed verbally.

| Dimension | Value |
|---|---|
| **Decision context** | Opens Hub Monday 9am for week-prior review, Friday 4pm for week-just-ended, monthly for board prep. Mental state: pattern-over-time, week-over-week deltas, "are we on plan." Rarely cares about a single day unless it's anomalous. |
| **Time pressure** | 5-15min on Monday/Friday. 1-2hrs for monthly close, where the Hub is one of 4-5 sources feeding a slide deck. |
| **Authority** | Relays — does not directly act on Hub data. Translates Hub into a Slack post, slide, or 1:1 conversation with Tomer. Every number they show externally becomes a contract — if it's wrong, the next time they show ANY number they get challenged. |
| **Technical depth** | Reads financials fluently — $, %, MoM, cohort retention. Does NOT read on-chain semantics natively ("what's a holder vs a wallet vs a position"). Needs the Hub to do the translation. |
| **Failure mode** | Wrong number gets into a board slide / investor update. Discovered weeks later. Forces a "we have to recompute" email that erodes Tomer's credibility. The single highest-cost trust failure of all three personas. |
| **Adjacent tools competing** | Spreadsheets (the perennial truth-of-record for board narratives), Snag dashboard (loyalty growth), prior-week Slack posts from Tomer ("we hit 15K users this week"). The Hub's unique value: AUM + holder cohorts + week-over-week trend in one screen that doesn't require Tomer to assemble. Replaces the Slack post, not the spreadsheet. |

**The persona insight that matters most:** M2 and X1 have OPPOSITE shapes. M2 wants individual names with recency; X1 wants aggregate trend with stability. The current Hub leans X1-shaped (KPI cards, sparklines, cohort grids) but M2's primary workflows depend on the Users tab and KOL Leaderboard, which are the *least* polished surfaces.

---

## 2 — Daily / Weekly Journey Timelines

Mapped per persona. Friction flag = "needs 3+ tabs to answer one question."

### M1 — Paid Acquisition Marketer

| Moment | Question they're holding | Path today | Friction |
|---|---|---|---|
| **Mon 9am — campaign weekly review** | "Which paid channel drove the most converted holders last week, and at what cost?" | Source Attribution → Channels card → KOL Leaderboard for comparison → **mental math** because cost data is NOT in Hub (lives in Twitter Ads / Google Ads). | 🚩 **Hub gives them half the equation.** Cost-per-holder is the actual question; Hub gives only the numerator. |
| **Wed afternoon — campaign mid-flight check** | "Is the campaign I launched Monday actually pulling new users vs returning ones?" | Pulse signup-by-source bar → switch to Users tab → filter by `utm_source` → eyeball date range. | 🚩 **3 tabs to answer one question.** Pulse should let them click-through to the filtered Users view. |
| **Fri 4pm — weekly reconciliation** | "Reconcile Hub's GA4 sessions vs Twitter's clicks vs my holder count by channel." | GA4 native (separate browser tab) + Twitter Ads (separate tab) + Hub Source Attribution. Manually transcribes into a Google Sheet. | 🚩 Hub is one of 3 inputs to a spreadsheet. Hub doesn't even know it's playing this role. Export-to-CSV is the missing primitive. |
| **Monthly — quarterly board input to X1** | "Give me the channel attribution for last month." | Source Attribution + filter manipulation + screenshot. | Acceptable today but fragile to date-range changes. |

### M2 — Community / KOL Manager

| Moment | Question | Path today | Friction |
|---|---|---|---|
| **Anytime — KOL just posted** | "Did @cobie's followers actually sign up? Which ones held?" | KOL Leaderboard → find row → click-through to... nothing. Need to switch to Users tab, filter by source, sort by hold duration. | 🚩 **Leaderboard has no drill-down.** The most valuable click in the entire Hub is missing. |
| **Anytime — whale appeared in Discord/Telegram** | "Who is this wallet? Are they already in our system? Have they done a quest?" | Users tab → search by wallet → IdentityCard. Reasonable. But if they search by Twitter handle, they have to know whether the user is "stitched" first. | 🟡 Acceptable but assumes user understands stitching status. |
| **Pre-KOL outreach call** | "How many of @[KOL]'s historical audience already hold? Show me names so I can mention 'your community member X already loves us.'" | No path. Requires asking Tomer. | 🚩 ✗ Gap. This is M2's signature use case and it's not self-serve. |
| **Friday — weekly KOL ROI** | "Which KOLs we paid this week drove holders?" | KOL Leaderboard. Mostly works. | OK. But cost/payment data isn't in Hub, same problem as M1. |

### X1 — Founder/Exec Reviewer

| Moment | Question | Path today | Friction |
|---|---|---|---|
| **Mon 9am — week-over-week** | "How did last week compare to the week before — users, holders, AUM, top channel?" | Pulse for KPI deltas → Trader Cohorts for retention shape → Source Attribution for channel mix. | 🚩 3 tabs, but each is fast. The real friction is mental — "what's the headline." Hub doesn't write the narrative; X1 has to. |
| **Friday 4pm — week-ended snapshot** | "What do I send Tomer / the team for end-of-week?" | Pulse screenshot or rough Slack message. | 🚩 No snapshot/export primitive. The output of a Hub session today is a screenshot. |
| **Monthly board prep** | "Give me cohort retention by week for the last 12 weeks, plus AUM trend, plus top 5 channels." | Trader Cohorts + Pulse sparkline + Source Attribution. Three separate copy/paste operations into Google Slides. | 🚩 The MoM cadence is when X1 most needs "Hub-as-source-of-truth-with-citation" — a way to point at a number and link back to its definition. Today nothing has a definition. |
| **Ad-hoc — investor asks "how many users do you have?"** | One number, fast. | Pulse top-left card. | This single moment is the most important UX in the entire Hub. It MUST be right. |

**Cross-persona friction summary:** Every persona's weekly review requires 3+ tab traversal to answer one question. That's the strongest signal in this research: the Hub's IA is decomposed by **data model** (Pulse=KPIs, Funnels=conversion, Sources=attribution, Cohorts=retention, Users=people) when it should be at least partially decomposed by **persona job-to-be-done** (M1's weekly review, M2's KOL drilldown, X1's snapshot). The Engineering gear/tab is the only persona-shaped affordance in the entire Hub.

---

## 3 — Self-Serve Gap Analysis: Methodology Without Stakeholder Interviews

Tomer is unlikely to sit a marketer down for an hour, and the marketer doesn't exist yet for some roles. The gap discovery method must work from artifacts already produced.

**Proxy sources, ranked by signal density:**

1. **Slack DM/channel search — "Tomer, can you check..." or "do you have the number for..."** — the highest-fidelity proxy. Every such message is a self-serve failure. Search 90 days, categorize the question type, count frequency. The histogram IS the gap list. *Required tooling:* Slack export or `slack-search` skill on the workspace where these conversations happen.

2. **Spreadsheets people maintain by hand** — anything in Google Drive shared with Tomer that copies Hub numbers into a sheet is a UX failure (the Hub didn't shape it the way they needed). Crawl Drive for sheets that reference SHIFT/airdrop/holder, look at the columns. The column headers are the persona's mental model — and any column the Hub doesn't produce is a gap.

3. **Agency / contractor inbound requests** — if the team has agencies, they send weekly "can you pull X for us" emails. Each one is a gap.

4. **Twitter/Discord/Telegram pings to Tomer about data** — "hey what's the holder count this week?" Same pattern.

5. **Hub's own access logs** — *behavioral proxy.* Which tabs are actually opened? Which filters set? What's the click-bounce-rate per tab (open → close <5s without interacting)? Pages opened then closed without action are candidates for "this didn't answer their question." If admin clicks aren't logged today, instrumenting that is itself a v2 deliverable.

6. **The questions Tomer pre-emptively answers in standup** — if Tomer opens Monday standup with "here's the holder count and top channel for last week," it's because he's covering a gap. What he says verbally IS the marketer's daily question.

**Methodology to apply these proxies:**

- **Phase 1 (1-2 hours of artifact harvesting):** Pull 90 days of Slack DMs to/from Tomer with words `holder`, `user`, `count`, `whale`, `KOL`, `signup`, `volume`, `attribution`, `campaign`, `source`. List of `(question text, requester, frequency)`.
- **Phase 2 (categorize):** Group questions into ~10 archetypes. Each archetype = one user job. Count how often the job is requested.
- **Phase 3 (route each job through the current Hub):** For each archetype, simulate the persona's path. Mark ✓ self-serve / 🟡 multi-step / ✗ requires Tomer. The ✗ list is the gap list, ranked by frequency.
- **Phase 4 (validate with 1 lightweight session with Tomer — 20 min, not 1 hour):** Show Tomer the archetypes and ask only "is this list right and what did I miss." This is the smallest possible synchronous ask.

**Bias mitigations to call out:** Slack-only proxies undersample silent users who don't ask Tomer (because they already gave up). Behavioral proxies oversample what the Hub is currently shaped for. Triangulating both reduces blind spots. Also: M1 and M2 don't exist yet as employees — for those personas the methodology becomes "interview the agency contractor or shadow Tomer doing the job himself for 1 week" because there is no historical Slack signal yet.

---

## 4 — "Hub vs Adjacent Tools" Decision Tree

For each typical question, the routing today and the routing the Hub should target. The principle: **the Hub wins where it uniquely joins data sources nobody else joins. It loses where it's a worse version of a specialist tool.**

| Question | Current path | Hub should be authoritative? | Why |
|---|---|---|---|
| "How many users total / this week?" | Hub Pulse | ✓ **Yes — flagship** | Hub is the only join of (registered users) × (stitched identity) × (on-chain holder). No other tool can produce this number. Must be right. |
| "What's our AUM?" | Hub Pulse + on-chain check | ✓ **Yes — flagship** | Same reason. Solscan can give per-token, but Hub aggregates the 6-token portfolio. Authoritative. |
| "What's the bounce rate / session duration on shiftrwa.xyz?" | Hub Analytics tab | ✗ **Defer to GA4 native** | GA4 native is the source. Hub is a 1-hour-stale cached copy and re-presenting it as if equal-to-GA4 creates trust problems when they disagree. Hub should LINK to GA4 with deep-link, not duplicate the dashboard. |
| "What's our CTR / CPM / spend on Twitter Ads campaign X?" | Twitter Ads Manager | ✗ **Defer to ad platform** | Hub should not try to import ad spend. It should accept ad spend AS INPUT (CSV upload or API) and produce the join (spend → holder), which is the unique value. |
| "Show me everyone who completed Snag quest Y." | Snag dashboard | ✗ **Defer to Snag** | Snag is authoritative for quest completion. Hub should LINK to the relevant Snag view with the user/quest pre-filtered. |
| "Show me Snag points × on-chain holding × Twitter handle for one user." | Hub Users → IdentityCard | ✓ **Yes — flagship** | Only the Hub joins all three. The IdentityCard is the Hub's single most defensible surface. |
| "Which KOL drove the most holders last week?" | Hub KOL Leaderboard | ✓ **Yes — flagship** | Only the Hub joins UTM tracking × on-chain holding. Cannot be done in GA4 (no holder data) or Twitter Ads (no holder data). |
| "Which campaign creative had the lowest cost per holder?" | Doesn't exist | 🟡 **Conditional** | Requires ad spend ingest. If Hub ingests spend, it owns this answer. If not, defer to spreadsheet that joins ad platform CSV + Hub CSV. The v2 decision: build spend ingest or accept the spreadsheet workflow as legitimate? |
| "What's the week-over-week cohort retention?" | Hub Trader Cohorts | ✓ **Yes — flagship** | Only the Hub has the position-level data joined to identity. Authoritative. |
| "Is this wallet a whale, a KOL, or a bot?" | Hub Users + IdentityCard + manual Solscan | 🟡 **Authoritative for stitched identity; defer on bot detection** | Hub knows identity, position size, signup source. It does NOT know on-chain behavior beyond positions (no transaction graph). Bot/sybil detection is a different tool. Hub should classify what it can and link out for the rest. |
| "Give me last month's holder count for a board slide." | Hub Pulse screenshot | ✓ **Yes, with provenance** | Authoritative — but the Hub today gives a number with no audit trail. Board context demands "as of [timestamp], computed from [definition], source SQL link." This is the snapshot/export primitive X1 needs. |
| "What's the current price of TSL2L?" | Jupiter / Birdeye | ✗ **Defer to price source** | Hub is not a price oracle. Don't fight Birdeye. |
| "Who joined Discord this week?" | Discord native | ✗ **Defer to Discord** | Hub has no Discord ingest today, shouldn't pretend to. |

**The decision principle for the synthesizer:** Hub should be authoritative on **joins** (identity stitch, attribution × holding, spend × outcome). Hub should DEFER and DEEP-LINK on **specialist single-source views** (GA4 native, Snag native, Twitter Ads native, Solscan). The current Hub tries to re-present GA4 data inline, which sets up trust collisions for zero unique value. Killing the Analytics tab as a "GA4 mirror" and replacing it with "GA4 deep-links + the joins we uniquely produce" is the highest-leverage IA call.

A second principle: **acknowledge spreadsheets as legitimate.** M1's Friday reconciliation will live in a spreadsheet for the foreseeable future. The Hub's job is to make exporting to that spreadsheet trivial and well-defined (column headers, units, time ranges), not to replace it.

---

**File:** `/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/docs/design/agent-outputs/2026-06-06-ux-research-angle.md`
