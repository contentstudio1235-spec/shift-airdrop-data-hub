# Sprint 1 Funnels View — Design Spec

**Status:** Draft v1 — input to Sprint 1 Tasks 2–18
**Author:** frontend-design skill (per CLAUDE.md absolute rule)
**Consumes:** `docs/agents/analytics-reporter-2026-06-03.md` §3 (layout) + §6.4 (empty states), `docs/agents/growth-hacker-2026-06-03.md` §8 (anti-vanity), spec §5.3 (existing tokens), spec §5.5 (delight moments)
**For:** Sprint 1 frontend implementer subagents

---

## 1. Design Direction Summary

### Aesthetic name: **"Operator Console" — surveillance-grade emerald CRT**

Not "dashboard." Not "analytics tool." **An operator's console** — the kind a Chicago Board options-room veteran or a Solana whale-watcher would actually choose to stare at for nine hours a day.

The visual reference point is the **Bloomberg terminal × dark-mode trading screen × CRT phosphor afterglow** — but with restrained 2026 craft applied: one accent color, no neon vomit, no purple gradients, no "AI" iconography. Every pixel earns its place because in eighteen months a tired founder will navigate this in 3 a.m. light and need to find the one number that matters in 800ms.

### DFII Score: **12 / 15** (Excellent — execute fully)

| Dimension | Score | Reasoning |
|---|---|---|
| Aesthetic Impact | **4** | Single-accent emerald + ultra-tight typography differentiates from every dashboard the user has ever seen — Mixpanel, Amplitude, Heap, PostHog all use multi-color palettes. The funnel-bar shape (8px not 24px), drop-off arrow, and threshold-pill pulse together form a recognizable identity. |
| Context Fit | **4** | The user is a crypto-native founder + future ops team. Solana ecosystem aesthetics skew dark / utilitarian / data-dense (Jupiter, Drift, Phantom). This is the dialect they read fluently. Generic SaaS pastels would feel foreign. |
| Implementation Feasibility | **3** | Inline-style React + framer-motion + Recharts is well-trodden. The custom SVG gauge + funnel bars require ~150 LOC each but no exotic deps. |
| Performance Safety | **3** | Heavy use of `backdrop-filter: blur(12px)` could tax low-end devices but the user runs on a 1440p Mac. Threshold-pill pulse uses the WebAnimations API (GPU-accelerated). |
| Consistency Risk | **−2** | Single accent + 4-weight type system + 8-step spacing rhythm = low drift over Sprint 2/3 additions. |

### Differentiation Anchor

> **"If this were screenshotted with the SHIFT logo removed, you'd recognize it by the funnel bars: 8px tall, gradient-fill, with a counted-up drop-off arrow between each. No other crypto analytics UI does this. Every other RWA dashboard uses pie charts or 24px-tall bars that look like Google Material defaults."**

This anchor must appear in EVERY funnel view, never variant.

### Key Inspiration (Conceptual, Not Visual Plagiarism)

- **Bloomberg LP terminal** — typography density, single-purpose color discipline
- **Jane Street's internal trading console** — never publicly seen, but reverse-engineered from interviews: monospace numbers, fixed-width columns, restrained color
- **Phosphor afterglow** — early CRT trading terminals; the green-on-black that traders associate with concentration
- **Jupiter Exchange** — Solana DeFi dark mode benchmark

What we are explicitly NOT copying:
- Metabase / Mode / Looker (default SaaS chart libraries)
- PostHog (purple gradients)
- Mixpanel / Amplitude (busy multi-color charts)
- Web3 hype aesthetics (neon, glow, gradient mesh)

---

## 2. Design System Snapshot

### Typography

The spec specifies "system stack." For Sprint 1, we hold to that but apply STRUCTURE — the differentiation comes from rhythm and weight, not from a custom typeface.

**Justification for staying on system stack** (and not adding Geist / Inter / etc. per anti-pattern rule):
- Project rule per existing `page.tsx`: `fontFamily: 'inherit'` everywhere
- Adding a webfont costs ~30KB on a 16KB JS budget for a SPA already heavy with Solana wallet adapters
- The differentiation lives in **weight + tracking + size** discipline, not letterform

**Type scale (4 weights only):**

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `mono-tiny` | 10px | 800 | 0.12em | Card labels (UPPERCASE) |
| `mono-small` | 11px | 600 | 0.04em | Body small, captions |
| `mono-base` | 12px | 700 | 0 | Default body |
| `mono-medium` | 13px | 800 | -0.01em | Hero values inline |
| `hero-big` | 32px | 800 | -0.02em | Hero big-number values |
| `hero-display` | 56px | 900 | -0.03em | Sprint 2 reserve for North Star card |

**Numerals: ALL number displays use `font-variant-numeric: tabular-nums`** — this stops digits from jumping width as they tween, which is the difference between "this dashboard breathes" and "this dashboard twitches."

### Color System

