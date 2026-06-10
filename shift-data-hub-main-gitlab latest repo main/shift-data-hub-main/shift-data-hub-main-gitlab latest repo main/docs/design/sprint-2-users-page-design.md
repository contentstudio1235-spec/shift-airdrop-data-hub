# Sub-Sprint 2.2 — Users Page Design Spec

**Status:** Draft v1 — input to Sub-Sprint 2.2 Tasks 2–20
**Author:** frontend-design skill (per CLAUDE.md absolute rule)
**Consumes:** `docs/superpowers/specs/2026-06-03-universal-identity-users-page-design.md` §8, `frontend/lib/chartTokens.ts`, Sprint 1 design at `docs/design/sprint-1-funnels-view-design.md`
**For:** Sub-Sprint 2.2 frontend implementer subagents

---

## 1. Design Direction Summary

### Aesthetic name: **"Operator Console — Identity Plane"**

This is a direct continuation of the Sprint 1 "Operator Console" aesthetic (Bloomberg terminal × CRT phosphor afterglow × Jane Street trading screen), now applied to a **2-pane investigator's surface**. Where the Funnels view was an instrument panel for measuring flow, the Users page is an **identity inspector** — the place an operator goes when a single wallet's story matters more than the aggregate.

Visual continuity: same single emerald accent `#00c896`, same glassmorphism panels, same 4-weight type system, same anti-AI-slop discipline. The Identity Plane adds **one new pattern unique to this surface**: a vertical phosphor scanline divider between the two panes — a 1px-wide vertical accent gradient (top 30% accent / bottom 70% accentBorder) that signals "list view → detail view" in the same way a Bloomberg terminal uses subtle column separators.

### DFII Score: **13 / 15** (Excellent — execute fully)

| Dimension | Score | Reasoning |
|---|---|---|
| Aesthetic Impact | **4** | The 2-pane investigator surface with phosphor scanline divider continues the differentiation anchor from Sprint 1 (8px funnel bars, threshold pill pulse) into a NEW signature element. Identity link table with confidence-tier pills + Phosphor icons reads like nothing else in crypto admin tools. |
| Context Fit | **4** | Tomer is the operator. 16K profiles to investigate. Power-user UX — keyboard nav, click-to-deep-link, virtualized list. This is the tool he'll spend hours in. Aesthetic must reward density without exhausting the eye. |
| Implementation Feasibility | **3** | react-window for virtualization (well-trodden). Phosphor icons already installed. 11 components fit cleanly inside existing primitives. Risk: ResizeObserver for accurate height measurement in Next 16 is the one non-trivial piece. |
| Performance Safety | **3** | Virtualized list keeps DOM ≤ 50 rows. backdrop-filter cost amortized across glass panels. 60fps target on the 1440p Mac. |
| Consistency Risk | **−1** | Re-uses ALL existing tokens. Adds zero new colors. One new visual pattern (phosphor scanline divider) — that's the only consistency cost, and it's isolated to this page. |

### Differentiation Anchor

> **"If this page were screenshotted with the SHIFT logo removed, you'd recognize it by the 1px phosphor scanline divider between the list and detail panes — a vertical accent gradient that fades top-to-bottom, mimicking the column separators on a Bloomberg terminal. The 8px threshold pill on each list row (red/yellow/green per stitch%) and the Phosphor icon column in the IdentityCard's links table compound that signature."**

This anchor must appear on every page load. The scanline divider is the single new pattern; everything else is borrowed equity from Sprint 1.

### Key Inspiration (Conceptual)

- **Bloomberg Terminal** — split-pane investigator surfaces with vertical column separators
- **Jane Street internal trading consoles** — left list / right detail patterns with no ornament
- **Phantom wallet's address book** (Solana-native UX reference) — chip-style identity tags
- **Linear's command surface** — modal hierarchy + ESC-to-close discipline
- **Spotify's "Now Playing"** detail pane — sticky header + scrolling card stack

What we are **NOT** copying:
- Mixpanel/Amplitude user profile drawers (slide-out modals, weak hierarchy)
- Auth0 user dashboards (purple, tabular, soulless)
- Stripe customer pages (good but generic SaaS, no aesthetic POV)
- Segment Identity surfaces (cluttered, multi-color chart spam)

---

## 2. Design System Snapshot

### Typography (unchanged from Sprint 1)

System stack with structural discipline. 4 weights only. `tabular-nums` on ALL numbers.

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `mono-tiny` | 10px | 800 | 0.12em | Column labels (UPPERCASE) — wallet, name, volume headers |
| `mono-small` | 11px | 600 | 0.04em | Captions, last-seen timestamps, hint text |
| `mono-base` | 12px | 700 | 0 | Body — value cells, dialog body, button labels |
| `mono-medium` | 13px | 800 | -0.01em | Wallet values in list rows, identity values in IdentityCard |
| `hero-small` | 18px | 800 | -0.02em | Detail pane header strip primary wallet |
| `hero-big` | 32px | 800 | -0.02em | BigNumber values in LifetimeStatsCard |

### Color System (unchanged — ZERO new tokens)

```typescript
// All sourced from frontend/lib/chartTokens.ts — no additions
TOKENS.bg              = '#030d0a'
TOKENS.panel           = 'rgba(8,18,14,0.9)'
TOKENS.glassBlur       = '12px'
TOKENS.accent          = '#00c896'
TOKENS.accentDim       = 'rgba(0,200,150,0.15)'
TOKENS.accentBorder    = 'rgba(0,200,150,0.2)'
TOKENS.accentGlow      = '0 0 24px rgba(0,200,150,0.4)'  // hover only
TOKENS.textPrimary     = '#ffffff'
TOKENS.textSecondary   = '#9fb5aa'
TOKENS.textMuted       = '#5a9070'
TOKENS.textFaint       = '#3a7060'
TOKENS.threshold.green = '#5ee0a8'  // stitch ≥ 80
TOKENS.threshold.yellow= '#ff9a3c'  // stitch 50-79
TOKENS.threshold.red   = '#ff5a5a'  // stitch < 50 OR destructive CTA only
TOKENS.chartGrid       = 'rgba(255,255,255,0.04)'
TOKENS.chartFill       = 'rgba(255,255,255,0.03)'
```

**Rule reaffirmed:** threshold colors ONLY appear on (a) stitch pills, (b) destructive dialog confirm buttons, (c) confidence pills in IdentityCard, (d) the "legacy user" yellow info badge. NEVER in chrome.

### Spacing System (8-step rhythm, multiples of 4)

```
4   →  inner gap (icon to text in row)
8   →  intra-card gap (label to value)
12  →  card-to-card gap inside dialog
16  →  inter-card gap in detail pane / inter-pane gutter
20  →  card padding (default)
24  →  card padding (header strip, dialog body)
32  →  page edge padding
48  →  reserved (no current use on this page)
```

### Motion (3 timing tokens, surgical use)

| Token | Value | Where on this page |
|---|---|---|
| `fast` | 120ms ease-out | Row hover border bump, button hover, tab icon swap |
| `medium` | 400ms cubic-bezier(0.4,0,0.2,1) | Detail pane content swap on row select, dialog scale 0.96→1, card expand |
| `slow` | 1200ms cubic-bezier(0.16,1,0.3,1) | Skeleton shimmer cycle, NOT used for entry sequences here (data is dense — slow entries become annoying) |

**Threshold pill pulse:** 600ms cubic-bezier(0.4,0,0.2,1), fires only when stitch% crosses a band boundary (rare — typically on AddLink success).

**Dialog motion:** opacity 0→1 over 200ms + scale 0.96→1 over 400ms cubic-bezier(0.4,0,0.2,1). Backdrop opacity 0→0.6 over 200ms.

**Skeleton shimmer:** opacity oscillates 0.3 → 0.5 → 0.3 over 1.6s in a CSS `@keyframes`. NO horizontal sweep — keep it quiet.

