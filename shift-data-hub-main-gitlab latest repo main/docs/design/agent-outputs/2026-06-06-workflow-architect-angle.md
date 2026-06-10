# Workflow Architect Angle — Hub Operational Workflow Trees (v2 Input)

**Author:** Workflow Architect agent
**Date:** 2026-06-06
**Purpose:** Map the actual workflow edges the multi-team Hub needs. Parallel to PM / UX Researcher / Analytics Reporter inputs.
**Scope:** Workflow trees only. Not principles, not phases, not KPI choices, not IA.

---

## 1. "Wrong number" workflow tree

**Trigger:** A marketer at Monday standup sees a Hub number that doesn't match memory. Today: no formal channel exists — the row-multiplication bug lived 24h+ because there was no edge from "I noticed something" to "an engineer is looking."

### Tree

```
NODE 1: DISCOVERY
  Actor: any Hub viewer (marketer, manager, Tomer)
  Surface: tab they were already on (no separate "report bug" page)
  Input: a number that "feels wrong"
  Output: a reported-suspicion row, attached to the specific tab + metric + timestamp viewed
  Mechanism: in-Hub "flag this number" affordance on every numeric cell, one click,
             pre-fills tab/metric/value/asOf + viewer identity + free-text "why I think it's wrong"
  Latency target: <30 seconds from notice to flag landing in queue
  Failure mode: viewer doesn't know flagging exists → reports verbally in standup → flag never logged
  Mitigation: every numeric cell shows a tiny flag affordance on hover; first-week onboarding shows it
  Escalation if missed: row-multiplication-class bugs ship undetected for >24h (the incident pattern)

NODE 2: TRIAGE
  Actor: rotating triage owner (this week Tomer; once team grows, a marketing ops or analytics-lite role)
  Input: flagged row from NODE 1
  Decision branches:
    BRANCH A — "viewer is wrong" (number is correct, viewer remembered Friday's snapshot)
      → Close flag with "confirmed correct as of {asOf}". Post comparison: Friday value vs today value.
      → Reply to flagger in the same surface they flagged from.
      Latency target: <2 business hours during work hours; SLA-paused overnight
    BRANCH B — "data is delayed" (number is correct for its asOf but asOf is stale)
      → Close flag with "pipeline lag: source {GA4 / Snag / chain} last refreshed at {ts}, expected at {ts}"
      → Add the stale-timestamp banner to the affected tab until refresh completes
      Latency target: <2 business hours to diagnose lag; banner up <30 min after triage
    BRANCH C — "Hub is wrong" (number diverges from source of record)
      → Promote flag to incident. Go to NODE 3.
      Latency target: triage decision <2 business hours
  Failure mode: triage owner is on PTO / async timezone gap
  Mitigation: triage rotation has a documented backup; flags older than 4 business hours auto-escalate
  Escalation if missed: incident is undiagnosed; team starts losing trust because "I flagged it and nothing happened"

NODE 3: INCIDENT OPEN
  Actor: triage owner files; engineer (Tomer/Claude today) owns the fix
  Input: triaged flag with "Hub is wrong" classification
  Output: incident record with severity (P0/P1/P2 — see below), affected tabs, hypothesis
  Severity rubric:
    P0 — number visible on default-tab Level-1 KPI (the kind management acts on this week)
    P1 — number visible but secondary (drill-down, not standup-headline)
    P2 — cosmetic / explanatory copy / formatting
  Communication side-effect (fires immediately on incident open):
    → Affected tab/metric gets a "⚠ Under investigation since {ts}" banner replacing the value
    → Slack ping to #hub-incidents (or equivalent) so all Hub users see it without opening the Hub
  Latency target: banner up within 5 min of incident open; Slack ping within same window
  Failure mode: silent investigation — other users keep citing the bad number in meetings
  Mitigation: incident-open is a one-action step that does both (banner + ping), not two separate actions

NODE 4: DIAGNOSE & FIX
  Actor: engineer (today: Tomer/Claude solo. Tomorrow: agent-dispatched per the Code-Reviewer-signoff discipline)
  Input: incident record + reproduction (curl the affected API + diff vs source of record)
  Workflow:
    a. Reproduce: curl the affected /api endpoint, compare to source (chain, Snag, GA4)
    b. Classify: query bug / API bug / frontend bug / pipeline bug / source-of-record bug
    c. Patch: dispatch to Agency Agent (Frontend Dev / Data Engineer / Backend) per existing discipline
    d. Code review: existing reviewer signoff applies, BLOCKs fixed inline before merge
    e. Deploy: existing chain (GitLab MR → squash main → Vercel + Render auto-rebuild)
  Latency targets:
    P0: reproduction <2h, patch <8h, deployed <24h from incident open
    P1: deployed <72h
    P2: deployed in next regular release
  Realistic human latency to document:
    Tomer-async: Slack ping → "wait 4 hours" until Tomer is at keyboard is the dominant latency component for P1/P2
    Render rebuild: ~5-12 min after merge
    Vercel deploy: ~2-4 min after merge
  Failure mode: Tomer is the only engineer; on PTO = P0 SLA breached
  Mitigation: an on-call engineer (even one-deep) is required before management starts using the Hub for budget calls

NODE 5: VERIFY & REOPEN-TO-USERS
  Actor: engineer who deployed + a second pair of eyes (originally the flagger, if available)
  Input: deployed patch
  Output: incident closed; banner removed; corrected number shown; "fixed at {ts}" annotation persists on the metric for 7 days
  Mechanism:
    → Verification step explicitly diffs old API response vs new API response vs source-of-record
    → If diff doesn't match the hypothesis exactly → incident reopens at NODE 4
  Latency target: verification <30 min after deploy
  Failure mode: number "looks right" but a downstream cell still uses the cached/derived bad value
  Mitigation: verification checklist includes "every tab where this metric appears" — driven by a metric→surface registry

NODE 6: COMMUNICATION (closure)
  Actor: triage owner posts to the same channel(s) the incident opened in
  Input: closed incident
  Output:
    a. Slack post to #hub-incidents: "Resolved: {metric} on {tab}. Was {wrong value}, now {right value}. Cause: {one-liner}. Impact: {who acted on the wrong value, if known}."
    b. Reply on the original flag thread so flagger sees their report led to a fix
    c. "Fixed {ts}: was {x}, now {y}" annotation visible on hover for 7 days on the affected cell
  Latency target: same business day as NODE 5
  Failure mode: fix shipped, nobody told the marketer who flagged it → trust erodes anyway
  Mitigation: closure step is a forcing function — incident cannot be marked Closed without all three outputs

NODE 7: AUDIT TRAIL
  Actor: triage owner writes one line into the incident ledger (Notion DB or equivalent — a row, not a doc)
  Input: closed incident
  Output: ledger row {date, severity, tab, metric, root_cause_class, time_to_fix, who_flagged, who_fixed}
  Cadence: visible in monthly review (NODE 8). Cumulative table grows over time — never deleted, only annotated.
  Latency target: ledger row written within 24h of closure
  Failure mode: ledger written but never read → pattern of repeat failures invisible
  Mitigation: NODE 8 (monthly) is a calendar-scheduled meeting, not a "when we get to it"

NODE 8: PATTERN REVIEW (monthly)
  Actor: triage owner + engineer + one marketing seat
  Input: previous month's ledger rows
  Output: list of root_cause_classes that repeated → opens prevention tickets (NODE 9)
  Latency target: monthly meeting on calendar; <60 min slot
  Failure mode: same bug-class ships repeatedly because nobody is reading the ledger
  Mitigation: monthly meeting is recurring; cancelled only by explicit decision, not by drift

NODE 9: PREVENTION
  Actor: engineer (Tomer/Claude or dispatched agent)
  Input: a repeating root_cause_class from NODE 8
  Output: a CI-running reconciliation test that fails the build if the class re-emerges
  Examples of reconciliation tests:
    - row-count assertion: API row count must equal SELECT COUNT(*) from the underlying query
    - cross-source assertion: GA4 daily users for date D vs internal events for date D must agree within ±X%
    - aggregate assertion: sum of segment rows = total row, to the cent
  Latency target: per ticket, scoped like any feature
  Failure mode: prevention is treated as optional → ledger fills with the same root cause for the third month
  Mitigation: an incident cannot be Closed-permanent without a prevention ticket linked (open or shipped)
                — only Closed-pending-prevention if engineering capacity is the blocker, and that status
                is itself surfaced in NODE 8
```