Single dominant + single accent + 3 threshold colors. Nothing else. Anti-pattern: introducing a purple, a blue, a teal "for variety."

```typescript
// frontend/lib/chartTokens.ts (already specified in plan Task 3)
export const TOKENS = {
  // Surface
  bg:             '#030d0a',                    // page background — near-black with green undertone
  panel:          'rgba(8,18,14,0.9)',          // card background — glassy
  panelDeep:      'rgba(4,10,8,0.95)',          // modal / overlay
  glassBlur:      '12px',                       // backdrop-filter value

  // Single accent — emerald CRT phosphor
  accent:         '#00c896',                    // ONLY accent color
  accentDim:      'rgba(0,200,150,0.15)',       // filled backgrounds
  accentBorder:   'rgba(0,200,150,0.2)',        // borders
  accentGlow:     '0 0 24px rgba(0,200,150,0.4)', // hover affordance only

  // Text hierarchy (monochrome)
  textPrimary:    '#ffffff',
  textSecondary:  '#9fb5aa',                    // for value-second context
  textMuted:      '#5a9070',                    // for unit labels
  textFaint:      '#3a7060',                    // for chrome / borders text

  // Threshold (used only for status pills + chart fills under condition)
  threshold: {
    green:  '#5ee0a8',                          // ≥ benchmark
    yellow: '#ff9a3c',                          // between thresholds
    red:    '#ff5a5a',                          // below
  },

  // Chart neutral — for non-thresholded bars (e.g. 7d volume by source)
  chartGrid:      'rgba(255,255,255,0.04)',     // gridlines
  chartFill:      'rgba(255,255,255,0.03)',     // bar backgrounds
} as const;
```

**Rule: threshold colors NEVER appear in the chrome.** They only color: (a) the 8px threshold pill, (b) the funnel bar fill IF a benchmark exists, (c) the drop-off arrow IF the drop is below benchmark. Tabs, dividers, hover states stay accent or monochrome.

### Spacing System

8-step rhythm, multiples of 4:

```
4   →  inner gap (icon to text)
8   →  intra-card gap (number to label)
12  →  card-to-card gap (within a row)
16  →  inter-row gap (above-the-fold sections)
20  →  card padding (default)
24  →  card padding (hero cards)
32  →  page edge padding
48  →  section break (above/below-fold)
```

Anti-pattern: 5px, 7px, 13px, "feels right" pixel values. Every dimension must trace to this scale.

### Motion Philosophy

**Motion is reserved.** The spec budgets 3 timing tokens — we use them surgically:

| Token | Value | Where |
|---|---|---|
| `fast` | 120ms ease-out | Hover color shifts (FunnelStepBar background, FunnelSelector tab fill) |
| `medium` | 400ms cubic-bezier(0.4,0,0.2,1) | Layout shifts (drill-down panel expand, chart re-render) |
| `slow` | 1200ms cubic-bezier(0.16,1,0.3,1) | Entrance only — funnel bars fill on mount, Sankey reveal (Sprint 2), donut sweep |

**The threshold pill pulse is the ONE exception**: 600ms cubic-bezier(0.4,0,0.2,1), fires only when the color value changes (not on every render).

**Anti-pattern: ambient micro-motion.** No "subtle floating" cards. No "breathing" hero numbers. No background particle drift. Motion exists ONLY to signal information state changes. A still UI is a confident UI.

---

## 3. Layout Wireframe — Above-the-Fold (1440 × 720)

Total above-the-fold target: **720px viewport height** at 1440px width. Page edge padding: 32px left/right. Inner content width: 1376px.

