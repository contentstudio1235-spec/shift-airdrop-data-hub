# SHIFT RWA — KPI Tree, Alert Thresholds, Data Hub Layout Priority, Insight Templates

**Author:** Analytics Reporter agent
**Date:** 2026-06-03
**Status:** Draft v1 — ready for frontend implementer + Executive Summary Generator
**Consumes:** `growth-hacker-2026-06-03.md` (4 hero KPIs, refined funnel steps, anti-vanity checklist), `tracking-specialist-2026-06-02.md` (17-event taxonomy incl. growth-hacker additions), `trend-researcher-2026-06-02.md` (channel ranking, KOL tiers)
**Consumed by:** Frontend engineer (Sprint 1–3), Behavioral Nudge Engine, Paid Media Auditor, Executive Summary Generator

---

## TL;DR

This document binds the Growth Hacker's 4 hero KPIs ("Trailing-7d new active holders", "Trailing-7d volume", "Viral coefficient K", "Attribution coverage %") to a 3-tier KPI tree, defines red/yellow/green alert thresholds for every metric in the tree, prescribes the 8-card above-the-fold layout for the Funnels default view, gives the frontend engineer 6 ready-to-render insight-card templates, and locks down anti-hallucination rules so the Data Hub never shows a 47% WoW delta computed off n=3. Every KPI is computable today from the 11 backend endpoints listed in the spec (`/api/funnels/{7}`, `/api/attribution/{2}`, `/api/cohorts/:dim`, `/api/stream/whales`).

---

## 1. KPI Tree — North Star → Inputs

### 1.0 North Star Metric

**Trailing 30-day attributable trading volume from wallets with ≥2 trades (`v_NS_volume_30d_repeat`)**

- **Why this and not "total volume":** Per Growth Hacker §8, cumulative volume hides decay and includes one-trade tourists. Filtering to ≥2-trade wallets removes airdrop-claim noise; trailing-30d is the longest window that still moves week-to-week.
- **Why not "active holders":** Holder count is a proxy for the underlying truth. Volume from repeat traders IS the business — it is the revenue surface, the LTV driver, and the only number whose growth implies all of: acquisition working, activation working, retention working, whales being whales.
- **Formula:** `SUM(positions.position_size_usd) WHERE wallet IN (SELECT wallet FROM positions GROUP BY wallet HAVING COUNT(*) >= 2) AND opened_at >= NOW() - INTERVAL '30 days'`
- **Endpoint:** Derived from `/api/funnels/conversion` (step 2 = Second Trade gives the repeat-wallet set) joined with volume aggregation already present in `/api/analytics/kpis`.
- **Owner:** Founder (Tomer) — only number on the founder's daily dashboard.
- **Refresh cadence:** Hourly (memoized 60min). Real-time not required at the North Star level.
- **30-day target (Day 30 of Growth Hacker plan):** $80K–$120K (implies ~3-4x current cumulative $13.7K trailing-30 if repeat-wallet share is 50%).

### 1.1 Tier 1 — Hero Inputs (the 4 Growth Hacker hero KPIs)

These four are the heroes. They appear as the top row of the Funnels default view (Section 3). Each is named exactly as the Growth Hacker doc named them.

| # | KPI Name (Growth Hacker §8.2) | Formula | Endpoint | Owner | Refresh |
|---|---|---|---|---|---|
| T1.1 | **Trailing-7d new active holders (≥1 trade)** with WoW delta | `COUNT(DISTINCT wallet) FROM attribution_events WHERE event_name='first_trade' AND occurred_at >= NOW() - INTERVAL '7 days'` compared to the prior 7d window | `/api/funnels/acquisition?from=<7d ago>&to=<now>` step 4 count | Growth lead | 15min |
| T1.2 | **Trailing-7d trading volume** with WoW delta and channel breakdown | `SUM(position_size_usd) FROM positions WHERE opened_at >= NOW() - INTERVAL '7 days'` grouped by `users.first_utm_source` | `/api/attribution/channel-roi?from=<7d ago>` | Founder | 15min |
| T1.3 | **Viral coefficient K (rolling 30d)** with green/yellow/red light vs. 1.0 target | K = (% who generate code) × (avg clicks per code) × (click-to-trade %) — all three from `/api/funnels/referral` step ratios | `/api/funnels/referral?from=<30d ago>` | Growth lead | 1h |
| T1.4 | **Attribution coverage %** with red gate at 50% | `COUNT(*) FROM users WHERE first_utm_source IS NOT NULL AND wallet IN (SELECT wallet FROM positions)` ÷ `COUNT(*) FROM users WHERE wallet IN (SELECT wallet FROM positions)` | `/api/funnels/acquisition` (header field `attributablePct`) | Tracking specialist / Backend | 1h |

### 1.2 Tier 2 — Leading Indicators (the 10 levers that move the heroes)

These are the metrics that, when they move, predict Tier 1 movement within 7–14 days. Every Tier 2 metric is sliceable by source (per Growth Hacker §6) and shows up in the per-funnel views.

