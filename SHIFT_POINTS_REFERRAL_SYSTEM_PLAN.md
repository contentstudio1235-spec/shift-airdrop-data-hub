# SHIFT RWA — Points Architecture & Referral Engine Plan
**Version:** 1.0  
**Date:** June 9, 2026  
**Status:** Approved for Development

---

## 1. Executive Summary

This document defines the new weighted points architecture and referral commission engine for the SHIFT RWA airdrop platform. The primary objective is to maximise real trading engagement — specifically unique position holding, SHIFT RWA token adoption, and on-chain volume — while rewarding social growth and quality referrals proportionally.

### Core Principles
1. **Position SP is king** — trading activity always scores the most
2. **Referrals are quality-gated** — only active holders generate commission
3. **Social rewards are real but secondary** — no gaming through social alone
4. **Transparency** — users can see exactly how their points break down

---

## 2. Current State

| Signal | Current Treatment | Problem |
|---|---|---|
| Position SP (trading) | 1x | Underweighted vs social |
| Social SP (Snag tasks) | 1x | Equal to trading — misaligned incentive |
| Referral XP (Snag) | 1x | Flat, no quality gate |
| Badge XP | Not awarded | UI shows XP but no actual credit |
| Referral commission | None | No passive reward for bringing active traders |

---

## 3. New Points Architecture

### 3.1 Final Score Formula

```
Final Points = (Position_SP  × 1.5)
             + (Social_SP    × 1.0)
             + (Referral_SP  × 0.5)
```

**No caps applied.** Every point a user earns in any category counts. The multipliers alone ensure the composition naturally favours active traders. A user who only does social tasks will plateau quickly; a user who trades will compound continuously.

### 3.2 Why These Multipliers

| Multiplier | Rationale |
|---|---|
| **Position SP × 1.5** | Every SHIFT RWA token held and every trade generates SP. Boosting this 1.5x directly incentivises holding unique assets, increasing on-chain volume and token adoption — the core business metric. |
| **Social SP × 1.0** | Social tasks (follow X, join Discord, connect wallet) are one-time completion. Keeping them at 1x gives fair credit without overpowering trading. |
| **Referral SP × 0.5** | Referral points are passive — earned by bringing others in, not by trading yourself. Halving them keeps referrers incentivised to grow the community without letting pure referral farming dominate the leaderboard. |

### 3.3 What "Position SP" Includes

Position SP is the sum of:
- XP earned from open positions (multiplier × position size × time)
- XP granted by earned badges (common +100, rare +150, epic +200, legend +300)
- Referral commission SP earned from referred traders (see Section 5)

**Badges grant Position SP, not Social SP** — since badge criteria are all tied to on-chain trading behaviour.

---

## 4. Badge XP Awards (Implemented)

Each badge awards a flat XP bonus when earned. XP is credited to `users.total_xp` exactly once, guarded against duplicates.

| Rarity | XP Granted | Examples |
|---|---|---|
| Common | +100 XP | first_trade, doubled_down, volume_veteran_i |
| Rare | +150 XP | diamond_hands, long_hauler, triple_down |
| Epic | +200 XP | the_og, conviction_stack, referral_king |
| Legend | +300 XP | the_believer, iron_hands, black_swan_buyer |

**The OG Badge Window:** May 26, 2026 (launch) → June 25, 2026 (30 days). Pre-launch beta wallets automatically qualify. After June 25 the badge is permanently closed — locked in history.

---

## 5. Referral Commission Engine

### 5.1 How Referrals Work Now vs New

| | Current | New |
|---|---|---|
| Referrer reward | 100 XP (Snag, one-time on signup) | 100 XP Snag signup bonus **PLUS** ongoing Position SP commission |
| Quality gate | None — anyone who signs up counts | Referred person must hold ≥1 active SHIFT position |
| Commission type | Social XP only | **Position SP** (trading commission is Position SP, not Social) |
| Commission rate | — | 5–10% of referred person's earned Position SP |

### 5.2 Answer: Referrer Gets Both Snag XP + Position SP

| Event | What Referrer Gets | Category |
|---|---|---|
| Referred person **signs up** | +100 XP (one-time) | Social SP (Snag referral) |
| Referred person **opens first position** | Referral becomes "active"; commission starts | — |
| Referred person **earns Position SP** (any trade) | 5–10% of that SP, ongoing | **Position SP** |

**Why Position SP for commission?**  
The referrer is rewarded because they brought in a *trader*, not a social follower. That commission should count toward the same metric it came from — Position SP — further reinforcing the 1.5x weight. This means a referrer who brings in active traders climbs the Position SP leaderboard legitimately.

### 5.3 Commission Tier Structure

Tier is evaluated dynamically based on the **referred person's total earned Position SP** (proxy for engagement, works at testnet scale without USD dependency):

| Referred Person's Position SP | Commission Rate to Referrer |
|---|---|
| No active position open | **0%** — referral inactive, no commission |
| Active position + < 1,000 Position SP earned | **5%** |
| Active position + 1,000–10,000 Position SP earned | **7%** |
| Active position + > 10,000 Position SP earned | **10%** |

Tier upgrades automatically when the referred person crosses thresholds. Commission rate retroactively applies to new SP only (not backdated on crossing).

### 5.4 Monthly Cap Per Referral Pair (Whale Protection)

To prevent a single high-volume referred wallet from generating unlimited passive income for a referrer:

```
Max commission per referrer–referred pair = 500 Position SP / month
```

After hitting 500 SP for that month:
- Referred person continues earning normally
- Commission for that pair pauses until next calendar month
- Referrer still earns commission from all other referred wallets

**This only affects the overflow on one pair, not the referrer's overall cap.**

### 5.5 Rules
- **Single-level only** — no MLM. A refers B, B refers C: A earns from B, not from C.
- **Additive** — referred person keeps 100% of their SP. Referrer commission is a platform bonus on top.
- **Active gate** — if referred person closes all positions, commission drops to 0% until they re-open.
- **No self-referral** — enforced at DB level (wallet cannot refer itself).

---

## 6. Referral Page — Frontend Spec (`/referral`)

New dedicated page at `airdrop.shiftrwa.xyz/referral`.

### 6.1 Hero Section
- Wallet's unique referral link (copy + share on X)
- Total referred users (all-time)
- Active referred traders (currently holding positions)
- Total commission SP earned (all-time)
- Pending commission this month vs monthly cap per pair

### 6.2 Referred Users Table

| Column | Description |
|---|---|
| Wallet (truncated) | Referred person's wallet |
| Status | 🟢 Active / 🔴 No position |
| Positions Open | Count of open positions |
| Total Holding Value | Sum of position_size_usd across open positions |
| Volume Generated | Total position_size_usd across all positions |
| Position SP Earned | Their total Position SP |
| Commission Tier | 5% / 7% / 10% |
| SP Earned for You | Commission SP you've received from them |
| Joined | Date of first position |

Sortable by: Holding Value ↓, Volume ↓, Position SP ↓, Joined ↓

### 6.3 Tier Progress Widget
Shows how many more Position SP the referred person needs before your commission rate upgrades:
```
[==============>       ] 7,230 / 10,000 SP → upgrade to 10% commission
```

---

## 7. Leaderboard Additions (`/leaderboard`)

New sort dimensions alongside the existing Total Points sort:

| Sort Option | What It Ranks By |
|---|---|
| 📈 **Highest Referrals** | Total number of referred wallets (all-time) |
| 💰 **Referred Volume** | Sum of all referred wallets' total position_size_usd |
| 🏦 **Referred Holding** | Sum of all referred wallets