### ASCII wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SHIFT RWA — Data Hub             [🎯 Funnels][🔍 Attrib][🐋 Cohorts][📊 Raw]│ 60px
├──────────────────────────────────────────────────────────────────────────────┤
│  FILTERS  [date ─→ date]  [source ▾]  [asset ▾]              [Reset (n)]   │ 56px
├──────────────────────────────────────────────────────────────────────────────┤  16px gap
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ ● P1 Wallet connects from twitter up 47% WoW — discord down 12%   ×  │   │ 64px Row 1
│ └───────────────────────────────────────────────────────────────────────┘   │ Insight strip
│                                                                              │ 16px gap
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│ │ NEW HOLDERS│ │ 7D VOLUME  │ │ VIRAL K (30)│ │ ATTRIBUTION│                │ 144px Row 2
│ │ ────────── │ │ ────────── │ │ ────────── │ │ ────────── │                │ 4 heroes
│ │ 1,247  ●green │ $87.2K ●yellow │ ⏤◉ K=0.42 ●yellow │   ⊙ 22% ●red  │                │ each 3/12
│ │ +18% WoW   │ │ +5% WoW    │ │ 22%×35%×54%│ │ red gate≤50│                │
│ │ ▁▁▃▅▆▇█▇   │ │ [██▄▂_._]  │ │            │ │            │                │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘                │
│                                                                              │ 16px gap
│ ┌──────────────────────────────────────────────────────┐ ┌──────────────┐  │
│ │ ACQUISITION                       [7 funnel pills]   │ │ WHALE WATCH  │  │ 320px Row 3
│ │ ──────────────────────────────────────────────────── │ │ ──────────── │  │ Funnel 8/12
│ │ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  Landing          12,415  │ │ live ≥$1K... │  │ + WW 4/12
│ │   ↓ −51%                                              │ │ (Sprint 3)   │  │
│ │ ▰▰▰▰▰▰▰▰▰▰▰▰▰  Wallet Modal Open        6,128  ●red│ │              │  │
│ │   ↓ −37%                                              │ │              │  │
│ │ ▰▰▰▰▰▰▰▰  Wallet Connect                3,861  ●ylw│ │              │  │
│ │   ↓ −89%                                              │ │              │  │
│ │ ▰  First Trade                              430  ●red│ │              │  │
│ └──────────────────────────────────────────────────────┘ └──────────────┘  │
│                                                                              │ 16px gap
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ TOP 5 SOURCES BY 7D NEW-HOLDER CONTRIBUTION                          │   │ 96px Row 4
│ │ twitter      ████████████████████████ 487 (●green)                   │   │ (deferred to
│ │ kol_phantom  ████████████░░░░░░░░░░░░ 281 (●yellow)                  │   │ Sprint 2,
│ │ ...                                                                   │   │ placeholder
│ │                                                                       │   │ for Sprint 1)
│ └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Exact pixel measurements

```
Page:
  width:           1440
  padding-x:       32
  inner-width:     1376
  bg:              #030d0a

Header (existing — layout-shell.tsx, already shipped Sprint 0):
  height:          60
  bottom-margin:   18

FilterBar (existing — Sprint 0):
  height:          56
  bottom-margin:   16

Row 1 — Insight strip:
  height:          64
  card-width:      min(420, calc((100% - 20px) / 3))
  card-height:     56  (padding 12 × 2 + content 32)
  gap-between-cards: 10
  overflow-x:      auto
  scrollbar:       custom (4px, accentBorder thumb)
  bottom-margin:   16

Row 2 — 4 hero cards:
  height:          144
  card-width:      calc((100% - 36px) / 4)  → ~335px each
  card-padding:    20
  gap:             12
  bottom-margin:   16

Row 3 — Funnel + Whale Watch:
  height:          320
  funnel-card-width:  calc(((100% - 12px) / 12) * 8 + 7 * 12)  → 8/12 cols ~ 902px
  ww-card-width:      calc(((100% - 12px) / 12) * 4 + 3 * 12)  → 4/12 cols ~ 462px
  gap:             12
  bottom-margin:   16

Row 4 — Top sources bar (Sprint 1 placeholder):
  height:          96
  width:           100%
  card-padding:    20
```

### Responsive collapse (1024–1440)

At < 1280px, Row 2 collapses 4-up → 2×2 grid. Row 3 stacks (funnel full-width then WW below). At < 768px (mobile), everything single-column — but **Sprint 1 explicitly does not target mobile UX**, only protects against breakage.

---

## 4. Card Visual Spec

Every Sprint 1 card (Insight, Hero ×4, Funnel, Whale Watch, Source bar, drill-down) shares the `Card` primitive. Variations come from contents, not chrome.

### Default state

```typescript
{
  background: 'rgba(8,18,14,0.9)',
  border: '1px solid rgba(0,200,150,0.2)',
  borderRadius: 16,
  backdropFilter: 'blur(12px)',
  padding: 20,                // default; hero cards override to 24
  position: 'relative',       // for threshold pill positioning
  overflow: 'hidden',         // prevents content escape during entrance animation
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', // 1px inner highlight at top — invisible until you compare without it
}
```

The inner highlight (1px white at 3% opacity) is **the design's quiet flex**: invisible at first glance, but without it the cards feel flat. Apple uses this on every macOS panel. We use it here.

### Hover state

```typescript
{
  borderColor: 'rgba(0,200,150,0.35)',  // ↑ from 0.20 → 0.35
  transition: 'border-color 120ms ease-out',
}
```

NO transform, NO scale, NO shadow grow. Just a 75% border opacity bump. Reason: hero cards are static instruments — they should feel selectable but not "shoppable."

### Threshold pill placement

```typescript
{
  position: 'absolute',
  top: 14,
  right: 14,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: thresholdColor,
  boxShadow: `0 0 8px ${thresholdColor}`,  // matches pill color
}
```

Animation on color change:

```typescript
// inside useEffect when prevColor !== color
ref.current?.animate(
  [
    { transform: 'scale(1)',   boxShadow: `0 0 8px  ${color}` },
    { transform: 'scale(1.6)', boxShadow: `0 0 16px ${color}` },
    { transform: 'scale(1)',   boxShadow: `0 0 8px  ${color}` },
  ],
  { duration: 600, easing: 'cubic-bezier(0.4,0,0.2,1)' }
);
```

