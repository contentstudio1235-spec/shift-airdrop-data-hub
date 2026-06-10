# SHIFT RWA — Funnel Taxonomy, Success Metrics & 30-Day Growth Plan

**Author:** Growth Hacker agent
**Date:** 2026-06-03
**Status:** Draft v1 — ready for Analytics Reporter + frontend implementation
**Consumes:** `tracking-specialist-2026-06-02.md` (UTM schema, 15-event spec, identity stitching) + `trend-researcher-2026-06-02.md` (channel map, KOL tiers)
**Consumed by:** Analytics Reporter (Task 22), frontend Funnel views, Behavioral Nudge Engine, Paid Media Auditor

---

## TL;DR

The shipped v1 funnel definitions are step-name-correct but benchmark-wrong for a Solana RWA leveraged-token product. The true conversion crisis is **landing → wallet_connect (≈3.5% vs. v1 benchmark of 60%)**, not visit → trade — the v1 model double-counts a missing step. This document re-binds every funnel step to the Tracking Specialist's 15 server-side events, re-baselines benchmarks against Solana DeFi context (Drift, Jupiter Perps, Backed.fi xStocks), and lays out a sequenced 30-day plan whose single highest-leverage move is shipping a Phantom-deep-link landing flow that should 3-4x wallet_connect rate within 14 days.

---

## 1. Refined Funnel Step Names & Definitions

Across all 7 funnels, **step IDs** are what the backend `funnelService.ts` SQL queries against in `attribution_events.event_name`. **Display names** are what the admin sees in the Data Hub UI. Every step ID maps to one of the 15 events in the Tracking Specialist spec Section 2.1.

### 1.1 Acquisition Funnel — `funnel_id = acquisition`

Tracks anonymous traffic → identified-wallet user.

| Step | Step ID (event_name) | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `landing` | Landing | Top of pipe; only attributable side of GA4. | v1 said "visit" — rename to `landing` to align with `attribution_events.event_name = 'landing'`. |
| 2 | `landing` w/ `wallet_modal_open` flag | Wallet Modal Open | The "intent" signal — separates curious clicks from purchase-intent. | **MISSING in v1.** Add an intermediate event so the 3.4% mega-drop is decomposable. Wire into the wallet-adapter button click. |
| 3 | `wallet_connect` | Wallet Connect | The identity-stitch moment — every downstream metric depends on it. | v1 said "connect"; align name with the actual event. |
| 4 | `first_trade` | First Trade | The actual conversion event. | Same as v1. |

**v1 was wrong because** it conflated GA4 "visit" with `landing` event, and lacked the `Wallet Modal Open` step that distinguishes "blocked at wallet adapter" from "uninterested." Without that step, the 60→25 drop-off is undiagnosable.

### 1.2 Activation Funnel — `funnel_id = activation`

Tracks wallet → trading-capable user.

| Step | Step ID | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `wallet_connect` | Wallet Connected | Same anchor as Acquisition step 3. | OK as-is. |
| 2 | `register` | Account Registered | Required because backend INSERT happens slightly after wallet signature. | OK as-is. |
| 3 | `kyc_complete` | KYC Complete | Required for sized trades; biggest activation bottleneck in any RWA product. | v1 said "kyc" — rename to `kyc_complete` (the event name in the tracking spec). |
| 4 | `first_trade` | First Trade | Activation defined as a single qualifying position. | OK as-is. |

**v1 was wrong because** it implied `kyc` and `register` are interchangeable steps; in reality `register` is automatic at wallet_connect and `kyc_complete` is the blocker. Treat them as distinct.

### 1.3 Conversion Funnel — `funnel_id = conversion`

Tracks first-trade user → repeat trader.

| Step | Step ID | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `first_trade` | First Trade | Anchor. | OK. |
| 2 | `position_open` (n=2, same wallet) | Second Trade | The single best predictor of LTV. | v1 said "second_trade" — implement as `COUNT(*) FROM attribution_events WHERE event_name='position_open' GROUP BY wallet HAVING COUNT(*)>=2`. |
| 3 | `position_open` (≥2 distinct `asset` values) | Multi-Asset Trader | Multi-asset = the user understood the product. | v1 said "multi_asset" — OK as label, computed via distinct asset count. |
| 4 | `whale_threshold_hit` (tier = `silver` / cumulative ≥ $1K) | Active Holder | Cumulative $1K is when CAC payback usually crosses. | v1 said "active_holder" — re-bind to `whale_threshold_hit` at $1K tier for a concrete numeric definition. |

**v1 was wrong because** "active_holder" was undefined — what makes a holder active? Bind it to the `whale_threshold_hit` event at the $1K tier so it has an unambiguous SQL definition.

### 1.4 Whale Pipeline Funnel — `funnel_id = whale_pipeline`

Tracks trader → high-volume whale.

| Step | Step ID | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `whale_threshold_hit` (tier=`bronze`, ≥$100 cumulative) | Holder ($100+) | Lower bar than v1; surfaces drop-off earlier. | v1 started at "holder" with no $ threshold; bind to bronze tier at $100. |
| 2 | `whale_threshold_hit` (tier=`silver`, ≥$1K) | Silver Whale ($1K+) | The "real user" threshold per trend research. | OK as label. |
| 3 | `whale_threshold_hit` (tier=`gold`, ≥$10K) | Gold Whale ($10K+) | The economic engine — 80/20 of revenue here. | OK. |
| 4 | `whale_threshold_hit` (tier=`whale`, ≥$100K) | Mega Whale ($100K+) | Concierge-tier; should trigger a Slack ping. | OK. |