### Workflow insight (do not lose in synthesis)

**The discovery edge is the bottleneck, not the fix edge.** The row-multiplication bug was fixable in <2h once seen. It lived 24h+ because there was no in-Hub flagging affordance and no Slack channel where the number's wrongness could surface before someone eyeballed a column. Every NODE downstream of NODE 1 already exists implicitly (Tomer fixes things). NODE 1 + NODE 3's "banner + ping" pair are the deltas that change the Hub from "trustable by one person who knows where the bugs hide" to "trustable by a team that doesn't know where the bugs hide."

---

## 2. "Marketing needs a new metric" workflow tree

**Trigger:** Marketer needs an answer the Hub doesn't currently surface (example: "users who held >7 days who first touched via KOL=cobie"). They cannot self-serve.

### Tree

```
NODE 1: REQUEST INTAKE
  Actor: marketer files a request
  Surface: one channel only — a Notion-style intake form OR a #hub-requests Slack channel with a templated thread
           Crucial: not a DM to Tomer. DMs lose state and bypass triage.
  Input: {question being asked, why now, decision being made off it, urgency self-tag}
  Output: queued request row
  Latency target: filing takes <2 min from the marketer's side
  Failure mode: marketer DMs Tomer instead → request bypasses triage, no audit trail, gets lost
  Mitigation: response to DM is "please file in #hub-requests so I can prioritize" — enforced as habit

NODE 2: TRIAGE (request classification)
  Actor: same triage owner as the wrong-number workflow (a single person doing both keeps cognitive load low and pattern visibility high)
  Input: queued request
  Decision branches:
    BRANCH A — "already exists" (the answer is already in the Hub, marketer didn't find it)
      → reply with screenshot + path. Close.
      → Side effect: log under "discoverability gap" — if same answer is asked 3x, IA needs work (handed to UX research stream, not this workflow)
      Latency target: <1 business day
    BRANCH B — "one-off pull" (genuinely a single question, no recurring decision)
      → engineer (Tomer/Claude or Data Engineer agent) writes the SQL, runs it, replies in Slack with the result + the SQL
      → Crucial exit edge: this does NOT become a Hub feature. The result lives in the Slack thread + a one-off queries ledger.
      Latency target: P0 (budget decision today) <4h; P1 (this week's planning) <2 business days
    BRANCH C — "feature: recurring decision, deserves to be in the Hub"
      → Goes to NODE 3
      Decision rubric for B-vs-C:
        - Will this question be asked again in the next 30 days? → C
        - Does the answer drive a recurring decision (weekly budget allocation, monthly KOL renewal)? → C
        - Is the answer interesting once but not actionable? → B
    BRANCH D — "out of scope" (data we don't have, third-party we don't integrate)
      → reply with what would be needed, close as Won't Build (or escalate to PM for prioritization if material)
      Latency target: <1 business day
  Latency target: triage decision <1 business day from filing
  Failure mode: triage owner accumulates a backlog; requests sit untriaged for a week
  Mitigation: untriaged requests >2 business days auto-surface in #hub-requests as nudges

NODE 3: SPEC (only for BRANCH C — feature requests)
  Actor: triage owner + marketer (+ analytics-lite role if exists)
  Input: BRANCH C request
  Output: a one-page spec:
    - exact metric definition (formula in words + intended SQL shape)
    - source(s) of record
    - which tab / where it lives in the IA
    - acceptance criteria (what value would prove it's right on launch day)
    - reconciliation test definition (this becomes the CI test on ship — closes the loop with workflow #1)
  Latency target: spec drafted within 3 business days of triage
  Failure mode: spec is vague → engineer implements one interpretation → marketer says "that's not what I meant"
  Mitigation: spec must be signed off by the original requester before NODE 4

NODE 4: IMPLEMENTATION
  Actor: engineer (Tomer/Claude or dispatched Data Engineer + Frontend Dev per existing discipline)
  Input: signed-off spec
  Workflow: existing — Agency Agents dispatch, Code Reviewer signoff, GitLab MR, squash, Vercel/Render deploy
  Output: shipped feature on the agreed tab
  Latency target: scoped per spec; small additions (a new column on existing table) <1 week, new tabs/views >1 week
  Failure mode: ships without the reconciliation test → enters the wrong-number ledger at first divergence
  Mitigation: PR cannot merge without the reconciliation test from spec NODE 3 attached

NODE 5: QA + ACCEPTANCE
  Actor: original requester (marketer) + engineer
  Input: deployed feature
  Output: marketer confirms the launch-day value matches the spec's acceptance criteria
  Latency target: <2 business days from deploy
  Failure mode: marketer is busy, never confirms, feature lives in ambiguous state
  Mitigation: deploy notification pings the requester directly; 5-business-day no-response = auto-accepted but flagged in monthly review

NODE 6: ANNOUNCEMENT
  Actor: triage owner (or engineer) posts to #hub-announcements (separate from #hub-incidents to keep noise distinct)
  Input: accepted feature
  Output: short post: "New on {tab}: {metric}. Definition: {one-liner}. Use it for: {decision}."
  Latency target: same day as acceptance
  Failure mode: feature ships, nobody knows it exists → marketer keeps asking the same question
  Mitigation: announcement is a forcing function of acceptance

NODE 7: ONE-OFF LEDGER (for BRANCH B exits)
  Actor: engineer who answered the one-off appends to a ledger
  Input: one-off question + SQL + result
  Cadence: monthly — if a one-off has been asked 3+ times, triage owner reopens it as a BRANCH C candidate
  Failure mode: same one-off gets asked 5 times across 3 marketers, each takes a half-day, but nobody sees the pattern
  Mitigation: ledger is part of the monthly pattern review (workflow #1 NODE 8 piggybacks on this — same meeting)
```