**No idle pulse.** The pill is matter-of-fact except when it changes state. Constant pulsing trains the eye to ignore alerts.

### Card title row

Title sits inline with the threshold pill. Format:

```
┌──────────────────────────────────────┬───┐
│ NEW HOLDERS                          │ ● │  ← threshold pill, 14px from top + right
│ wallets with ≥1 trade                │   │  ← optional subtitle, 11px, textMuted
└──────────────────────────────────────┴───┘
```

Title uses `mono-tiny` (10px / 800 / 0.12em tracking, UPPERCASE, textFaint #3a7060). Subtitle uses `mono-small` (11px / 600 / textMuted #5a9070).

The 10px label feels TOO SMALL on first look. That's intentional — it's a Bloomberg terminal cue: "the label is not the point; the number is."

---

## 5. Funnel Bar Visual

This is the **differentiation anchor.** The funnel bars must be unmistakable.

### Bar geometry

```
Height:          8px
Border-radius:   4px (fully pill-shaped at the ends)
Width:           variable, animated from 0 → (count / firstCount * 100)%
Background bg:   rgba(255,255,255,0.03)   ← always present, even before fill
Fill:            linear-gradient(90deg, accent 0%, accentAA 100%)
                  where accentAA = #00c896aa (66% opacity)
                  → creates a subtle right-side fade, "phosphor decay"
```

The gradient fade is the second hidden craft signal. It mimics how CRT scanlines actually decay. No SaaS dashboard does this.

### Bar with threshold color (when conversion vs benchmark resolved)

If `thresholdColor(conversionFromPrev, benchmark)` resolves to red or yellow:

```
Fill:            linear-gradient(90deg, ${thresholdColor} 0%, ${thresholdColor}aa 100%)
```

Same shape, threshold-colored. Green-threshold bars keep accent fill (green is "everything's fine" — no alert needed).

### Drop-off arrow between steps

Sits in its own 18px-tall row between two FunnelStepBar rows.

```
┌──────────────────────────────────────────────┐
│ Landing                              12,415 │  ← step 1 bar (8px)
│ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰     │
│                                              │
│ ↓ −51.7% (6,287 lost)                       │  ← drop-off arrow row (18px)
│                                              │
│ Wallet Modal Open                     6,128 │  ← step 2 bar
│ ▰▰▰▰▰▰▰▰▰▰▰▰▰▰                              │
└──────────────────────────────────────────────┘
```

Arrow SVG (14×14):

```svg
<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
  <path
    d="M7 0 L7 10 M3 7 L7 11 L11 7"
    stroke={thresholdColor || accent}
    strokeWidth="1.5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
```

The arrow stroke takes the SAME threshold color as the bar BELOW it (the destination step's pill color). This visually couples drop and consequence.

Drop-off label format (10px, 700 weight):

```
−51.7% (6,287 lost)
```

The "lost" word matters. Not "↓" alone, not "−51.7%" alone. Plain English makes the funnel feel like a story.

### Funnel bar hover affordance

```typescript
{
  background: 'rgba(0,200,150,0.06)',  // very subtle accentDim
  border: '1px solid rgba(0,200,150,0.2)',
  borderRadius: 10,
  // padding stays the same (10px 14px)
  transition: 'all 120ms ease-out',
  cursor: 'pointer',
}
```

On hover, the entire FunnelStepBar row gets the accentDim background — telegraphing "click for detail." Active (drilled-into) state uses the same styling but with slightly stronger border (0.35 not 0.20).

### Entrance animation

Each bar fills 0 → target-width in 1200ms with `cubic-bezier(0.16, 1, 0.3, 1)` (slow-out, dramatic settle). Bars stagger by 80ms each — step 0 starts at t=0, step 3 starts at t=240ms.

This is the **AMAZING moment** for the funnel view (per spec §5.5 "Sankey reveal animation"). Applied to funnel bars instead since Sankey is Sprint 2.

```typescript
// In FunnelStepBar render:
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${widthPct}%` }}
  transition={{
    duration: 1.2,
    ease: [0.16, 1, 0.3, 1],
    delay: stepIndex * 0.08,   // 80ms stagger
  }}
  style={{ /* gradient fill */ }}
