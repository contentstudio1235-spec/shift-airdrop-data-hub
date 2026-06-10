# Handoff: SHIFT Airdrop — Register, Referral & Leaderboard Redesign

## Overview
Full redesign of three pages in the SHIFT Airdrop Next.js frontend:
1. **`/register`** — Wider layout with weighted points breakdown, queue hero, journey checklist, and feature navigation
2. **`/referral`** — New standalone referral dashboard with commission tiers, share hub, active traders table, and weighted SP formula
3. **`/leaderboard`** — Updated with Final SP weightage formula banner and expanded column context

The project already uses Next.js 14 (App Router), TypeScript, and a custom CSS design system in `globals.css`. All three redesigned files are drop-in replacements for their existing counterparts — no new dependencies.

---

## About the Design Files

The `.html` files in this bundle (`Register.html`, `Referral.html`) are **HTML prototypes created as design references** — they show the intended look, layout, interactions, and information architecture. They are NOT production code to copy directly.

The `.tsx` files (`RegisterContent.tsx`, `ReferralContent.tsx`, `leaderboard-page.tsx`) ARE production-ready TypeScript replacements that should be copied directly into the codebase. The HTML prototypes exist only as visual references.

**Target codebase:** `Shift_Backend_Logic/frontend/` — Next.js 14, TypeScript, custom CSS design system (`globals.css`).

---

## Fidelity

**High-fidelity.** The `.tsx` files are pixel-accurate implementations using the project's existing design system tokens (`var(--mint)`, `var(--amber)`, etc.), CSS utility classes (`.card`, `.btn`, `.badge`, `.stat`, `.progress`, `.section-title`), and component imports. The HTML prototypes match the intended visual output exactly.

---

## Files to Copy

| Source file (in this bundle) | Copy to (in codebase) |
|---|---|
| `RegisterContent.tsx` | `frontend/app/register/RegisterContent.tsx` |
| `ReferralContent.tsx` | `frontend/app/referral/ReferralContent.tsx` |
| `leaderboard-page.tsx` | `frontend/app/leaderboard/page.tsx` |

`Register.html` and `Referral.html` are visual references only — do not copy to the codebase.

---

## Screens / Views

### 1. `/register` — Register Page

**Layout:** Full page width (`--page-max: 1280px`), `padding: 32px 24px`. Was previously capped at `max-width: 640px` — this constraint must be removed.

#### Pre-connect state (no wallet)
- Full-width atmospheric hero section (min-height 480px)
  - Radial gradient background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(38,200,184,0.08), transparent 70%)`
  - Launch bonus badge: `.badge.mint` pill with live-pulse dot
  - H1: `52px`, `font-family: var(--font-space)`, "Trade RWA. **Earn Points.** Win SHIFT." — "Earn Points." uses `.gradient-text`
  - Subtitle: `16px`, `color: var(--text-dim)`, max-width 480px
  - Stats row: 3 panels (2,847+ Registered · 3.0× Launch Bonus · Q3 2026 TGE) in a rounded container with dividers, `background: var(--panel)`, `border: 1px solid var(--border)`
  - "Connect your Solana wallet above to register ↑" hint text
- Feature cards grid: `repeat(auto-fit, minmax(210px, 1fr))`, gap 14px — 4 cards (Airdrop, Leaderboard, SNAG Quests, Referrals)
- "Three steps to earn" grid: `repeat(auto-fit, minmax(240px, 1fr))`, gap 16px — 3 step cards with large ghost number watermarks

#### Loading state
- Skeleton blocks: hero (180px), 4-col stats strip (80px each), two-col grid (420px each)
- Use `.skeleton` class from `globals.css`

#### Registered state

**Launch bonus banner** (conditional, amber or mint gradient based on multiplier value):
- `border-radius: 10px`, `padding: 10px 16px`, flex row with live-pulse dot, label, description, and multiplier value right-aligned

**Queue Hero card:**
- `background: linear-gradient(135deg, var(--bg-2), var(--bg-3))`
- `border: 1px solid rgba(38,200,184,0.22)`, `border-radius: 20px`, `padding: 28px 32px`
- Ambient glow: absolute radial gradient at 22% left / 50% top
- 5-column grid: `auto 1px 1fr 1px auto`, gap 28px
  - **Queue Position**: `#` prefix at 18px mint/55% opacity + main number at `70px`, `color: var(--mint)`, `letter-spacing: -2px`. Below: `.badge.mint` "✦ FOUNDING MEMBER" + `.badge.green` "● SEASON 1"
  - **Dividers**: `background: var(--border)`, `height: 100px`, `width: 1px`
  - **Final SP**: label "Final SP (Weighted)" as `.section-title`, value at `42px`, `font-family: var(--font-space)`. Below: member count in `var(--text-mute)`. Then inline chips: Multiplier (amber, `var(--amber-soft)` bg) + Rank (blue, `rgba(93,164,255,0.08)` bg)
  - **Quick Actions**: `.section-title` + 3 buttons stacked — primary "Share Referral Link" + ghost "View Dashboard" + ghost "Leaderboard"