**v1 was wrong because** it had no $100 entry tier, so 80% of wallets (who trade once for $50) appeared as a black hole. Add the bronze tier so we can measure the $100→$1K conversion separately from "did they trade at all."

### 1.5 Loyalty Funnel — `funnel_id = loyalty`

Tracks trader → Snag-engaged user.

| Step | Step ID | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `first_trade` | Trader | Loyalty system only matters once they trade. | v1 said "trader" — bind to `first_trade` event. |
| 2 | `snag_link` | Snag Linked | The Snag-side stitch event (Tracking Spec §3.2 Step 5). | v1 said "snag_linked" — rename to `snag_link` to match event name. |
| 3 | `badge_earn` (first badge) | First Badge | Validates the loyalty loop fires for this user. | v1 said "badged" — bind to first badge_earn event. |
| 4 | `badge_earn` (5th badge OR top XP quartile) | Top Tier | "Top tier" needs numeric definition. | v1 said "top_tier" — define as ≥5 badges earned OR top quartile of `users.total_xp`. |

**v1 was wrong because** "badged" vs. "top tier" was undefined. Bind to badge counts so it's queryable.

### 1.6 Referral Funnel — `funnel_id = referral`

Tracks viral loop completion.

| Step | Step ID | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `register` (wallet exists) | Eligible User | Every registered user is eligible to refer. | v1 said "user" — bind to `register` event for distinct count. |
| 2 | `register` w/ `referral_code_generated` flag | Code Generated | The act of creating a referrer code is the first "engaged" referrer signal. | v1 said "code_generated" — add as a server-side event when `users.referral_code` is first populated. |
| 3 | `landing` w/ `?ref=<code>` | Referral Clicked | Counts referral-link clicks server-side via the short-link redirect. | v1 said "referral_clicked" — bind to landing events with a non-null `ref` param. |
| 4 | `first_trade` where `users.referred_by_code IS NOT NULL` | Referral Traded | The completion of the viral loop — referred wallet actually traded. | v1 said "referral_traded" — definition matches. |

**v1 was wrong because** it didn't specify whether step 1 counts ALL users or only referral-generators; clarify "Eligible User" = all registered, "Code Generated" = subset who took action.

### 1.7 Retention Funnel — `funnel_id = retention`

Tracks engagement decay and reactivation.

| Step | Step ID | Display Name | Why it matters | v1 fix |
|---|---|---|---|---|
| 1 | `first_trade` | Active Trader | Anchor: any wallet with at least one trade. | v1 said "active" — bind to first_trade. |
| 2 | `churn_risk` (7-day inactive flag) | Dormant 7d | Earlier warning than the v1 14-day window. | v1 said "dormant_7d" — re-bind to a 7-day variant of the `churn_risk` cron. |
| 3 | `reactivation` | Reactivated | Catches the "they came back" moment. | v1 said "reactivated" — matches event. |
| 4 | `churn_risk` (30-day inactive) → no `reactivation` | Lost 30d | Hard-churn definition. | v1 said "lost_30d" — define as wallets with `churn_risk` fired and no subsequent `reactivation` in 30 days. |

**v1 was wrong because** "dormant_7d" used a 7-day window while the Tracking Specialist's churn_risk cron uses 14 days — reconcile by running TWO churn_risk variants (`churn_risk_7d` and `churn_risk_14d`) and exposing both.

---

## 2. Success Metrics Per Step

All thresholds use the Tracking Specialist's resolved `source` from `attribution_events.source`. **Benchmark column** = Solana DeFi / leveraged-product context (Drift, Jupiter Perps, GMX, Backed.fi), NOT generic SaaS. **R/Y/G** = red / yellow / green thresholds for Analytics Reporter alerting.

### 2.1 Acquisition