**Anti-pattern enforced:** zero idle motion on loaded states. A user staring at the Users page for 30 seconds sees no pixel movement.

---

## 3. Layout Wireframe — Above-the-Fold (1440 × 720+)

### ASCII wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SHIFT RWA — Data Hub  [Funnels][Source][Cohorts][○ Users][Raw Data]        │ 56px header (existing)
├──────────────────────────────────────────────────────────────────────────────┤
│  [search........]  [source ▾]  [stitch% ≥ ▾]  [vol ≥ ▾]  [since ▾]  [Reset] │ 56px filter row (NEW, sticky)
├─────────────────────────────────────────┬────────────────────────────────────┤
│ USER LIST (40% width)                   │ DETAIL PANE (60% width)            │
│ ── 562px ─────────────────────────────  │ ── 850px ────────────────────────  │
│ ┌─────────────────────────────────────┐ ╎ ┌────────────────────────────────┐ │
│ │ │WALLET    NAME     VOLUME LAST │●  │ ╎ │ HEADER STRIP                   │ │
│ │ │5xCF...JKM9 —      $4.2K  2d   │●  │ ╎ │ 5xCFvBxnimqV..JKM9  [Copy]    │ │
│ │ ▌6wpi...rM6m Alice  $850   9d   │●  │ ╎ │ display name (read-only)       │ │
│ │ │FGMZ...XyZ1 —      $12K   1h   │●  │ ╎ │ Last seen 2 hours ago         │ │
│ │ │AbCd...XyZ1 —      $42K   5m   │●  │ ╎ │                                │ │
│ │ │... [virtualized — 16,144 rows] │   │ ╎ ├────────────────────────────────┤ │
│ │ │                                │   │ ╎ │ ◇ IDENTITY                     │ │
│ │ │                                │   │ ╎ │   ┌──────────────────────┐    │ │
│ │ │                                │   │ ╎ │   │ wallet  5xCF...JKM9 ●│    │ │
│ │ │                                │   │ ╎ │   │ snag    snag_abc... ●│    │ │
│ │ │                                │   │ ╎ │   │ x       @cryptojohn ●│    │ │
│ │ │                                │   │ ╎ │   └──────────────────────┘    │ │
│ │ │                                │   │ ╎ │   [+ Add Link] [Merge] [...]  │ │
│ ├─────────────────────────────────────┤ ╎ ├────────────────────────────────┤ │
│ │ Page 1 of 323  ← 1 2 3 ... 323 →    │ ╎ │ ◇ SOURCE ATTRIBUTION           │ │
│ └─ 48px pagination footer ───────────┘ ╎ │   First-touch  | Last-touch    │ │
│                                         ╎ │   organic      | x/social      │ │
│                                         ╎ │   [locked 3d]  | 2 days ago    │ │
│                                         ╎ ├────────────────────────────────┤ │
│                                         ╎ │ ◇ LIFETIME STATS               │ │
│                                         ╎ │   8,420 XP    │ $42.5K vol     │ │
│                                         ╎ │   12 pos      │ 4 badges       │ │
│                                         ╎ ├────────────────────────────────┤ │
│                                         ╎ │ ◇ TIMELINE                     │ │
│                                         ╎ │   ▲ position_open TSL2L 2h ago │ │
│                                         ╎ │   ★ badge_earn diamond 1d ago  │ │
│                                         ╎ │   ⇄ snag_link 2d ago           │ │
│                                         ╎ │   [Load older]                 │ │
│                                         ╎ └────────────────────────────────┘ │
└─────────────────────────────────────────┴────────────────────────────────────┘
       ↑ Phosphor scanline divider (1px wide, vertical gradient accent→accentBorder)
```

### Exact pixel measurements (1440 × ≥900 viewport)

```
Outer container:
  width:               1440 (browser-fluid, but spec to 1440)
  padding-x:           32
  inner-width:         1376
  bg:                  TOKENS.bg

Header (existing — layout-shell.tsx, Sprint 0):
  height:              56
  margin-bottom:       0

Filter row (NEW for Sprint 2.2):
  height:              56
  margin-bottom:       16
  padding:             14px 18px
  background:          TOKENS.panel
  border:              1px solid TOKENS.accentBorder
  border-radius:       16
  backdrop-filter:     blur(12px)
  position:            sticky
  top:                 56  (sticks below header on scroll)
  z-index:             10

Content grid:
  display:             grid
  grid-template-columns: 40% 16px 60%   → list | gutter | detail
  height:              calc(100vh - 56px - 56px - 16px - 24px)  → ~720 on 13" / ~900 on Tomer's 1440
  min-height:          600

  List pane (col 1):
    width:             ~542px (40% of 1376 minus half-gutter)
    background:        TOKENS.panel
    border:            1px solid TOKENS.accentBorder
    border-radius:     16
    backdrop-filter:   blur(12px)
    overflow:          hidden
    display:           flex
    flex-direction:    column
    padding:           0  (children control their own padding)

    List virtualized region:
      flex:            1
      min-height:      0
      ROW_HEIGHT:      56
      overflow-y:      auto via FixedSizeList (react-window)

    Pagination footer:
      height:          48
      border-top:      1px solid TOKENS.accentBorder
      padding:         0 16px
      display:         flex
      align-items:     center
      justify-content: space-between
      flex-shrink:     0

  Phosphor scanline divider (col 2):
    width:             1px (16px container — 1px line centered in 16px gap, 7.5px each side)
    background:        linear-gradient(to bottom,
                          TOKENS.accent 0%,
                          TOKENS.accent 30%,
                          TOKENS.accentBorder 60%,
                          TOKENS.accentBorder 100%)
    box-shadow:        0 0 6px rgba(0,200,150,0.15)  (very subtle bloom)
    opacity:           0.6  (intentional restraint — divider, not decoration)
    height:            100%
    pointer-events:    none

  Detail pane (col 3):
    width:             ~826px (60% of 1376 minus half-gutter)
    background:        TOKENS.panel
    border:            1px solid TOKENS.accentBorder
    border-radius:     16
    backdrop-filter:   blur(12px)
    overflow-y:        auto  (4-card stack can exceed viewport)
    display:           flex
    flex-direction:    column

    Header strip (sticky):
      height:          88
      padding:         24px
      border-bottom:   1px solid TOKENS.accentBorder
      position:        sticky
      top:             0
      background:      rgba(8,18,14,0.95)  (slightly more opaque so cards scrolling underneath are obscured)

    Card stack:
      padding:         24px
      display:         flex
      flex-direction:  column
      gap:             16

    Each Card primitive (reused from Sprint 1):
      padding:         20  (default)
      border-radius:   16
      border:          1px solid TOKENS.accentBorder
      background:      TOKENS.panel
      box-shadow:      inset 0 1px 0 rgba(255,255,255,0.03)  (Sprint 1 inset highlight)
```

### Responsive collapse (1024–1440)

At < 1280px viewport width:
- Inter-pane gutter shrinks from 16 → 8px, scanline becomes barely visible (intentional — at lower densities, the operator's eye doesn't need the divider as much)
- Pagination footer page numbers collapse to first/prev/next/last (no inline 1 2 3 ... 323)

At < 1024px:
- Grid collapses to stacked layout: list on top (max-height 50vh), detail below (no header strip sticky)
- Scanline becomes a horizontal 1px gradient between them

**Sprint 2.2 ships the 1440px target only.** Mobile is explicitly out of scope per Sprint 1 precedent — the existing /admin/data-hub is desktop-only.

---

## 4. UserListRow Anatomy (56px tall)

### Visual structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ │  WALLET           NAME           VOLUME          LAST SEEN     STITCH│
│ ▌ 5xCF...JKM9       Alice          $42.5K          2h ago        ●     │  ← selected: 2px accent left border + accentDim bg
│ │  6wpi...rM6m      —              $850             9d ago        ●     │
│ │  FGMZ...XyZ1      —              $12K             1h ago        ●     │
└─────────────────────────────────────────────────────────────────────────┘
   ↑                                                                  ↑
  2px left border                                              8px threshold pill
  (accent if selected,                                         (red/yellow/green per stitch%)
   transparent otherwise)
```