| # | KPI Name | Formula | Endpoint | Owner role | Refresh | Predicts which T1 |
|---|---|---|---|---|---|---|
| T2.1 | **Landing → Wallet Modal Open conv %** | step 2 count ÷ step 1 count in Acquisition funnel | `/api/funnels/acquisition` | Growth | 15min | T1.1, T1.2 |
| T2.2 | **Wallet Modal Open → Wallet Connect conv %** | step 3 ÷ step 2 in Acquisition funnel | `/api/funnels/acquisition` | Growth | 15min | T1.1, T1.4 |
| T2.3 | **Wallet Connect → First Trade conv %** (24h window) | step 4 ÷ step 3 in Acquisition funnel | `/api/funnels/acquisition` | Growth / Product | 15min | T1.1, T1.2 |
| T2.4 | **KYC Complete rate** (Register → KYC Complete) | step 3 ÷ step 2 in Activation funnel | `/api/funnels/activation` | Product | 1h | T1.1, T1.2 |
| T2.5 | **First Trade → Second Trade conv %** (repeat-trade rate) | step 2 ÷ step 1 in Conversion funnel | `/api/funnels/conversion` | Product | 1h | North Star (directly) |
| T2.6 | **Silver → Gold whale conversion %** ($1K → $10K) | Whale Pipeline step 3 ÷ step 2 | `/api/funnels/whale-pipeline` | Founder | 1h | T1.2 (volume) |
| T2.7 | **Median time landing → first_trade** | median(`first_trade.occurred_at - landing.occurred_at`) WHERE same `ga_client_id`, last 7d | `/api/funnels/acquisition?aggregate=median_time` | Product | 1h | T1.1 |
| T2.8 | **Day-7 retention from first_trade** | `% of cohort with any position_open between day 7–14 of their first_trade` | `/api/cohorts/day_of_first_trade?window=7d` | Growth | 6h | North Star |
| T2.9 | **% of attributed volume from Tier S+A KOLs** | `SUM(value_usd) WHERE source LIKE 'kol_%' AND source IN (Trend Researcher Tier S/A list)` ÷ total attributed volume, trailing 30d | `/api/attribution/channel-roi?source=kol_*` | Growth | 6h | T1.2 |
| T2.10 | **Stitched wallet rate** (wallet_connect → ga_client_id present) | `COUNT(users WHERE ga_client_id IS NOT NULL AND wallet IS NOT NULL)` ÷ `COUNT(users WHERE wallet IS NOT NULL)`, last 7d cohort | `/api/funnels/acquisition` header `stitchedPct` | Backend / Tracking specialist | 1h | T1.4 (directly) |

### 1.3 KPI tree diagram

```
North Star: Trailing-30d Volume from ≥2-trade Wallets
  ├─ T1.1 7d new active holders     ← T2.1, T2.2, T2.3, T2.4
  ├─ T1.2 7d trading volume         ← T2.5, T2.6, T2.7, T2.9
  ├─ T1.3 Viral coefficient K (30d) ← (referral funnel internals: see §1.4)
  └─ T1.4 Attribution coverage %    ← T2.10, T2.2
```

### 1.4 Viral coefficient K decomposition (so the K card is drillable)

`K = K_gen × K_clicks × K_convert` where
- `K_gen` = step 2 ÷ step 1 in Referral funnel (% of registered users who generate a code)
- `K_clicks` = step 3 ÷ step 2 (referral clicks per code generated)
- `K_convert` = step 4 ÷ step 3 (referred clicks that complete first_trade)

Display K as the headline number with `K_gen × K_clicks × K_convert` shown beneath in small text — when K is low, this immediately shows WHICH of the three components is broken.

---

## 2. Alert Thresholds (Red / Yellow / Green)