### Workflow insight (do not lose in synthesis)

**The BRANCH B exit edge — "this is a one-off, here's the answer, it does not become a Hub feature" — is what keeps the Hub from becoming a graveyard of half-used dashboards.** Without an explicit one-off path, every request becomes a feature request, the backlog explodes, and the Hub fills with metrics nobody opens. The ledger + monthly review is the safety net that catches the genuinely-recurring questions hiding inside one-offs.

---

## 3. "Management vs marketing disagree on a number" workflow tree

**Trigger:** Management's deck says 16k users. Marketing's Hub says 17k users. Same room, different numbers, decision pending.

### Tree

```
NODE 1: DETECTION
  Actor: whoever is presenting / whoever is contradicting
  Input: two numbers in conflict, in real time, with stakes
  Output: the meeting either (a) pauses on this decision until resolved, or (b) makes the decision and absorbs the risk
  Failure mode (silent): meeting proceeds, decision is made on one of the two numbers, the other side privately believes the decision was wrong → trust in the Hub corrodes
  Decision rule (must be pre-agreed before this moment, not in the moment):
    If the disagreement is on a number that materially affects the decision being made → PAUSE → NODE 2
    If the disagreement is on a number that's directional context (we're in the right ballpark) → PROCEED → file flag → NODE 2 happens async

NODE 2: ARBITER LOOKUP
  Actor: anyone — but the answer is pre-decided and posted, not negotiated in the room
  Pre-decided arbiter table (this must exist before any disagreement happens; see RACI in section 4):
    Metric class → Arbiter → Source of record
    e.g., "user count" → Data Engineer / Tomer → SELECT COUNT(*) FROM users WHERE ... (the canonical query, stored)
    e.g., "KOL attribution" → Marketing analytics owner → UTM governance table + Snag join
    e.g., "revenue / volume" → Tomer / Finance once it exists → chain data + on-chain query
  Input: the metric in question
  Output: the arbiter's name + the canonical source query + last-validated timestamp
  Latency target: <60 seconds — this is a lookup, not a discussion
  Failure mode: no pre-decided arbiter for this metric class → meeting devolves into debate
  Mitigation: every metric on the Hub has an "arbiter" field on its definition (closes loop with workflow #2 NODE 3 spec)

NODE 3: ARBITER RUN
  Actor: arbiter (often Tomer/Claude today; an analyst once team grows)
  Input: the canonical query + a fresh execution against the source of record
  Output: the authoritative number + the timestamp it was computed + the gap analysis vs both contested numbers
  Latency target:
    In-meeting: <10 min for queries that can be run live (most chain / Postgres queries)
    Async: <2h for queries that need GA4 / Snag (rate-limited APIs)
  Failure mode: arbiter is unavailable (PTO, async tz)
  Mitigation: every metric has a primary + backup arbiter; if both unavailable, the meeting pauses the decision and the contested cell on the Hub gets the "⚠ Disputed since {ts}" banner

NODE 4: RESOLUTION
  Actor: arbiter announces the authoritative number
  Decision branches:
    BRANCH A — Hub was right
      → Management's slide is the wrong one
      → Management's source (deck, parallel spreadsheet, last week's PDF) needs an explicit correction trail
      → Action: identify the source-of-error in management's pipeline; if it's a stale spreadsheet, that's a workflow #2 BRANCH B/C candidate
      → Decision proceeds with Hub number
    BRANCH B — Management was right
      → Hub is wrong → this is a wrong-number incident → enters workflow #1 at NODE 3 (severity = P0 by definition because it surfaced in a management meeting)
      → Hub cell gets the "⚠ Under investigation" banner immediately
      → Decision proceeds with management's number
    BRANCH C — Both are wrong (different definitions)
      → The two sides were measuring different things (e.g., management counted wallets, marketing counted unique humans)
      → This is a definitions gap, not a data gap
      → Action: file a workflow #2 BRANCH C feature request to disambiguate both metrics on the Hub with their precise definition labels
      → Decision: arbiter picks which definition is the right one for this decision, and that becomes the canonical one going forward
  Latency target: BRANCH choice declared in-meeting; banner posted within 30 min; incident or feature request filed same day

NODE 5: LOSER'S NUMBER CLEANUP
  Actor: whoever owned the wrong number
  Input: arbiter's declaration
  Output:
    BRANCH A: management's deck/spreadsheet template gets updated; old PDFs annotated or retracted from circulation
    BRANCH B: Hub cell remains under "investigating" banner until workflow #1 fix lands; do not silently update it
    BRANCH C: both pre-existing presentations get an addendum clarifying which metric was meant
  Latency target: same business day as resolution
  Failure mode: loser's number lives on in the deck template / saved query / muscle memory → same disagreement happens next month
  Mitigation: cleanup includes the source artifact (template, saved view, scheduled email) — not just the one slide that triggered it

NODE 6: POLITICAL DE-RISK (the non-technical edge)
  Actor: human meeting leader (PM or founder)
  Input: the disagreement happened in front of leadership/peers
  Output: explicit normalization in the meeting: "we have a process for this, the Hub is the source, the arbiter is X, we are not relitigating in real-time"
  Cadence: every time, until the pattern is internalized (~3-5 incidents)
  Failure mode: disagreements become political — "marketing's numbers are unreliable" or "management is making stuff up" — and the Hub becomes a tribal weapon instead of a shared source
  Mitigation: NODE 6 is owned by the founder until a PM exists, then the PM. It cannot be skipped.
```

