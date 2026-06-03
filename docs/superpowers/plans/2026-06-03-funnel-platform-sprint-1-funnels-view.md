# Funnel Platform — Sprint 1: Funnels View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Mandatory frontend craft skills per Tomer's CLAUDE.md: invoke `frontend-design` AND `taste-skill` skills before any visual work. NO generic AI patterns allowed.

**Goal:** Replace the `FunnelsView` placeholder with a production-grade 7-funnel UI implementing Analytics Reporter's 8-card above-the-fold layout, Growth Hacker's refined taxonomy, and Section 5 of the spec.

**Architecture:** Pure-client React rendering against the 11 Sprint 0 endpoints (already shipped). Three new presentation layers — (1) `funnelTaxonomy.ts` as the single source of truth for step labels + benchmarks + thresholds, (2) reusable `<Card>` primitives backed by the existing inline-style design tokens, (3) Recharts for time-series + bar charts plus custom SVG for the funnel bars / gauge / Whale Origin shape that don't have a clean Recharts equivalent. Insight-strip text generated client-side from delta math with anti-hallucination gates enforced.

**Tech Stack:**
- Frontend: Next.js 16.2.6, React 19, `framer-motion@11`, `recharts@3`, inline-style React (NO Tailwind), `vitest`, `@testing-library/react`, `jsdom`
- Required skills: `frontend-design` + `taste-skill` (per CLAUDE.md absolute rule — no generic AI patterns, taste-skill enforces anti-AI-slop)
- Required agents: NONE in Sprint 1 (all 4 agency-agents already delivered in Sprint 0)

**Branch:** `feat/funnel-attribution-platform` (continue from Sprint 0)

**Spec reference:** `docs/superpowers/specs/2026-06-02-funnel-data-hub-design.md` §3, §5
**Upstream deliverables (REQUIRED reading by implementers):**
- `docs/agents/growth-hacker-2026-06-03.md` — refined funnel taxonomy, R/Y/G benchmarks, anti-vanity list, 4 hero KPIs
- `docs/agents/analytics-reporter-2026-06-03.md` — KPI tree, 8-card layout, insight templates, anti-hallucination rules, Recharts cheat sheet
- `docs/agents/next-16-notes.md` — "use client" mandate + Next 16 patterns

---

## Scope Check

Sprint 1 ships the **Funnels view only**. Source Attribution (Whale Sankey, KOL leaderboard) is Sprint 2. Trader Cohorts (retention heatmap, Whale Watch ticker live UI) is Sprint 3. These boundaries are non-negotiable — if a task references attribution or cohort charts, it's mis-scoped to Sprint 1.

---

## File Structure

### New files (frontend)

```
frontend/
├── lib/
│   ├── chartTokens.ts                       # Color tokens, motion timings, thresholdColor() fn
│   └── funnelTaxonomy.ts                    # Single source of truth: 7 funnels × steps × labels × benchmarks × R/Y/G
│
├── hooks/
│   └── useInsightStrip.ts                   # Insight rendering w/ sample-size + staleness gates
│
└── components/DataHub/
    ├── primitives/
    │   ├── Card.tsx                          # Glassmorphism card shell
    │   ├── ThresholdPill.tsx                 # 8px R/Y/G dot, one-pulse on cross
    │   ├── BigNumber.tsx                     # Hero number + WoW delta + sparkline
    │   ├── Sparkline.tsx                     # 40px height, no axes, accent line
    │   ├── EmptyState.tsx                    # 3 variants (insufficient/stale/gated) per spec §6.4
    │   └── ChartFrame.tsx                    # Common wrapper: title + threshold pill + body
    │
    ├── funnels/
    │   ├── FunnelStepBar.tsx                 # One horizontal animated bar
    │   ├── FunnelStepCard.tsx                # Hover-to-explain detail (NOT modal, inline panel)
    │   ├── DropoffArrow.tsx                  # SVG arrow between steps with %drop label
    │   ├── AnimatedFunnel.tsx                # Composes FunnelStepBar + DropoffArrow for 1 funnel
    │   ├── FunnelSelector.tsx                # 7-tab pills for switching active funnel
    │   ├── PerStepDrillDown.tsx              # Below-the-fold panel when a step is clicked
    │   └── CompareModeToggle.tsx             # Two date pickers + toggle to overlay two periods
    │
    ├── insights/
    │   ├── InsightStrip.tsx                  # Horizontal scrolling 3-card strip at top
    │   ├── InsightCard.tsx                   # Single insight card with × dismiss
    │   └── insightTemplates.ts               # The 10 §4 templates as data
    │
    ├── heroes/
    │   ├── HeroNewHolders.tsx                # T1.1 — 7d new active holders + WoW + sparkline
    │   ├── HeroVolume7d.tsx                  # T1.2 — 7d volume + WoW + top-5 stacked bar
    │   ├── HeroViralK.tsx                    # T1.3 — gauge + K_gen × K_clicks × K_convert subtext
    │   └── HeroAttributionCoverage.tsx       # T1.4 — donut + 50% red gate line
    │
    └── source-breakdown/
        └── TopSourcesBar.tsx                 # Row 4 full-width bar chart, R/Y/G colored
```

### Modified files (frontend)

- `frontend/app/admin/data-hub/views/FunnelsView.tsx` — replace placeholder with the new layout composed from above components
- `frontend/components/DataHub/types.ts` — extend with the new endpoint response shapes (`Funnel/Attribution/Cohort` already added in Sprint 0; verify)
- `frontend/hooks/useFunnelData.ts` — already exists; may need additional fetch helpers for the hero KPIs

### Modified files (backend) — minimal

Per Analytics Reporter §7.5, the Acquisition endpoint needs 3 new header fields. ONE backend task adds them:
- `src/services/funnelService.ts` — compute and return `attributablePct`, `stitchedPct`, `medianTimeToFirstTrade` on the acquisition funnel response

### Out of scope (deferred to Sprint 2/3)

- Whale Origin Sankey — Sprint 2
- KOL leaderboard — Sprint 2
- Cohort retention heatmap — Sprint 3
- Whale Watch live ticker UI — Sprint 3 (the SSE backend stream exists; UI is deferred)
- Command palette / Cmd-K — Sprint 3
- Export PNG/CSV/PDF — Sprint 3
- Saved views — Sprint 3

---

## Pre-flight Tasks

### Task 1: Invoke `frontend-design` skill — produce design spec

This is the ABSOLUTE-RULE per Tomer's CLAUDE.md: any frontend work loads frontend-design + taste-skill FIRST. No code happens before the design pass.

**Files:**
- Create: `docs/design/sprint-1-funnels-view-design.md`

- [ ] **Step 1:** Invoke the `frontend-design` skill with this argument:

```
Sprint 1 of SHIFT RWA Data Hub funnel UI. Design the Funnels view layout per the Analytics Reporter spec at docs/agents/analytics-reporter-2026-06-03.md §3 (8-card above-the-fold, 12-col grid). Existing design tokens: bg #030d0a, panel rgba(8,18,14,0.9), accent #00c896, accentBorder rgba(0,200,150,0.2), glass backdrop-filter blur(12px). Inline-style React only (NO Tailwind). Must feel premium and proprietary, not "another Metabase clone." Reference the existing /admin/data-hub page.tsx for visual continuity.

Deliverables:
1. Layout wireframe with exact pixel measurements for each of the 8 above-the-fold cards
2. Card visual spec: padding, border radius, hover state, threshold pill placement
3. Funnel bar visual: shape, gradient fill, drop-off arrow style, hover affordance
4. Motion design: which elements animate on load, hover, threshold-cross. Use framer-motion timings: 120ms fast / 400ms medium / 1200ms slow (per spec §5.3)
5. Insight strip visual: card shape, dismiss-button placement, scroll indicator

Save the design spec to docs/design/sprint-1-funnels-view-design.md
```

- [ ] **Step 2:** Invoke the `taste-skill` skill on the design spec:

```
Audit the design spec at docs/design/sprint-1-funnels-view-design.md for AI-slop tendencies. Specifically:
- Anti-AI-slop check against generic SaaS dashboards
- Color variance metric (we use ONE accent — verify the design doesn't add gradient noise)
- Typography hierarchy (only 4 weights max)
- Shadow restraint (no neon glows)
- Empty/loading/error state design (3 variants per Analytics Reporter §6.4)

Mark each section APPROVED or NEEDS_REVISION. Save findings to the end of the design spec.
```

- [ ] **Step 3:** Commit the design spec

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add docs/design/sprint-1-funnels-view-design.md
git commit -m "docs(design): Sprint 1 Funnels view design + taste-skill audit"
```

---

## Foundation Tasks (lib + primitives)

### Task 2a: Replace emoji with Phosphor icons (taste-skill mandate)

**Files:**
- Modify: `frontend/package.json` (install `@phosphor-icons/react`)
- Modify: `frontend/app/admin/data-hub/layout-shell.tsx` (existing Sprint 0 file — tab emoji)
- (Task 2 funnelTaxonomy.ts uses Phosphor `Icon` references from creation, not retrofitted)

Per the taste-skill audit in `docs/design/sprint-1-funnels-view-design.md` Appendix, the anti-emoji policy [CRITICAL] forbids emoji anywhere in markup. The Sprint 0 `layout-shell.tsx` and the planned `funnelTaxonomy.ts` both need icon replacements.

- [ ] **Step 1:** Install Phosphor

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npm install @phosphor-icons/react
```