**Stats Strip:** 4-column grid, gap 12px. Each uses `.stat.card-hover`:
- Position SP / `var(--mint)` / "Weighted ×2.0 driver"
- Social SP / `var(--tier-stock)` / "SNAG · weighted ×1.0"
- Claim Multiplier / `var(--amber)` / "Applied at TGE"
- Leaderboard Rank / `var(--text)` / "of X members"

**Main 2-col grid:** `repeat(auto-fit, minmax(340px, 1fr))`, gap 18px

Left column:
- `ShiftIdCard` component (centered) — props: `handle`, `ticker="SHIFT"`, `rank`, `points=finalSp`, `status="FOUNDING MEMBER"`
- `PointsBreakdown` component (see below)

Right column:
- **Referral teaser card** (amber gradient bg, `border: 1px solid rgba(247,162,59,0.2)`, `position: relative`):
  - Top accent bar: `position: absolute`, `height: 2px`, amber-to-transparent gradient
  - Header: "Referral Program" `.section-title` + description. Right: COMMISSION % chip (amber) + YOUR CODE chip (mint)
  - Two mini-stat panels (flex, gap 10px): "Referral SP Earned" (amber) + "Your Tier" showing tier name + range
  - Referral link input + copy button
  - Full-width amber CTA: "Open Referral Dashboard →" → `/referral`
- **Journey checklist card**: Progress bar + 6 steps with checkboxes, "Go →" links for incomplete steps

**Feature nav strip:** `repeat(auto-fit, minmax(210px, 1fr))`, gap 12px. Same 4 FeatureCard components.

---