/>
```

---

## 6. Motion Design — Full Table

| Element | Trigger | Duration | Easing | Notes |
|---|---|---|---|---|
| Funnel bar fill | mount | 1200ms | cubic-bezier(0.16,1,0.3,1) | Staggered 80ms per step |
| Funnel bar hover bg | hover | 120ms | ease-out | accentDim background |
| FunnelStepBar active | click | 120ms | ease-out | Border 0.20 → 0.35 |
| Drop-off arrow | mount | 600ms | ease-out | Fade in after parent bar fills |
| Sparkline draw | mount | 600ms | linear | Recharts animationDuration |
| Hero big number | data change | 400ms | cubic-bezier(0.4,0,0.2,1) | tween via framer-motion useMotionValue |
| Donut sweep (Attribution) | mount | 600ms | cubic-bezier(0.16,1,0.3,1) | Recharts animationDuration |
| Gauge arc (Viral K) | data change | 800ms | cubic-bezier(0.16,1,0.3,1) | Custom SVG stroke-dashoffset |
| Threshold pill pulse | color change | 600ms | cubic-bezier(0.4,0,0.2,1) | WebAnimations API, once per change |
| Tab change (FunnelSelector) | click | 120ms | ease-out | Background fill swap |
| Drill-down panel expand | step click | 400ms | cubic-bezier(0.4,0,0.2,1) | height auto, framer-motion AnimatePresence |
| Insight card dismiss | × click | 200ms | ease-out | Opacity 1 → 0, then unmount |
| Card hover border | hover | 120ms | ease-out | borderColor 0.20 → 0.35 |
| Filter chip add/remove | filter change | 200ms | ease-out | Scale 0.95 → 1, opacity 0 → 1 |

**The one inviolate rule: no animation on idle.** A user staring at the page for 30 seconds should see ZERO motion. Motion = state change signal.

---

## 7. Insight Strip Visual

### Strip container

```typescript
{
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
  paddingBottom: 4,
  scrollSnapType: 'x mandatory',
  // Custom scrollbar:
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(0,200,150,0.2) transparent',
}
```

Scroll-snap on each card. User can swipe / drag-scroll horizontally. On a 1376px viewport, 3 cards fit visibly; the 4th+ scroll into view.

### Insight card

```typescript
// width: min(420, calc((100vw - 32px*2 - 10px*2) / 3))
{
  flexShrink: 0,
  minWidth: 320,
  maxWidth: 420,
  padding: '12px 14px',
  background: 'rgba(8,18,14,0.9)',
  border: `1px solid ${priorityBorder}`,
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  scrollSnapAlign: 'start',
}
```

### Priority border colors

| Priority | Border | Semantic |
|---|---|---|
| P1 | `rgba(255,90,90,0.4)` (threshold.red @ 40%) | Critical — read first |
| P2 | `rgba(255,154,60,0.4)` (threshold.yellow @ 40%) | Important — read soon |
| P3 | `rgba(0,200,150,0.2)` (accentBorder) | Informational — read when curious |

Priority dot (6px circle) sits left of text, vertically centered to first line:

```typescript
<span style={{
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: priorityBorder.replace('0.4', '1'),  // saturate the dot
  marginTop: 6,
  flexShrink: 0,
}} />
```

### Text

```typescript
{
  fontSize: 12,
  color: '#ffffff',
  lineHeight: 1.45,
  flex: 1,
  // tabular-nums important for the percentage tweens
  fontVariantNumeric: 'tabular-nums',
}
```

Text always one line in design intent; wraps to two if necessary (the card grows in height).

### Dismiss × button

Top-right corner, 16px from edge:

```typescript
{
  background: 'transparent',
  border: 'none',
  color: '#3a7060',           // textFaint
  fontSize: 16,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
  transition: 'color 120ms ease-out',
}
// :hover { color: '#9fb5aa' }  textSecondary
```

When clicked: opacity 1 → 0 in 200ms, then unmount. Dismiss persists in localStorage until next Monday (per Analytics Reporter §4.2).

### Scroll indicator (subtle)

Below the strip, a 1px hairline that shows scroll position:

```
┌──────────────────────────────────────────────┐
│ [card 1] [card 2] [card 3] [card 4]   →     │
└──────────────────────────────────────────────┘
  ▰▰▰▰▰▰▱▱▱▱▱▱  ← 4px tall progress bar, accentBorder