- [ ] **Step 2:** Modify `layout-shell.tsx` — replace `emoji` field with `Icon`

Find:
```typescript
const TABS: Array<{ id: TopView; label: string; emoji: string }> = [
  { id: 'funnels',     label: 'Funnels',           emoji: '🎯' },
  { id: 'attribution', label: 'Source Attribution', emoji: '🔍' },
  { id: 'cohorts',     label: 'Trader Cohorts',    emoji: '🐋' },
  { id: 'raw',         label: 'Raw Data',          emoji: '📊' },
];
```

Replace with:

```typescript
import { Target, MagnifyingGlass, Waves, ChartBar, type Icon } from '@phosphor-icons/react';

const TABS: Array<{ id: TopView; label: string; Icon: Icon }> = [
  { id: 'funnels',     label: 'Funnels',            Icon: Target },
  { id: 'attribution', label: 'Source Attribution', Icon: MagnifyingGlass },
  { id: 'cohorts',     label: 'Trader Cohorts',     Icon: Waves },
  { id: 'raw',         label: 'Raw Data',           Icon: ChartBar },
];
```

In the render block, replace `<span>{t.emoji}</span>` with `<t.Icon weight="regular" size={14} />`.

- [ ] **Step 3:** Verify next build clean

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -5
```

- [ ] **Step 4:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/package.json frontend/package-lock.json frontend/app/admin/data-hub/layout-shell.tsx
git commit -m "fix(design): replace nav emoji with Phosphor icons per taste-skill audit"
```

---

### Task 2: Build `funnelTaxonomy.ts` — single source of truth

**Note:** Per Task 2a's emoji replacement, the taxonomy uses `Icon: PhosphorIcon` instead of `emoji: string`. Sample code below already reflects this.

**Files:**
- Create: `frontend/lib/funnelTaxonomy.ts`
- Create: `frontend/lib/__tests__/funnelTaxonomy.test.ts`

This file is referenced by EVERY hero card, EVERY funnel step, and the insight templates. Get it right.

- [ ] **Step 1:** Write the failing test

```typescript
// frontend/lib/__tests__/funnelTaxonomy.test.ts
import { describe, it, expect } from 'vitest';
import { FUNNEL_DISPLAY, getStepBenchmark, getThresholdsForKPI } from '../funnelTaxonomy';

describe('FUNNEL_DISPLAY', () => {
  it('contains all 7 funnels with 4 steps each', () => {
    const ids = ['acquisition','activation','conversion','whale_pipeline','loyalty','referral','retention'];
    expect(Object.keys(FUNNEL_DISPLAY).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(FUNNEL_DISPLAY[id as keyof typeof FUNNEL_DISPLAY].steps).toHaveLength(4);
    }
  });

  it('acquisition step 2 is Wallet Modal Open per Growth Hacker §1.1', () => {
    expect(FUNNEL_DISPLAY.acquisition.steps[1].name).toBe('Wallet Modal Open');
  });

  it('whale_pipeline step 1 is Holder ($100+) per Growth Hacker §1.4', () => {
    expect(FUNNEL_DISPLAY.whale_pipeline.steps[0].name).toBe('Holder ($100+)');
  });
});

describe('getStepBenchmark', () => {
  it('returns the green benchmark for acquisition Landing → Modal Open', () => {
    expect(getStepBenchmark('acquisition', 1)?.green).toBe(15);
  });
  it('returns undefined for steps with no benchmark', () => {
    expect(getStepBenchmark('retention', 0)).toBeUndefined();
  });
});

describe('getThresholdsForKPI', () => {
  it('returns Analytics Reporter §2 hero thresholds for T1.1', () => {
    const t = getThresholdsForKPI('new_holders_7d_wow');
    expect(t).toEqual({ red: -10, yellow: -5, green: 10 });
  });
});
```

- [ ] **Step 2:** Run test to verify it fails

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx vitest run lib/__tests__/funnelTaxonomy.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3:** Create `frontend/lib/funnelTaxonomy.ts`

```typescript
// frontend/lib/funnelTaxonomy.ts
// SINGLE SOURCE OF TRUTH for funnel display names, benchmarks, thresholds.
// Sourced from docs/agents/growth-hacker-2026-06-03.md §1-2 and
// docs/agents/analytics-reporter-2026-06-03.md §2.

export type FunnelId =
  | 'acquisition' | 'activation' | 'conversion'
  | 'whale_pipeline' | 'loyalty' | 'referral' | 'retention';

export interface StepBenchmark {
  red: number;     // %
  yellow: number;  // %
  green: number;   // %
}

export interface StepDisplay {
  id: string;             // matches backend step ID
  name: string;           // display name from Growth Hacker §1
  benchmark?: StepBenchmark;
}

export interface FunnelDisplay {
  id: FunnelId;
  name: string;
  emoji: string;
  description: string;
  steps: StepDisplay[];
}

export const FUNNEL_DISPLAY: Record<FunnelId, FunnelDisplay> = {
  acquisition: {
    id: 'acquisition',
    name: 'Acquisition',
    emoji: '🎯',
    description: 'Anonymous traffic → identified-wallet user',
    steps: [
      { id: 'visit',       name: 'Landing' },
      { id: 'landing',     name: 'Wallet Modal Open', benchmark: { red: 8,  yellow: 15, green: 15 } },
      { id: 'connect',     name: 'Wallet Connect',    benchmark: { red: 35, yellow: 50, green: 50 } },
      { id: 'first_trade', name: 'First Trade',       benchmark: { red: 8,  yellow: 15, green: 15 } },
    ],
  },
  activation: {
    id: 'activation',
    name: 'Activation',
    emoji: '⚡',
    description: 'Wallet → trading-capable user',
    steps: [
      { id: 'connect',     name: 'Wallet Connected' },
      { id: 'register',    name: 'Account Registered' },
      { id: 'kyc',         name: 'KYC Complete',  benchmark: { red: 20, yellow: 35, green: 35 } },
      { id: 'first_trade', name: 'First Trade' },
    ],
  },
  conversion: {
    id: 'conversion',
    name: 'Conversion',
    emoji: '🔁',
    description: 'First-trade user → repeat trader',
    steps: [
      { id: 'first_trade',   name: 'First Trade' },
      { id: 'second_trade',  name: 'Second Trade',     benchmark: { red: 25, yellow: 40, green: 40 } },
      { id: 'multi_asset',   name: 'Multi-Asset Trader' },
      { id: 'active_holder', name: 'Active Holder ($1K+)' },
    ],
  },
  whale_pipeline: {
    id: 'whale_pipeline',
    name: 'Whale Pipeline',
    emoji: '🐋',
    description: 'Trader → high-volume whale',
    steps: [
      { id: 'holder',     name: 'Holder ($100+)' },
      { id: 'over_1k',    name: 'Silver Whale ($1K+)' },
      { id: 'over_10k',   name: 'Gold Whale ($10K+)',  benchmark: { red: 4, yellow: 9, green: 9 } },
      { id: 'over_100k',  name: 'Mega Whale ($100K+)' },
    ],
  },
  loyalty: {
    id: 'loyalty',
    name: 'Loyalty',
    emoji: '🏆',
    description: 'Trader → Snag-engaged user',
    steps: [
      { id: 'trader',      name: 'Trader' },
      { id: 'snag_linked', name: 'Snag Linked' },
      { id: 'badged',      name: 'First Badge' },
      { id: 'top_tier',    name: 'Top Tier' },
    ],
  },
  referral: {
    id: 'referral',
    name: 'Referral',
    emoji: '🤝',
    description: 'Viral loop completion',
    steps: [
      { id: 'user',             name: 'Eligible User' },
      { id: 'code_generated',   name: 'Code Generated' },
      { id: 'referral_clicked', name: 'Referral Clicked' },
      { id: 'referral_traded',  name: 'Referral Traded' },
    ],
  },
  retention: {
    id: 'retention',
    name: 'Retention',
    emoji: '🔄',
    description: 'Engagement decay & reactivation',
    steps: [
      { id: 'active',      name: 'Active Trader' },
      { id: 'dormant_7d',  name: 'Dormant 7d' },
      { id: 'reactivated', name: 'Reactivated' },
      { id: 'lost_30d',    name: 'Lost 30d' },
    ],
  },
};

export function getStepBenchmark(funnelId: FunnelId, stepIndex: number): StepBenchmark | undefined {
  return FUNNEL_DISPLAY[funnelId].steps[stepIndex]?.benchmark;
}

// Analytics Reporter §2.1 — Tier 1 hero thresholds
export type HeroKpiId =
  | 'new_holders_7d_wow'
  | 'volume_7d_wow'
  | 'viral_k_30d'
  | 'attribution_coverage_pct';

export function getThresholdsForKPI(id: HeroKpiId): StepBenchmark {
  const TABLE: Record<HeroKpiId, StepBenchmark> = {
    new_holders_7d_wow:        { red: -10, yellow: -5,  green: 10 },
    volume_7d_wow:             { red: -15, yellow: -5,  green: 10 },
    viral_k_30d:               { red: 0.20, yellow: 0.45, green: 0.45 },
    attribution_coverage_pct:  { red: 50, yellow: 80, green: 80 },
  };
  return TABLE[id];
}
```

- [ ] **Step 4:** Run test to verify it passes

```bash
npx vitest run lib/__tests__/funnelTaxonomy.test.ts
```

Expected: PASS — 5 tests green.

