# SHIFT Airdrop — Complete Product Guide

**Version:** 1.0  
**Last Updated:** May 26, 2026  
**Status:** ✅ **PRODUCTION READY**

---

## 📋 Executive Summary

The SHIFT Airdrop system is a fully operational, real-time trading gamification platform built on Solana. Users trade real-world asset (RWA) tokens through Jupiter, accumulate Shift Points (SP) through on-chain activity and time-weighted holding, and compete for a limited SHIFT token airdrop allocation.

**Key Metrics:**
- **31 Achievable Badges** across 5 activity categories + event-driven wins
- **21 Certificate Tiers** (Tier/Mastery/Personality/Seasonal) with multiplier boosts
- **Dynamic Multiplier System** with +2.0x stacking cap + Hall of Fame tier
- **Real-time Leaderboard** with rank-based airdrop allocation
- **KOL Referral Program** with custom codes and multiplier bonuses
- **Live Launch Bonus** (Phase 1: 3.0x, Phase 2: 2.0x, then 1.0x baseline)

---

## 🎮 User Features (Live)

### 1. **Registration & Onboarding**

**Path:** `https://airdrop.shiftrwa.xyz/register`

**What Users See:**
- Wallet connection (Phantom, Backpack, Solflare, MetaMask, MagicEden, TrustWallet, Jupiter)
- Queue position (founding member tier)
- Referral code system (shareable link)
- Task ladder (5 tasks = social verification + wallet + first trade)
- Launch bonus banner (current phase multiplier)
- SHIFT ID card (foundational NFT-like card)

**Referral System:**
- **Default code:** First 6 chars of wallet (e.g., `A5XstH`)
- **Custom codes:** KOLs get branded codes like `SHIFT-AXEL-VIP`
- **Bonuses on registration:**
  - Standard referral: +1.0x (no bonus)
  - KOL dynamic: +1.5x (forward-only)
  - KOL permanent: +2.0x (retroactive to all XP)
- **Referrer incentives:**
  - Standard referral: +250 XP per signup
  - KOL referral: +500 XP per signup

**Launch Bonus Phases:**
- **Phase 1 (Week 1):** 3.0x multiplier on all earnings
- **Phase 2 (Week 2):** 2.0x multiplier on all earnings
- **Baseline (Week 3+):** 1.0x (no bonus)

---

### 2. **Airdrop Dashboard**

**Path:** `https://airdrop.shiftrwa.xyz/airdrop`

**What Users See:**