### Workflow insight (do not lose in synthesis)

**The arbiter table must exist before the first disagreement, not after.** The question "who decides which number is right" cannot be answered in the room. If the synthesis ships without a per-metric-class arbiter assignment (workflow #2 NODE 3 spec includes "arbiter" field), the first management-vs-marketing disagreement will be resolved by social authority (whoever has more political weight wins), not by data authority, and the Hub's status as source of truth dies in that single meeting.

---

## 4. RACI matrix for the operational Hub (proposed transition state)

Today's de-facto answer: Tomer is R+A+C+I on everything. The transition target is a multi-team state where Tomer is A on most things but R is distributed.

**Roles in this matrix:**
- **Founder (Tomer):** product + engineering owner; on-call engineer until a second exists
- **PM:** product owner once hired/dispatched; intake + prioritization
- **Marketing Lead:** owns marketing-visible KPI thresholds + KOL definitions
- **Management (founder + 1 senior):** uses the Hub as source for board / strategic decisions
- **Analytics-lite seat:** a marketing-ops or analyst role; one-off SQL pulls + triage owner (this role does not exist today — proposed creation)
- **Engineering agent dispatch (Claude + Agency Agents):** implementation work, code review, deploys
- **Agency contractor(s):** external paid help (designer, KOL ops, etc.)

| # | Responsibility | R (does) | A (signs off) | C (consulted) | I (informed) |
|---|---|---|---|---|---|
| 1 | Audit cadence (monthly pattern review meeting) | Analytics-lite seat | Founder | Marketing Lead, PM | All Hub users |
| 2 | Metric definitions ownership (canonical formula per metric) | Analytics-lite seat | Marketing Lead for marketing metrics; Founder for chain/financial | PM | Engineering, all Hub users |
| 3 | KPI threshold updates (e.g., "what counts as a healthy CTR") | Marketing Lead | Founder | PM, Analytics-lite | All Hub users, Management |
| 4 | Broken-number incident response (workflow #1) | Analytics-lite (triage) + Engineering agents (fix) | Founder until second engineer exists; then on-call rotation | Original flagger, affected team | All Hub users via #hub-incidents |
| 5 | New metric requests (workflow #2) | Analytics-lite (intake + triage) + Engineering agents (build) | PM if exists, otherwise Founder | Marketing Lead, requester | All Hub users via #hub-announcements |
| 6 | Deploy approval for changes affecting marketing-visible KPIs | Engineering agents (build) + Code Reviewer (signoff) | Founder for P0/Level-1 KPIs; Engineering for everything else | Marketing Lead if a marketing-visible metric changes definition | All Hub users via release notes on the affected tab |
| 7 | Agency/contractor access management (read-only Hub access for external KOL ops, designer, etc.) | Analytics-lite OR Founder (whoever provisions access today) | Founder | PM | Security log of who has access, reviewed quarterly |
| 8 | Arbiter table maintenance (workflow #3 NODE 2 — which role arbitrates which metric class) | Analytics-lite | Founder | Marketing Lead, PM | All Hub users (visible on each metric's definition tooltip) |
| 9 | Source-of-record query catalog (the canonical SQL per metric, stored & versioned) | Engineering agents | Analytics-lite | Founder | All Hub users (linked from each metric's definition) |
| 10 | Reconciliation test suite (CI tests that prevent repeat root-cause classes — workflow #1 NODE 9) | Engineering agents | Founder | Analytics-lite | Engineering on each CI run |

### Transition staging (today → multi-team)

- **Today (1 user, Tomer):** Tomer is R+A on every row. The matrix is aspirational.
- **+30 days (marketing onboarded):** Marketing Lead takes R on #3; Founder retains A everywhere; #hub-incidents and #hub-requests channels exist; in-Hub flag affordance shipped (workflow #1 NODE 1).
- **+60 days (management uses Hub for decisions):** Arbiter table (row 8) is mandatory and exists on every metric tooltip; workflow #3 NODE 2 lookup works without debate.
- **+90 days (analytics-lite seat exists OR a recurring Claude-Code-driven workflow plays the role):** triage R moves off Founder; monthly pattern review is on calendar; one-off ledger reviewed monthly.

### Workflow insight (do not lose in synthesis)

**The single highest-leverage role to fill (human or agent-driven) is "analytics-lite triage owner."** It is the load-bearing role across all three workflows: it triages incidents (workflow #1 NODE 2), triages requests (workflow #2 NODE 2), and maintains the arbiter table (workflow #3 NODE 2). If the synthesis assigns these to "Tomer until further notice," the Hub's multi-team viability has a single-point-of-failure baked in from day one. If the role is staffed (or genuinely automated via a Claude routine + dispatch playbook), the operational hub works without Tomer on the critical path for ~80% of weekly volume.