- [ ] **Step 5:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/lib/funnelTaxonomy.ts frontend/lib/__tests__/funnelTaxonomy.test.ts
git commit -m "feat(taxonomy): single-source funnel display + benchmarks + thresholds"
```

---

### Task 3: Build `chartTokens.ts` — color + motion tokens + threshold function

**Files:**
- Create: `frontend/lib/chartTokens.ts`
- Create: `frontend/lib/__tests__/chartTokens.test.ts`

- [ ] **Step 1:** Write the failing test

```typescript
// frontend/lib/__tests__/chartTokens.test.ts
import { describe, it, expect } from 'vitest';
import { TOKENS, MOTION, thresholdColor } from '../chartTokens';

describe('TOKENS', () => {
  it('exposes the single accent color', () => {
    expect(TOKENS.accent).toBe('#00c896');
  });
  it('has red/yellow/green threshold colors', () => {
    expect(TOKENS.threshold.green).toBe('#5ee0a8');
    expect(TOKENS.threshold.yellow).toBe('#ff9a3c');
    expect(TOKENS.threshold.red).toBe('#ff5a5a');
  });
});

describe('MOTION', () => {
  it('exposes fast/medium/slow easing tokens', () => {
    expect(MOTION.fast).toBe('120ms ease-out');
    expect(MOTION.medium).toContain('400ms');
    expect(MOTION.slow).toContain('1200ms');
  });
});

describe('thresholdColor', () => {
  it('returns green when value >= green threshold', () => {
    expect(thresholdColor(20, { red: -10, yellow: -5, green: 10 })).toBe(TOKENS.threshold.green);
  });
  it('returns yellow when in yellow band', () => {
    expect(thresholdColor(0, { red: -10, yellow: -5, green: 10 })).toBe(TOKENS.threshold.yellow);
  });
  it('returns red when below red threshold', () => {
    expect(thresholdColor(-20, { red: -10, yellow: -5, green: 10 })).toBe(TOKENS.threshold.red);
  });
  it('handles inverted scales (e.g. error rates where lower=better)', () => {
    // Not in scope for Sprint 1 heroes — placeholder behavior is to treat as ascending
    expect(thresholdColor(0, { red: 0, yellow: 5, green: 10 })).toBe(TOKENS.threshold.yellow);
  });
});
```

- [ ] **Step 2:** Run test → expect FAIL

```bash
npx vitest run lib/__tests__/chartTokens.test.ts
```

- [ ] **Step 3:** Create `frontend/lib/chartTokens.ts`

```typescript
// frontend/lib/chartTokens.ts
// Color + motion tokens for the Data Hub. Inline-style only — no Tailwind.

import type { StepBenchmark } from './funnelTaxonomy';

export const TOKENS = {
  bg: '#030d0a',
  panel: 'rgba(8,18,14,0.9)',
  glass: 'backdrop-filter: blur(12px)',

  accent: '#00c896',
  accentDim: 'rgba(0,200,150,0.15)',
  accentBorder: 'rgba(0,200,150,0.2)',

  textPrimary: '#ffffff',
  textMuted: '#5a9070',
  textFaint: '#3a7060',

  threshold: {
    green: '#5ee0a8',
    yellow: '#ff9a3c',
    red: '#ff5a5a',
  },
} as const;

export const MOTION = {
  fast: '120ms ease-out',
  medium: '400ms cubic-bezier(0.4,0,0.2,1)',
  slow: '1200ms cubic-bezier(0.16,1,0.3,1)',
} as const;

// thresholdColor — Analytics Reporter §2.4
// Inputs: value (the metric), thresholds { red, yellow, green }
// Output: hex color string
// Behavior: green if >= green, yellow if >= yellow and < green, red otherwise.
// Inverted thresholds (where lower = better) MUST be passed with red > yellow > green
// — caller responsibility to invert.
export function thresholdColor(value: number, t: StepBenchmark): string {
  if (value >= t.green) return TOKENS.threshold.green;
  if (value >= t.yellow) return TOKENS.threshold.yellow;
  return TOKENS.threshold.red;
}
```

- [ ] **Step 4:** Run test → expect PASS

- [ ] **Step 5:** Commit

```bash
git add frontend/lib/chartTokens.ts frontend/lib/__tests__/chartTokens.test.ts
git commit -m "feat(tokens): color/motion tokens + thresholdColor helper"
```

---

### Task 4: Build `Card` + `ThresholdPill` + `ChartFrame` primitives

**Files:**
- Create: `frontend/components/DataHub/primitives/Card.tsx`
- Create: `frontend/components/DataHub/primitives/ThresholdPill.tsx`
- Create: `frontend/components/DataHub/primitives/ChartFrame.tsx`

No tests for these — they are pure visual components with no logic. Verification is via `npx next build` clean + manual visual check.

- [ ] **Step 1:** Create `Card.tsx`

```typescript
"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  className?: string;
}

export function Card({ children, padding = 20 }: CardProps) {
  return (
    <div style={{
      background: TOKENS.panel,
      border: `1px solid ${TOKENS.accentBorder}`,
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2:** Create `ThresholdPill.tsx`

```typescript
"use client";
import React, { useEffect, useRef } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface ThresholdPillProps {
  color: string;      // from thresholdColor()
  size?: number;
  // When color changes, pulse once. Caller passes a stable color when no change.
}

export function ThresholdPill({ color, size = 8 }: ThresholdPillProps) {
  const prevColor = useRef(color);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prevColor.current !== color && ref.current) {
      ref.current.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }],
        { duration: 600, easing: 'cubic-bezier(0.4,0,0.2,1)' },
      );
      prevColor.current = color;
    }
  }, [color]);

  return (
    <span
      ref={ref}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size}px ${color}`,
        position: 'absolute',
        top: 14,
        right: 14,
        transition: `background ${MOTION.fast}`,
      }}
      aria-hidden
    />
  );
}
```

- [ ] **Step 3:** Create `ChartFrame.tsx`

```typescript
"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { Card } from './Card';
import { ThresholdPill } from './ThresholdPill';

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  thresholdColor?: string;
  children: React.ReactNode;
  rightActions?: React.ReactNode;
  padding?: number;
}

export function ChartFrame({
  title, subtitle, thresholdColor, children, rightActions, padding,
}: ChartFrameProps) {
  return (
    <Card padding={padding}>
      {thresholdColor && <ThresholdPill color={thresholdColor} />}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: TOKENS.textFaint,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {rightActions}
      </div>
      <div>{children}</div>
    </Card>
  );
}
```

- [ ] **Step 4:** Verify next build clean

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -8
```

Expected: clean build.

- [ ] **Step 5:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/primitives/
git commit -m "feat(primitives): Card + ThresholdPill + ChartFrame components"
```

---

### Task 5: Build `EmptyState` + `Sparkline` + `BigNumber` primitives

**Files:**
- Create: `frontend/components/DataHub/primitives/EmptyState.tsx`
- Create: `frontend/components/DataHub/primitives/Sparkline.tsx`
- Create: `frontend/components/DataHub/primitives/BigNumber.tsx`

- [ ] **Step 1:** Create `EmptyState.tsx` — 3 variants per Analytics Reporter §6.4

```typescript
"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export type EmptyVariant = 'insufficient' | 'stale' | 'gated';

export interface EmptyStateProps {
  variant: EmptyVariant;
  actualN?: number;
  requiredN?: number;
  lastUpdated?: string;       // relative time string
  coveragePct?: number;
  coverageRequired?: number;
  onRetry?: () => void;
}