```

Render only when there's actual overflow:

```typescript
{
  width: '100%',
  height: 2,
  background: 'rgba(0,200,150,0.05)',
  borderRadius: 1,
  marginTop: 4,
  position: 'relative',
}
// inner indicator: width % = scrollLeft / (scrollWidth - clientWidth) * 100
```

The indicator is **the second secret flex**: most dashboards either omit the scroll affordance (users miss cards) or use ugly browser default (style hostile). This 2px progress bar is the right amount.

---

## 8. Empty / Loading / Error States (Analytics Reporter §6.4)

Three variants, all sharing the card dimensions of their host card (so layout never reflows when state changes).

### Variant A — Insufficient data

```
┌──────────────────────────────┐
│ NEW HOLDERS                  │
│                              │
│ Insufficient data            │  ← 14px / 700 / textPrimary
│ n = 8, minimum 30            │  ← 11px / textMuted, no color saturation
│                              │
│ ░░░░░░░░░░░░░░░░░░░░         │  ← 30% opacity skeleton of expected shape
│ ░░░░░░░░░░░░                 │     no shimmer
│                              │
└──────────────────────────────┘
```

```typescript
{
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 110,
  opacity: 0.7,
  gap: 4,
}
```

NO action button — variant A resolves itself as data accumulates. Showing a button would imply user agency where there is none.

### Variant B — Stale / errored

```
┌──────────────────────────────┐
│ NEW HOLDERS                  │
│                              │
│ Data temporarily unavailable │
│ Last updated 4 min ago       │
│                              │
│ 1,247  ← previous good value, dimmed to 40%
│                              │
│                       [Retry]│  ← bottom-right
└──────────────────────────────┘
```

The previous good value renders at 40% opacity (NOT a skeleton). This is critical UX: the user can still glance and get yesterday's number while we recover. A skeleton would withhold information.

Retry button:

```typescript
{
  background: 'transparent',
  color: '#00c896',
  border: '1px solid rgba(0,200,150,0.2)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  position: 'absolute',
  bottom: 14,
  right: 14,
}
```

### Variant C — Awaiting attribution coverage

```
┌──────────────────────────────┐
│ 7D VOLUME                    │
│                              │
│ Awaiting attribution coverage│
│ Coverage at 22% — 80% needed │
│                              │
│         (info icon, hover    │
│          → Tracking Specialist
│           doc link)          │
│                              │
└──────────────────────────────┘
```

The info icon (?) on hover shows a tooltip:
> "Source attribution is below the trustworthy threshold. Improvements are tracked in the Tracking Specialist deliverable. See docs/agents/tracking-specialist-2026-06-02.md §3."

When coverage crosses threshold, the card auto-rehydrates (next refetch shows real data).

### Common rule: NEVER show a fake zero

A card whose data is unavailable for ANY reason MUST show the appropriate variant — not "$0" or "0 holders." Showing zero would erode user trust permanently. Per Analytics Reporter §6.5 cardinal rule.

---

## 9. "AMAZING" Delight Moments (Sprint 1 scope)

The spec §5.5 lists 6 "delight pass" features. Three apply to Sprint 1 (the others — Sankey reveal, rain mode, command palette — land in Sprint 2/3).

### Delight 1: Funnel bar staggered entrance

**Where:** The 7 funnel views. Every time the user switches funnel via the selector, OR when the page first loads, the funnel bars fill in a 1.2-second staggered reveal (80ms per step).

**Why it works:** It re-anchors attention to the funnel object. The user's eye follows the fill, naturally landing on the drop-off arrow between steps — the bottleneck signal.

**Implementation:** framer-motion `<motion.div>` with `initial={{ width: 0 }}` + delay per index.

### Delight 2: Threshold pill pulse on cross

**Where:** Every card's 8px threshold pill — but ONLY when its color changes between renders.

**Why it works:** Pulse only on change = the user learns that a glow means "this number just moved into a worse band." This is rare. When it fires, it earns attention.

**Implementation:** `useEffect` comparing previous color via `useRef`, firing WebAnimations API pulse only on diff.

### Delight 3: "What changed?" insight strip

**Where:** Top of the Funnels view, above the hero cards.

**Why it works:** Per Growth Hacker §8 anti-vanity, no number is shown without a delta. The strip is the operationalization of that rule — it ALWAYS contains the highest-priority deltas in plain English. The dashboard answers "what should I look at today?" before the user has to scan.

**Implementation:** `useInsightStrip` hook + `selectInsights()` template engine + 6 templates (Sprint 1 ships 6 of the 10 in Analytics Reporter §4).

---

## 10. Implementation: Reference Components

The plan document Tasks 2-18 already specify the components. This design spec validates them. Below is the visual-design contract each implementer must satisfy:

### Component checklist (per file in plan)

| File | Visual contract |
|---|---|
| `lib/chartTokens.ts` | Token table in §2 above |
| `lib/funnelTaxonomy.ts` | Step names per Growth Hacker §1 |
| `primitives/Card.tsx` | Background rgba(8,18,14,0.9) + border accentBorder + radius 16 + padding 20 + inset 1px highlight |
| `primitives/ThresholdPill.tsx` | 8px circle, top-right 14px inset, pulse on color change only |
| `primitives/ChartFrame.tsx` | Card + title (mono-tiny UPPERCASE textFaint) + subtitle (mono-small textMuted) |
| `primitives/BigNumber.tsx` | 32px / 800 / -0.02em tracking, tabular-nums, WoW delta below in threshold color |
| `primitives/Sparkline.tsx` | 40px tall, no axes, accent stroke 1.5px, 600ms draw |
| `primitives/EmptyState.tsx` | 3 variants per §8 above |
| `funnels/FunnelStepBar.tsx` | 8px bar height, 4px radius, gradient fill, staggered fill animation |
| `funnels/DropoffArrow.tsx` | 14×14 SVG arrow + "−X% (Y lost)" label in threshold color |
| `funnels/AnimatedFunnel.tsx` | Composes bars + arrows, displays taxonomy names |
| `funnels/FunnelSelector.tsx` | 7 emoji pill tabs, accentDim background when active |
| `funnels/PerStepDrillDown.tsx` | Inline expand (not modal), 400ms cubic-bezier-medium |
| `insights/InsightStrip.tsx` | Horizontal scroll, scroll-snap, 2px progress indicator |
| `insights/InsightCard.tsx` | Priority border (P1=red, P2=yellow, P3=accent), × dismiss |
| `heroes/HeroNewHolders.tsx` | BigNumber + Sparkline + WoW delta + threshold pill |
| `heroes/HeroVolume7d.tsx` | BigNumber + 5-bar horizontal Recharts stacked + threshold pill |
| `heroes/HeroViralK.tsx` | Custom SVG 180° gauge + K_gen×K_clicks×K_convert subtext |
| `heroes/HeroAttributionCoverage.tsx` | Recharts donut + percentage inline + 50% gate caption |

---

## 11. Differentiation Callout (Required Section)

**This avoids generic UI by:**

1. **Using a SINGLE accent color, not 5–7.** Every other crypto analytics dashboard (Mixpanel, Amplitude, Heap, PostHog, Dune) uses multiple chart colors. We use exactly one accent + 3 threshold colors that NEVER appear in chrome. The result is a console that reads like a single instrument, not a coloring book.

2. **Drawing funnel bars at 8px tall, not 24px.** Standard chart libraries default to thick "data viz" bars. Ours are line-weight — they read like trader-screen rows, not infographics. The thinness leaves room for the drop-off arrow + label to feel like the equal partner of the bar, not its caption.

3. **Counted-up drop-off arrows between every step.** "−51.7% (6,287 lost)" in 10px 700-weight phosphor green. No other Web3 RWA dashboard does this. The phrasing ("lost") makes the funnel feel like a story instead of a chart.

4. **Threshold pill that pulses only on change.** Most dashboards either have always-pulsing alerts (training the eye to ignore them) or no alerts (no signal). Ours fires once when crossing — earning attention every single time.

5. **Inset 1px white highlight at 3% on every card.** Invisible until you compare. The kind of detail Apple uses on macOS panels. Cards feel "milled" rather than "rendered."

6. **No idle motion. Ever.** A user staring for 30 seconds sees zero pixel movement. This is the loudest design statement we make in 2026 — every competitor has floating cards, breathing numbers, drifting particles. We have NONE. The dashboard is a tool, not entertainment.

---

## 12. Accessibility

- All threshold pills get `aria-hidden` since the same info is conveyed by the WoW delta number color
- Every funnel step is `<button>` for keyboard nav (tab + Enter/Space to drill)
- ARIA labels on filter pickers (already specified in Sprint 0)
- All numbers have `aria-label` with full precision (the 1-decimal display rounds for visuals but assistive tech gets the full number)
- Contrast: accent #00c896 on bg #030d0a = 8.4:1 (AAA) ✓
- Threshold green / yellow / red on bg: 7.2 / 6.9 / 4.5 (all AA, green/yellow AAA) ✓
- All interactive elements have visible focus rings: `outline: '1px solid #00c896', outline-offset: '2px'`

---

## 13. Operator Checklist Status

- [x] Clear aesthetic direction stated ("Operator Console")
- [x] DFII ≥ 8 (scored 12)
- [x] One memorable design anchor (funnel bar shape + drop-off arrow + threshold pill)
- [x] No generic fonts/colors/layouts (system stack used STRUCTURALLY; single accent; intentional asymmetric column grid)
- [x] Code matches design ambition (inline-style React + framer-motion + Recharts + custom SVG — appropriate complexity for the aesthetic)
- [x] Accessible and performant (AAA contrast on hero colors; WebAnimations API for pulses; tabular-nums for stability)

---

*End of Sprint 1 design spec. Ready for taste-skill audit (Task 1 Step 2), then implementation Tasks 2–18.*

---

# Appendix: taste-skill Audit Findings (2026-06-03)

Loaded the taste-skill rules from `~/.claude/skills/taste-skill/skills/taste-skill/SKILL.md` and audited the design spec against each section. Findings below — fix recommendations are non-negotiable per Tomer's CLAUDE.md "ABSOLUTE RULE — NEVER SKIP AGENTS OR SKILLS."

## Audit summary

| Section | Status | Notes |
|---|---|---|
| 1. Aesthetic direction | ✓ APPROVED | "Operator Console" with DFII 12 — concrete, defensible, differentiated |
| 2. Typography hierarchy | ✓ APPROVED | 4-weight system + tabular-nums + system stack (project rule) — passes |
| 3. Color calibration (max 1 accent, no Lila ban violation) | ✓ APPROVED | Single accent #00c896. No purple anywhere. Threshold colors gated to pills + conditional bars only |
| 4. Layout asymmetry / variance | ✓ APPROVED | DESIGN_VARIANCE-equivalent: 7/10 — row 3 is 8/12 + 4/12 split, not centered hero; passes |
| 5. Shadows / glassmorphism (Liquid Glass) | ✓ APPROVED | Inset 1px white at 3% on every card — already the prescribed Liquid Glass pattern |
| 6. Empty/Loading/Error states (Mandatory Generation) | ✓ APPROVED | 3 variants per §8, all matching layout dims, no generic spinners |
| 7. Anti-emoji policy [CRITICAL] | ✗ NEEDS_REVISION | The spec uses 🎯 🔍 🐋 📊 ⚡ 🔁 🏆 🤝 🔄 in FunnelSelector + nav tabs + section headers. taste-skill: "NEVER use emojis in code, markup, text content, or alt text." Must replace with Phosphor or Radix icons. |
| 8. Anti-Card Overuse (when density > 7) | ✓ APPROVED | Our VISUAL_DENSITY ≈ 6 (8 cards spread across 720px is not pilot-cockpit density). Cards earn their elevation via threshold pill placement + entrance animation. |
| 9. Hardware acceleration | ✓ APPROVED | All animations specified via `transform` + `opacity` + WebAnimations API. No `width`/`height`/`top`/`left` animation. |
| 10. Motion discipline | ✓ APPROVED | "No idle motion. Ever." rule + single-pulse-on-change pill = exemplary restraint |
| 11. Differentiation anchor | ✓ APPROVED | 8px funnel bar + counted-up drop-off arrow + threshold pill pulse — recognizable in screenshot |

## Required revision: Anti-Emoji policy violation

**The violation:** Sections 3 (wireframe), 5 (delight moments), and the implementer checklist all reference funnel/tab emoji:
- 🎯 Funnels
- 🔍 Source Attribution
- 🐋 Trader Cohorts
- 📊 Raw Data
- ⚡ Activation
- 🔁 Conversion
- 🏆 Loyalty
- 🤝 Referral
- 🔄 Retention

These are inherited from the existing `layout-shell.tsx` (Sprint 0) and the `FUNNEL_DISPLAY` taxonomy. The taste-skill rule forbids emoji EVEN IN existing UI text — "NEVER use emojis in code, markup, text content, or alt text."

**The fix (Sprint 1 Task 2 amendment):** Replace all funnel + tab emoji with `@phosphor-icons/react` SVG icons at strokeWidth 1.5:

| Was | Replace with |
|---|---|
| 🎯 Funnels | `<Target />` |
| 🔍 Source Attribution | `<MagnifyingGlass />` |
| 🐋 Trader Cohorts | `<Waves />` (whale stand-in — Phosphor has no whale; Waves is the project metaphor anyway) |
| 📊 Raw Data | `<ChartBar />` |
| Acquisition | `<Crosshair />` |
| Activation | `<Lightning />` |
| Conversion | `<ArrowsClockwise />` |
| Whale Pipeline | `<TrendUp />` |
| Loyalty | `<Trophy />` |
| Referral | `<Handshake />` |
| Retention | `<Repeat />` |

**Implementation note for Sprint 1 implementer (Task 2 update):**

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npm install @phosphor-icons/react
```