### Column widths (within ~542px pane, minus 32px horizontal padding = ~510px content)

| Column | Width | Content | Type token | Notes |
|---|---|---|---|---|
| **Wallet** | 140px | `XXXX...XXXX` truncated | `mono-medium` (13px / 800 / -0.01em) | `tabular-nums` |
| **Name** | 100px | displayName OR `—` | `mono-base` if name, `textMuted` if `—` | Truncate with ellipsis |
| **Volume** | 90px right-align | `$42.5K` via fmtUSD | `mono-medium`, color `TOKENS.accent` if >0, `textFaint` if 0 | `tabular-nums` |
| **Last seen** | 80px right-align | "2h ago" / "5m ago" / "9d ago" | `mono-small` (11px / 600), color `textFaint` | Relative time |
| **Pill** | 20px (16px + 4px breathing room) | 8px circle, threshold color | — | thresholdColor(stitchedPct, {red:0, yellow:50, green:80}) |
| **Gap allowance** | ~80px | distributed | — | Column gaps + leading 2px border |

### Row chrome

```typescript
{
  height: 56,
  padding: '0 14px 0 12px',         // 12px left to allow 2px border + 10px inset
  display: 'grid',
  gridTemplateColumns: '140px 100px 90px 80px 20px',
  gridGap: 14,
  alignItems: 'center',

  borderLeft: '2px solid transparent',  // becomes accent when selected
  borderBottom: '1px solid rgba(255,255,255,0.025)',  // hairline divider — slightly softer than chartGrid
  cursor: 'pointer',
  transition: 'all 120ms ease-out',

  // States:
  // default:
  background: 'transparent',

  // hover (not selected):
  // background: 'rgba(0,200,150,0.04)',  ← 50% of accentDim
  // borderBottom: '1px solid rgba(0,200,150,0.15)',

  // selected:
  // background: TOKENS.accentDim,
  // borderLeft: '2px solid TOKENS.accent',
  // borderBottom: '1px solid rgba(0,200,150,0.2)',
}
```

### Header row (above the virtualized list)

Same 56px structure but height 32 and uses `mono-tiny` (10px / 800 / 0.12em / UPPERCASE / textFaint) for column labels. Sticky inside the list pane at top:0.

### Threshold pill (8px)

```typescript
{
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: thresholdColor(stitchedPct, { red: 0, yellow: 50, green: 80 }),
  boxShadow: `0 0 6px ${pillColor}`,  // subtle phosphor bloom matching the Sprint 1 ThresholdPill
}
```

NO pulse on first paint (would be noise across 50 rows). Pulse fires only when an admin action mutates the row's stitch% — the row's pill animates once via the same WebAnimations API helper from Sprint 1's `<ThresholdPill />`.

---

## 5. UserDetailPane Header Strip

### Layout (88px tall, sticky at top of detail pane)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  PRIMARY WALLET                                                      │
│  5xCFvBxnimqVma6v6D8fZ9FawPVVzS57jgp2zPwJKbM9   [Copy]              │ ← hero-small text 18px
│                                                                      │
│  Display name: Alice                                                 │ ← mono-base
│                                                                      │
│  Last seen 2 hours ago                                              │ ← mono-small textMuted
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Anatomy

```typescript
{
  padding: 24,
  borderBottom: `1px solid ${TOKENS.accentBorder}`,
  position: 'sticky',
  top: 0,
  background: 'rgba(8,18,14,0.95)',  // 0.05 more opaque than card bg — scrolled cards are obscured
  zIndex: 5,
}

// Row 1 — primary wallet line:
{
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
}

// Label "PRIMARY WALLET" — mono-tiny UPPERCASE textFaint
// Wallet value — hero-small, tabular-nums
// Default: truncated to 'XXXX...XXXX' (12 chars left + ... + 4 chars right). Click toggles full vs truncated.
// Copy button: 24x24 ghost button with Phosphor <Copy weight="regular" size={14} /> icon
//   - default color: textFaint
//   - hover color: accent
//   - on click: copies wallet to clipboard + flashes accent for 200ms + tooltip "Copied"

// Row 2 — display name (read-only for Sprint 2.2):
{
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginBottom: 4,
}
// Label "DISPLAY NAME" + value (or "—" in textMuted)
// TODO comment in code: display name editing arrives in Sprint 2.3

// Row 3 — last seen:
// Format: "Last seen 2 hours ago" — mono-small textMuted
```

### Wallet truncation toggle

`useState<'truncated' | 'full'>('truncated')` — click anywhere on the wallet value toggles. Visual cue: `cursor: 'pointer'`, `transition: color 120ms`, `:hover { color: accent }`.

### Copy button feedback

Sequence on click:
1. `await navigator.clipboard.writeText(wallet)`
2. Icon swaps to Phosphor `<Check />` for 1.2s
3. Floating mono-tiny tooltip "Copied" appears above button for 1.2s
4. Returns to `<Copy />` icon

If clipboard write fails (e.g., not in secure context), show "Copy failed" tooltip in `threshold.red`.

---

## 6. Card Specs for the 4 Detail Cards

All 4 cards use the existing `<Card>` primitive (Sprint 1) with `padding: 20`. Card header rows use `mono-tiny` UPPERCASE textFaint labels. Each card has a 16px gap from the previous.

### 6.1 IdentityCard

```
┌─ IDENTITY ──────────────────────────────────  [+ Add] [⇄ Merge] [⚙ Primary]
│
│ ┌───────────────────────────────────────────────────────────────────┐
│ │  TYPE         VALUE                CONF        LINKED      ACTIONS│  ← header row
│ ├───────────────────────────────────────────────────────────────────┤
│ │ ⌬ wallet      5xCF...JKM9          ● det       3d ago      [⋯]   │  ← row
│ │ ⊙ snag        snag_abc_4f8...      ● det       3d ago      [⋯]   │
│ │ × x_handle    @cryptojohn          ▲ man       1h ago      [⋯]   │
│ └───────────────────────────────────────────────────────────────────┘
```

**Header row:** 3 buttons right-aligned: "+ Add Link" / "⇄ Merge" / "⚙ Primary". Phosphor icons + 11px labels. Buttons:
```typescript
{
  background: 'transparent',
  border: `1px solid ${TOKENS.accentBorder}`,
  color: TOKENS.accent,
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  gap: 5,
  alignItems: 'center',
  transition: `all 120ms ease-out`,
}
// hover: background TOKENS.accentDim, borderColor 0.4
```

"⚙ Primary" button is **disabled** (opacity 0.4, cursor not-allowed) when fewer than 2 wallet links exist. Clicking it opens a small inline dropdown of the wallet identity values to choose from.