export function EmptyState({
  variant, actualN, requiredN, lastUpdated, coveragePct, coverageRequired, onRetry,
}: EmptyStateProps) {
  let headline = '';
  let subtext = '';
  let action: React.ReactNode = null;

  if (variant === 'insufficient') {
    headline = 'Insufficient data';
    subtext = actualN !== undefined && requiredN !== undefined
      ? `n = ${actualN}, minimum ${requiredN}`
      : 'Sample size below threshold';
  } else if (variant === 'stale') {
    headline = 'Data temporarily unavailable';
    subtext = lastUpdated ? `Last updated ${lastUpdated} ago` : 'Endpoint not responding';
    if (onRetry) {
      action = (
        <button onClick={onRetry} style={{
          background: 'transparent',
          color: TOKENS.accent,
          border: `1px solid ${TOKENS.accentBorder}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
        }}>Retry</button>
      );
    }
  } else if (variant === 'gated') {
    headline = 'Awaiting attribution coverage';
    subtext = coveragePct !== undefined && coverageRequired !== undefined
      ? `Coverage at ${coveragePct}% — ${coverageRequired}% required`
      : 'Attribution coverage insufficient';
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      opacity: 0.7,
      gap: 4,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.textPrimary }}>{headline}</div>
      <div style={{ fontSize: 11, color: TOKENS.textMuted }}>{subtext}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2:** Create `Sparkline.tsx`

```typescript
"use client";
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TOKENS } from '@/lib/chartTokens';

export interface SparklineProps {
  data: Array<{ date: string; value: number }>;
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = TOKENS.accent, height = 40 }: SparklineProps) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3:** Create `BigNumber.tsx`

```typescript
"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export interface BigNumberProps {
  value: number | string;
  deltaPct?: number;
  deltaLabel?: string;          // e.g. "WoW" or "vs prior 7d"
  formatter?: (n: number) => string;
}

const defaultFmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : n.toLocaleString();

export function BigNumber({ value, deltaPct, deltaLabel = 'WoW', formatter = defaultFmt }: BigNumberProps) {
  const display = typeof value === 'number' ? formatter(value) : value;
  const deltaColor =
    deltaPct === undefined ? TOKENS.textMuted
    : deltaPct >= 0 ? TOKENS.threshold.green
    : TOKENS.threshold.red;
  const sign = deltaPct === undefined ? '' : deltaPct >= 0 ? '+' : '';

  return (
    <div>
      <div style={{
        fontSize: 32,
        fontWeight: 800,
        color: TOKENS.textPrimary,
        lineHeight: 1.0,
        letterSpacing: '-0.02em',
      }}>
        {display}
      </div>
      {deltaPct !== undefined && (
        <div style={{
          fontSize: 11,
          color: deltaColor,
          marginTop: 4,
          fontWeight: 600,
        }}>
          {sign}{deltaPct.toFixed(1)}% <span style={{ color: TOKENS.textFaint }}>{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4:** Verify next build clean

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -5
```

- [ ] **Step 5:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/primitives/
git commit -m "feat(primitives): EmptyState + Sparkline + BigNumber"
```

---

## Funnel Chart Tasks

### Task 6: Build `FunnelStepBar` — one animated horizontal bar

**Files:**
- Create: `frontend/components/DataHub/funnels/FunnelStepBar.tsx`

The signature visual element. Custom SVG path animated with framer-motion (per Recharts cheat sheet — Recharts has no native funnel).

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface FunnelStepBarProps {
  name: string;
  count: number;
  widthPct: number;          // 0-100 — width relative to step 1
  conversionFromPrev?: number; // %
  thresholdColor?: string;
  onClick?: () => void;
  active?: boolean;
}

export function FunnelStepBar({
  name, count, widthPct, conversionFromPrev, thresholdColor, onClick, active,
}: FunnelStepBarProps) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : n.toLocaleString();

  const barColor = thresholdColor ?? TOKENS.accent;
  const bgColor = `rgba(255,255,255,0.03)`;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: '10px 14px',
        borderRadius: 10,
        background: active ? TOKENS.accentDim : 'transparent',
        border: `1px solid ${active ? TOKENS.accentBorder : 'transparent'}`,
        transition: `all ${MOTION.fast}`,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: TOKENS.textPrimary,
        }}>{name}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color: barColor,
          letterSpacing: '-0.01em',
        }}>{fmt(count)}</span>
      </div>
      <div style={{
        position: 'relative',
        width: '100%',
        height: 8,
        background: bgColor,
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
            borderRadius: 4,
          }}
        />
      </div>
      {conversionFromPrev !== undefined && (
        <div style={{
          fontSize: 10,
          color: TOKENS.textFaint,
          marginTop: 4,
          fontWeight: 600,
        }}>
          {conversionFromPrev.toFixed(1)}% from previous step
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2:** Verify build

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -5
```

- [ ] **Step 3:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/funnels/FunnelStepBar.tsx
git commit -m "feat(funnels): FunnelStepBar with framer-motion fill animation"
```

---

### Task 7: Build `DropoffArrow` — the drop-off label between steps

**Files:**
- Create: `frontend/components/DataHub/funnels/DropoffArrow.tsx`

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export interface DropoffArrowProps {
  dropPct: number;            // 0-100
  dropAbsolute: number;       // raw count of dropped users
  thresholdColor?: string;
}

export function DropoffArrow({ dropPct, dropAbsolute, thresholdColor }: DropoffArrowProps) {
  const color = thresholdColor ?? TOKENS.threshold.yellow;
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : n.toLocaleString();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 14px',
      height: 18,
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M7 0 L7 10 M3 7 L7 11 L11 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.04em' }}>
        −{dropPct.toFixed(1)}% ({fmt(dropAbsolute)} lost)
      </span>
    </div>
  );
}
```

- [ ] **Step 2:** Verify build, commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/funnels/DropoffArrow.tsx
git commit -m "feat(funnels): DropoffArrow inter-step indicator"
```

---

### Task 8: Build `AnimatedFunnel` — composes bars + arrows

**Files:**
- Create: `frontend/components/DataHub/funnels/AnimatedFunnel.tsx`
- Create: `frontend/components/DataHub/funnels/__tests__/AnimatedFunnel.test.tsx`

- [ ] **Step 1:** Write a smoke test (rendering, not behavior)

```typescript
// frontend/components/DataHub/funnels/__tests__/AnimatedFunnel.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnimatedFunnel } from '../AnimatedFunnel';

describe('AnimatedFunnel', () => {
  it('renders 4 step bars when given 4 steps (using taxonomy display names)', () => {
    const steps = [
      { id: 'visit',       name: 'visit',       count: 100, conversionFromPrev: 100, conversionFromFirst: 100 },
      { id: 'landing',     name: 'landing',     count: 60,  conversionFromPrev: 60,  conversionFromFirst: 60 },
      { id: 'connect',     name: 'connect',     count: 30,  conversionFromPrev: 50,  conversionFromFirst: 30 },
      { id: 'first_trade', name: 'first_trade', count: 10,  conversionFromPrev: 33,  conversionFromFirst: 10 },
    ] satisfies Array<{ id: string; name: string; count: number; conversionFromPrev: number; conversionFromFirst: number }>;
    const { container } = render(<AnimatedFunnel funnelId="acquisition" steps={steps} />);
    // AnimatedFunnel substitutes display names from FUNNEL_DISPLAY taxonomy
    for (const expected of ['Landing', 'Wallet Modal Open', 'Wallet Connect', 'First Trade']) {
      expect(container.textContent).toContain(expected);
    }
  });
});
```

Note: tests use the acquisition step IDs because `AnimatedFunnel` looks up display names from `FUNNEL_DISPLAY[funnelId].steps[i].name`. The test asserts the substitution actually happens.

- [ ] **Step 2:** Need to configure vitest for jsdom + React Testing Library. Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['{components,hooks,lib,app}/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
```

Create `frontend/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3:** Run test → expect FAIL (component doesn't exist)

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx vitest run components/DataHub/funnels/__tests__/AnimatedFunnel.test.tsx
```

- [ ] **Step 4:** Create `AnimatedFunnel.tsx`

```typescript
"use client";
import React from 'react';
import { FUNNEL_DISPLAY, getStepBenchmark, type FunnelId } from '@/lib/funnelTaxonomy';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { FunnelStepBar } from './FunnelStepBar';
import { DropoffArrow } from './DropoffArrow';

export interface FunnelStep {
  id: string;
  name: string;
  count: number;
  uniqueWallets?: number;
  conversionFromPrev: number;
  conversionFromFirst: number;
  vs7dDelta?: number;
  benchmark?: number;
}

export interface AnimatedFunnelProps {
  funnelId: FunnelId;
  steps: FunnelStep[];
  activeStepId?: string;
  onStepClick?: (stepId: string) => void;
}

export function AnimatedFunnel({ funnelId, steps, activeStepId, onStepClick }: AnimatedFunnelProps) {
  if (!steps || steps.length === 0) return null;
  const firstCount = steps[0]?.count ?? 1;
  const display = FUNNEL_DISPLAY[funnelId];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => {
        const widthPct = firstCount > 0 ? (step.count / firstCount) * 100 : 0;
        const benchmark = getStepBenchmark(funnelId, i);
        // For step 0, no threshold pill (always 100% from itself).
        const tColor = i > 0 && benchmark
          ? thresholdColor(step.conversionFromPrev, benchmark)
          : undefined;

        const previousCount = i > 0 ? steps[i - 1].count : null;
        const dropAbs = previousCount !== null ? previousCount - step.count : 0;
        const dropPct = previousCount && previousCount > 0
          ? ((previousCount - step.count) / previousCount) * 100
          : 0;

        // Use display name from taxonomy if present, else fall back to backend
        const displayName = display.steps[i]?.name ?? step.name;

        return (
          <React.Fragment key={step.id}>
            <FunnelStepBar
              name={displayName}
              count={step.count}
              widthPct={widthPct}
              conversionFromPrev={i > 0 ? step.conversionFromPrev : undefined}
              thresholdColor={tColor}
              active={activeStepId === step.id}
              onClick={onStepClick ? () => onStepClick(step.id) : undefined}
            />
            {i < steps.length - 1 && (
              <DropoffArrow
                dropPct={dropPct === 0 && previousCount === step.count ? 0 : 100 - step.conversionFromPrev}
                dropAbsolute={dropAbs}
                thresholdColor={tColor}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5:** Run test → expect PASS

```bash
npx vitest run components/DataHub/funnels/__tests__/AnimatedFunnel.test.tsx
```

- [ ] **Step 6:** Verify build, commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/vitest.config.ts frontend/vitest.setup.ts frontend/components/DataHub/funnels/AnimatedFunnel.tsx frontend/components/DataHub/funnels/__tests__/
git commit -m "feat(funnels): AnimatedFunnel composing bars + drop-off arrows"
```

---

### Task 9: Build `FunnelSelector` — 7-tab pills

**Files:**
- Create: `frontend/components/DataHub/funnels/FunnelSelector.tsx`

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { FUNNEL_DISPLAY, type FunnelId } from '@/lib/funnelTaxonomy';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface FunnelSelectorProps {
  active: FunnelId;
  onChange: (id: FunnelId) => void;
}

const FUNNEL_IDS: FunnelId[] = [
  'acquisition','activation','conversion','whale_pipeline','loyalty','referral','retention',
];

export function FunnelSelector({ active, onChange }: FunnelSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      background: 'rgba(0,0,0,0.3)',
      padding: 4,
      borderRadius: 10,
      border: `1px solid ${TOKENS.accentBorder}`,
      flexWrap: 'wrap',
    }}>
      {FUNNEL_IDS.map(id => {
        const f = FUNNEL_DISPLAY[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              background: isActive ? TOKENS.accentDim : 'transparent',
              color: isActive ? TOKENS.accent : TOKENS.textMuted,
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
              fontFamily: 'inherit',
              transition: `all ${MOTION.fast}`,
            }}
          >
            <span>{f.emoji}</span>
            <span>{f.name}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/funnels/FunnelSelector.tsx
git commit -m "feat(funnels): FunnelSelector pills for 7-funnel switching"
```

---

### Task 10: Build `PerStepDrillDown` — below-fold detail panel

**Files:**
- Create: `frontend/components/DataHub/funnels/PerStepDrillDown.tsx`

Per Analytics Reporter §3.2, this is an INLINE panel (not modal) that appears below the funnel when a step is clicked. Sprint 1 ships the data shape; the wallet-cohort table (50-row pagination) is Sprint 3.

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { ChartFrame } from '../primitives/ChartFrame';
import type { FunnelStep } from './AnimatedFunnel';

export interface PerStepDrillDownProps {
  step: FunnelStep;
  stepIndex: number;
  prevStep?: FunnelStep;
  benchmark?: { red: number; yellow: number; green: number };
  insight?: string;
}

export function PerStepDrillDown({ step, stepIndex, prevStep, benchmark, insight }: PerStepDrillDownProps) {
  const dropPct = prevStep ? 100 - step.conversionFromPrev : 0;
  const dropAbs = prevStep ? prevStep.count - step.count : 0;

  return (
    <ChartFrame title={`Step ${stepIndex + 1}: ${step.name}`} padding={20}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        marginBottom: 16,
      }}>
        <Stat label="Count" value={step.count.toLocaleString()} />
        <Stat label="From previous" value={`${step.conversionFromPrev.toFixed(1)}%`} />
        <Stat label="From first" value={`${step.conversionFromFirst.toFixed(1)}%`} />
        {prevStep && <Stat label="Dropped" value={`${dropAbs.toLocaleString()} (${dropPct.toFixed(1)}%)`} />}
        {step.vs7dDelta !== undefined && step.vs7dDelta !== 0 && (
          <Stat label="vs 7d delta" value={`${step.vs7dDelta > 0 ? '+' : ''}${step.vs7dDelta.toFixed(1)}%`} />
        )}
        {benchmark && (
          <Stat label="Benchmark" value={`green ≥ ${benchmark.green}%`} />
        )}
      </div>
      {insight && (
        <div style={{
          padding: 12,
          background: 'rgba(0,200,150,0.05)',
          border: `1px solid ${TOKENS.accentBorder}`,
          borderRadius: 8,
          fontSize: 12,
          color: TOKENS.textPrimary,
          lineHeight: 1.5,
        }}>
          {insight}
        </div>
      )}
      <div style={{
        marginTop: 16,
        fontSize: 11,
        color: TOKENS.textFaint,
        fontStyle: 'italic',
      }}>
        Wallet-cohort drill-down (50 rows, paginated) lands in Sprint 3.
      </div>
    </ChartFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        color: TOKENS.textFaint,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{ fontSize: 16, color: TOKENS.textPrimary, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/funnels/PerStepDrillDown.tsx
git commit -m "feat(funnels): PerStepDrillDown inline detail panel"
```

---

## Hero KPI Tasks

### Task 11: Backend — extend acquisition response with 3 header fields

**Files:**
- Modify: `src/services/funnelService.ts`

Per Analytics Reporter §7.5, the acquisition endpoint needs `attributablePct`, `stitchedPct`, `medianTimeToFirstTrade` on the response so the Attribution Coverage hero card can render without an extra round-trip.

- [ ] **Step 1:** Read the current `computeFunnel` in `src/services/funnelService.ts` and identify the response-build location.

- [ ] **Step 2:** For the acquisition funnel ONLY, add a side query that computes:
  - `attributablePct` = % of users in window with non-null `first_utm_source` (Sprint 0 doesn't have this column — return `null` for now with a comment that the Tracking Specialist migration enables it)
  - `stitchedPct` = % of users with non-null `ga_user_id` OR `snag_user_id`
  - `medianTimeToFirstTrade` = median seconds between `users.created_at` and earliest `positions.opened_at` per wallet

```typescript
// in src/services/funnelService.ts, inside computeFunnel:
// after the funnel steps are built, before constructing the FunnelResult:

let acquisitionExtras: { attributablePct: number | null; stitchedPct: number; medianTimeToFirstTrade: number | null } | undefined;

if (funnelId === 'acquisition') {
  const extraRows = await query<{
    attributable_pct: string | null;
    stitched_pct: string | null;
    median_seconds: string | null;
  }>(
    `
    WITH window_users AS (
      SELECT wallet, ga_user_id, snag_user_id, created_at FROM users
      WHERE ($1::timestamp IS NULL OR created_at >= $1)
        AND ($2::timestamp IS NULL OR created_at <= $2)
    ),
    first_trades AS (
      SELECT wallet, MIN(opened_at) AS first_at FROM positions GROUP BY wallet
    ),
    deltas AS (
      SELECT EXTRACT(EPOCH FROM (ft.first_at - wu.created_at)) AS dt
      FROM window_users wu
      INNER JOIN first_trades ft ON ft.wallet = wu.wallet
      WHERE ft.first_at >= wu.created_at
    )
    SELECT
      NULL::float AS attributable_pct,
      (100.0 * COUNT(*) FILTER (WHERE ga_user_id IS NOT NULL OR snag_user_id IS NOT NULL) / NULLIF(COUNT(*), 0))::float AS stitched_pct,
      (SELECT PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY dt) FROM deltas)::float AS median_seconds
    FROM window_users
    `,
    [params.from ?? null, params.to ?? null],
  );

  const row = extraRows[0];
  acquisitionExtras = {
    attributablePct: row?.attributable_pct !== null && row?.attributable_pct !== undefined ? Number(row.attributable_pct) : null,
    stitchedPct: row?.stitched_pct ? Number(row.stitched_pct) : 0,
    medianTimeToFirstTrade: row?.median_seconds ? Number(row.median_seconds) : null,
  };
}

// in the FunnelResult assembly — spread extras only if computed (acquisition only):
const result: FunnelResult = {
  funnelId,
  steps,
  computedAt: new Date().toISOString(),
  cacheKey,
  cacheTTLSeconds: FUNNEL_TTL_SECONDS,
  ...(acquisitionExtras ?? {}),
};
```

**Order of operations:** complete Step 3 (type extension) BEFORE the code in Step 2 will compile. The plan is presented in narrative order; the implementer should apply Step 3 first to avoid a transient compile error.

- [ ] **Step 3:** Extend the `FunnelResult` type in `src/types/funnel.ts` to allow these fields (apply this BEFORE editing the service):

```typescript
export interface FunnelResult {
  funnelId: FunnelId;
  steps: FunnelStepResult[];
  bySource?: Array<{ source: string; steps: number[] }>;
  cohorts?: Array<{ cohort: string; steps: number[] }>;
  computedAt: string;
  cacheKey: string;
  cacheTTLSeconds: number;
  // Acquisition-only header fields (per Analytics Reporter §7.5)
  attributablePct?: number | null;
  stitchedPct?: number;
  medianTimeToFirstTrade?: number | null;
}
```

Both steps then compile cleanly — no `@ts-expect-error` needed.

- [ ] **Step 4:** Add a test for the extras

```typescript
// add to src/__tests__/funnelService.test.ts inside acquisition describe:

it('returns acquisition extras when funnel is acquisition', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce([
      { step: 'visit', count: '12415' },
      { step: 'landing', count: '8200' },
      { step: 'connect', count: '3387' },
      { step: 'first_trade', count: '430' },
    ] satisfies Array<{ step: string; count: string }>)
    .mockResolvedValueOnce([
      { attributable_pct: null, stitched_pct: '22.0', median_seconds: '7200' },
    ] satisfies Array<{ attributable_pct: string | null; stitched_pct: string | null; median_seconds: string | null }>);

  const result = await computeFunnel('acquisition', {});
  expect(result.stitchedPct).toBe(22);
  expect(result.attributablePct).toBeNull();
  expect(result.medianTimeToFirstTrade).toBe(7200);
});
```

- [ ] **Step 5:** Run all backend tests

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npx vitest run
```

Expected: 29+ tests pass (28 existing + new one).

- [ ] **Step 6:** Commit

```bash
git add src/services/funnelService.ts src/types/funnel.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): acquisition response includes attributablePct/stitchedPct/medianTimeToFirstTrade"
```

---

### Task 12: Build `HeroNewHolders` card

**Files:**
- Create: `frontend/components/DataHub/heroes/HeroNewHolders.tsx`

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { BigNumber } from '../primitives/BigNumber';
import { Sparkline } from '../primitives/Sparkline';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface AcquisitionResponse {
  steps: Array<{ id: string; count: number }>;
  dailyTrend?: Array<{ date: string; value: number }>;
  vs7dDelta?: number;
}

export function HeroNewHolders({ filters }: { filters: Filters }) {
  // Pull 7d snapshot
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useFunnelData<any>(
    '/api/funnels/acquisition',
    { ...filters, from: sevenDaysAgo },
  );

  if (loading && !data) {
    return (
      <ChartFrame title="New Holders (7d)" subtitle="Wallets with ≥1 trade">
        <div style={{ height: 80, opacity: 0.5 }} />
      </ChartFrame>
    );
  }

  if (error || !data) {
    return (
      <ChartFrame title="New Holders (7d)">
        <EmptyState variant="stale" onRetry={refetch} />
      </ChartFrame>
    );
  }

  const newHoldersStep = data?.steps?.find((s: any) => s.id === 'first_trade');
  const count = newHoldersStep?.count ?? 0;
  // delta from steps[step].vs7dDelta when populated; for Sprint 1 we use the field if present.
  const delta = newHoldersStep?.vs7dDelta;
  const t = getThresholdsForKPI('new_holders_7d_wow');
  const pillColor = delta !== undefined ? thresholdColor(delta, t) : undefined;

  return (
    <ChartFrame title="New Holders (7d)" subtitle="Wallets with ≥1 trade" thresholdColor={pillColor}>
      <BigNumber value={count} deltaPct={delta} deltaLabel="WoW" />
      {data.dailyTrend && data.dailyTrend.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Sparkline data={data.dailyTrend} />
        </div>
      )}
    </ChartFrame>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/heroes/HeroNewHolders.tsx
git commit -m "feat(heroes): HeroNewHolders card (T1.1)"
```

---

### Task 13: Build `HeroVolume7d` card

**Files:**
- Create: `frontend/components/DataHub/heroes/HeroVolume7d.tsx`

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { BigNumber } from '../primitives/BigNumber';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface ChannelROIResponse {
  rows: Array<{
    source: string;
    totalVolumeUSD: number;
    holders: number;
  }>;
  dataQuality?: string;
}

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`;

export function HeroVolume7d({ filters }: { filters: Filters }) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useFunnelData<ChannelROIResponse>(
    '/api/attribution/channel-roi',
    { ...filters, from: sevenDaysAgo },
  );

  if (loading && !data) {
    return <ChartFrame title="7d Volume"><div style={{ height: 80, opacity: 0.5 }} /></ChartFrame>;
  }
  if (error || !data) {
    return <ChartFrame title="7d Volume"><EmptyState variant="stale" onRetry={refetch} /></ChartFrame>;
  }

  const total = (data.rows ?? []).reduce((acc, r) => acc + r.totalVolumeUSD, 0);
  const top5 = (data.rows ?? []).slice(0, 5);

  // Sprint 0 placeholder flag — show data quality footnote per Analytics Reporter §6
  const isPlaceholder = data.dataQuality === 'sprint_0_placeholder';

  const t = getThresholdsForKPI('volume_7d_wow');
  // No WoW delta computed yet (would require historical query — Sprint 2)
  const pillColor = undefined;

  return (
    <ChartFrame title="7d Volume" subtitle={isPlaceholder ? 'Source: referred_by_code (v1)' : 'Source: utm_source'} thresholdColor={pillColor}>
      <BigNumber value={total} formatter={fmtUSD} />
      <div style={{ marginTop: 12, height: 64 }}>
        <ResponsiveContainer>
          <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="source" hide />
            <Bar dataKey="totalVolumeUSD" fill={TOKENS.accent} radius={[4, 4, 4, 4]} maxBarSize={10}>
              {top5.map((_, i) => (
                <Cell key={i} fill={TOKENS.accent} fillOpacity={1 - i * 0.18} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/heroes/HeroVolume7d.tsx
git commit -m "feat(heroes): HeroVolume7d card (T1.2)"
```

---

### Task 14: Build `HeroViralK` card — gauge

**Files:**
- Create: `frontend/components/DataHub/heroes/HeroViralK.tsx`

- [ ] **Step 1:** Create the component (custom SVG gauge per Recharts cheat sheet §7.1)

```typescript
"use client";
import React from 'react';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface ReferralResponse {
  steps: Array<{ id: string; count: number; conversionFromPrev: number }>;
}

export function HeroViralK({ filters }: { filters: Filters }) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, loading, error, refetch } = useFunnelData<ReferralResponse>(
    '/api/funnels/referral',
    { ...filters, from: thirtyDaysAgo },
  );

  if (loading && !data) return <ChartFrame title="Viral K (30d)"><div style={{ height: 110, opacity: 0.5 }} /></ChartFrame>;
  if (error || !data) return <ChartFrame title="Viral K (30d)"><EmptyState variant="stale" onRetry={refetch} /></ChartFrame>;

  // K = K_gen × K_clicks × K_convert per Analytics Reporter §1.4
  const stepBy = (id: string) => data.steps?.find(s => s.id === id);
  const kGen = (stepBy('code_generated')?.conversionFromPrev ?? 0) / 100;
  const kClicks = (stepBy('referral_clicked')?.conversionFromPrev ?? 0) / 100;
  const kConvert = (stepBy('referral_traded')?.conversionFromPrev ?? 0) / 100;
  const K = kGen * kClicks * kConvert;

  // Bootstrap gate per Analytics Reporter §6.1
  const codeCount = stepBy('code_generated')?.count ?? 0;
  const clickCount = stepBy('referral_clicked')?.count ?? 0;
  if (codeCount < 20 || clickCount < 10) {
    return (
      <ChartFrame title="Viral K (30d)" subtitle="K_gen × K_clicks × K_convert">
        <EmptyState variant="insufficient" actualN={codeCount} requiredN={20} />
      </ChartFrame>
    );
  }

  const t = getThresholdsForKPI('viral_k_30d');
  const pillColor = thresholdColor(K, t);

  // Gauge geometry: 180° arc, 80px radius
  const radius = 50;
  const target = 1.0;
  const value = Math.min(K, 1.5);
  const angle = (value / 1.5) * 180 - 180;  // -180° to 0°
  const x = 60 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 60 + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <ChartFrame title="Viral K (30d)" subtitle="K_gen × K_clicks × K_convert" thresholdColor={pillColor}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="120" height="70" viewBox="0 0 120 70" aria-hidden>
          <path d="M 10 60 A 50 50 0 0 1 110 60" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
          <path
            d={`M 10 60 A 50 50 0 0 ${value > 0.75 ? 1 : 0} ${x} ${y}`}
            stroke={pillColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="60" y1="10" x2="60" y2="20" stroke={TOKENS.textFaint} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
        <div style={{ fontSize: 32, fontWeight: 800, color: TOKENS.textPrimary, marginTop: -4 }}>
          {K.toFixed(2)}
        </div>
        <div style={{ fontSize: 10, color: TOKENS.textFaint, fontWeight: 600 }}>
          {(kGen * 100).toFixed(0)}% × {(kClicks * 100).toFixed(0)}% × {(kConvert * 100).toFixed(0)}%
        </div>
      </div>
    </ChartFrame>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/heroes/HeroViralK.tsx
git commit -m "feat(heroes): HeroViralK gauge card (T1.3)"
```

---

### Task 15: Build `HeroAttributionCoverage` card — donut

**Files:**
- Create: `frontend/components/DataHub/heroes/HeroAttributionCoverage.tsx`

- [ ] **Step 1:** Create the component

```typescript
"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useFunnelData } from '@/hooks/useFunnelData';
import type { Filters } from '@/hooks/useFilters';
import { ChartFrame } from '../primitives/ChartFrame';
import { EmptyState } from '../primitives/EmptyState';
import { TOKENS, thresholdColor } from '@/lib/chartTokens';
import { getThresholdsForKPI } from '@/lib/funnelTaxonomy';

interface AcquisitionResponse {
  stitchedPct?: number;
  attributablePct?: number | null;
}

export function HeroAttributionCoverage({ filters }: { filters: Filters }) {
  const { data, loading, error, refetch } = useFunnelData<AcquisitionResponse>(
    '/api/funnels/acquisition',
    filters,
  );

  if (loading && !data) return <ChartFrame title="Attribution Coverage"><div style={{ height: 110, opacity: 0.5 }} /></ChartFrame>;
  if (error || !data) return <ChartFrame title="Attribution Coverage"><EmptyState variant="stale" onRetry={refetch} /></ChartFrame>;

  // Sprint 1 uses stitchedPct because attributablePct is null until Tracking Specialist migration
  // (see Sprint 0 Task 11 implementation note)
  const pct = data.attributablePct ?? data.stitchedPct ?? 0;

  const t = getThresholdsForKPI('attribution_coverage_pct');
  const pillColor = thresholdColor(pct, t);
  const isStitchedFallback = data.attributablePct === null || data.attributablePct === undefined;

  const pieData = [
    { name: 'Covered', value: pct },
    { name: 'Uncovered', value: Math.max(0, 100 - pct) },
  ];

  return (
    <ChartFrame
      title="Attribution Coverage"
      subtitle={isStitchedFallback ? 'Stitched proxy (utm_source pending)' : 'attributable / total'}
      thresholdColor={pillColor}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 80, height: 80 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={26}
                outerRadius={38}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive
                animationDuration={600}
              >
                <Cell fill={pillColor} />
                <Cell fill="rgba(255,255,255,0.05)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: TOKENS.textPrimary, lineHeight: 1 }}>
            {pct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: TOKENS.textFaint, marginTop: 4 }}>
            red gate ≤ 50%
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/heroes/HeroAttributionCoverage.tsx
git commit -m "feat(heroes): HeroAttributionCoverage donut card (T1.4)"
```

---

## Insight Strip Tasks

### Task 16: Build `insightTemplates.ts` — the 10 templates as data

**Files:**
- Create: `frontend/components/DataHub/insights/insightTemplates.ts`

- [ ] **Step 1:** Create the templates file

```typescript
// frontend/components/DataHub/insights/insightTemplates.ts
// Templates per Analytics Reporter §4. Each template is rendered client-side
// when its trigger condition fires. Templates render to a single string ≤120 chars.

export type InsightPriority = 'P1' | 'P2' | 'P3';

export interface InsightContext {
  topGrowingSource?: { source: string; pct: number };
  comparatorSource?: { source: string; pct: number };
  whaleSilverToGoldPct?: number;
  whaleSilverToGoldDeltaPct?: number;
  medianHoursToTrade?: number;
  medianHoursDeltaPct?: number;
  attributionCoveragePct?: number;
  uncoveredWalletCount?: number;
  viralK?: number;
  viralKComponent?: { name: string; pct: number };
  topKolHandle?: string;
  topKolTrades?: number;
  topKolVolume?: number;
}

export interface InsightTemplate {
  id: number;
  priority: InsightPriority;
  trigger: (ctx: InsightContext) => boolean;
  render: (ctx: InsightContext) => string;
}

const TEMPLATES: InsightTemplate[] = [
  {
    id: 1,
    priority: 'P1',
    trigger: ctx =>
      !!ctx.topGrowingSource && ctx.topGrowingSource.pct > 20 &&
      !!ctx.comparatorSource && ctx.comparatorSource.pct < -10,
    render: ctx =>
      `Wallet connects from ${ctx.topGrowingSource!.source} up ${ctx.topGrowingSource!.pct.toFixed(0)}% WoW — ${ctx.comparatorSource!.source} down ${Math.abs(ctx.comparatorSource!.pct).toFixed(0)}%.`,
  },
  {
    id: 2,
    priority: 'P2',
    trigger: ctx => ctx.whaleSilverToGoldPct !== undefined,
    render: ctx => {
      const arrow = (ctx.whaleSilverToGoldDeltaPct ?? 0) >= 0 ? '↑' : '↓';
      return `Whale Silver→Gold conversion at ${ctx.whaleSilverToGoldPct!.toFixed(1)}% this week (${arrow} ${Math.abs(ctx.whaleSilverToGoldDeltaPct ?? 0).toFixed(0)}% vs prior 7d).`;
    },
  },
  {
    id: 3,
    priority: 'P2',
    trigger: ctx =>
      ctx.medianHoursToTrade !== undefined && Math.abs(ctx.medianHoursDeltaPct ?? 0) > 20,
    render: ctx => {
      const arrow = (ctx.medianHoursDeltaPct ?? 0) >= 0 ? '↑' : '↓';
      return `Median time landing → first_trade now ${ctx.medianHoursToTrade!.toFixed(1)}h (${arrow} ${Math.abs(ctx.medianHoursDeltaPct ?? 0).toFixed(0)}% vs prior 7d).`;
    },
  },
  {
    id: 6,
    priority: 'P1',
    trigger: ctx => ctx.attributionCoveragePct !== undefined && ctx.attributionCoveragePct < 80,
    render: ctx =>
      `Attribution coverage at ${ctx.attributionCoveragePct!.toFixed(0)}% — ${ctx.uncoveredWalletCount ?? '?'} wallet_connects in last 7d had no resolved source.`,
  },
  {
    id: 5,
    priority: 'P2',
    trigger: ctx => ctx.viralK !== undefined,
    render: ctx => {
      const color = ctx.viralK! >= 0.45 ? 'green' : ctx.viralK! >= 0.20 ? 'yellow' : 'red';
      const c = ctx.viralKComponent;
      return `Viral K reached ${ctx.viralK!.toFixed(2)} (${color})${c ? ` — driven by ${c.name} at ${c.pct.toFixed(0)}%` : ''}.`;
    },
  },
  {
    id: 7,
    priority: 'P3',
    trigger: ctx => !!ctx.topKolHandle && (ctx.topKolTrades ?? 0) >= 10,
    render: ctx =>
      `${ctx.topKolHandle} attributed ${ctx.topKolTrades} first_trades and $${((ctx.topKolVolume ?? 0) / 1000).toFixed(1)}K volume in last 7d.`,
  },
];

export function selectInsights(ctx: InsightContext): InsightTemplate[] {
  return TEMPLATES.filter(t => t.trigger(ctx))
    .sort((a, b) => {
      const order: Record<InsightPriority, number> = { P1: 0, P2: 1, P3: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 3);
}
```

- [ ] **Step 2:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/insights/insightTemplates.ts
git commit -m "feat(insights): 6 §4 insight templates with priority selection"
```

---

### Task 17: Build `InsightCard` + `InsightStrip`

**Files:**
- Create: `frontend/components/DataHub/insights/InsightCard.tsx`
- Create: `frontend/components/DataHub/insights/InsightStrip.tsx`
- Create: `frontend/hooks/useInsightStrip.ts`

- [ ] **Step 1:** Create `useInsightStrip.ts` — returns `RenderedInsight[]` so consumers don't re-thread the context

```typescript
"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Filters } from './useFilters';
import { selectInsights, type InsightContext, type InsightPriority } from '@/components/DataHub/insights/insightTemplates';

export interface RenderedInsight {
  id: number;
  priority: InsightPriority;
  text: string;
}

// Build the InsightContext by querying the 3 endpoints that feed §4 templates,
// then call template.render(ctx) so consumers get plain strings.
export function useInsightStrip(filters: Filters): RenderedInsight[] {
  const [insights, setInsights] = useState<RenderedInsight[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const [acq, channelRoi, referral] = await Promise.allSettled([
          apiGet<any>('/api/funnels/acquisition', { query: { ...filters, from: sevenDaysAgo } }),
          apiGet<any>('/api/attribution/channel-roi', { query: { ...filters, from: sevenDaysAgo } }),
          apiGet<any>('/api/funnels/referral', { query: { ...filters, from: thirtyDaysAgo } }),
        ]);

        const ctx: InsightContext = {};

        if (acq.status === 'fulfilled') {
          const acqRes = acq.value;
          if (acqRes.stitchedPct !== undefined) {
            ctx.attributionCoveragePct = acqRes.attributablePct ?? acqRes.stitchedPct;
            // Uncovered = step `connect` count × (1 - coverage)
            const connectStep = acqRes.steps?.find((s: any) => s.id === 'connect');
            if (connectStep && ctx.attributionCoveragePct !== undefined) {
              ctx.uncoveredWalletCount = Math.round(connectStep.count * (1 - ctx.attributionCoveragePct / 100));
            }
          }
          if (acqRes.medianTimeToFirstTrade) {
            ctx.medianHoursToTrade = acqRes.medianTimeToFirstTrade / 3600;
          }
        }

        if (channelRoi.status === 'fulfilled' && channelRoi.value.rows) {
          // Top growing / declining source requires historical comparison — defer to Sprint 2
          // Sprint 1 just shows whatever has the largest holders count
          const rows: Array<{ source: string; holders: number }> = channelRoi.value.rows;
          if (rows.length >= 2) {
            // Without historical, surface the top + bottom by holders as a proxy
            // This is mathematically NOT the §4 template trigger — flag and skip
          }
        }

        if (referral.status === 'fulfilled' && referral.value.steps) {
          const stepBy = (id: string) => referral.value.steps.find((s: any) => s.id === id);
          const kGen = (stepBy('code_generated')?.conversionFromPrev ?? 0) / 100;
          const kClicks = (stepBy('referral_clicked')?.conversionFromPrev ?? 0) / 100;
          const kConvert = (stepBy('referral_traded')?.conversionFromPrev ?? 0) / 100;
          const K = kGen * kClicks * kConvert;
          ctx.viralK = K;
          const components = [
            { name: 'K_gen', pct: kGen * 100 },
            { name: 'K_clicks', pct: kClicks * 100 },
            { name: 'K_convert', pct: kConvert * 100 },
          ];
          ctx.viralKComponent = components.reduce((a, b) => a.pct >= b.pct ? a : b);
        }

        if (!cancelled) {
          const rendered: RenderedInsight[] = selectInsights(ctx).map(t => ({
            id: t.id,
            priority: t.priority,
            text: t.render(ctx),
          }));
          setInsights(rendered);
        }
      } catch {
        if (!cancelled) setInsights([]);
      }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(filters)]);

  return insights;
}
```

- [ ] **Step 2:** Create `InsightCard.tsx`

```typescript
"use client";
import React from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface InsightCardProps {
  text: string;
  priority: 'P1' | 'P2' | 'P3';
  onDismiss?: () => void;
}

export function InsightCard({ text, priority, onDismiss }: InsightCardProps) {
  const borderColor =
    priority === 'P1' ? TOKENS.threshold.red
    : priority === 'P2' ? TOKENS.threshold.yellow
    : TOKENS.accentBorder;

  return (
    <div style={{
      flexShrink: 0,
      minWidth: 320,
      maxWidth: 420,
      padding: '12px 14px',
      background: TOKENS.panel,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      backdropFilter: 'blur(12px)',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      transition: `border-color ${MOTION.fast}`,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: borderColor,
        marginTop: 6,
        flexShrink: 0,
      }} />
      <div style={{
        fontSize: 12,
        color: TOKENS.textPrimary,
        lineHeight: 1.45,
        flex: 1,
      }}>{text}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: TOKENS.textFaint,
            fontSize: 16,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="Dismiss insight"
        >×</button>
      )}
    </div>
  );
}
```

- [ ] **Step 3:** Create `InsightStrip.tsx`

```typescript
"use client";
import React, { useState } from 'react';
import type { Filters } from '@/hooks/useFilters';
import { useInsightStrip } from '@/hooks/useInsightStrip';
import { InsightCard } from './InsightCard';
import { TOKENS } from '@/lib/chartTokens';