#### Stats Strip
| Stat | Description |
|------|-------------|
| **Total SP** | Cumulative Shift Points earned |
| **Your Rank** | Leaderboard position (#1 = highest) |
| **Claim Multiplier** | Personal airdrop multiplier (1.0–5.0x) |
| **Weekly SP** | Projected XP earnings this week |

#### Holdings Tab
Shows all open positions with:
- Asset name (e.g., "SPX3L", "TSL")
- Weeks held
- Current multiplier (increases weekly)
- Next multiplier (when available)
- XP earned per week
- Progress bar (% toward next milestone)

#### Badges Tab
- **Activity badges** (31 total) — earned by hitting milestones
- **Event badges** (5 total) — earned by trading during special windows
- Rarity colour-coded (Common=grey, Rare=blue, Epic=purple, Legendary=gold)
- Shows description, XP value, earned status
- **All 31 badge icons rendered with real PNG artwork**

#### Events Tab
Public events feed:
- FOMC announcements
- Earnings windows (Tesla, etc.)
- Macro events (inflation, geopolitical)
- Each event shows: name, type, active status, eligible assets

#### Right Sidebar
- **Points card** with multiplier ring visualization
- **Claim multiplier breakdown** (badges, referrals, streaks, etc.)
- **Referral card** with branded link + social share buttons (Twitter, Telegram, Discord, WhatsApp)
- **Copy, share, or open** the referral link directly

---

### 3. **Leaderboard**

**Path:** `https://airdrop.shiftrwa.xyz/leaderboard`

**Features:**
- Real-time rank (#1 through N)
- Total XP / Shift Points
- Multiplier display (claim mult, tier)
- Badge count per user
- Top 100 visible, pagination

---

### 4. **Certificates**

**Path:** `https://airdrop.shiftrwa.xyz/certificates`

**Status:** ✅ **Live preview grid** with all 21 certificate icons

**What's Shown:**
- **Tier Certificates (4):** Bronze (top 25%), Silver (top 10%), Gold (top 5%), Platinum (top 1%)
- **Mastery Certificates (5):** Comeback Kid, Iron Stomach, Profit Maximizer, Risk Manager, Timing Master
- **Personality Certificates (7):** Analyst, Champion, Investor, Predator, Rogue, Sage, Virtuoso
- **Seasonal Certificates (5):** Most Active, Most Profitable, Top 25%/10%/1%

Each cert shows:
- Full-resolution icon
- Name & description
- Multiplier boost (`+5% permanent`, `+20% dynamic`, etc.)
- Category tag

**Minting:** Currently Season 1 preview — TGE will mint these as on-chain NFTs to winner wallets.

---

### 5. **Wallet Connections**

**Supported Wallets:**
1. ✅ **Phantom** (Primary Solana wallet)
2. ✅ **Backpack** (Solana-native)
3. ✅ **Solflare** (Solana-native)
4. ✅ **MagicEden** (Solana-native)
5. ✅ **MetaMask (Solana mode)** (EVM → Solana bridge)
6. ✅ **TrustWallet** (Multi-chain)
7. ✅ **Jupiter** (DEX-integrated)

**Connection Flow:**
- Click "Connect Wallet" → modal lists all options with icons
- Auto-reconnect on page load (onlyIfTrusted flag)
- Account change listeners detect wallet switch/disconnect
- Real-time balance sync

---

## 🎯 Admin Features (Live)

### 1. **KOL Whitelist Management**

**Path:** `https://airdrop.shiftrwa.xyz/admin/kol`

**What Admins Can Do:**

#### Add/Edit KOL
- Wallet address
- Custom code (e.g., `SHIFT-AXEL-VIP`)
- Display name (shown on register page)
- Multiplier bonus (1.0–2.0x range)
- Multiplier type (Dynamic or Permanent)
- Notes (internal admin notes)
- Active/Inactive toggle

#### View KOL Details
Click any KOL row to expand:
- **Referral link:** Full URL with copy button & open link button
- **Statistics:**
  - Total referrals
  - Bonus applied (count)
  - Pending bonus (count)
- **Recent referrals:** Table of last 10 referees with:
  - Referee wallet (abbreviated)
  - Referee's total XP
  - Bonus multiplier applied
  - Bonus status (Applied/Pending)
  - Referral date

#### KOL Leaderboard
`GET /api/admin/referrals/leaderboard`
- All active KOLs ranked by total referrals
- Applied vs pending bonus counts
- Aggregate referee XP

---

### 2. **Referral Configuration**

**Endpoints:**
- `GET /api/admin/referrals/config` — View current settings
- `PATCH /api/admin/referrals/config` — Update invite XP bonuses

**Configurable:**
- Standard invite XP (currently 250)
- KOL invite XP (currently 500)
- Multiplier ranges (1.0–2.0x)
- Audit trail of all changes

**Documented Requirements:**
Referral is counted when:
1. Valid code format (alphanumeric + hyphens, 4–32 chars)
2. Different referrer and referee wallet
3. One referrer per user (first code wins)
4. Successful registration completion
5. Code is active (KOL or standard wallet-based)

---

### 3. **User Management**

**Path:** `https://airdrop.shiftrwa.xyz/admin/users/:wallet`

**What Admins Can See:**
- Wallet address
- Total XP earned
- Claim multiplier (breakdown by source)
- Badge count & list
- Certificate count
- Current streak
- Multiplier composition:
  - Base multiplier
  - Badge multipliers (top 3 badges at full value, rest at half)
  - Hall of Fame bonus (if eligible)
  - Stacking cap status (`cap_reached` or `under_cap`)

---

### 4. **Badge Management**

**Path:** `https://airdrop.shiftrwa.xyz/admin/badges`

**Capabilities:**
- List all 31 badge templates with:
  - Template key (e.g., `doubled_down`)
  - Category (conviction, buying_dip, etc.)
  - Display name
  - Description
  - Multiplier value
  - Duration type (permanent, dynamic, provisional)
  - Hall of Fame tier (yes/no)

- Award badge to wallet manually
- Revoke badge from wallet
- View all badges earned by a user

---

### 5. **Certificate Management**

**Path:** `https://airdrop.shiftrwa.xyz/admin/certificates`

**Capabilities:**
- List all 21 certificate templates
- Create new certificates (name, category, multiplier, tier)
- Award certificate to user
- Revoke certificate
- Track multiplier boosts per user

---

### 6. **Launch Configuration**

**Path:** `https://airdrop.shiftrwa.xyz/admin/configuration`

**Configurable Phases:**
- Phase 1: Start date, end date, multiplier (default 3.0x)
- Phase 2: Start date, end date, multiplier (default 2.0x)
- Phase 3: Start date, end date, multiplier (default 1.0x)
- Toggle launch bonus on/off globally
- Audit trail

**Live Updates:**
Frontend polls `/api/admin/launch-config` every 10 seconds → real-time UI refresh on admin changes

---

### 7. **Admin Dashboard**

**Path:** `https://airdrop.shiftrwa.xyz/admin/dashboard`

**Metrics:**
- Total registered users
- Total XP in ecosystem
- Badges earned (last 30 days)
- Certificates awarded (last 30 days)
- Hall of Fame tier count
- Average claim multiplier across users
- Recent admin activity log (last 20 actions)

---

### 8. **Audit Trail**

**Path:** `https://airdrop.shiftrwa.xyz/admin/audit`

**Tracked Actions:**
- Badge awarded/revoked (who, when, which badge)
- Certificate awarded/revoked (who, when, reason)
- KOL added/updated/deactivated (wallet, code, changes)
- Launch phase updated (new multiplier, reason)
- Config changes (XP bonuses, rules, reason)
- User lookup (for security)

---

## 🔧 Backend Systems (Always-On)

### 1. **Real-Time XP Calculation Engine**

**Every 60 seconds:**
- Scan all open positions across all users
- For each position:
  - Calculate hours held since `opened_at`
  - Determine current multiplier (based on weeks held)
  - Apply badge stacking multiplier (top 3 badges full, rest half, cap at 2.0x)
  - Apply referral multiplier (dynamic or permanent)
  - Apply launch bonus (current phase)
  - Compute: `XP = log₁₀(position_size_usd) × 100 × launch_bonus × claim_multiplier`
  - Prorate by hours held since last calc
  - Update `total_xp` on users table

**Automatic Badge Checking:**
- SHIFT Holder: Open position ≥ $100
- Diamond Hands: 30+ days held (any token)
- Long Hauler: 90+ days held
- The Believer: 180+ days held (Hall of Fame)
- Volume Veteran I/II/III: Cumulative volume thresholds

---

### 2. **Badge Rule Engine (31 Badges)**

Template-driven badge system. Each badge is evaluated against rules at registration and periodically:

**Conviction Adding (4):**
- Doubled Down: Added to position after -5% drop
- Triple Down: Added 3+ times during -10% drawdown
- Pyramid Up: Added 3+ times as position rose +10%
- Conviction Stack: 5+ separate adds over 30+ days

**Buying Dip (6):**
- Dip Buyer: Opened on -3%+ day
- Crash Buyer: Opened on -5%+ SPX day (with bonus)
- Black Swan Buyer: Opened on -10%+ SPX day (max bonus)
- Momentum Rider: Opened on +3%+ day
- Breakout Buyer: Opened within 24h of 52-week high
- New High Holder: Opened at ATH, held 30+ days

**Short Conviction (5):**
- First Short: First short ever
- Top Caller: Shorted within 24h of 52-week high
- Earnings Short: Shorted into earnings, closed profitable
- Squeeze Survivor: Held through +10% squeeze, closed profitable
- Macro Bear: Held short 30+ days

**Drawdown / Duration (7):**
- Negative 10/20% Survivor: Held through -10%/-20% without closing
- Iron Hands: Held through -30%+ and closed profitable (Hall of Fame)
- Diamond Hands: Held 60+ days
- Long Hauler: Held 90+ days
- The Believer: Held 180+ days (Hall of Fame)
- Multi-Earnings Holder: Held through 2+ earnings

**Volume & OG (4):**
- Volume Veteran I: $10k+ cumulative
- Volume Veteran II: $100k+ cumulative
- Volume Veteran III: $1M+ cumulative
- The OG: Active in first 30 days

**Event-Driven (5):**
- Earnings Conviction: Opened 24h before earnings
- Geopolitical Trade: Opened during geo event
- Fed Day Trade: Opened on FOMC day
- CPI Bet: Opened on CPI day
- News Reactor: Opened within 60m of headline

---

### 3. **Multiplier Stacking System**

**Per User:**
- Base: 1.0x
- Badge stacking:
  - Top 3 badges: Full multiplier value
  - Remaining badges: Half multiplier value
  - Hard cap: +2.0x (across badges alone)
- Referral multiplier: +0.5x to +1.0x depending on KOL tier
- Launch bonus: ×1.0, ×2.0, or ×3.0 (applied to all earnings)
- Hall of Fame tier: Bypass +2.0x cap, add +0.10x premium

**Final Claim Multiplier:**
`claim_multiplier = min(badge_stacking, 2.0) + hall_of_fame_bonus`

---

### 4. **Referral Multiplier Application**

**On Registration:**
- User enters referral code (or inherits from URL param)
- Code resolved to: KOL wallet, multiplier bonus, multiplier type
- Two types:
  - **Dynamic:** Multiplier applies only to XP earned AFTER registration
  - **Permanent:** Multiplier applies retroactively to ALL XP (including future)
- Stored in `referrals` table
- Applied immediately or on next XP calc cycle

**Tracking:**
- `user_dynamic_multipliers` table tracks all active dynamic multipliers
- Expires at configured interval (or null = never expires)
- Effective dynamic multiplier = MAX of all active records

---

### 5. **Anti-Farm & Wash-Trade Detection**

**Implemented:**
- Minimum position size: $100 USD
- Minimum hold duration: 24 hours (or flagged)
- Wash-trade detection: Same token, buy/sell within short window, flagged
- Cooldown between same-asset trades: 6 hours minimum
- Max drawdown tolerance: 50% before flagging

**Admin Visibility:**
- Flagged positions excluded from XP calculation
- Manual review via admin dashboard
- Reversal/approval workflow

---

### 6. **Live Event System**

**Admin Can Create Events:**
- Event name (e.g., "Tesla Earnings")
- Type: `twitter|fomc|earnings|macro|ai`
- Start/end time (UTC)
- Eligible assets (which tokens give badge)
- Badge reward (which badge to award)

**User Experience:**
- Events tab on dashboard shows live events
- Automatic badge award when:
  - User trades eligible asset during event window
  - Event is marked active
  - User meets secondary conditions (hold duration, profit, etc.)

---

## 📊 Data Models

### Core Tables

**users**
```
wallet, total_xp, claim_multiplier, current_streak, 
permanent_multiplier, dynamic_multiplier, referral_code, 
referred_by_wallet, created_at, last_active
```

**positions**
```
id, wallet, asset, asset_mint, position_size_usd, token_amount, 
price_at_open, opened_at, closed_at, status (open|closed), 
last_xp_calc, xp_per_week, current_multiplier, next_multiplier
```

**kol_whitelist**
```
wallet, custom_code, display_name, multiplier_bonus, 
multiplier_type (dynamic|permanent), is_active, notes, created_at
```

**referrals**
```
id, referred_wallet, referrer_wallet, code_used, 
is_kol_referral, bonus_multiplier, bonus_type, bonus_applied, referred_at
```

**badges**
```
id, badge_name, wallet, earned_at, description, multiplier_value, 
earned, category (activity|event), icon, xp_value
```

**user_dynamic_multipliers**
```
wallet, multiplier_value, reason, source (kol_referral|badge|seasonal), 
activated_at, expires_at, is_active
```

**badge_rule_templates**
```
template_key, category, display_name, description, multiplier_value, 
duration_type (permanent|dynamic), is_hall_of_fame, parameters
```

---

## 🎨 Frontend Asset Library

### Badges (31 icons)
All stored in `frontend/public/badges/`:
- `conviction_*.png` (4 files)
- `buyingdip_*.png` (6 files)
- `shortconviction_*.png` (5 files)
- `drawdown_*.png` (7 files)
- `volumeog_*.png` (4 files)
- `eventdriven_*.png` (5 files)

### Certificates (21 icons)
All stored in `frontend/public/certificates/`:
- `tier_*.png` (4 files: bronze, silver, gold, platinum)
- `mastery_*.png` (5 files)
- `personality_*.png` (7 files)
- `seasonal_*.png` (5 files)

### Dynamic Rendering
- BadgeCard component renders PNG via `next/image`
- Earned badges: full opacity, rarity-coloured glow
- Locked badges: 35% opacity, greyscale filter
- Certificates page: colour-coded sections (blue/purple/gold/mint)

---

## 📱 Routes & Pages

| Route | Status | Purpose |
|-------|--------|---------|
| `/` | ✅ Live | Landing page |
| `/register` | ✅ Live | Onboarding, queue, task ladder |
| `/airdrop` | ✅ Live | Main dashboard (holdings, badges, events) |
| `/leaderboard` | ✅ Live | Public ranking |
| `/certificates` | ✅ Live | Certificate grid preview |
| `/dashboard` | ✅ Live | User stats summary |
| `/trade` | 🔗 Coming | Link to Jupiter DEX |
| `/admin/kol` | ✅ Live | KOL management + referral tracking |
| `/admin/users/:wallet` | ✅ Live | User detail view |
| `/admin/badges` | ✅ Live | Badge templates & award |
| `/admin/certificates` | ✅ Live | Certificate management |
| `/admin/configuration` | ✅ Live | Launch phase config |
| `/admin/dashboard` | ✅ Live | System metrics |
| `/admin/audit` | ✅ Live | Admin activity log |
| `/r/[code]` | ✅ Live | Referral link (redirects to `/register`) |

---

## 🚀 Launch Status

### ✅ Fully Implemented & Tested
- [x] Wallet connections (7 wallet types)
- [x] User registration & queue system
- [x] Real-time XP calculation
- [x] 31 badge system with automatic evaluation
- [x] 21 certificate templates
- [x] Multiplier stacking (2.0x cap + Hall of Fame)
- [x] Launch bonus phases (3.0x → 2.0x → 1.0x)
- [x] Referral code system (standard + KOL)
- [x] Dynamic & permanent multiplier types
- [x] KOL whitelist management
- [x] Referral tracking & leaderboard
- [x] Admin dashboard & audit trail
- [x] Real-time leaderboard
- [x] Anti-farm & wash-trade detection
- [x] Event system (FOMC, earnings, macro, etc.)
- [x] Badge & certificate icons (all 52 PNGs)
- [x] Position tracking (hold time, multipliers, XP/week)

### 🔄 In Production, Live Polling
- [x] XP engine (every 60s)
- [x] Badge evaluation (on action + periodic)
- [x] Multiplier recalc (on position open/close)
- [x] Launch bonus (real-time per phase)

### 📋 Coming Soon (Season 2)
- [ ] On-chain certificate minting (TGE)
- [ ] Airdrop claim smart contract
- [ ] SHIFT token distribution
- [ ] Leaderboard season splits
- [ ] Advanced trading metrics

---

## 🔐 Security & Compliance

**Implemented:**
- Admin passcode protection (all admin endpoints)
- Wallet validation (44-char Solana addresses)
- Referral code format validation (alphanumeric + hyphens)
- XP calculation audit trail (who earned what, when)
- Wash-trade detection
- Position size & hold-duration minimums
- Input sanitization on all endpoints

**Monitoring:**
- Real-time error logging
- Failed task tracking
- Badge award audit trail
- User lookup audit trail

---

## 📞 Support & Troubleshooting

### Common Issues

**"User not found" on admin lookup**
- Solution: User exists but hasn't completed registration. Run backfill or manually award starter badge.

**Multiplier not applying**
- Check: Is position > $100 USD? Is it > 24 hours old? Are there competing multipliers capping the value?
- Launch bonus overrides everything — if Phase 1 is active, everyone gets 3.0x regardless of other bonuses.

**Referral code not recognized**
- Check: Is the code 4–32 chars? Is it alphanumeric + hyphens only? Is the KOL active in `kol_whitelist`?

**Badge awarded but not showing**
- Check: Did the user refresh the page? Is the badge active in `badge_definitions`?

---

## 📧 Contact & Coordination

**Product & Marketing:** Check feature flags, launch dates, messaging
**Backend Ops:** Real-time XP engine, badge evaluation, event setup
**Admin Team:** User issues, manual badge/cert awards, fraud reviews

---

## 📎 Appendix: API Endpoints Summary

### Public API
- `GET /api/airdrop/launch-config` — Current phase & multiplier
- `GET /api/airdrop/user/:wallet` — Dashboard data
- `GET /api/airdrop/positions/:wallet` — Holdings list
- `GET /api/airdrop/badges/:wallet` — Earned badges
- `GET /api/airdrop/events` — Event feed
- `GET /api/airdrop/leaderboard` — Public ranking
- `GET /api/airdrop/ref/:code` — Resolve referral code
- `POST /api/airdrop/register` — Register user

### Admin API (Requires `x-admin-key` header)
- `GET /api/admin/kol` — List all KOLs
- `POST /api/admin/kol` — Add KOL
- `PATCH /api/admin/kol/:wallet` — Update KOL
- `DELETE /api/admin/kol/:wallet` — Deactivate KOL
- `GET /api/admin/kol/:wallet/referrals` — KOL referral details
- `GET /api/admin/referrals/leaderboard` — KOL rankings
- `GET /api/admin/referrals/config` — Referral settings
- `PATCH /api/admin/referrals/config` — Update referral settings
- `GET /api/admin/users/:wallet` — User detail
- `GET /api/admin/badges` — List badge templates
- `POST /api/admin/badges/:wallet` — Award badge
- `DELETE /api/admin/badges/:wallet/:templateKey` — Revoke badge
- `GET /api/admin/certificates/:category` — List certs
- `POST /api/admin/certificates/award/:wallet/:certificateId` — Award cert
- `GET /api/admin/launch-config` — Phase config
- `PATCH /api/admin/launch-config/phase/:phase` — Update phase
- `PATCH /api/admin/launch-config/toggle` — Toggle bonus on/off
- `GET /api/admin/dashboard` — System metrics
- `GET /api/admin/audit` — Admin activity log

---

**Document Version:** 1.0  
**Last Updated:** May 26, 2026 — All systems operational, ready for marketing campaign.