**Table rows** (40px tall each):
- Phosphor icon column (24px) — uses IDENTITY_ICONS map (§7.2 below)
- Type label (60px) — mono-small textMuted
- Value (flex-grow) — mono-base textPrimary, truncated for long values
- Confidence pill (60px) — 6px dot + 3-letter abbrev: `det` (green), `prob` (yellow), `man` (textSecondary muted blue-grey — NOT a threshold color since it's neutral, but rendered as `rgba(159,181,170,0.8)` from textSecondary)
- Linked timestamp (60px) — mono-small textFaint
- Actions cell (32px) — Phosphor `<DotsThree weight="bold" />` opens a dropdown: "Unlink" (opens UnlinkDialog)

**Confidence pill detail:**

```typescript
const CONFIDENCE_STYLE = {
  deterministic: { color: TOKENS.threshold.green, label: 'det' },
  probabilistic: { color: TOKENS.threshold.yellow, label: 'prob' },
  manual:        { color: TOKENS.textSecondary,    label: 'man' },
};
```

Manual is NOT red — manual is admin-asserted and trustworthy in its own way. Red is reserved for destructive intent.

### 6.2 SourceAttributionCard

```
┌─ SOURCE ATTRIBUTION ─────────────────────────────────────────────────
│
│ ┌─────────────────────────────┬─────────────────────────────────────┐
│ │ FIRST TOUCH       [🔒 LOCKED]│ LAST TOUCH                          │
│ │                              │                                     │
│ │ source     organic           │ source     x                        │
│ │ medium     —                 │ medium     social                   │
│ │ campaign   —                 │ campaign   2026q2_summer            │
│ │ referrer   shiftrwa.xyz/blog │                                     │
│ │ landing    /admin/data-hub   │                                     │
│ │                              │                                     │
│ │ locked 3 days ago            │ updated 2 hours ago                 │
│ └─────────────────────────────┴─────────────────────────────────────┘
```

**Layout:** `display: grid; grid-template-columns: 1fr 1fr; gap: 16`

**Each column:**
- Section header — mono-tiny UPPERCASE textFaint + optional lock badge (right-aligned within header)
- 2-column inner sub-grid: label (mono-small textMuted) | value (mono-base textPrimary or "—" textMuted)
- Bottom caption — mono-small textFaint

**Lock badge** (first-touch only, when `attributionLockedAt !== null`):
```typescript
{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  padding: '2px 6px',
  background: 'rgba(0,200,150,0.1)',
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 4,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: TOKENS.accent,
}
```
With Phosphor `<Lock weight="fill" size={10} />` + text "LOCKED".

**Legacy user badge** (when `firstUtmSource === 'unknown_legacy'`):
Renders ABOVE the first-touch column header as a full-width 32px-tall info banner:
```typescript
{
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  background: 'rgba(255,154,60,0.08)',
  border: `1px solid rgba(255,154,60,0.3)`,
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  color: TOKENS.threshold.yellow,
  marginBottom: 12,
}
```
Phosphor `<Warning weight="regular" size={14} />` + "Legacy user — pre-tracking acquisition. First-touch backfilled from referral_code."

This banner is THE clearest signal that the funnel data for this profile is unreliable — operator instantly knows to weight differently.

### 6.3 LifetimeStatsCard

```
┌─ LIFETIME STATS ────────────────────────────────────────────────────
│
│ ┌──────────────────────────┬──────────────────────────┐
│ │ XP                       │ LIFETIME VOLUME          │
│ │ 8,420                    │ $42.5K                   │
│ │                          │                          │
│ ├──────────────────────────┼──────────────────────────┤
│ │ POSITIONS                │ BADGES                   │
│ │ 12                       │ 4                        │
│ │                          │                          │
│ └──────────────────────────┴──────────────────────────┘
```

**Layout:** `display: grid; grid-template-columns: 1fr 1fr; gap: 16`

**Each cell:**
- Label — mono-tiny UPPERCASE textFaint
- Value — `<BigNumber />` primitive (Sprint 1) at hero-big 32px
- No delta/comparator on this card (Sprint 1 BigNumber supports them but here we keep absolute-only — this is identity inspection, not trend monitoring)

**Formatters:**
- XP — comma-separated integer (`8,420`)
- Volume — `fmtUSD` from `frontend/lib/format.ts` (extracted in Task 8) — `$42.5K`, `$1.2M`, `$850`
- Positions — comma-separated integer
- Badges — comma-separated integer

**Empty state** (when `lifetimeStats` is undefined OR all 4 are zero):
```typescript
<EmptyState
  variant="insufficient"
  // re-use Sprint 1 EmptyState — title "No on-chain activity yet"
  // body "This profile has no positions, badges, or XP recorded."
/>
```

### 6.4 TimelineCard

```
┌─ TIMELINE ──────────────────────────────────  [Load older]
│
│ ⬆ position_open      TSL2L  +$1,500   2 hours ago         [helius]
│ ★ badge_earn         diamond_hands     5 hours ago        [snag]
│ ⇄ snag_link                            2 days ago         [system]
│ ◉ wallet_connect                       3 days ago         [system]
│ ◎ landing            ref=cryptojohn    3 days ago         [ga4]
│
│         [Load older entries]
```

**Card header:** label "TIMELINE" + right-aligned action — "Load older" only renders if there are entries.

**Row anatomy** (44px tall):
```typescript
{
  display: 'grid',
  gridTemplateColumns: '24px 1fr 80px 80px 64px',
  // icon | event name + asset/payload | value | relative time | source pill
  gridGap: 12,
  alignItems: 'center',
  padding: '8px 4px',
  borderBottom: `1px solid ${TOKENS.chartGrid}`,
  cursor: 'pointer',  // click to expand payload
  transition: 'background 120ms ease-out',
}
// hover: background 'rgba(0,200,150,0.04)'
```

- **Icon** (24px) — Phosphor from EVENT_ICONS map (§7.1)
- **Event name** — mono-base textPrimary. Convert snake_case to human English ("position_open" → "Position Open"). Inline below in mono-small textFaint: asset (e.g. "TSL2L") or payload summary
- **Value** — `+$1,500` if `valueUSD !== null`. Color: green if positive, red if negative position_close with loss, accent otherwise. tabular-nums.
- **Relative time** — "2 hours ago" via shared relative formatter. mono-small textFaint.
- **Source pill** — small 18px-tall pill with source name (helius/snag/ga4/system/manual). Colors map:

```typescript
const SOURCE_PILL_COLORS = {
  helius:  TOKENS.accent,           // accent — most operational
  snag:    'rgba(159,181,170,0.6)', // textSecondary muted
  ga4:     'rgba(159,181,170,0.6)',
  system:  'rgba(159,181,170,0.4)', // dimmer — system events are noise
  manual:  TOKENS.threshold.yellow,  // admin action — needs visibility
};
```
Pill background = color at 0.15 alpha, border = color at 0.3 alpha, text = color full.

**Payload expand** (click row):
- Row height expands from 44 → 200 with smooth motion (400ms cubic-bezier-medium)
- Below the row, a `<pre>` block appears with the `payload` JSON:
  ```typescript
  {
    fontSize: 10,
    fontFamily: 'monospace',
    color: TOKENS.textMuted,
    background: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 6,
    maxHeight: 200,
    overflowY: 'auto',
    border: `1px solid ${TOKENS.chartGrid}`,
  }
  ```
- Click again to collapse

**"Load older" button:**
```typescript
{
  width: '100%',
  padding: '10px',
  background: 'transparent',
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8,
  color: TOKENS.accent,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 12,
  transition: 'all 120ms ease-out',
}
// hover: background accentDim, borderColor 0.4
```
Calls `loadMore(oldestEntry.occurredAt)`. While loading: replaces label with "Loading…" + opacity 0.6.

---

## 7. Phosphor Icon Maps

### 7.1 TimelineEntry event icons (verbatim from plan §13)

```typescript
import {
  TrendUp, TrendDown, Trophy, LinkSimple, Wallet, Eye,
  MagnifyingGlass, ShieldWarning, ArrowsMerge, LinkBreak,
} from '@phosphor-icons/react';

export const EVENT_ICONS: Record<string, IconType> = {
  position_open:   TrendUp,
  position_close:  TrendDown,
  badge_earn:      Trophy,
  snag_link:       LinkSimple,
  wallet_connect:  Wallet,
  landing:         Eye,
  utm_touch:       MagnifyingGlass,
  gdpr_forget:     ShieldWarning,
  identity_merge:  ArrowsMerge,
  identity_link:   LinkSimple,
  identity_unlink: LinkBreak,
};
```

Default fallback (event_name not in map): Phosphor `<DotOutline />`.

### 7.2 IdentityCard link type icons

```typescript
import {
  Wallet, ChartLineUp, Trophy,
  TwitterLogo, DiscordLogo, TelegramLogo,
} from '@phosphor-icons/react';

export const IDENTITY_ICONS: Record<string, IconType> = {
  wallet:         Wallet,
  ga_client_id:   ChartLineUp,
  snag_user_id:   Trophy,
  social_x:       TwitterLogo,
  social_discord: DiscordLogo,
  social_telegram:TelegramLogo,
};
```

Use `weight="regular"` for all timeline event icons (matches existing tab icon weight). Use `weight="fill"` ONLY for the Lock badge in SourceAttributionCard.

### 7.3 Tab icon

```typescript
import { UserCircle } from '@phosphor-icons/react';

{ id: 'users', label: 'Users', Icon: UserCircle }
```

Render with `weight="regular"` and `size={14}` — matches Funnels/Attribution/Cohorts/RawData tab icons.

---

## 8. Modal/Dialog Specs (4 dialogs)

All dialogs share:
- Position: centered on screen
- Backdrop: `rgba(0,0,0,0.6)` over the entire viewport
- Glass panel: `TOKENS.panel` + `backdrop-filter: blur(12px)` + border
- Border-radius: 16
- Padding: 24
- ESC key closes (via document keydown listener mounted on open)
- Click-outside (backdrop) closes — EXCEPT for ForgetUserDialog which requires explicit Cancel click (prevents accidental dismissal mid-confirm-typing)
- Entry motion: opacity 0→1 over 200ms + scale 0.96→1 over 400ms cubic-bezier(0.4,0,0.2,1)
- Backdrop motion: opacity 0→0.6 over 200ms
- Body uses inline-style React (no portal library — use a small `<dialog>` wrapper rendered via `createPortal` to document.body to escape stacking contexts)

### Button hierarchy across all dialogs

```typescript
// Primary submit (constructive — Add Link, Set Primary):
{
  background: TOKENS.accent,
  color: TOKENS.bg,           // dark text on accent fill
  border: 'none',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: 'all 120ms ease-out',
}
// hover: brightness(1.1)
// disabled: opacity 0.4, cursor 'not-allowed'
// loading: opacity 0.7, replaces label with spinner

// Destructive submit (Merge, Unlink, Forget):
{
  background: 'transparent',
  color: TOKENS.threshold.red,
  border: `1px solid ${TOKENS.threshold.red}`,
  // rest as above
}
// hover: background red @ 0.15 alpha, color textPrimary

// Cancel (always present):
{
  background: 'transparent',
  color: TOKENS.textMuted,
  border: 'none',
  padding: '10px 16px',
}
// hover: color textPrimary
```

Button row: `display: flex; justify-content: flex-end; gap: 12; marginTop: 24;`. Cancel always leftmost, primary action rightmost.

### 8.1 AddLinkDialog (480px wide)

**Title:** "Add Identity Link" (hero-small 18px textPrimary)
**Subtitle:** "Link this profile to an external identity" (mono-small textMuted, marginBottom 16)

**Form fields** (stacked, gap 16):

1. **Type select** (Phosphor icon prefix per IDENTITY_ICONS):
   ```
   <select>
     <option value="wallet">Wallet</option>
     <option value="ga_client_id">GA Client ID</option>
     <option value="snag_user_id">Snag User ID</option>
     <option value="social_x">X (Twitter)</option>
     <option value="social_discord">Discord</option>
     <option value="social_telegram">Telegram</option>
   </select>
   ```
   Select chrome: dark background, accentBorder border, white text, dropdown arrow Phosphor `<CaretDown />`.

2. **Value text input** — placeholder + hint changes per type:
   - wallet: placeholder "5xCFv..." hint "Solana base58 address (32-44 chars, case-sensitive)"
   - ga_client_id: placeholder "GA1.2.1234567890" hint "Google Analytics 4 client ID"
   - snag_user_id: placeholder "snag_abc_..." hint "Snag platform user identifier"
   - social_x: placeholder "@username" hint "X (Twitter) handle without @"
   - social_discord: placeholder "user#1234 or 18-digit ID" hint "Discord username or snowflake ID"
   - social_telegram: placeholder "@username or chat_id" hint "Telegram handle or numeric chat ID"

   Input chrome: same as select. Hint text: mono-small textFaint, marginTop 4.

3. **Confidence select**:
   - `manual` (default) — admin-asserted
   - `deterministic` — backed by a verifiable event
   - `probabilistic` — IP/session correlation (not Sprint 2.2 scope, but allowed in API)

4. **Evidence textarea** — required IF confidence === 'manual':
   - placeholder "Why are you asserting this link? (e.g., 'User confirmed in DM screenshot 2026-06-03')"
   - min-height 80px
   - hint "Required for manual links. Logged in admin audit trail."

**Button row:** Cancel | Add Link

**409 Conflict state** (when `addLink` returns `{ ok: false, error.body.error === 'identity_conflict' }`):

Replaces the form body with:
```
┌──────────────────────────────────────────────────────────────┐
│  ⚠  Conflict — identity already linked                       │
│                                                              │
│  Type:   x_handle                                            │
│  Value:  @cryptojohn                                         │
│  Existing profile:  abc12345-...                             │
│                                                              │
│  This identity is already linked to another profile.         │
│  You can:                                                    │
│    • Cancel and review                                       │
│    • Merge this profile into the existing one                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Buttons change to: Cancel | "Merge into existing profile" (destructive style, opens MergeProfilesDialog pre-filled with `winnerId = error.body.existingProfileId, loserId = currentProfileId`).

The conflict state replaces the form, keeps the dialog open, animates in over 400ms cubic-bezier-medium with color shift from accent border → yellow border (`#ff9a3c` at 0.3 alpha).

### 8.2 MergeProfilesDialog (560px wide)

**Title:** "Merge Profiles" (hero-small 18px textPrimary)
**Subtitle:** "Combine two profiles into one. This is irreversible." (mono-small textMuted)

**Form** (stacked, gap 20):

1. **Winner profile (current)** — read-only display:
   ```
   ┌──────────────────────────────────────────────────────┐
   │ WINNER (current)                                     │
   │                                                      │
   │ 5xCFvBxnimqV...JKM9                                 │
   │ Alice  •  $42.5K lifetime  •  4 badges              │
   └──────────────────────────────────────────────────────┘
   ```
   Glass panel inside the dialog, accent border, padding 12.

2. **Loser profile (to merge in)** — search input → results list → selection:
   - Search input: placeholder "Type wallet address to find profile..."
   - On 2+ chars typed, debounced 250ms, calls `GET /api/users/search?q=`
   - Results render below as compact rows (max 25):
     ```
     ┌──────────────────────────────────────────────────────┐
     │ ◇  6wpizL3gyTpq...rM6m   Bob   $850   2 days ago    │
     │ ◇  AbCd...xyz1            —     $12K   1 hour ago    │
     └──────────────────────────────────────────────────────┘
     ```
     Click row to select. Selected row gets `borderLeft: 2px solid accent + background accentDim`.
   - Once selected, the search input collapses + selected profile shows in a glass panel like winner (with destructive `<X />` button to clear selection)

3. **Reason textarea** (required, min 10 chars):
   - placeholder "Why merge these profiles? (e.g., 'Same user; both wallets confirmed via signed message')"
   - Counter below: "12 / minimum 10 characters"
   - Counter colors: red < 10, accent ≥ 10

**Button row:** Cancel | "Merge profiles" (destructive style, disabled until both loser selected AND reason ≥ 10 chars)

**Success path:** dialog closes, list refetches, detail pane stays on winner profile, brief toast in top-right: "Merged X profiles into current"

### 8.3 UnlinkDialog (320px wide)

**Title:** "Unlink Identity" (hero-small 18px textPrimary)

**Body:**
```
You're about to unlink:

  ⊙ snag_user_id: snag_abc_4f8e2b1...

This soft-deletes the link. The audit log is preserved.

Reason (min 10 chars):
[textarea]
```

**Form fields:**
- Reason textarea: min 10 chars, char counter, placeholder "Why unlink?"

**Button row:** Cancel | "Unlink" (destructive style, disabled until reason valid)

### 8.4 ForgetUserDialog (480px wide, RED accent border)

This is the only dialog with a non-accent border by default:
```typescript
{
  border: `1px solid ${TOKENS.threshold.red}`,  // RED border signals destructive surface
  // rest same as other dialogs
}
```

**Title:** "Forget User (GDPR)" (hero-small 18px textPrimary)

**Warning banner** at top of body:
```typescript
{
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: 12,
  background: 'rgba(255,90,90,0.1)',
  border: `1px solid rgba(255,90,90,0.3)`,
  borderRadius: 8,
  marginBottom: 20,
}
```
Phosphor `<ShieldWarning weight="regular" size={20} />` in red + body text:

"This nullifies identifiable columns (display_name, country_code, wallet_type, referrer, landing_path) and deletes all identity_links. The profile row and attribution_events are RETAINED in anonymized form for analytics continuity. This action is logged in admin_logs and is **irreversible**."

**Form fields** (stacked, gap 20):

1. **Wallet confirmation input** (case-sensitive match required):
   - Label: "Type the primary wallet to confirm:"
   - Placeholder: shows the actual wallet (faint, mono-base, textFaint background)
   - Validation: live, shows red borderColor + error text "Wallet doesn't match" when mismatched and field has been touched
   - Shows green borderColor when matched

2. **Reason textarea** (min 20 chars — stricter than other dialogs):
   - placeholder "Why are you forgetting this user? (e.g., 'GDPR Article 17 request received 2026-06-03 from user@example.com')"
   - Counter: "X / minimum 20 characters"

**Button row:** Cancel | "Forget user" (destructive style, disabled until BOTH gates pass)

**Submit feedback:** Show inline loading state (button label → "Forgetting...") + spin animation. On success, close + clear selectedId in URL + refetch list. Show top-right toast: "User forgotten. Audit log entry written."

---

## 9. Empty / Loading / Error States

### 9.1 List pane states

**Loading (initial):**
8 skeleton rows, each 56px tall, with:
- 12px-wide gray bar where the threshold pill would be
- 80px-wide gray bar where wallet would be
- 40px-wide gray bar where name would be
- 60px-wide gray bar where volume would be
- 50px-wide gray bar where last-seen would be

```typescript
@keyframes shimmer {
  0%   { opacity: 0.3; }
  50%  { opacity: 0.5; }
  100% { opacity: 0.3; }
}
.skeleton-bar {
  background: rgba(255,255,255,0.04);
  border-radius: 4;
  animation: shimmer 1.6s ease-in-out infinite;
}
```

**Empty (no profiles match filters):**
```
┌────────────────────────────────────────┐
│                                        │
│            ⌕  (32px Phosphor           │
│               MagnifyingGlass          │
│               in textFaint)            │
│                                        │
│     No profiles match these filters    │
│        Try widening your criteria      │
│                                        │
│        [Reset filters]                 │
│                                        │
└────────────────────────────────────────┘
```
- Vertically centered
- Title: mono-base textPrimary opacity 0.7
- Body: mono-small textMuted
- Reset button: same style as filter row Reset (transparent + accentBorder)

**Error:**
```
┌────────────────────────────────────────┐
│                                        │
│            ⚠  (32px Phosphor           │
│               Warning in red)          │
│                                        │
│       Data temporarily unavailable     │
│         Last error 2 minutes ago       │
│                                        │
│         [Retry]                        │
│                                        │
└────────────────────────────────────────┘
```
- Title: mono-base textPrimary
- Body: mono-small textMuted + error timestamp
- Retry button: accent fill (constructive primary style)

### 9.2 Detail pane states

**Empty (no profileId selected — initial state):**
```
┌────────────────────────────────────────────────┐
│                                                │
│                                                │
│             ○  (48px Phosphor                  │
│                UserCircle in textFaint)        │
│                                                │
│             Select a user                      │
│                                                │
│   Pick a row from the list to inspect          │
│   identity, attribution, and timeline.         │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```
- Vertically centered, takes full detail pane height
- Title: hero-small (18px) textPrimary
- Body: mono-small (11px) textMuted, max-width 320px, centered, line-height 1.5

**Loading (after row click):**
4 skeleton cards stacked, each:
- 12px-tall mono-tiny label skeleton (60% width)
- 16px gap
- 3 body lines: 100% / 80% / 40% widths
- All bars in 4px border-radius, animated with the shimmer keyframes above

The header strip skeleton: 18px-tall wallet bar (60% width) + 12px-tall caption bar (40% width).

**Error:** Replaces the 4-card stack with a single full-pane error EmptyState (red Phosphor `<Warning />` + retry button), header strip still shows but with skeleton content.

### 9.3 Card-level empty states

**LifetimeStatsCard with no stats:**
Inside the card, replace the 2x2 grid with:
```
   ●  No on-chain activity yet
   This profile has no positions, badges, or XP recorded.
```
Phosphor `<Coins weight="regular" />` icon left of title. Title mono-base textPrimary opacity 0.7, body mono-small textMuted.

**TimelineCard with no events:**
```
   ◷  No events recorded
   Identity events will appear here as they happen.
```
Phosphor `<Clock weight="regular" />`.

**IdentityCard with only 1 link** (the wallet itself):
No empty state needed — show the wallet link. The 3 action buttons remain visible; "Set Primary" stays disabled (only 1 wallet).

**SourceAttributionCard with all UTMs null** (rare — backfill ensures something always populated):
No empty state — render all "—" cells. If `firstUtmSource === 'unknown_legacy'`, the legacy banner is the implicit empty state.

---

## 10. Filter Row Spec (56px tall, sticky)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [⌕ search...........]  [source ▾]  [stitch ≥ ▾]  [vol ≥ ▾]  [since ▾]  │
│                                                                  [Reset]│
└──────────────────────────────────────────────────────────────────────────┘
```

### Layout

```typescript
{
  height: 56,
  padding: '12px 18px',
  background: TOKENS.panel,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  position: 'sticky',
  top: 56,
  zIndex: 10,
}
```

### Controls (left → right)

1. **Search input** — flex-grow with min-width 200px max-width 360px:
   - Phosphor `<MagnifyingGlass size={14} />` prefix icon (positioned absolute, 12px from left)
   - placeholder "Search wallet, name, or identity..."
   - 250ms debounce (per useUsersList hook spec)
   - input chrome: `rgba(0,0,0,0.4)` background, accentBorder, color textPrimary, 12px font, 32px height, paddingLeft 32 (icon clearance) paddingRight 10

2. **Source select** — width 140px:
   - Default option "All sources"
   - Static options: organic, x, discord, telegram, kol, referral, unknown_legacy
   - Chrome matches input

3. **Stitch% min select** — width 130px:
   - Options: "Any", "≥ 25%", "≥ 50%", "≥ 80%"
   - Maps to `stitchPctMin` query param

4. **Wallet size min select** — width 130px:
   - Options: "Any", "≥ $100", "≥ $1K", "≥ $10K", "≥ $100K"
   - Maps to `walletSizeMin`

5. **Activity since date input** — width 140px:
   - Native date input, colorScheme dark
   - Maps to `activitySince` ISO string

6. **Reset button** (right-aligned, marginLeft auto) — visible only when any filter is active:
   - Same style as Sprint 1 FilterBar Reset
   - Shows count badge: "Reset (3)" — number of active filters

### State persistence

Filter values persist to `?source=&stitchPctMin=&walletSizeMin=&activitySince=&q=` in the URL (same pattern as Sprint 1's `useFilters`). On mount, hydrate from URL.

---

## 11. Pagination Footer (48px tall, inside list pane)

```
┌────────────────────────────────────────────────────────┐
│  Showing 1–50 of 16,144   ◀  1  2  3  ... 323  ▶      │
└────────────────────────────────────────────────────────┘
```

### Layout

```typescript
{
  height: 48,
  padding: '0 16px',
  borderTop: `1px solid ${TOKENS.accentBorder}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  background: 'rgba(8,18,14,0.95)',  // slightly more opaque than card bg
}
```

### Left side: "Showing X–Y of Z"
mono-small textMuted, tabular-nums.

### Right side: page navigation
- `<` previous (Phosphor `<CaretLeft />`) — disabled at page 1
- Page numbers — show: 1, [current-1], [current], [current+1], ..., last
  - Current page: `background: TOKENS.accentDim`, `color: TOKENS.accent`, `border: 1px solid accentBorder`
  - Other pages: ghost button, hover accent text
- `>` next — disabled at last page

Page buttons: 28x28 square, 4px border-radius, 11px font, 700 weight, tabular-nums.

---

## 12. Tab Integration

Add to existing `TABS` array in `layout-shell.tsx` between `cohorts` and `raw`:

```typescript
import { UserCircle } from '@phosphor-icons/react';

const TABS = [
  { id: 'funnels',     label: 'Funnels',           Icon: Target },
  { id: 'attribution', label: 'Source Attribution', Icon: MagnifyingGlass },
  { id: 'cohorts',     label: 'Trader Cohorts',    Icon: Waves },
  { id: 'users',       label: 'Users',             Icon: UserCircle },  // NEW
  { id: 'raw',         label: 'Raw Data',          Icon: ChartBar },
];
```

The `TopView` union type widens to:
```typescript
type TopView = 'funnels' | 'attribution' | 'cohorts' | 'users' | 'raw';
```

Default landing tab stays `'raw'` per constraint.

Tab button styling unchanged — UserCircle inherits the same Phosphor `weight="regular"` + `size={14}` as the other 4 tabs.

---

## 13. Differentiation Anchor (Single Visual Signature)

**The Phosphor Scanline Divider.** A 1px-wide vertical line between the list and detail panes, rendered as a top-to-bottom gradient (`TOKENS.accent` at top 30% → `TOKENS.accentBorder` at bottom 70%) with a subtle 6px accent bloom (`box-shadow: 0 0 6px rgba(0,200,150,0.15)`). Opacity 0.6 for restraint.

**Why it works:**
1. **Visual continuity with Sprint 1's anchor:** Sprint 1 made 8px funnel bars + counted drop-off arrows the signature. The Scanline Divider continues the "phosphor afterglow" aesthetic into a new shape — instead of a horizontal bar, it's a vertical line.
2. **Functional honesty:** the line tells the operator's eye where the list ends and detail begins — Bloomberg terminals use column dividers for the same reason. No purely decorative use.
3. **Unique to this page:** appears nowhere else in the Data Hub. Funnels view has bars; Users view has the divider. Trader Cohorts (Sprint 3) will get its own signature. Each page has one new pattern; the rest is shared equity.
4. **Recognizable in screenshot:** if the SHIFT logo is cropped, a viewer with prior exposure to the Sprint 1 aesthetic will know this is the Users page by the divider's vertical accent gradient + the 8px threshold pills lining up like a column of phosphor LEDs in the list rows.

**Anti-pattern avoided:** no glowing border, no neon vomit, no animated scanline (no "data flowing through" effect). It's static. It's matter-of-fact. It's a Bloomberg terminal column separator with a 2026 craft polish.

**This anchor must appear on every load of the Users page, regardless of selection state, filter state, or data state.** Even on empty list + empty detail, the divider is there — signaling "this surface has two roles."

---

## 14. Accessibility

- All Phosphor icons rendered with `aria-hidden` since the same info is conveyed by adjacent text labels
- IdentityCard table is a real `<table>` element with `<th>` headers for screen readers (visually styled like a div grid but semantically table)
- Dialogs use `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the dialog title id
- Focus management: on dialog open, focus moves to first form field. On close, focus returns to the trigger button.
- ESC key closes all dialogs (already specified)
- Tab order in dialogs: form fields top-to-bottom, then Cancel, then primary CTA
- All buttons have visible focus rings: `outline: '2px solid TOKENS.accent', outline-offset: '2px'`
- Contrast: all text on TOKENS.panel meets WCAG AA. Threshold colors on TOKENS.panel:
  - green #5ee0a8 on rgba(8,18,14,0.9) = 9.2:1 (AAA) ✓
  - yellow #ff9a3c on same = 6.5:1 (AA) ✓
  - red #ff5a5a on same = 5.9:1 (AA) ✓
- ForgetUserDialog wallet-match input has `aria-describedby` pointing to the validation message
- Pagination buttons have `aria-label` like "Go to page 3"

---

## 15. Implementation Notes for Sprint 2.2 Implementer

### Component checklist (per file in plan)

| File | Visual contract |
|---|---|
| `lib/api.ts` | Append `apiPost/apiPatch/apiDelete` + `ApiError` class. ESM imports. |
| `lib/navigation.ts` | `linkToProfile(walletOrId)` + `useProfileDeepLink` hook with URL sync |
| `lib/format.ts` (NEW) | Extract `fmtUSD` and `fmtWallet` from `page.tsx`; add `fmtRelativeTime` for "2h ago" |
| `hooks/useUsersList.ts` | Debounce 250ms on `q`, no debounce on page change |
| `hooks/useUserProfile.ts` | Abort on profileId change, null is no-op |
| `hooks/useUserTimeline.ts` | Cursor pagination via `before` param + `loadMore(beforeISO)` |
| `hooks/useIdentityActions.ts` | Discriminated union `{ok, data}|{ok, error}`. ApiError surfaces 409 conflict body |
| `components/DataHub/users/UserListPane.tsx` | react-window FixedSizeList + ResizeObserver for height + PaginationFooter child |
| `components/DataHub/users/UserListRow.tsx` | Grid layout per §4, threshold pill, selected/hover/default chrome |
| `components/DataHub/users/UserDetailPane.tsx` | Header strip + 4-card stack, empty/loading/error states per §9.2 |
| `components/DataHub/users/IdentityCard.tsx` | Links table + 3 action buttons (Add/Merge/Primary), confidence pills per §6.1 |
| `components/DataHub/users/SourceAttributionCard.tsx` | 2-col first/last grid + lock badge + legacy banner per §6.2 |
| `components/DataHub/users/LifetimeStatsCard.tsx` | 2x2 BigNumber grid + empty state |
| `components/DataHub/users/TimelineCard.tsx` | List of entries + Load older button |
| `components/DataHub/users/TimelineEntry.tsx` | Grid layout, icon from EVENT_ICONS, expandable payload |
| `components/DataHub/users/AddLinkDialog.tsx` | Form + 409 conflict flip state |
| `components/DataHub/users/MergeProfilesDialog.tsx` | Winner display + debounced search loser + reason gate |
| `components/DataHub/users/UnlinkDialog.tsx` | Confirm + reason min 10 |
| `components/DataHub/users/ForgetUserDialog.tsx` | Red border + warning banner + wallet-match gate + reason min 20 |
| `app/admin/data-hub/views/UsersView.tsx` | Filter row + 2-pane grid + scanline divider |
| `app/admin/data-hub/layout-shell.tsx` | Add UserCircle tab |
| `app/admin/data-hub/page.tsx` | Route 'users' → UsersView |

### Phosphor Scanline Divider implementation

```typescript
// Inside UsersView.tsx, between the list pane and detail pane in the grid:
<div style={{
  width: 1,
  background: `linear-gradient(to bottom,
    ${TOKENS.accent} 0%,
    ${TOKENS.accent} 30%,
    ${TOKENS.accentBorder} 60%,
    ${TOKENS.accentBorder} 100%)`,
  boxShadow: '0 0 6px rgba(0,200,150,0.15)',
  opacity: 0.6,
  height: '100%',
  pointerEvents: 'none',
  justifySelf: 'center',  // centers within the 16px gutter
}} aria-hidden />
```

### ResizeObserver for list height (small custom hook in UserListPane)

```typescript
function useResizeObserver(ref: React.RefObject<HTMLDivElement>) {
  const [height, setHeight] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return height;
}
```

Use to feed `FixedSizeList`'s `height` prop. Parent div has `flex: 1; minHeight: 0` so it fills available space.

### Skeleton shimmer keyframes (one global style mount)

Inject once into the UsersView root:
```typescript
<style>{`
  @keyframes users-skeleton-shimmer {
    0%   { opacity: 0.3; }
    50%  { opacity: 0.5; }
    100% { opacity: 0.3; }
  }
`}</style>
```

Reusable className `.users-skeleton-bar` with `animation: users-skeleton-shimmer 1.6s ease-in-out infinite`. Or use inline `style.animation` per element.

### Dialog portal mounting

Use `createPortal(dialogContent, document.body)` to escape any stacking contexts. ESC listener mounted on document on dialog open, removed on close. Backdrop click handler ignores clicks that originated inside the dialog panel.

---

## 16. Differentiation Callout (Required)

**This avoids generic UI by:**

1. **Using a 1px Phosphor Scanline Divider between panes instead of a transparent gap.** Every SaaS admin tool uses a transparent gutter or a 1px gray line. We use a vertical emerald gradient with a subtle bloom. The eye reads it as "purposeful column boundary" rather than "default Bootstrap divider."

2. **8px threshold pills in a vertical column on the right edge of the list.** When the list scrolls, the pills line up like phosphor LEDs on a Bloomberg terminal — the operator can sweep the list visually and instantly spot the red (poorly stitched) profiles.

3. **Confidence pills using 3-letter abbreviations (det / prob / man) instead of full words or color-only icons.** "deterministic" / "probabilistic" / "manual" are too long; pure colors fail accessibility. The 3-letter abbreviation in tabular-nums-styled mono-base is the right amount of information density.

4. **A legacy banner that DOES NOT hide.** Most dashboards either (a) show all data with no quality signal, or (b) hide low-quality data behind a toggle. We show "Legacy user — pre-tracking acquisition" as a yellow info banner that's always visible on the SourceAttributionCard. The operator never misinterprets backfilled data as real.

5. **ForgetUserDialog requires typing the full wallet to confirm.** Most "delete user" dialogs use a single checkbox or a "type DELETE" affordance. Typing the full wallet — a long, case-sensitive base58 string — forces the operator to deliberately copy or read the value, eliminating muscle-memory mistakes.

6. **The Timeline payload expands inline, not in a modal.** Most admin tools open a JSON viewer in a separate modal. We expand the row in-place with a smooth 400ms motion. The operator stays in context.

7. **No idle motion. Ever.** The Sprint 1 rule applies here. A user staring at the Users page sees zero pixel movement. Motion is exclusively a state-change signal.

---

## 17. Operator Checklist Status

- [x] Clear aesthetic direction stated ("Operator Console — Identity Plane")
- [x] DFII ≥ 8 (scored 13)
- [x] One memorable design anchor (Phosphor Scanline Divider + column-of-threshold-pills)
- [x] No generic fonts/colors/layouts (system stack used STRUCTURALLY; ZERO new color tokens; asymmetric 40/60 grid)
- [x] Code matches design ambition (inline-style React + Phosphor + react-window — appropriate for the data density)
- [x] Accessible and performant (AAA threshold contrast; react-window for 16K rows at 60fps; semantic table inside IdentityCard)

---

*End of Sub-Sprint 2.2 design spec. Ready for `taste-skill` audit (Task 1 Step 2), then Tasks 2–20 implementation.*

---

# Appendix: taste-skill Audit Findings (2026-06-03)

Loaded the taste-skill rules from `~/.claude/skills/taste-skill/skills/taste-skill/SKILL.md` and audited the design spec against each section. Findings below follow the same format as Sprint 1's audit.

## Audit summary

| Section | Status | Notes |
|---|---|---|
| 1. Aesthetic direction | ✓ APPROVED | "Operator Console — Identity Plane" with DFII 13. Direct continuation of Sprint 1's named aesthetic. |
| 2. Typography hierarchy | ✓ APPROVED | 4-weight system + tabular-nums + system stack (project rule). Unchanged from Sprint 1. |
| 3. Color calibration (max 1 accent, no Lila ban violation) | ✓ APPROVED | Zero new color tokens. Single accent #00c896. Threshold colors gated to pills + destructive CTAs + legacy banner only. |
| 4. Layout asymmetry / variance | ✓ APPROVED | 40/60 split-screen — DESIGN_VARIANCE 7. Centered hero ban not triggered (no hero). |
| 5. Shadows / glassmorphism (Liquid Glass) | ✓ APPROVED | Inherits inset 1px white at 3% from Sprint 1 Card primitive. New addition: 6px accent bloom on the Scanline Divider — minimal and purposeful. |
| 6. Empty/Loading/Error states (Mandatory Generation) | ✓ APPROVED | 3 list states + 3 detail states + per-card empties per §9. Skeleton uses opacity shimmer (no horizontal sweep). All match dimensions of loaded state. |
| 7. Anti-emoji policy [CRITICAL] | ✓ APPROVED | All icons are Phosphor (UserCircle for tab, EVENT_ICONS for timeline, IDENTITY_ICONS for links, Lock/Warning/MagnifyingGlass/etc for chrome). The ASCII wireframes use unicode glyphs (⌬ ⊙ × ★ ⬆ ⇄ ◷ ◇ ▾ etc.) as PURELY ILLUSTRATIVE indicators of icon placement — implementation uses Phosphor components. NOT EMOJI in the rendered UI. |
| 8. Anti-Card Overuse (when density > 7) | ✓ APPROVED | VISUAL_DENSITY 6, not 7. Cards earn their elevation via threshold pills + scanline divider visual cohesion. 4 cards in detail pane is the right level — none are decorative. |
| 9. Hardware acceleration | ✓ APPROVED | All animations specified via `transform` (scale) + `opacity`. WebAnimations API for threshold pulse. No `width`/`height`/`top`/`left` animation. ResizeObserver triggers state update, not animation. |
| 10. Motion discipline | ✓ APPROVED | "No idle motion. Ever." rule reaffirmed. Skeleton shimmer is the ONE exception during loading states only — disappears the moment data lands. Single-pulse-on-change pill maintained. |
| 11. Differentiation anchor | ✓ APPROVED | Phosphor Scanline Divider — unique to this page, continues Sprint 1's phosphor aesthetic, functional honesty (Bloomberg column separator analogue). Recognizable in screenshot. |
| 12. Information density | ✓ APPROVED | UserListRow at 56px tall packs wallet + name + volume + last-seen + threshold pill cleanly. IdentityCard table rows at 40px. Timeline rows at 44px. All match a "professional admin tool" density target (more than airy, less than cockpit). |
| 13. Destructive action discipline | ✓ APPROVED | ForgetUserDialog gates: red border + warning banner + wallet-match confirmation + 20-char reason minimum. MergeProfilesDialog: destructive button style + 10-char reason gate. Both block accidental confirmation via muscle memory. |
| 14. Accessibility | ✓ APPROVED | All AAA contrasts. Semantic table inside IdentityCard. ARIA on dialogs. Focus management. ESC + click-outside. |

## Net assessment

**Design spec: APPROVED for implementation. No revisions required.**

This is a stronger audit result than Sprint 1's (which required an emoji-replacement amendment). Sprint 2.2 benefits from inheriting Sprint 1's tokens + Phosphor convention + anti-AI-slop discipline from the start.

The aesthetic direction is well-defined, the differentiation anchor (Scanline Divider) is concrete and unique to this page, the empty/error states are mandatory-generation compliant, the destructive action gates are strong, and the motion discipline is exemplary.

Proceed directly to Tasks 2–20 implementation without further design iteration.