#### PointsBreakdown component (inline in RegisterContent.tsx)
```
Formula: Final SP = (Position SP × 2) + (Social SP × 1) + (Referral SP × 0.5)
```
- Header: "Points Breakdown" left + Final SP number right
- HR divider
- 3 rows: label + raw value + multiplier + weighted value + proportional progress bar + subtitle
  - Position SP ×2.0 → `var(--mint)`
  - Social SP ×1.0 → `var(--tier-stock)` (#5da4ff)
  - Referral SP ×0.5 → `var(--amber)`
- Footer total row + "View Referral Dashboard →" amber CTA

**Data sources:**
- `positionSp = userData.totalXp`
- `socialSp = userData.loyaltyPoints`
- `referralSp` → fetch from `/api/dashboard/${wallet}/referrals/stats` → `myStats.totalXpEarned`
- `finalSp = Math.round(positionSp * 2 + socialSp + referralSp * 0.5)`
- `commRate`: 0% (no SP) → 10% (1–999 SP) → 12% (1000–10000 SP) → 15% (>10000 SP)

---

### 2. `/referral` — Referral Dashboard (full standalone page)

**Layout:** `.page.fade-in`, full `--page-max` width

**Back link:** `← Back to Register` → `/register`, `color: var(--text-dim)`, hover to `var(--text)`

**Hero card:**
- `background: linear-gradient(135deg, var(--bg-2), var(--bg-3))`
- `border: 1px solid rgba(247,162,59,0.22)`, `border-radius: 20px`, `padding: 28px 32px`
- Ambient amber glow (absolute, right side)
- Header row: H1 "Referral Dashboard" + `.badge.amber` "SEASON 1" pill + right side: YOUR CODE chip (mint) + COMMISSION chip (amber, `20px` value)
- 4-stat grid (`repeat(auto-fit, minmax(150px, 1fr))`):
  - Total Referrals / `var(--text)`
  - Active Traders (holding ≥ $5 SHIFT) / `var(--green)`
  - Commission Earned (X SP) / `var(--amber)`
  - Pending Balance (X SP) / `var(--text-dim)`

**Formula Banner:**
- `background: rgba(255,255,255,0.02)`, `border: 1px solid var(--border)`, `border-radius: 10px`
- Inline equation: `Final SP =` + three formula chips + "Referral SP weighted at 0.5×" right-aligned
- Referral SP chip uses `var(--amber-soft)` background to highlight it

**2-col grid:** `repeat(auto-fit, minmax(340px, 1fr))`, gap 18px

Left column:
- `ShareHub` — referral link + copy + 4 share buttons (X, Telegram, WhatsApp, Copy). Amber hover on buttons
- `PendingBalanceCard` (existing component, conditional on `pending.pending > 0`)
- `ReferredUsersTable` (existing component)

Right column:
- `CommissionTierCard` — 4 tiers list with current highlighted in amber bg, progress bar to next tier, "Earn +X SP to unlock Y% commission" text, "Earn more Position SP →" ghost CTA → `/airdrop`
- `QualityGateCard` — 4 requirements with green checkmarks, inactive-referral nudge if applicable

**Leaderboard:** `LeaderboardTabs` (existing component, full width below the grid)

**Data fetching:** Parallel `Promise.allSettled` for 3 endpoints:
1. `/api/referral/${wallet}` → `stats` (referralCount, totalVolume, totalHolding) + `legacy`
2. `/api/airdrop/user/${wallet}` → `positionSp` (totalXp), `referralLink`, `referralCode`
3. `/api/dashboard/${wallet}/referrals/stats` → `myStats` (totalReferred, totalXpEarned, activeReferrals)

---

### 3. `/leaderboard` — Leaderboard

**Changes from current version:**
- Mode renamed: `'Points'` → `'Final SP'`
- Formula banner added between controls and user card:
  - Collapsible with "Learn more" toggle
  - Shows: `Final SP = (Position SP ×2.0) + (Social SP ×1.0) + (Referral SP ×0.5)`
  - Expanded state shows 3 explanation cards (one per SP type)
- "Total SP" column header → "Final SP" with `(Pos×2+Soc×1+Ref×0.5)` subtitle
- User card shows formula hint line below wallet address when in Final SP mode
- Podium label "SP" → "Final SP"
- Sorting logic unchanged — `totalSp ?? totalXP` from API is already the weighted final value

---

## Design Tokens Used

All tokens are already defined in `frontend/app/globals.css`:

```css
--mint: #26C8B8
--mint-dark: #1E9E92
--mint-soft: rgba(38,200,184,0.12)
--brand-gradient: linear-gradient(135deg, #26C8B8 0%, #07638C 100%)
--bg: #021C24
--bg-2: #052a32
--bg-3: #073640
--panel: rgba(255,255,255,0.03)
--panel-2: rgba(255,255,255,0.055)
--border: rgba(255,255,255,0.08)
--border-strong: rgba(255,255,255,0.14)
--text: #EDEEEE
--text-dim: #8ba6a4
--text-mute: #5a7472
--amber: #f7a23b
--amber-soft: rgba(247,162,59,0.12)
--purple: #9d6cf5
--green: #38d39f
--green-soft: rgba(56,211,159,0.12)
--tier-stock: #5da4ff
--font-space: 'Space Grotesk', sans-serif
--font-mono: 'JetBrains Mono', monospace
--radius-lg: 14px
--radius-md: 10px
--radius-sm: 6px
```

---

## CSS Classes Used (from globals.css)

```
.page          — max-width 1280px, centered, padding 32px 24px
.card          — panel bg, border, border-radius 14px, padding 20px
.card-hover    — hover: border-strong
.btn.primary   — brand gradient, white text
.btn.ghost     — transparent, border, text-dim
.btn.amber     — amber-soft bg, amber text, amber border
.btn.mint      — mint-soft bg, mint text
.btn.sm        — smaller padding/font
.btn.block     — width 100%
.badge.mint    — mint pill
.badge.amber   — amber pill
.badge.green   — green pill
.stat          — stat card (panel bg, border, radius-md, padding 16px)
.stat-label    — 11px, text-mute, uppercase, 600 weight
.stat-value    — 26px, 700, font-space
.stat-sub      — 12px, text-dim
.progress      — progress bar track (6px height)
.progress > span — fill (mint gradient by default)
.section-title — 13px, 600, font-space, text-mute, uppercase, letter-spacing 0.07em
.skeleton      — shimmer loading placeholder
.fade-in       — fadeIn 0.3s ease both
.live-pulse    — livePulse 2s ease infinite (opacity blink)
.gradient-text — brand gradient text
.hr            — 1px border separator
.font-mono     — JetBrains Mono
.input         — styled text input
```

---

## NavBar

`Referral` is already in `NAV_ITEMS` in `NavBar.tsx`:
```ts
{ label: 'Referral', href: '/referral', soon: false, external: false }
```
Positioned between `Loyalty` and `Leaderboard`. **No NavBar changes needed.**

---

## Existing Components Referenced

These components already exist in `frontend/components/` and are imported as-is:

| Component | Used in |
|---|---|
| `ShiftIdCard` | RegisterContent |
| `Icon` | All pages |
| `LivePill` | Leaderboard |
| `LeaderboardRow` | Leaderboard |
| `PendingBalanceCard` | ReferralContent |
| `ReferredUsersTable` | ReferralContent |
| `LeaderboardTabs` | ReferralContent |

---

## Key Behavioral Notes

1. **Referral XP fetch is non-blocking** — fire it in parallel, update state when it resolves. Don't block initial render waiting for it.
2. **Dashboard rank is cached** — 5-minute TTL via `dashboardCache` Map. Check cache before fetching.
3. **walletChain guard in ReferralContent** — show "Please use Solana Wallet" if `walletChain !== 'solana'`.
4. **Auto-registration on 404** — if `/api/airdrop/user/${wallet}` returns 404, POST to `/api/airdrop/register` first, then re-fetch.
5. **Commission tier computed client-side** from `positionSp`: 0% → 10% → 12% → 15%.

---

## Files in This Bundle

```
README.md                  ← this file
RegisterContent.tsx        ← drop into frontend/app/register/
ReferralContent.tsx        ← drop into frontend/app/referral/
leaderboard-page.tsx       ← drop into frontend/app/leaderboard/page.tsx
Register.html              ← visual reference only (HTML prototype)
Referral.html              ← visual reference only (HTML prototype)
```