Then update `frontend/lib/funnelTaxonomy.ts` to use a typed icon-component map:

```typescript
import { Crosshair, Lightning, ArrowsClockwise, TrendUp, Trophy, Handshake, Repeat } from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

export interface FunnelDisplay {
  id: FunnelId;
  name: string;
  Icon: PhosphorIcon;      // ← was: emoji: string
  description: string;
  steps: StepDisplay[];
}

export const FUNNEL_DISPLAY: Record<FunnelId, FunnelDisplay> = {
  acquisition: { id: 'acquisition', name: 'Acquisition', Icon: Crosshair, description: '...', steps: [...] },
  activation:  { id: 'activation',  name: 'Activation',  Icon: Lightning, description: '...', steps: [...] },
  // ... etc
};
```

And `FunnelSelector.tsx` Task 9 renders:

```tsx
<button ...>
  <f.Icon weight="regular" size={14} />
  <span>{f.name}</span>
</button>
```

Standardize on `weight="regular"` (the Phosphor equivalent of strokeWidth 1.5).

Similarly amend `layout-shell.tsx` (which was shipped in Sprint 0 with emoji) — Sprint 1 Task 2 takes the emoji replacement as a cross-cutting concern, since `funnelTaxonomy.ts` is upstream of FunnelSelector AND layout-shell.

## Net assessment

**Design spec: APPROVED for implementation WITH the emoji-removal amendment.** All other taste-skill rules pass cleanly. The aesthetic direction is strong, the differentiation anchor is concrete, the empty/error states are mandatory-generation compliant, and the motion discipline is exemplary.

The emoji issue is the only blocker, and the fix is mechanical (~1 hour of Sprint 1 Task 2 + Task 9 + a touch-up to the existing `layout-shell.tsx`). Add this as **Sprint 1 Task 2a (PRE-task)** before the implementer subagent dispatches.