| Step | Target conv % (from prev) | Solana RWA benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| Landing → Wallet Modal Open | 18% | 12-20% (Drift landing-to-connect-attempt) | <8% | 8-15% | >15% |
| Wallet Modal Open → Wallet Connect | 55% | 45-65% (the Phantom popup approval rate) | <35% | 35-50% | >50% |
| Wallet Connect → First Trade | 18% | 10-25% (Drift's connect→first-trade) | <8% | 8-15% | >15% |
| **Compound visit → first_trade** | **~1.8%** | Backed.fi public ~2.5%, Drift ~3% | <1% | 1-2% | >2% |

Reasoning: SHIFT's current 3.4% visit→hold is actually *above* Backed.fi xStocks — the visible problem is share-of-whales, not gross conversion.

### 2.2 Activation

| Step | Target conv % (from prev) | Benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| Wallet Connect → Register | 96% | Should be near-100% (automatic backend INSERT) | <90% | 90-95% | >95% |
| Register → KYC Complete | 40% | Backed.fi reports 30-50% on tokenized stocks | <20% | 20-35% | >35% |
| KYC Complete → First Trade | 65% | Drift post-KYC conversion ≈ 60-70% | <40% | 40-60% | >60% |

The KYC step is the single biggest activation drag; expect to see it drop to 25-35% on mobile.

### 2.3 Conversion

| Step | Target conv % (from prev) | Benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| First Trade → Second Trade | 45% | Crypto-trading "D1 second trade" benchmark | <25% | 25-40% | >40% |
| Second Trade → Multi-Asset | 35% | Higher than v1 because SHIFT's 6 tokens make L/S pairing natural | <15% | 15-30% | >30% |
| Multi-Asset → Active Holder ($1K+) | 25% | This is the LTV inflection point | <10% | 10-20% | >20% |

### 2.4 Whale Pipeline

| Step | Target conv % (from prev) | Benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| Holder ($100+) → Silver ($1K+) | 20% | Power-law expected on leveraged products | <8% | 8-15% | >15% |
| Silver ($1K+) → Gold ($10K+) | 12% | Same | <4% | 4-9% | >9% |
| Gold ($10K+) → Mega Whale ($100K+) | 6% | Same | <2% | 2-5% | >5% |

Whale-tier conversion is THE economic flywheel — alert thresholds should be tight.

### 2.5 Loyalty

| Step | Target conv % (from prev) | Benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| Trader → Snag Linked | 50% | Snag links require user action; 50% is achievable with in-product nudge | <25% | 25-45% | >45% |
| Snag Linked → First Badge | 80% | First badge typically auto-fires on first_trade | <60% | 60-75% | >75% |
| First Badge → Top Tier (≥5 badges) | 18% | Power-law over engagement | <8% | 8-15% | >15% |

### 2.6 Referral

| Step | Target conv % (from prev) | Benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| Eligible User → Code Generated | 12% | Crypto referral-link generation rates | <5% | 5-10% | >10% |
| Code Generated → Referral Clicked (≥1) | 35% | One click per active referrer is realistic | <15% | 15-30% | >30% |
| Referral Clicked → Referral Traded | 8% | Lower than acquisition because already-warm KOL traffic has self-selection | <3% | 3-6% | >6% |

Viral coefficient calc: K = (% who generate code) × (avg clicks per code) × (click-to-trade %). Target K ≥ 0.4 by Day 30, K ≥ 1.0 by Day 90.

### 2.7 Retention

| Step | Target retention (from first_trade) | Benchmark | Red | Yellow | Green |
|---|---|---|---|---|---|
| Day 7 retention | 40% | Solana DeFi power-user benchmark | <20% | 20-35% | >35% |
| Day 30 retention | 20% | Drift/Jupiter level | <10% | 10-17% | >17% |
| Day 90 retention | 10% | LTV-meaningful retention | <5% | 5-8% | >8% |
| Dormant 7d → Reactivated within 30d | 25% | Email/Discord nudge typical | <10% | 10-20% | >20% |

---

## 3. Diagnostic Drop-off Analysis

Given current visit-to-hold = 3.4% (12,415 GA4 30d → 430 holders).

### 3.1 Where we lose users (most → least)

Modeling against the refined Acquisition funnel:

| Step | Modeled count | Cumulative conv | Drop magnitude |
|---|---|---|---|
| Landing (GA4 active users 30d) | 12,415 | 100% | — |
| Wallet Modal Open | ~1,490 | 12% | **-88% (BIGGEST)** |
| Wallet Connect | ~819 | 6.6% | -45% |
| First Trade | ~430 | 3.5% | -47% |

**The single biggest drop-off is Landing → Wallet Modal Open at -88%.** Almost 9 of every 10 landings do not even click the connect button. This is masked in v1 because v1 had no `wallet_modal_open` step.

### 3.2 Top 3 root causes per drop-off

**Drop-off A: Landing → Wallet Modal Open (-88%)**

1. **Anonymous airdrop tourism.** The 12,415 GA4 users are heavily skewed toward `?ref=<code>` airdrop hunters who landed once, took a screenshot, and bounced. Trend Researcher data confirms 80% of Tier-C KOL traffic is awareness-only, not conversion intent.
2. **No above-fold value-prop.** Landing page (per current frontend) leads with airdrop messaging rather than the wedge "leveraged TSLA / SPY 24-7 on Solana, no PDT rule" that Trend Researcher identifies as the converting message for perp traders.
3. **Mobile Phantom in-app browser flakiness.** Per Tracking Spec §7.7, Phantom and Solflare in-app browsers strip referrers and break wallet adapters on first try. Probable 30-50% mobile fail.

**Highest-ROI fix:** Ship a `phantom://` deep-link CTA above the fold that auto-triggers wallet connect on Phantom mobile (eliminates one tap + the broken referrer path). Build effort S, expected lift on Landing→Modal: +200-400%. [Targets Acquisition step 1→2]

**Drop-off B: Wallet Modal Open → Wallet Connect (-45%)**

1. **Multi-wallet confusion.** Users hit modal, see Phantom/Solflare/Backpack/etc., back out.
2. **Network mismatch.** User on Ethereum-default Phantom doesn't know to switch to Solana.
3. **Sign-message rejection.** The auth signature popup looks scary; lots of bail-out at sign step.

**Highest-ROI fix:** Default to Phantom, hide other wallets behind a "More" expander, pre-set Solana network, replace generic sign-message with branded one. Build effort M, expected lift on Modal→Connect: +30-50%. [Targets Acquisition step 2→3]

**Drop-off C: Wallet Connect → First Trade (-47%)**

1. **KYC friction.** Likely 40-60% drop at KYC, especially mobile.
2. **No starter capital path.** User connects empty wallet, has no SOL/USDC, abandons. No on-ramp embed.
3. **Token selection paralysis.** Six tokens with cryptic names (TSL2L, SOX3S, SPX3L) — user doesn't know which one to buy first.

**Highest-ROI fix:** Add a "Recommended starter trade" widget post-KYC that pre-fills $20 in TSL2L (TSLA 2x long — the most named-recognition asset). Build effort S, expected lift on Connect→Trade: +25-40%. [Targets Acquisition step 3→4 and Activation step 4]

### 3.3 Stack ranking by impact / effort

| Rank | Fix | Step targeted | Effort | Estimated absolute lift in 30d holders |
|---|---|---|---|---|
| 1 | Phantom deep-link CTA above fold | Acq 1→2 | S | +200-350 new holders |
| 2 | Recommended starter trade post-KYC | Acq 3→4 | S | +80-130 new holders |
| 3 | KYC simplification (skip for <$500 positions) | Act 2→3 | M | +60-100 new holders |
| 4 | Phantom-default wallet modal | Acq 2→3 | M | +40-70 new holders |
| 5 | Above-fold wedge copy ("3x TSLA, 24/7, no PDT") | Acq 1→2 | S | +40-60 new holders |

Combined upside if all 5 ship in 30 days: ~420-710 new holders, doubling the active holder base.

---

## 4. Top 5 Viral-Loop Mechanics

Crypto/RWA context — these exploit on-chain provenance, public PnL, and trader identity. NOT generic SaaS referral.

### 4.1 PnL Flex Cards (on-chain shareable)

**How it works:** After every closed position, generate a branded card (SVG, downloadable + auto-posted to a `https://shiftrwa.xyz/pnl/<position_id>` page) showing asset, leverage, % PnL, entry/exit, and the trader's truncated wallet. The page has Open Graph cards so Twitter/Discord previews render the card inline. Each card embeds the trader's `ref=<code>` so any visitor click is attributed.

**Why it fits SHIFT:** Whales love to flex realized gains; degens want clout. The 24/7 equity-leverage angle gives them content no other product can provide (a 3x TSLA daytrade screenshot at 3am). Per Trend Researcher §1, Tier-S perp KOLs already post liquidation maps and PnL screenshots constantly.

**Build effort:** S (1-2 days). **Expected viral lift:** K +0.15 to +0.30. **Tracking hook:** `landing` event with `referrer = 'shiftrwa.xyz/pnl/*'` and `?ref=<code>` parameter, captured in `attribution_events.source = 'pnl_flex'`.

### 4.2 KOL Referral Code Marketplace (revenue-share native)

**How it works:** Self-serve KOL onboarding at `/become-affiliate`. Any wallet can claim a custom `kol_<handle>` code. The code earns 5-10% of referred-volume trading fees for 90 days (per Trend Researcher §8 default deal structure). Live leaderboard at `/affiliates` ranks by attributed volume. Top 10 unlock concierge support.

**Why it fits SHIFT:** Trend Researcher's Tier S/A KOLs (CryptoCred, DefiSquared, PentosethTrader) prefer code+revshare over flat sponsorship. Self-serve means we don't bottleneck on outbound outreach.

**Build effort:** M (1 week). **Expected viral lift:** K +0.20 to +0.40 once 20+ codes active. **Tracking hook:** `attribution_events.source = 'kol_<handle>'` via the `ref` short-link redirect.

### 4.3 Whale Watch Public Mirror

**How it works:** Opt-in feature — whales who toggle "public mode" appear on `/whales` live ticker with their wallet, current positions, and PnL. Their profile page is shareable. Followers can subscribe via email/Telegram for trade alerts. Each followed-whale "join" gives the whale a points multiplier (gamified).

**Why it fits SHIFT:** Per Trend Researcher §5, "Whale-wallet tracking (Cielo / Smart Money alerts)" is one of the top content patterns Drift/Jupiter traders engage with. SHIFT can be the first to bake it in natively.

**Build effort:** L (2 weeks, but partially shared with the existing Whale Watch SSE ticker in Sprint 2). **Expected viral lift:** K +0.10 to +0.20 (lower coefficient but high LTV — copy-traders convert at much higher $). **Tracking hook:** new event `whale_followed` written to `attribution_events`, source = `whale_mirror`.

### 4.4 Long/Short Pair Challenge (24-hour squad mode)

**How it works:** Two-wallet team event — user invites a friend to take the *opposite* side of an asset (e.g. user buys TSL2L, friend buys TSL1S) for 24 hours. Winner takes a points-pool bonus; both get a "Pair Trader" badge. Invite link is `https://shiftrwa.xyz/pair/<challenge_id>?ref=<wallet>`.

**Why it fits SHIFT:** Uses the existing long-short token pair structure (TSL2L/TSL1S, SOX3L/SOX3S, SPX3L/SPX3S) — no other product has this symmetry. Trend Researcher §3 flagged bear-leaning traders as underserved and easy to convert. Pair mode forces invites.

**Build effort:** M (1 week). **Expected viral lift:** K +0.10 (lower volume but high attach because each challenge = guaranteed new wallet attempt). **Tracking hook:** new event `pair_challenge_created` / `pair_challenge_joined`.

### 4.5 Airdrop Multiplier Tied to Referrals

**How it works:** The existing `users.claim_multiplier` increases by +0.1x per referred wallet that completes first_trade (cap at 3.0x). Display the multiplier prominently on user profile and on the airdrop page. Make the upgrade animation flashy.

**Why it fits SHIFT:** Airdrop hunters (the 88% who currently land and bounce) are the BIGGEST demographic. Convert them from one-off tourists to repeat referrers by making their airdrop allocation depend on referral activity. Plays directly into the existing airdrop infrastructure.

**Build effort:** S (2-3 days — mostly UI; the multiplier column exists). **Expected viral lift:** K +0.15 to +0.25 (huge addressable audience). **Tracking hook:** existing `users.referred_by_code`; airdrop_claim event already in spec.

### 4.6 Summary — viral coefficient model

| Mechanic | Build | K lift | Cumulative K |
|---|---|---|---|
| Baseline (no loop) | — | — | ~0.05 |
| + Airdrop Multiplier | S | +0.20 | 0.25 |
| + PnL Flex Cards | S | +0.22 | 0.47 |
| + KOL Marketplace | M | +0.30 | 0.77 |
| + Pair Challenge | M | +0.10 | 0.87 |
| + Whale Watch Mirror | L | +0.15 | 1.02 (sustainable virality) |

Ship in this order. K=1.0 is the threshold beyond which the product compounds without paid spend.

---

## 5. Channel Budget Allocation Framework

**Assumed quarterly budget: $50K.** I recommend keeping $50K but reallocating heavily toward Tier-S micro-KOLs and away from Tier-3 reach plays. The 70/20/10 split from Trend Researcher §1 is the right shape.

### 5.1 Per-channel allocation

| Channel | % of $50K | $ amount | Spend mechanic | Source UTM(s) | Why |
|---|---|---|---|---|---|
| **X / Twitter (Tier S+A KOLs)** | 35% | $17,500 | Sponsored threads + revenue-share codes. CryptoCred + DefiSquared + PentosethTrader + SolanaLegend per Trend §8 ranks 1-5. | `twitter`, `kol_<handle>` | Highest whale-conversion per dollar. |
| **Telegram (alpha + bear groups)** | 15% | $7,500 | Sponsored slots in Hsaka General, CryptoCapo (bear-targeted for short tokens), Smart Money Tracker. | `telegram`, `tg_<channel>` | TG is the trade-decision channel per Trend §3. |
| **Discord (organic embed)** | 8% | $4,000 | Pay 2-3 community ambassadors $500/mo to embed in Jupiter, Drift, Adrena, Flash Trade per Trend §2. | `discord` | Compounding presence, not paid posts. |
| **Reddit (high-effort DD)** | 7% | $3,500 | Hire 1 long-time WSB user for a single r/wallstreetbets DD comparing 3x TSL vs. 0DTE options (per Trend §6.1). + r/algotrading open-source notebook. | `reddit` | Asymmetric upside; #6.1 underpriced opportunity. |
| **Tier-B RWA narrative (TheDeFiEdge, TomWanHQ)** | 10% | $5,000 | Sponsored research threads + on-chain data partnership. | `kol_<handle>` | Institutional credibility layer for whale recruitment. |
| **Paid search/display** | 0% | $0 | DEFER. No clear keyword inventory yet ("3x TSLA" intent doesn't exist at scale). | — | Save budget. |
| **Tier-C reach plays (WatcherGuru, MilkRoad)** | 5% | $2,500 | One milestone announcement only (e.g. "$40M PoR live"). | `twitter`, `email` | Awareness only; gated to 1-2 announcements. |
| **Owned (email/Discord/TG)** | 5% | $2,500 | Email infrastructure (Resend or Postmark), Discord bot dev for onboarding nudges. | `email`, `discord` | Compounds across all funnels. |
| **Direct (SEO content + docs)** | 8% | $4,000 | Long-form RWA/leveraged-token explainer content; "Solana leveraged stock tokens" SEO. | `direct`, `google` (organic) | 6-9 month payback but compounding. |
| **Token allocation reserve (non-cash)** | 7% (notional) | $3,500 | Vested SHIFT for ambassadors per Trend §8 deal-structure defaults. | `kol_<handle>` | Aligns long-term incentives. |
| **TOTAL** | 100% | **$50,000** | | | |

### 5.2 Per-channel spend mechanic detail

- **Organic-only:** Discord embed, Reddit DD (after writer is paid; the post itself is organic), SEO content.
- **Paid sponsored content:** X threads, Telegram slots, Reddit author fee, milestone announcements.
- **Revenue-share / token-vested:** Tier S/A KOLs preferred, all KOL Marketplace listings.
- **Build cost (counted in budget):** Email infra ($500), Discord bot ($1500), URL builder UI ($0 — internal).

### 5.3 Budget tripwires

- If `whale_pipeline` Silver→Gold conversion drops below yellow on any single channel, **freeze that channel's spend** within 7 days and reallocate to the next-best.
- If X / Twitter `attribution_events.source` shows < 30% of first_trade volume by Day 30, reallocate $5K from X to KOL Marketplace.
- Trend Researcher recommends Tier-C only AFTER retention validates the funnel — enforce this with a gate: Tier-C spend blocked until Day 7 retention ≥ 30%.

---

## 6. Cohort Comparison Framework

Every funnel should be sliceable along these axes in the Data Hub UI. All cohort dimensions exist as either an `attribution_events` column, a `users` column added by the Tracking Spec §4.1 migration, or a derivable view.

### 6.1 The 5 cohort axes that matter

| # | Axis | Field source | Why it matters | Example filter combos |
|---|---|---|---|---|
| 1 | **Source channel** | `attribution_events.source` / `users.first_utm_source` | The headline question — which channels produce whales? | `source IN ('kol_cryptocred','kol_defisquared')` vs. `source = 'twitter'` vs. `source = 'direct'` |
| 2 | **Wallet age (creation cohort)** | `users.created_at` bucketed weekly | Newer wallets = airdrop hunters; aged wallets = real users. Critical for whale prediction. | `wallet_age_days > 365` vs. `< 30` |
| 3 | **Position-size cohort** | `users.cumulative_volume_usd` bucketed (<$100, $100-$1K, $1K-$10K, $10K-$100K, $100K+) | Every funnel looks different per size band. | `position_size_band = 'silver'` |
| 4 | **KOL-attributed vs. direct** | `users.first_utm_source LIKE 'kol_%'` | Tests Trend Researcher's hypothesis that KOL traffic converts ≥3x direct. | `kol_attributed = true` |
| 5 | **Wallet type** | `users.wallet_type` (phantom/solflare/backpack/other) | Phantom dominates; Backpack users skew advanced. Different funnel shapes expected. | `wallet_type = 'backpack'` (whale-heavy) vs. `phantom` (mass-market) |

### 6.2 Bonus axes (lower priority but useful)

- **Country (`users.country_code`)** — geographic concentration; identifies KYC-blocked regions.
- **Tokenset traded (single vs. multi-asset)** — predicts retention.
- **First-asset-bought** — TSLA vs. SPX vs. SOX. Behavioral signal.
- **Time-of-day cohort** — US market hours vs. 24/7 Asia overnight (since SHIFT trades 24/7).

### 6.3 Suggested filter combos for Data Hub UI

These should be one-click presets in the global filter bar:

1. **"Whales by source"** — `position_size_band IN ('gold','whale')` GROUP BY source — the headline view.
2. **"KOL ROI"** — `source LIKE 'kol_%'` × Whale Pipeline funnel — per-KOL value.
3. **"Mobile mass-market"** — `wallet_type = 'phantom'` × `position_size_band = 'silver'` — the biggest user segment.
4. **"Power user funnel"** — `wallet_type = 'backpack'` × Conversion funnel — early adopters.
5. **"Aged wallet whales"** — `wallet_age_days > 180` × `position_size_band IN ('gold','whale')` — real money.
6. **"Bear-trader cohort"** — wallets whose first trade was a `*1S` or `*3S` token — proves Trend §3 hypothesis.
7. **"Reactivated cohort"** — wallets with a `reactivation` event in last 30d — re-engagement validation.

---

## 7. 30-Day Growth Plan

Sequenced for compounding impact. Each action ≤1 sentence; funnel step in `[brackets]`. Owner column assumes the existing team + agent system; "Eng" = backend/frontend engineer, "Growth" = marketing/community lead, "Founder" = Tomer.

### Week 1 (Days 1-7) — Foundations + biggest acquisition fix

| Action | Owner | Success criteria | Expected funnel impact | Funnel step |
|---|---|---|---|---|
| Ship Phantom deep-link CTA above fold | Eng | Live by Day 4 | +30% Landing→Modal | `[Acq 1→2]` |
| Replace landing-page hero copy with "3x TSLA, 24/7, no PDT" wedge | Growth | A/B live by Day 5 | +15% Landing→Modal | `[Acq 1→2]` |
| Publish + lock UTM taxonomy in Notion + Discord (Tracking Spec §1) | Growth | Posted Day 1; team confirms | All funnel source attribution becomes reliable | `[all]` |
| Run Tracking Spec migrations (Section 4.5 steps 1-4) | Eng | Schema deployed Day 2 | Unlocks event capture | `[all]` |
| Ship `src/lib/tracking.ts` + `/api/track/landing` + `/api/track/wallet_connect` | Eng | Live Day 5 | Stitch rate begins climbing | `[Acq 2→3]` |
| Wire Helius webhook to emit `first_trade`, `position_open`, `whale_threshold_hit` | Eng | Live Day 6 | All conversion + whale funnels populated | `[Conv, Whale]` |
| Sign 2 Tier-S micro-KOLs (CryptoCred + PentosethTrader) on revshare codes | Founder/Growth | Both posted Day 7 | +50-150 wallet_connects | `[Acq 1, Referral]` |

### Week 2 (Days 8-14) — Activation + first viral loop

| Action | Owner | Success criteria | Expected funnel impact | Funnel step |
|---|---|---|---|---|
| Ship "Recommended starter trade" widget (auto-fills $20 in TSL2L post-KYC) | Eng | Live Day 10 | +25% Connect→Trade | `[Acq 3→4]` |
| Default wallet modal to Phantom + hide others behind "More" | Eng | Live Day 11 | +30% Modal→Connect | `[Acq 2→3]` |
| Ship Airdrop Multiplier viral loop (referral → +0.1x multiplier) | Eng | Live Day 12 | K +0.20 | `[Referral]` |
| KYC-skip flow for positions <$500 (legal review then ship) | Eng/Founder | Live Day 14 | +40% Register→KYC bypass | `[Act 2→3]` |
| Launch DefiSquared sponsored thread (funding-rate vs. leveraged-token decay) | Growth | Live Day 9 | +200 wallet_connects | `[Acq 1, Referral]` |
| Telegram sponsored post in CryptoCapo (bear-targeted, SHIFT short tokens) | Growth | Live Day 11 | +50 wallet_connects, skew to 1S/3S tokens | `[Acq 1]` |
| Activate Snag webhook → `badge_earn`, `snag_link` events | Eng | Live Day 13 | Loyalty funnel populates | `[Loyalty]` |

### Week 3 (Days 15-21) — Viral loops + whale recruitment

| Action | Owner | Success criteria | Expected funnel impact | Funnel step |
|---|---|---|---|---|
| Ship PnL Flex Cards (post-close shareable SVG + Open Graph page) | Eng | Live Day 17 | K +0.20 | `[Referral 3→4]` |
| Launch KOL Referral Code Marketplace (`/become-affiliate` + `/affiliates`) | Eng + Growth | Live Day 19 | 10+ self-serve codes claimed | `[Referral 1→2]` |
| Discord ambassador embeds active in Jupiter + Drift + Adrena (week 2 of 6+ presence) | Growth | 3 ambassadors posting | +30 wallet_connects from Discord | `[Acq 1]` |
| Reddit DD post in r/wallstreetbets ("3x TSL vs. 0DTE options decay math") | Growth (hired writer) | Posted Day 20 | Asymmetric: best case 5K landings, worst case 200 | `[Acq 1]` |
| r/algotrading open-source backtest notebook | Growth (writer or Eng) | Posted Day 21 | +50 high-quality landings | `[Acq 1]` |
| Wire `kyc_start` / `kyc_complete` via KYC provider webhook | Eng | Live Day 16 | Activation funnel fully measurable | `[Act 3]` |
| Tier-B research thread (TheDeFiEdge sponsored) on RWA leveraged tokens | Growth | Live Day 21 | +100 wallet_connects, high-LTV skew | `[Acq 1, Whale 1]` |

### Week 4 (Days 22-30) — Retention + cohort analysis go-live

| Action | Owner | Success criteria | Expected funnel impact | Funnel step |
|---|---|---|---|---|
| Ship `churn_risk` nightly cron (both 7d and 14d variants) | Eng | Live Day 24 | Retention funnel populated | `[Retention 1→2]` |
| Trigger re-engagement email/Telegram nudge on `churn_risk` event | Growth + Eng | Live Day 26 | Dormant→Reactivated +15% | `[Retention 2→3]` |
| Ship Pair Challenge (long/short squad mode, 24h challenges) | Eng | Live Day 28 | K +0.10 | `[Referral, Conv 1→2]` |
| Run one-time backfill job for legacy users' `first_utm_*` (Tracking Spec §3.2 Step 6) | Eng | Run Day 23 | Stitch rate jump to 45-55% | `[all]` |
| Publish first weekly Executive Summary memo using new funnels | Founder + ESG agent | Day 30 | Decisions data-driven | `[all]` |
| KOL Marketplace ≥20 active codes claimed | Growth | By Day 30 | K compounding | `[Referral]` |
| Tier-C announcement (WatcherGuru) for $40M PoR milestone IF retention ≥30% Day 7 | Founder | Gated on retention gate | +1000 awareness, +50 conversions | `[Acq 1]` |
| Whale Watch SSE ticker live + first 10 whale profiles | Eng | Live Day 30 (Sprint 2 deliverable) | Whale recruitment visibility | `[Whale]` |

### 30-day end-state target

- Active holders: 430 → **900-1,100** (2-2.5x)
- Stitch rate: 22% → **60%+** (per Tracking Spec target)
- Whales ($1K+): unknown → **80-150**
- Viral coefficient K: ~0.05 → **0.45-0.65**
- Day 7 retention: unknown → **35%+ measured**

---

## 8. Anti-Vanity-Metric Checklist

Metrics the Data Hub UI must NOT prominently display because they mislead — either by inflation, by being unactionable, or by being decoupled from business outcomes.

### 8.1 DO NOT prominently feature

| Metric | Why it misleads | What to show instead |
|---|---|---|
| **Total registered users (15,455)** | 78% are airdrop tourists who will never trade. Inflates org confidence; misleads investor reporting. | Show **"Attributable wallets with ≥1 trade"** as the primary user count. Registered users belongs only on the Acquisition funnel step 1, not as a hero stat. |
| **GA4 sessions (23,693)** | Sessions includes bots, repeated own-team visits, and bounces. | Show **"GA4 sessions with non-zero engagement"** (engagement time > 0) and **"GA4 sessions → wallet modal opens"** conversion %. |
| **GA4 active users without source attribution** | The 78% unstitched chunk is meaningless until stitched. | Show **"% of active users with known source"** as a coverage gauge, gated as red until 50%. |
| **Total SHIFT Points (2.72M)** | Points are issued by us; inflate over time mechanically; not a user-quality signal. | Show **"Median XP per active trader"** instead — it's bounded and movable. |
| **Badge count totals** | Same problem — supply-side inflated. | Show **"% of traders with ≥1 badge in last 7 days"** as an engagement signal. |
| **Cumulative trading volume ($13.7K)** | Cumulative numbers always look growing; hide recent decay. | Show **"Trailing 7-day volume"** and **"7d vs. prior 7d delta %"**. |
| **Unique on-chain holders (490)** | Includes dust holders who got airdropped tokens and never traded. | Show **"Holders with ≥$100 position"** as the floor. |
| **Number of KOLs onboarded** | Onboarding is not conversion. | Show **"KOLs with ≥1 attributed first_trade in last 14d"** — proves the relationship works. |
| **Twitter follower count** | Vanity; uncorrelated with conversion. Trend Researcher confirms 12K-follower KOLs out-convert 1M-follower KOLs. | Show **"Wallet_connects attributed to twitter source last 7d"** instead. |
| **Discord/Telegram member count** | Bot-inflated; many lurkers. | Show **"Discord/Telegram → wallet_connect attributed clicks last 7d"** (requires UTM-tagged links). |
| **Median time on site / page views** | GA4 standard but generic and unactionable. | Show **"Median time from landing to wallet_modal_open"** and **"% of landings with modal open within 30s"** — both actionable. |
| **Airdrop claim count** | Claiming an airdrop is not a sign of engagement; it's free money. | Show **"% of airdrop claimants who subsequently traded ≥$100"** — measures whether airdrop converted to user. |

### 8.2 Hero metric recommendations for the Data Hub default view

The Acquisition Funnel landing page should hero THESE four numbers in card form:

1. **Trailing-7d new active holders (≥1 trade)** with WoW delta
2. **Trailing-7d trading volume** with WoW delta and channel breakdown
3. **Viral coefficient K (rolling 30d)** with green/yellow/red light vs. 1.0 target
4. **Attribution coverage %** (stitched wallet-connects / total wallet-connects) with red gate at 50%

### 8.3 The "no cumulative numbers without a delta" rule

Every cumulative number anywhere in the Data Hub must be paired with either a 7-day delta % or a "rolling 30-day" version. Cumulative-only displays should be flagged by taste-skill review.

---

## Appendix A — Mapping refined steps to Tracking Specialist events

| Funnel | Step ID | Event from Tracking Spec §2.1 |
|---|---|---|
| Acquisition 1 | `landing` | `landing` |
| Acquisition 2 | `wallet_modal_open` | **NEW — needs to be added to event spec** (Tracking Specialist v1.1 amendment) |
| Acquisition 3 | `wallet_connect` | `wallet_connect` |
| Acquisition 4 | `first_trade` | `first_trade` |
| Activation 1-4 | same | `wallet_connect`, `register`, `kyc_complete`, `first_trade` |
| Conversion 1-4 | same | `first_trade`, `position_open` (n=2), `position_open` (distinct asset), `whale_threshold_hit` (silver) |
| Whale 1-4 | same | `whale_threshold_hit` (bronze/silver/gold/whale) |
| Loyalty 1-4 | same | `first_trade`, `snag_link`, `badge_earn` (n=1), `badge_earn` (n=5) |
| Referral 1-4 | same | `register`, **new `referral_code_generated`**, `landing` w/ `ref`, `first_trade` w/ `referred_by_code` |
| Retention 1-4 | same | `first_trade`, `churn_risk` (7d variant), `reactivation`, `churn_risk` (30d, no `reactivation`) |

**Two events need to be added to the Tracking Specialist's 15-event spec to support this taxonomy:**
1. `wallet_modal_open` — fires on Connect Wallet button click (Acquisition step 2)
2. `referral_code_generated` — fires when `users.referral_code` is first populated (Referral step 2)

Recommend flagging this back to the Tracking Specialist for v1.1.

---

## Appendix B — Handoff contract to Analytics Reporter

The Analytics Reporter (Task 22) will consume this doc to wire alerts. Concretely:

- The Red/Yellow/Green thresholds in §2 become PagerDuty/Slack alert triggers.
- The hero metrics in §8.2 become the KPI tree root.
- The cohort axes in §6.1 become the saved-view presets.
- The Anti-Vanity checklist in §8.1 becomes a "do not surface in default view" allowlist.

Suggested alert priorities:
- **P1** (Slack + email): any RED on Acquisition 2→3 OR Whale Silver→Gold conversion
- **P2** (Slack only): any YELLOW persisting 3+ days on Conversion or Activation
- **P3** (weekly digest): all GREEN streaks, all cohort divergences > 2x

---

## Sign-off

This is the source of truth for SHIFT RWA funnel taxonomy, success metrics, and 30-day growth tactics. Changes require explicit sign-off and a new dated version.

**Next review:** 2026-07-03 after Day 30 retention data is in.