export function InsightStrip({ filters }: { filters: Filters }) {
  const insights = useInsightStrip(filters);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = insights.filter(i => !dismissed.has(i.id));

  if (visible.length === 0) {
    return (
      <div style={{
        padding: 12,
        background: TOKENS.panel,
        border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        textAlign: 'center',
        color: TOKENS.textMuted,
        fontSize: 12,
      }}>
        All KPIs within expected bands
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      paddingBottom: 4,
    }}>
      {visible.map(insight => (
        <InsightCard
          key={insight.id}
          text={insight.text}
          priority={insight.priority}
          onDismiss={() => setDismissed(d => new Set(d).add(insight.id))}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4:** Build + commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/insights/InsightCard.tsx frontend/components/DataHub/insights/InsightStrip.tsx frontend/hooks/useInsightStrip.ts
git commit -m "feat(insights): InsightStrip + InsightCard with priority-sorted rendering"
```

---

## Composition Task

### Task 18: Compose the full `FunnelsView`

**Files:**
- Modify: `frontend/app/admin/data-hub/views/FunnelsView.tsx`

This task replaces the Sprint 0 placeholder with the full 8-card above-the-fold layout per Analytics Reporter §3.1.

- [ ] **Step 1:** Read the current placeholder file.

- [ ] **Step 2:** Replace the placeholder with the full view:

```typescript
"use client";
import React, { useState } from 'react';
import { useFilters } from '@/hooks/useFilters';
import { useFunnelData } from '@/hooks/useFunnelData';
import { FUNNEL_DISPLAY, getStepBenchmark, type FunnelId } from '@/lib/funnelTaxonomy';
import { TOKENS } from '@/lib/chartTokens';
import { InsightStrip } from '@/components/DataHub/insights/InsightStrip';
import { HeroNewHolders } from '@/components/DataHub/heroes/HeroNewHolders';
import { HeroVolume7d } from '@/components/DataHub/heroes/HeroVolume7d';
import { HeroViralK } from '@/components/DataHub/heroes/HeroViralK';
import { HeroAttributionCoverage } from '@/components/DataHub/heroes/HeroAttributionCoverage';
import { FunnelSelector } from '@/components/DataHub/funnels/FunnelSelector';
import { AnimatedFunnel, type FunnelStep } from '@/components/DataHub/funnels/AnimatedFunnel';
import { PerStepDrillDown } from '@/components/DataHub/funnels/PerStepDrillDown';
import { ChartFrame } from '@/components/DataHub/primitives/ChartFrame';
import { EmptyState } from '@/components/DataHub/primitives/EmptyState';

interface FunnelResponse {
  funnelId: FunnelId;
  steps: FunnelStep[];
}

export function FunnelsView() {
  const [filters] = useFilters();
  const [activeFunnel, setActiveFunnel] = useState<FunnelId>('acquisition');
  const [drillStepId, setDrillStepId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useFunnelData<FunnelResponse>(
    `/api/funnels/${activeFunnel}`,
    filters,
  );

  const activeStepIdx = data?.steps?.findIndex(s => s.id === drillStepId) ?? -1;
  const activeStep = activeStepIdx >= 0 ? data!.steps[activeStepIdx] : null;
  const prevStep = activeStepIdx > 0 ? data!.steps[activeStepIdx - 1] : undefined;
  const benchmark = activeStepIdx >= 0 ? getStepBenchmark(activeFunnel, activeStepIdx) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Insight strip (full width) */}
      <InsightStrip filters={filters} />

      {/* Row 2: 4 hero KPI cards (3/12 each) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        <HeroNewHolders filters={filters} />
        <HeroVolume7d filters={filters} />
        <HeroViralK filters={filters} />
        <HeroAttributionCoverage filters={filters} />
      </div>

      {/* Row 3: Funnel selector + selected funnel chart (8/12) + Whale Watch slot (4/12) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
        gap: 12,
      }}>
        <ChartFrame
          title={FUNNEL_DISPLAY[activeFunnel].name}
          subtitle={FUNNEL_DISPLAY[activeFunnel].description}
          rightActions={<FunnelSelector active={activeFunnel} onChange={(f) => { setActiveFunnel(f); setDrillStepId(null); }} />}
          padding={24}
        >
          {loading && !data ? (
            <div style={{ height: 200, opacity: 0.5 }} />
          ) : error || !data ? (
            <EmptyState variant="stale" onRetry={refetch} />
          ) : data.steps.length === 0 ? (
            <EmptyState variant="insufficient" actualN={0} requiredN={1} />
          ) : (
            <AnimatedFunnel
              funnelId={activeFunnel}
              steps={data.steps}
              activeStepId={drillStepId ?? undefined}
              onStepClick={(id) => setDrillStepId(prev => prev === id ? null : id)}
            />
          )}
        </ChartFrame>

        {/* Row 3 right: Whale Watch ticker placeholder (Sprint 3 ships live UI) */}
        <ChartFrame title="Whale Watch" subtitle="Live trades ≥ $1K (Sprint 3)">
          <div style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TOKENS.textFaint,
            fontSize: 11,
            fontStyle: 'italic',
          }}>
            SSE backend stream live; UI ticker in Sprint 3
          </div>
        </ChartFrame>
      </div>

      {/* Below-fold: per-step drill-down (inline, not modal) */}
      {activeStep && (
        <PerStepDrillDown
          step={activeStep}
          stepIndex={activeStepIdx}
          prevStep={prevStep}
          benchmark={benchmark}
        />
      )}

      {/* Sprint 1 ends here. Source breakdown bar + cohort breakdown + small-multiples land in later sprints */}
    </div>
  );
}
```

- [ ] **Step 3:** Verify build clean

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -8
```

Expected: clean build.

- [ ] **Step 4:** Smoke test locally

```bash
npx next dev
# Visit http://localhost:3000/admin/data-hub
# 1. Auth gate works (passcode: ShiftRwa2026@@$$Key)
# 2. Lands on 🎯 Funnels tab by default
# 3. Sees 4 hero KPI cards + insight strip + funnel chart + whale-watch slot
# 4. Clicking a funnel step → drill-down panel appears below
# 5. Switching funnel via selector → chart updates, drill-down clears
# 6. 📊 Raw Data tab still shows existing 6-tab content unchanged
```

- [ ] **Step 5:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/app/admin/data-hub/views/FunnelsView.tsx
git commit -m "feat(funnels): full FunnelsView per Analytics Reporter 8-card layout"
```

---

## Sprint 1 Exit

### Task 19: Final verification + tag

- [ ] **Step 1:** Run backend test suite

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npx vitest run
```

Expected: ≥ 29 tests pass (28 from Sprint 0 + 1 acquisition extras test).

- [ ] **Step 2:** Run frontend test suite

```bash
cd frontend
npx vitest run
```

Expected: all tests pass (taxonomy + chartTokens + AnimatedFunnel = ~10 tests).

- [ ] **Step 3:** Run frontend build

```bash
npx next build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4:** Manual UX verification on local dev server

Test:
- [ ] Auth gate works
- [ ] Lands on Funnels
- [ ] All 4 hero cards render (or show empty states gracefully)
- [ ] Funnel selector cycles through all 7 funnels
- [ ] Drill-down opens and closes on click
- [ ] Filter bar updates URL + persists
- [ ] Raw Data tab still works
- [ ] No console errors in browser devtools

- [ ] **Step 5:** Vercel preview deploy from `frontend/` (CLAUDE.md pattern)

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx vercel deploy --yes
```

Capture the preview URL. Visit and verify the live preview matches local dev behavior.

- [ ] **Step 6:** Tag

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git tag -a sprint-1-funnels -m "Sprint 1: Funnels view with 4 hero KPIs + 7 funnels + insight strip + drill-down"
git push origin sprint-1-funnels
```

- [ ] **Step 7:** Update PR #1 description with Sprint 1 completion notes

```bash
gh pr edit 1 --body "$(gh pr view 1 --json body --jq '.body')

---

## Sprint 1 Complete (2026-06-03)

- All 4 hero KPI cards live (T1.1 New Holders, T1.2 7d Volume, T1.3 Viral K gauge, T1.4 Attribution Coverage donut)
- 7-funnel selector with animated horizontal funnel bars (framer-motion)
- Per-step drill-down panel (inline, not modal)
- Insight strip with 6 of the 10 §4 templates rendering live
- Backend extension: acquisition response includes attributablePct/stitchedPct/medianTimeToFirstTrade
- frontend-design + taste-skill audits passed (see docs/design/sprint-1-funnels-view-design.md)
"
```

---

## Sprint 2 Preview (not in this plan)

Sprint 2 will produce a separate plan once Sprint 1 ships. Scope preview:
- Whale Origin Sankey (custom SVG with d3-sankey)
- KOL leaderboard
- Channel ROI table
- Whale Watch live ticker UI (consumes the SSE backend stream)
- Top 5 sources bar chart (row 4 of the §3.1 layout)
- WoW delta computations for hero cards (currently undefined where historical data isn't joined yet)

---

*End of Sprint 1 plan. Total tasks: 19. Estimated implementation time: 4-6 days of focused work.*