Every KPI from §1 has a tri-color threshold, an alert channel, a 1-sentence message template, and a dedupe window. Quiet hours = 22:00–07:00 America/New_York (matches Solana trading patterns and Tomer's timezone). Slack channel assumed `#shift-alerts`. Email recipient assumed `adrenaline187@gmail.com`. Templates use `{x}` placeholders the alerter substitutes at fire time.

### 2.0 Alert priority legend
- **P1** — Slack + email + iOS push (PushNotification tool). Fire immediately, dedupe 4h.
- **P2** — Slack only. Fire within 15min of detection, dedupe 12h.
- **P3** — In-app card on Data Hub only (no notification). Refresh on every page load.

### 2.1 Tier 1 alert table

| KPI | Green | Yellow | Red | Channel | Message template | Dedupe |
|---|---|---|---|---|---|---|
| **NS** Trailing-30d repeat-wallet volume | WoW Δ ≥ +5% | WoW Δ −5% to +5% | WoW Δ < −10% | P1 | "North Star down {pct}% WoW: ${volume} from {wallets} repeat traders. Check {top_dropping_source}." | 24h |
| **T1.1** 7d new active holders | ≥ +10% WoW | −5% to +10% WoW | < −10% WoW OR absolute < 30 | P1 | "Only {n} new holders in last 7d ({delta}% WoW). Acquisition leak likely at {worst_step}." | 4h |
| **T1.2** 7d trading volume | ≥ +10% WoW | −5% to +10% WoW | < −15% WoW | P1 | "7d volume ${v} (WoW {delta}%). Top source {src} contributed ${src_vol}." | 4h |
| **T1.3** Viral coefficient K (30d) | ≥ 0.45 | 0.20–0.45 | < 0.20 | P2 | "Viral K = {k} ({color}). Weakest component: {weak_component} at {weak_pct}%." | 12h |
| **T1.4** Attribution coverage % | ≥ 80% | 50–80% | < 50% | P1 | "Attribution coverage dropped to {pct}% — stitch pipeline degraded for {n} new wallets." | 4h |

### 2.2 Tier 2 alert table

Thresholds reuse Growth Hacker §2 benchmarks directly (R/Y/G in that doc were already calibrated to Solana DeFi).

| KPI | Green | Yellow | Red | Channel | Message template | Dedupe |
|---|---|---|---|---|---|---|
| **T2.1** Landing → Modal Open | > 15% | 8–15% | < 8% | P2 | "Landing→Modal at {pct}% — likely above-fold copy or deep-link regression. Affects {n} sessions/day." | 12h |
| **T2.2** Modal Open → Connect | > 50% | 35–50% | < 35% | P2 | "Modal→Connect at {pct}%. Phantom default may be broken; check {wallet_type} share." | 12h |
| **T2.3** Connect → First Trade (24h) | > 15% | 8–15% | < 8% | P1 | "Connect→Trade at {pct}% — {n} wallets connected and didn't trade in 24h. Onramp or KYC issue." | 4h |
| **T2.4** KYC complete rate | > 35% | 20–35% | < 20% | P2 | "KYC drop at {pct}%. Mobile share {mobile_pct}%; consider <$500 KYC-skip." | 12h |
| **T2.5** First Trade → Second Trade | > 40% | 25–40% | < 25% | P2 | "Repeat-trade rate {pct}% — LTV at risk. Cohort {worst_cohort} worst at {worst_pct}%." | 12h |
| **T2.6** Silver → Gold whale conv | > 9% | 4–9% | < 4% | P1 | "Whale Silver→Gold at {pct}%. Investigate {top_silver_source} pipeline." | 24h |
| **T2.7** Median time landing→first_trade | < 24h | 24h–7d | > 7d | P3 | "Median time-to-first-trade now {hours}h ({delta} vs prior week)." | n/a (in-app) |
| **T2.8** Day-7 retention | > 35% | 20–35% | < 20% | P2 | "Day-7 retention at {pct}% for cohort {cohort_date}. Reactivation push recommended." | 24h |
| **T2.9** % volume from Tier S+A KOLs | > 50% | 25–50% | < 25% | P3 | "KOL-attributed volume {pct}% of total. {top_kol} leading at ${kol_vol}." | n/a |
| **T2.10** Stitched wallet rate | > 95% | 80–95% | < 80% | P1 | "Wallet stitch rate dropped to {pct}%. Check `/api/track/wallet_connect` health." | 4h |

### 2.3 Cross-cutting alert rules

- **Suppress yellow → red transitions during quiet hours** (22:00–07:00 ET); queue for 07:00 batch fire.
- **Suppress all alerts during deploys** — read a `deploy_in_progress` flag from Render webhook (15min window post-deploy).
- **Bundle P2 alerts** — fire at most one P2 Slack message per hour, with all fired KPIs in a single threaded message.
- **Tone rule** — alert messages NEVER say "great job" or "uh oh"; they state the number, the comparator, and the suspected cause. The Executive Summary Generator owns sentiment; alerts are matter-of-fact.

### 2.4 Frontend representation of threshold state

Every KPI card renders a single colored pill (top-right corner, 8px diameter): green `#5ee0a8` / yellow `#ff9a3c` / red `#ff5a5a`. The pill animates on threshold-crossing only (one 600ms pulse), not constantly. Color tokens match `chartTokens.ts` defined in the spec §5.3.

---

## 3. Data Hub Default-View Layout Priority

The Funnels view loads at `/admin/data-hub?view=funnels&funnel=acquisition` per spec §3. Above-the-fold = first 720px viewport height on a 1440px-wide monitor (Tomer's primary). Below-the-fold begins at scroll offset 720px.

### 3.1 Above-the-fold (8 cards, 12-column grid)

| # | Card | Chart type | Data source | Width | Refresh | Why above the fold |
|---|---|---|---|---|---|---|
| 1 | **"What changed?" insight strip** | Horizontal scrolling row of 1-line text cards (3 visible, swipeable) | Computed in frontend from §4 templates | 12/12 (full) | 5min poll | Growth Hacker §5.5 "AMAZING feature 5" — the executive-glance answer to "what should I look at today?" |
| 2 | **T1.1 New active holders (7d)** | Big number + WoW Δ% + sparkline (7d daily) | `/api/funnels/acquisition?aggregate=daily` step 4 series | 3/12 | 15min | Growth Hacker hero #1 |
| 3 | **T1.2 7d trading volume** | Big number + WoW Δ% + horizontal stacked bar (top 5 sources) | `/api/attribution/channel-roi` | 3/12 | 15min | Growth Hacker hero #2 |
| 4 | **T1.3 Viral coefficient K** | Gauge (0–1.5 range, target line at 1.0) + K_gen × K_clicks × K_convert subtext | `/api/funnels/referral` | 3/12 | 1h | Growth Hacker hero #3 |
| 5 | **T1.4 Attribution coverage %** | Donut (covered vs uncovered) + red gate at 50% line | `/api/funnels/acquisition` header | 3/12 | 1h | Growth Hacker hero #4 — this is THE meta-signal that the rest of the dashboard is trustworthy |
| 6 | **Acquisition funnel (animated)** | 4-step horizontal funnel bar chart with drop-off arrows colored by R/Y/G | `/api/funnels/acquisition` (current funnel selection) | 8/12 | 15min | The selected funnel itself — main object of the view |
| 7 | **Whale Watch live ticker** | Pure-CSS scrolling list, SSE-fed, auto-pause on hover | `/api/stream/whales` | 4/12 | SSE live | Growth Hacker hero metric proxy: in-the-moment business velocity feel; addictive UI per spec §5.5 |
| 8 | **Top 5 sources by 7d new-holder contribution** | Horizontal bars colored by R/Y/G against `attribution_events` benchmarks | `/api/attribution/channel-roi?metric=new_holders_7d` | 12/12 | 1h | Connects the funnel object (card 6) to the actionable lever (channels) without scrolling |

Cards 2–5 share row 2 (each 3/12). Cards 6 + 7 share row 3 (8/12 + 4/12). Card 8 = row 4 full-width. Card 1 = row 1 full-width. Row 1 + 2 = 312px height combined; row 3 = 320px; row 4 = 88px → ~720px above the fold.

### 3.2 Below-the-fold (in scroll order)

1. **Per-step drill-down detail** — clicking a funnel step opens this inline (not modal) — shows: count, % from prev, % from first, median time, vs 7d delta, vs benchmark, plain-English insight. Replaces the v1 hover-tooltip with a persistent panel.
2. **Compare-mode toggle row** — two date pickers side-by-side; chart updates to dual-line overlay.
3. **Cohort breakdown of the selected funnel** — grouped bar chart by source (top 6 + "Other"), tied to Growth Hacker §6 cohort axes.
4. **"Funnel by wallet type"** — small-multiples: Phantom / Solflare / Backpack / Other, each their own mini-funnel. Surfaces the mobile-Phantom gap.
5. **Funnel-step contributors table** — 50-row paginated list of wallets at the bottleneck step, with source / wallet age / cumulative volume / last_seen columns. Click row → opens wallet detail.
6. **Predictive overlay** — "Projected next 30d" linear extrapolation, dashed line continuation of card 6's funnel.
7. **Export menu** — PNG/CSV/PDF buttons for the entire view.

Per Growth Hacker §8 anti-vanity: **the Acquisition page does NOT display "Total registered users (15,455)"** anywhere. That number, if shown at all, belongs in `/admin/data-hub` Raw Data Drill-downs only.

### 3.3 Other-funnel views

When the user picks a different funnel (Activation / Conversion / Whale Pipeline / Loyalty / Referral / Retention), cards 1, 2, 3, 4, 5, 7 stay (they are global heroes). Cards 6 and 8 swap to the chosen funnel and its source breakdown. This keeps the 4 hero KPIs anchored as the user navigates — the cognitive cost of cross-view comparison drops to zero.

---

## 4. "What Changed?" Insight Card Templates

The insight strip (card 1 above) renders these auto-generated 1-liners. Per Growth Hacker §5.5 "AMAZING feature 5" reference and Anti-Vanity §8 ("no cumulative numbers without a delta"). All deltas are WoW unless otherwise stated. Templates use `{placeholder}` for substitution at render time.

**Tone rules** (apply to every template):
- Matter-of-fact, no hype. "up 47%" not "🚀 up 47%!"
- Always include the comparator window. "WoW" or "vs prior 7d" must appear.
- If sample size is too small per §6, the template is suppressed entirely (not rendered with caveat).
- Never use "we" or "our" — the dashboard is a third-party observer.
- One sentence, ≤ 120 characters when rendered.

| # | Template | Data source(s) | Trigger condition | Tone |
|---|---|---|---|---|
| 1 | **"Wallet connects from {top_growing_source} up {pct}% WoW — {comparator_source} down {pct}%."** | `/api/attribution/channel-roi` two-week comparison | Fire when any single source's WoW Δ > +20% AND ≥ 1 other source > −10%, both with ≥30 wallet_connects | Matter-of-fact |
| 2 | **"Whale Silver→Gold conversion at {pct}% this week ({comparator_arrow} {delta_pct} vs prior 7d)."** | `/api/funnels/whale-pipeline` step 2→3 weekly | Fire weekly Monday; suppress if absolute Silver count < 20 | Neutral |
| 3 | **"Median time landing → first_trade now {hours}h ({comparator_arrow} {delta_pct} vs prior 7d) — driven by {top_source} cohort."** | `/api/funnels/acquisition?aggregate=median_time` | Fire when Δ > ±20% AND n ≥ 50 conversions in window | Neutral |
| 4 | **"Day-7 retention for {source} cohort: {pct}% — {benchmark_comparator} the {n}-source benchmark of {benchmark_pct}%."** | `/api/cohorts/source` + Growth Hacker §2.7 benchmark table | Fire when any source's Day-7 retention is > 1.5x or < 0.5x the cohort median, AND cohort size ≥ 30 | Diagnostic |
| 5 | **"Viral K reached {k} ({color}) — driven by {strongest_component} at {pct}%."** | `/api/funnels/referral` decomposition (§1.4) | Fire when K crosses a threshold (0.20 yellow → 0.45 green or reverse) | State change |
| 6 | **"Attribution coverage at {pct}% — {n} wallet_connects in last 7d had no resolved source."** | `/api/funnels/acquisition` header | Fire when coverage < 80% for 3+ consecutive days OR coverage drops > 10pp WoW | Operational |
| 7 | **"{top_kol_handle} attributed {n} first_trades and ${volume} volume in last 7d — leading the KOL leaderboard."** | `/api/attribution/channel-roi?source=kol_*` | Fire weekly Monday IF top KOL has ≥10 attributed first_trades that week | Recognition (neutral phrasing) |
| 8 | **"KYC drop spiked to {pct}% on {wallet_type} wallets — {n} stuck users could benefit from <$500 skip flow."** | `/api/funnels/activation?breakdown=wallet_type` | Fire when KYC drop on any wallet_type > 70% AND n ≥ 25 in window | Action-oriented |
| 9 | **"Reactivation rate from churn_risk_7d: {pct}% — {n} dormant wallets returned to trade after last week's nudge."** | `/api/funnels/retention` step 2→3 | Fire weekly Friday IF reactivation count ≥ 10 | Positive (factual) |
| 10 | **"Tier-S KOL share of new whales ($1K+): {pct}% — {comparator_arrow} {delta_pct} vs prior 7d."** | `/api/attribution/whale-origins?tier=silver+` filtered to Trend Researcher Tier-S handle list | Fire weekly Monday; suppress if new-whale count < 10 | Strategic |

### 4.1 Insight prioritization (which 3 render on row 1)

The strip can hold 3 visible. Ranking algorithm:
1. Any P1-priority insight (cards 1, 4, 6, 8 when they hit their fire condition) takes the leftmost slot.
2. State-change insights (cards 5, anything crossing a threshold) take the second slot.
3. Weekly digest insights (cards 7, 9, 10) fill remaining slots; rotate which one shows on hover.
4. If fewer than 3 are eligible, the strip collapses to a single-row "All KPIs within expected bands" message — never show a vague "stay tuned" or empty placeholder.

### 4.2 Insight suppression

An insight is suppressed if any of:
- Its data source returned `cacheAge > 60min` (per §6.2 staleness rule)
- The sample size at the time-of-evaluation is below the threshold in §6.1
- The same insight fired in the last 12h (dedupe key = template number + key placeholder values)
- The user has dismissed it via the × button (stored in localStorage, expires next Monday)

---

## 5. Weekly Executive Memo Template

Generated every Monday 09:00 ET by the Executive Summary Generator agent. Format: 1-page (≤500 words main body, appendix unlimited). Delivered via Slack + email + saved to `/api/reports/weekly/<yyyy-mm-dd>.html`. Uses SCQA (Situation, Complication, Question, Answer) per McKinsey's pyramid principle — the founder reads top-down and stops as soon as he has enough.

### Template

```
# SHIFT RWA Weekly — {week_of_date}

## Situation (1 paragraph, ≤80 words)
[State the current state of the North Star and the 4 hero KPIs in flat prose. Begin with the most movement-worthy number. Use absolute numbers AND WoW deltas. No interpretation here — just facts.]

Example sentence pattern: "Trailing-30d repeat-wallet volume sits at ${ns_value} ({ns_wow_pct} WoW). Last week added {t11_value} new active holders and ${t12_value} of volume. Viral K = {t13_value} (status: {t13_color}). Attribution coverage = {t14_pct}%."

## Complication (1 paragraph, ≤100 words)
[Identify the SINGLE highest-leverage friction in the funnel this week. Reference the specific Tier 2 KPI that's red or yellow. Quote the responsible Growth Hacker §3 root-cause analysis. Compare against the same week prior — was this already broken, or new?]

Example sentence pattern: "The {worst_t2_kpi} dropped to {worst_t2_value}, below the {threshold_color} threshold. Per Growth Hacker §3.2, root causes include {cause_1} and {cause_2}. This is {new_vs_persistent} — last week's value was {prior_value}."

## Question (1 sentence)
[A single decision the founder needs to make this week. Phrased as a question.]

Example sentence pattern: "Should we ship {recommended_fix} this week, defer {deferred_action}, or reallocate ${reallocation_amount} from {channel_from} to {channel_to}?"

## Answer (1 paragraph + bullet list, ≤150 words)
[The agent's recommended action with confidence level. Confidence comes from the §6 confidence floor logic.]

**Recommendation:** {one_sentence_recommendation}.
**Confidence:** {high|medium|low} — based on {sample_size} observations, {confidence_basis}.
**Expected impact:** {impact_range} on {target_kpi} within {time_horizon}.
**Owner:** {owner_role}. **By:** {target_date}.

Supporting bullets:
- {evidence_1_with_number}
- {evidence_2_with_number}
- {evidence_3_with_number}

---

## Data Appendix (links + numbers)

### Hero KPI table (last 4 weeks)
| Week of | NS volume | New holders | 7d volume | K | Coverage |
|---|---|---|---|---|---|
| {w-3} | ... | ... | ... | ... | ... |
| {w-2} | ... | ... | ... | ... | ... |
| {w-1} | ... | ... | ... | ... | ... |
| **{this_week}** | ... | ... | ... | ... | ... |

### Channel ROI snapshot (last 7d)
| Source | Wallet_connects | First_trades | Volume | Attributed K contribution |
|---|---|---|---|---|
| {source_1} | ... | ... | ... | ... |
| ... | ... | ... | ... | ... |

### Funnels with significant changes
- [Acquisition funnel](https://shift-airdrop-data-hub.vercel.app/admin/data-hub?view=funnels&funnel=acquisition&from={w-1}&to={now}) — {summary}
- [Whale Pipeline](https://shift-airdrop-data-hub.vercel.app/admin/data-hub?view=funnels&funnel=whale_pipeline&from={w-1}&to={now}) — {summary}

### Data quality notes
- Attribution coverage: {pct}% — {gate_note}
- Stale endpoints (if any): {list}
- Suppressed insights this week: {count} (reasons: {breakdown})

### Confidence summary
- {n} of {N} insights computed at high confidence (n ≥ thresholds in §6.1).
- {n} suppressed due to insufficient sample.
- {n} flagged for manual review.
```

### 5.1 Sentinel cases the memo MUST surface

The Executive Summary Generator runs these checks at generation time. If any fires, it overrides the SCQA above with a "RED ALERT" memo format that leads with the issue:

- Attribution coverage < 50% for ≥ 3 days
- Any P1-threshold breach unresolved 24h+
- North Star Δ < −15% WoW
- Stitched wallet rate < 80% (pipeline degradation)
- A source's CAC (spend / first_trades) exceeded $200 for ≥ 7d (paid media leak)

### 5.2 Tone calibration

The memo's voice should sound like a quiet analyst, not a press release. Approved phrasings:
- "The data suggests …"
- "Confidence: medium — sample size is …"
- "Recommend X, with the caveat that Y."

Banned phrasings (Growth Hacker §8 spirit):
- "Crushing it"
- "On fire"
- "Up only"
- Any emoji except the threshold pill (rendered separately, not in prose)
- "Total" of anything without a delta

---

## 6. Anti-Hallucination Rules

The dashboard computes deltas. Deltas computed off small samples lie. These rules define when the Data Hub MUST refuse to display a number, and how to fail gracefully.

### 6.1 Sample size thresholds (per metric)

Below the threshold, the metric is shown as "Insufficient data (n={actual})" with a tooltip explaining why. Above the threshold, the metric renders normally. The thresholds derive from a target ±5% margin of error at 95% confidence using normal approximation.

| Metric class | Minimum n | Notes |
|---|---|---|
| **Conversion rates between funnel steps** | n ≥ 30 at the upstream step within the window | Less than 30 trials is too noisy to show as a percentage; show absolute counts instead. |
| **WoW deltas on counts** | both this-week and prior-week counts ≥ 10 | Below 10, show "low volume — see absolute" with both raw numbers visible. |
| **Median time-to-event metrics (T2.7)** | n ≥ 25 completed transitions | Median is unstable on n<25. |
| **Source-level attribution** | n ≥ 5 wallet_connects per source per 7d window | Below 5, fold into "Other" bucket. |
| **Cohort retention curves** | cohort size ≥ 50 | Below 50, cohort row is suppressed entirely. |
| **Viral K (T1.3)** | ≥ 20 referral codes generated in the 30d window AND ≥ 10 referral clicks recorded | K is meaningless on tiny denominators; show "K bootstrapping" instead. |
| **KOL leaderboard rows** | KOL must have ≥ 3 attributed first_trades in window | Below 3, KOL row suppressed (not zero-shown). |
| **Whale Pipeline conversions** | upstream step count ≥ 10 wallets | Whale-tier conversions are inherently small-N; below 10, show counts only. |
| **Insight strip templates (§4)** | per-template trigger condition specifies its own n; default n ≥ 30 if not specified | See §4.2 suppression rules. |

### 6.2 Staleness windows

A metric is "stale" if its source data is older than its window. Stale metrics render with a grey overlay and a "Last updated: {ts}" caption. The threshold pill does NOT update on stale data.

| Endpoint | Fresh < | Stale ≥ |
|---|---|---|
| `/api/funnels/{acquisition,activation,conversion}` | 30min | 30min |
| `/api/funnels/{whale-pipeline,loyalty,referral,retention}` | 2h | 2h |
| `/api/attribution/{channel-roi,whale-origins}` | 6h | 6h |
| `/api/cohorts/:dim` | 6h | 6h |
| `/api/stream/whales` (SSE) | 15s heartbeat | 60s without heartbeat = disconnected banner |
| GA4-derived numbers (current /api/analytics/*) | 1h | 2h |

If the endpoint `503`s, render the previously cached value with a "data temporarily unavailable" overlay, **not** a fake zero or a skeleton-loading state indefinitely.

### 6.3 Confidence floors for displayed claims

The "What Changed?" insight strip and the Weekly Memo "Answer" section both make claims of the form "X up Y% because Z." Each claim has a confidence level computed from sample size + variance + recency.

| Confidence | Compute | Display behavior |
|---|---|---|
| **High** | n ≥ 100 AND data freshness < window AND effect size > 2× std dev of trailing 8 weeks | Render claim plainly, no caveat. |
| **Medium** | n in [30, 100) OR effect size in [1×, 2×] std dev | Render claim with "preliminary signal" suffix. |
| **Low** | n in [10, 30) OR effect size < 1× std dev | Suppress from insight strip; allow in memo appendix only with "early read" tag. |
| **Insufficient** | n < 10 OR data > 2× window stale | Suppress everywhere. |

### 6.4 "Insufficient data" graceful display

Standardize the empty-state component across the dashboard. The card retains its grid position and dimensions; only the body content changes. Variants:

**Variant A — too few samples**
- Headline (top-left, normal weight): "Insufficient data"
- Subtext (small, dimmed): "n = {actual}, minimum {required}"
- Body: greyed-out skeleton of the chart shape, 30% opacity, no shimmer
- No action button — these resolve themselves as data accumulates

**Variant B — endpoint stale or errored**
- Headline: "Data temporarily unavailable"
- Subtext: "Last updated {relative_time} ago"
- Body: the last good value, dimmed to 40% opacity
- Action: small "Retry" link in bottom-right

**Variant C — gated by attribution coverage**
- Headline: "Awaiting attribution coverage"
- Subtext: "Coverage at {pct}% — {pct_needed}% required for this view"
- Body: explanatory tooltip on hover linking to Tracking Specialist doc
- Action: link to "Coverage status" page

### 6.5 The cardinal rule

**Never compute a percentage and display it without showing the underlying numerator and denominator on hover.** If a user hovers any percentage anywhere in the dashboard, a tooltip shows `{num} / {denom}` and the window. Two-decimal percentages are banned; round to 1 decimal place, and if the underlying counts are <100, show 0 decimal places. No "33.333%" anywhere.

---

## 7. Specific Component Specs for Frontend Implementer

This section is for the Sprint 1–3 frontend engineer building against `recharts` (per spec §5.2). Each spec gives: chart type, color logic, drill interaction, and required states. Components are organized by data shape, not by visual category — the engineer should be able to pick the right chart by looking at what their data looks like.

### 7.1 Component selection cheat sheet

| Data shape | Use this Recharts component | Why |
|---|---|---|
| Time series with 1 metric (e.g. T1.1 daily holders) | `<LineChart>` with `<Line dot={false}>` + `<Area>` fill | Cleanest read for trend; area fill at 15% accent opacity gives volume feel |
| Time series with 2 metrics overlaid (e.g. compare mode) | `<LineChart>` with 2 `<Line>` — primary solid, secondary dashed | Visual hierarchy without legend clutter |
| Funnel steps (e.g. Acquisition 4 steps) | `<BarChart layout="vertical">` with custom `<Bar shape={CustomBar}>` PLUS `framer-motion` for fill animation | Recharts has no native funnel; horizontal bars + custom drop-off arrows between gives the funnel feel |
| Source breakdown of a single metric (e.g. 7d volume by source) | `<BarChart layout="vertical">` stacked OR `<PieChart>` with donut | Stacked bar for >5 sources, donut for ≤5 |
| Cohort retention heatmap | **Custom SVG** (NOT recharts) | Recharts heatmap support is poor; custom SVG grid is 30 lines |
| Whale Origin Sankey | **Custom SVG with `d3-sankey`** | Per spec §5.2 — signature piece |
| Whale Watch live ticker | **Pure CSS scrolling list** (`overflow-x: scroll` + scroll-snap) | No chart needed; SSE pushes DOM nodes |
| Big number with WoW Δ + sparkline (heroes) | `<ResponsiveContainer><LineChart>` (sparkline) + plain `<div>` for number | Sparkline = 40px tall, no axes, no grid |
| Gauge (Viral K card) | **Custom SVG arc** | Recharts has no native gauge; `<RadialBarChart>` is close but ugly |
| Funnel by wallet type small-multiples | 4 small `<BarChart>` in a `grid-template-columns: repeat(4, 1fr)` | Composable; reuse the funnel bar component at 25% width |

### 7.2 Color coding logic

Single source of truth: a function `thresholdColor(value, thresholds)` in `lib/chartTokens.ts`.

```typescript
// Pseudocode contract — not for direct copy-paste
type Threshold = { green: number; yellow: number; red: number; higherIsBetter?: boolean };

function thresholdColor(value: number, t: Threshold): 'green' | 'yellow' | 'red' {
  const higherIsBetter = t.higherIsBetter ?? true;
  if (higherIsBetter) {
    if (value >= t.green) return 'green';
    if (value >= t.yellow) return 'yellow';
    return 'red';
  } else {
    if (value <= t.green) return 'green';
    if (value <= t.yellow) return 'yellow';
    return 'red';
  }
}
```

Color tokens (per spec §5.3):
- `green` → `#5ee0a8`
- `yellow` → `#ff9a3c`
- `red` → `#ff5a5a` (NEW — add to spec)
- `neutral` → `#00c896` (existing accent — use for in-band numbers without a threshold)
- `dim` → `rgba(0,200,150,0.35)` (use for comparator series in compare mode)

Threshold objects live next to KPI definitions in `lib/funnelTaxonomy.ts`. The engineer should NOT hardcode thresholds inline in chart components — read from the taxonomy. This makes the Anti-Vanity §8 rules and §2 thresholds enforceable from one place.

### 7.3 Drill-down interaction spec

Every drillable element gets `cursor: pointer` and an `aria-label` describing the drill target.

| Click target | Interaction | What opens |
|---|---|---|
| Funnel step bar | Inline expand panel below the funnel (not modal) | Step detail: count, % from prev, % from first, median time, vs 7d Δ, vs benchmark, plain-English insight, paginated wallet list (50 per page), top 3 sources of users at this step |
| Source bar in §3.1 card 8 | Inline expand panel | Source detail: trailing 30d daily series, attributed wallets list, attributed volume, KOL profile if `source LIKE 'kol_*'` |
| Sankey flow ribbon | Modal (because Sankey is signature visual; modal preserves the picture) | Path detail: source → step → step → step, with counts at each junction |
| Whale ticker row | Modal | Whale profile: wallet (truncated, click to copy), positions table, attributed source, behavior segment, churn risk score |
| Hero card big number | Inline expand panel below the row | Full Tier 2 decomposition tree (§1.2 metrics that feed this hero) |
| Cohort heatmap cell | Bottom panel (per spec §5.5) | Union cohort of wallets in selected cells |
| Insight strip card | Bottom-sheet (mobile-style slide-up) | Full reasoning: what data triggered, what threshold crossed, link to relevant funnel view with pre-applied filters |

All drill-downs are URL-addressable: opening one updates `?drill=<id>` so the state is shareable and back-button navigable.

### 7.4 Empty / loading / error states (so the engineer doesn't have to invent them)

Three canonical components, each ~30 lines. Build once, reuse across all cards.

**`<EmptyDataCard>`** — for §6.4 Variant A (insufficient n)
- Props: `actualN`, `requiredN`, `chartHint` (the shape skeleton to display)
- Render: card frame intact, body shows the chart skeleton at 30% opacity, headline "Insufficient data" + subtext "n = X, minimum Y"
- No animation, no shimmer — these should feel inert, not loading.

**`<LoadingDataCard>`** — for first-paint of in-flight fetches
- Props: `chartHint`
- Render: card frame intact, body shows accent-color (`#00c896`) shimmer at 30% opacity over the chart skeleton shape
- Animation: 1.2s linear shimmer per spec §5.3 `motion.slow`
- Never show this for > 5 seconds; after 5s, switch to error state.

**`<ErrorDataCard>`** — for §6.4 Variant B (stale/errored endpoint)
- Props: `lastGoodValue` (renders dimmed), `lastUpdatedAt`, `errorCode`, `onRetry`
- Render: card frame intact, last good value at 40% opacity, headline "Data temporarily unavailable", subtext "Last updated {relative} ago", bottom-right "Retry" link
- Retry button calls `onRetry` then shows `<LoadingDataCard>` briefly.

**Component file location:** `frontend/components/DataHub/shared/StateCards.tsx`

**One rule that beats all other rules:** **never render a card with the value `0` if `0` could mean "no data" rather than "the value is zero."** This is the single biggest source of dashboard distrust. Distinguish:
- "0 holders this week, here's why" (legitimate zero) — render the number
- "We don't know yet" (unknown) — render `<LoadingDataCard>` or `<EmptyDataCard>`

The data-source contract from the backend MUST therefore distinguish these cases. Suggested response shape:
```json
{ "value": 0, "computed": true, "n": 12345 }   // legitimate zero
{ "value": null, "computed": false, "n": 0 }   // insufficient data
{ "value": 42, "computed": true, "n": null }   // stale — show with overlay
```
Frontend reads `computed` to decide which state component to render. Backend engineer: please honor this contract on every endpoint.

### 7.5 Animation timing

Per spec §5.3:
- Hover transitions: `120ms ease-out`
- Layout shifts (drill open/close): `400ms cubic-bezier(0.4,0,0.2,1)`
- Funnel reveal on first paint: `1200ms cubic-bezier(0.16,1,0.3,1)`, stagger steps by 150ms
- Number tweens: `framer-motion` `<motion.span>` with `transition={{ duration: 0.6, ease: 'easeOut' }}`
- Threshold pill pulse on state change: `600ms ease-out`, scale 1→1.4→1, no continuous looping

Respect `prefers-reduced-motion`: when set, all transitions become instant except number tweens (which become snap-to-value).

### 7.6 Accessibility contract

Every chart MUST have:
- `<title>` and `<desc>` elements inside the SVG (recharts gives you this — use it)
- An accompanying `<table>` with the underlying data, visually hidden but in DOM (`position: absolute; clip: rect(0 0 0 0)` etc.)
- Keyboard focus support — Tab moves through data points, arrow keys move within a chart, Enter triggers the drill-down
- Color-blind-safe — the threshold colors above are validated for protanopia/deuteranopia; never rely on color alone, always pair with shape (the threshold pill is a colored circle AND its position in the corner is consistent)

### 7.7 Single-source-of-truth for source/channel labels

Per Trend Researcher §1 channel ranking, channel labels and Tier badges must be consistent everywhere. Build `frontend/lib/channelTaxonomy.ts`:
```typescript
export const CHANNELS: Record<string, { displayName: string; tier: 'S'|'A'|'B'|'C'; group: 'kol'|'social'|'organic'|'paid'|'community'|'other' }>;
```
The Channel ROI Table, Source Attribution view, source bars on the Funnels view, and the Weekly Memo's channel table all read from this single map. When the Trend Researcher updates rankings, only this file changes.

### 7.8 Implementation order (Sprint 1 priority)

For the Sprint 1 frontend engineer, build in this order to maximize early value:
1. `<StateCards>` component family (used everywhere)
2. `lib/chartTokens.ts` + `thresholdColor` helper
3. Funnel bar chart component (used 7 times, all funnel views)
4. Hero number card with sparkline (used 4 times)
5. Insight strip with §4 templates (one card seeds them all)
6. Source breakdown bar component (used in card 8 + below-fold)
7. Drill-down inline expand panel
8. Whale Watch ticker (CSS-only)
9. Cohort heatmap (Sprint 2)
10. Sankey (Sprint 2)

Each step above should land in the design system with a Storybook entry before being wired to live data, per spec §7.2.

---

## Appendix A — Mapping every KPI to the 11 backend endpoints

This table proves every metric in §1 is computable today without new endpoints.

| KPI | Endpoint(s) | Field path |
|---|---|---|
| North Star (30d repeat volume) | `/api/funnels/conversion` + existing `/api/analytics/kpis` | `conversion.steps[1].uniqueWallets` ∩ position sum |
| T1.1 7d new holders | `/api/funnels/acquisition` | `steps[3].count` filtered to 7d window |
| T1.2 7d volume | `/api/attribution/channel-roi` | `totals.value_usd` |
| T1.3 Viral K | `/api/funnels/referral` | step ratios per §1.4 |
| T1.4 Attribution coverage % | `/api/funnels/acquisition` | `header.attributablePct` (request backend to include) |
| T2.1–T2.3 | `/api/funnels/acquisition` | step ratios |
| T2.4 | `/api/funnels/activation` | step 3 ÷ step 2 |
| T2.5 | `/api/funnels/conversion` | step 2 ÷ step 1 |
| T2.6 | `/api/funnels/whale-pipeline` | step 3 ÷ step 2 |
| T2.7 | `/api/funnels/acquisition?aggregate=median_time` | `steps[3].medianTimeToNextStep` (request backend to compute) |
| T2.8 | `/api/cohorts/day_of_first_trade` | retention curve at day 7 |
| T2.9 | `/api/attribution/channel-roi?source=kol_*` | sum of Tier S/A from `channelTaxonomy` |
| T2.10 | `/api/funnels/acquisition` | `header.stitchedPct` (request backend to include) |

**Backend request:** add three header fields to `/api/funnels/acquisition` response: `attributablePct`, `stitchedPct`, and `medianTimeToFirstTrade`. These are 3 SQL aggregates over `users` + `attribution_events`. Without these, the frontend has to compute them client-side from raw rows — wasteful and slower.

---

## Appendix B — Handoff to Executive Summary Generator

The Executive Summary Generator agent (per spec §6) consumes this doc as follows:
- Section 2 alert thresholds → triggers for memo "RED ALERT" mode (§5.1).
- Section 4 insight templates → seed phrases for the "What Changed?" section of the memo.
- Section 5 template → memo skeleton.
- Section 6 confidence floors → confidence-level computation for memo Answer section.

The ESG agent should NOT reinvent any of these. Suggested implementation: the ESG agent's prompt loads this doc plus `growth-hacker-2026-06-03.md` plus the trailing-week endpoint responses, then fills in placeholders. No new analytical work — the analytics live here.

---

## Appendix C — Handoff to Behavioral Nudge Engine

The Behavioral Nudge Engine consumes the funnel-step bottleneck identification:
- T2.1 / T2.2 / T2.3 (Acquisition step drops) — these are where in-product nudges go.
- T2.4 (KYC drop) — Growth Hacker §3 root causes are the nudge content seed.
- T2.5 (repeat trade) — the "Recommended starter trade" widget (Growth Hacker Day 10) is a behavioral nudge.

The Nudge Engine should subscribe to the §2 alert stream — when a yellow → red transition fires on any Tier 2 metric, that's the signal to ship a nudge targeting that step.

---

## Sign-off

This document is the source of truth for SHIFT RWA's KPI tree, alert thresholds, Data Hub default-view layout, and frontend implementation specs. Changes require explicit sign-off and a new dated version.

**Next review:** 2026-07-03 after first 30 days of new-pipeline data.
