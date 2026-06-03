# Funnel Platform — Sprint 0: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working backend funnel/attribution/cohort API (11 endpoints) and a frontend layout shell with global filter bar — enough for Sprint 1's funnels view to plug into without further backend work.

**Architecture:** Backend reads existing Postgres tables (`users`, `positions`, `badges`, `user_certificates`, `admin_logs`) via inline SQL queries inside a new `funnelService`. Results wrapped in an LRU memory cache (60s funnel TTL, 5m attribution TTL). SSE whale ticker driven by the existing Helius webhook fan-out. Frontend gets a new layout shell (`layout-shell.tsx`), URL-param-backed filter state (`useFilters` hook), and tab skeleton for 4 new views — content arrives in Sprint 1+.

**Tech Stack:**
- Backend: Node.js 20, Express 5, TypeScript, `pg`, `lru-cache`, `helmet` (already present), `vitest` (new), `supertest` (new)
- Frontend: Next.js 16.2.6 (Turbopack), React 19, inline-style React (NO Tailwind), `framer-motion` (new), `recharts` (new — used in Sprint 1, installed now)
- Agents: 4 agency-agents dispatched via the `Agent` tool — Tracking & Measurement Specialist (Sprint 0), Trend Researcher (Sprint 0, async), Growth Hacker (Sprint 0, after Tracking output lands), Analytics Reporter (Sprint 0, after Growth Hacker output lands)

**Branch:** `feat/funnel-attribution-platform` (already created)

**Spec reference:** `docs/superpowers/specs/2026-06-02-funnel-data-hub-design.md`

---

## File Structure

### New files (backend)

```
src/
├── types/
│   └── funnel.ts                  # FunnelDefinition, FunnelStepResult, FunnelResult, QueryParams interfaces
├── services/
│   ├── funnelService.ts           # 7 funnel computations + LRU cache
│   ├── attributionService.ts      # Channel ROI, Whale Origins
│   ├── cohortService.ts           # Cohort matrices
│   └── streamService.ts           # SSE pubsub + whale event filter
├── routes/
│   ├── funnels.ts                 # 7 GET endpoints
│   ├── attribution.ts             # 2 GET endpoints
│   ├── cohorts.ts                 # 1 GET endpoint
│   └── stream.ts                  # 1 GET SSE endpoint
├── lib/
│   ├── cache.ts                   # LRU wrapper, key hashing
│   └── queryParams.ts             # Parse + validate funnel query params
└── __tests__/
    ├── funnelService.test.ts
    ├── attributionService.test.ts
    ├── cohortService.test.ts
    └── routes.test.ts
```

### Modified files (backend)

- `src/index.ts` — mount 4 new route modules
- `package.json` — add `vitest`, `supertest`, `lru-cache`, test scripts

### New files (frontend)

```
frontend/
├── app/admin/data-hub/
│   ├── layout-shell.tsx           # Tab nav, global filter bar, auth gate (extracted from page.tsx)
│   └── views/
│       ├── FunnelsView.tsx        # Sprint 0: skeleton with "Coming Sprint 1" placeholder
│       ├── AttributionView.tsx    # Sprint 0: skeleton placeholder
│       ├── CohortsView.tsx        # Sprint 0: skeleton placeholder
│       └── RawDataView.tsx        # Sprint 0: wraps existing 6-tab content
├── components/DataHub/
│   ├── types.ts                   # Extended with FunnelResult, AttributionResult, etc.
│   └── shared/
│       ├── FilterBar.tsx          # Global filter bar (date range, source, asset, cohort, wallet size)
│       ├── DateRangePicker.tsx
│       ├── SourcePicker.tsx
│       └── AssetPicker.tsx
├── hooks/
│   ├── useFilters.ts              # URL params + localStorage filter state
│   └── useFunnelData.ts           # Generic fetcher with cache + abort + retry
└── lib/
    ├── api.ts                     # Single API client with x-admin-key injection
    └── chartTokens.ts             # Color/motion tokens (referenced in Sprint 1)
```

### Modified files (frontend)

- `frontend/app/admin/data-hub/page.tsx` — refactored to use `layout-shell.tsx` + 4 new view components (existing 6-tab content moves into `RawDataView`)
- `frontend/package.json` — add `framer-motion`, `recharts`, `vitest`, `@playwright/test`

### Agent deliverables (new)

```
docs/agents/
├── tracking-specialist-2026-06-02.md      # UTM schema, server-side event spec
├── trend-researcher-2026-06-02.md         # Where whales come from
├── growth-hacker-2026-06-02.md            # Funnel taxonomy, success metrics
└── analytics-reporter-2026-06-02.md       # KPI tree, alert thresholds
```

---

## Pre-flight Tasks

### Task 1: Read Next.js 16 docs (per frontend/AGENTS.md warning)

**Files:**
- Read: `frontend/node_modules/next/dist/docs/` (or live Next.js 16 docs via Context7 MCP)
- Create: `docs/agents/next-16-notes.md` — summary of breaking changes that affect this work

The frontend's `AGENTS.md` explicitly says "This is NOT the Next.js you know. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code." We must do this before touching any frontend code.

- [ ] **Step 1:** Use Context7 MCP to fetch current Next.js docs

```bash
# In Claude: invoke the Context7 MCP
# Resolve library: nextjs-16
# Query docs: "App Router data fetching, async server components, SSE in route handlers"
```

- [ ] **Step 2:** List files in `frontend/node_modules/next/dist/docs/` if present

Run: `find "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend/node_modules/next/dist/docs" -name "*.md" -maxdepth 3 2>/dev/null | head -30`

- [ ] **Step 3:** Write `docs/agents/next-16-notes.md` with 1-pager summary

Required sections:
- Server Components vs. Client Components conventions in 16.x
- Route handlers (SSE pattern)
- `useRouter` / `useSearchParams` API in 16.x
- Any breaking changes from 15.x that affect our existing `page.tsx`

- [ ] **Step 4:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add docs/agents/next-16-notes.md
git commit -m "docs(agents): Next.js 16 conventions reference for funnel work"
```

---

### Task 2: Dispatch Tracking & Measurement Specialist agent

**Files:**
- Create: `docs/agents/tracking-specialist-2026-06-02.md`

This is the **single highest-leverage deliverable** — without proper attribution, every downstream funnel is computed against an unstitched 78% of users.

- [ ] **Step 1:** Dispatch the agent via the Agent tool

Use `subagent_type: "Tracking & Measurement Specialist"`. Prompt:

```
You are dispatched to design the conversion-tracking architecture for SHIFT RWA — a Solana-based RWA leveraged-token platform.

Context you need:
- Existing GA4 OAuth is wired and working (property 536531221, shiftrwa.xyz)
- Existing user table has columns: wallet, ga_user_id, snag_user_id, referred_by_code, referred_by_wallet, created_at
- Identity stitching is currently at 22% (3,387 of 15,455 users) — the bottleneck
- Existing positions table: wallet, position_size_usd, status, opened_at, asset
- Existing Helius webhook fires on on-chain trade events
- Community channels: X (Twitter), Discord, Telegram, Reddit — all of which currently use UTMs only
- 11 backend endpoints are being built (7 funnels, 2 attribution, 1 cohort, 1 SSE) — they need real source/UTM data to be useful

Deliverables (write to docs/agents/tracking-specialist-2026-06-02.md):
1. UTM schema: standardize utm_source/medium/campaign/content/term values for X, Discord, Telegram, Reddit, KOL referrals, email, direct
2. Server-side event spec: what events should fire from where (landing, wallet-connect, first-trade, position-close, badge-earn, snag-link)
3. Identity-stitching plan: concrete steps to raise stitch rate from 22% → 60%+ (gtag user_id, server-side Measurement Protocol, wallet-connect → GA4 user_id binding)
4. Storage schema additions (if needed): which columns to add to users/positions/events tables
5. GA4 custom dimensions to register: dimension names + scope (event vs user)
6. A 1-page "what to wire up first" sequenced checklist

Be specific. Cite real GA4 / GTM / Measurement Protocol API patterns. Output is consumed directly by Growth Hacker and the implementation team.
```

- [ ] **Step 2:** Save the agent's output to disk

```bash
# The Agent tool returns the agent's report. Save it to:
docs/agents/tracking-specialist-2026-06-02.md
```

- [ ] **Step 3:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add docs/agents/tracking-specialist-2026-06-02.md
git commit -m "docs(agents): Tracking Specialist — UTM schema + stitching plan"
```

---

### Task 3: Dispatch Trend Researcher agent (parallel, runs async)

**Files:**
- Create: `docs/agents/trend-researcher-2026-06-02.md`

Output feeds Sprint 2 (Whale Origin Sankey + Channel ROI views), but we dispatch in Sprint 0 to run in parallel.

- [ ] **Step 1:** Dispatch the agent via the Agent tool with `run_in_background: true`

Use `subagent_type: "Trend Researcher"`. Prompt:

```
You are dispatched to map the actual source channels driving high-volume leveraged-token traders to SHIFT RWA.

Context:
- SHIFT trades 6 leveraged tokens (TSL2L, TSL1S, SOX3L, SOX3S, SPX3L, SPX3S) on Solana
- Closest competitors: Jupiter Perps, Drift Protocol, Phantom (wallet UX), Mango Markets
- 430 active holders today, $13.7K trading volume — small but growing
- "Whale" defined as $1K+ position
- Goal: identify which Crypto Twitter accounts, Discord servers, Telegram channels, subreddits, and forums actually drive whale-level traders (not just impressions)

Deliverables (write to docs/agents/trend-researcher-2026-06-02.md):
1. Ranked Crypto Twitter (X) accounts by likely whale-attribution (KOL handles, follower size, engagement-to-trade conversion proxies)
2. Discord servers where leveraged-token traders congregate (server names + member-count tiers + content patterns)
3. Telegram alpha groups + signal channels relevant to leveraged tokens
4. Subreddits ranked by RWA-trader density (r/solana, r/CryptoCurrency, r/RealWorldAssets, others)
5. Competitor flow analysis: where Jupiter Perps / Drift traders' attention currently is
6. 5 "underpriced" channels — communities the competitors haven't fully captured
7. Recommended content types per channel (thread vs. AMA vs. token-gated alpha)

Output is consumed by the Whale Origin Sankey implementation in Sprint 2 and by the Twitter Engager / Reddit Community Builder agents later. Be specific with named accounts/servers/subreddits.
```

- [ ] **Step 2:** Note: agent runs async — Sprint 2 task will pick up the output

- [ ] **Step 3:** Commit a placeholder so we don't forget

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
echo "# Trend Researcher Output — Pending" > docs/agents/trend-researcher-2026-06-02.md
echo "" >> docs/agents/trend-researcher-2026-06-02.md
echo "Agent dispatched 2026-06-02 in background. Update this file with the agent's output when complete. Consumed by Sprint 2 Sankey + KOL Leaderboard." >> docs/agents/trend-researcher-2026-06-02.md
git add docs/agents/trend-researcher-2026-06-02.md
git commit -m "docs(agents): Trend Researcher dispatched — output pending"
```

---

## Backend — Funnel Service Foundation

### Task 4: Install backend dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Install runtime deps

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npm install lru-cache@^11
```

- [ ] **Step 2:** Install test deps

```bash
npm install -D vitest@^2 supertest@^7 @types/supertest@^6
```

- [ ] **Step 3:** Add test scripts to `package.json`

Edit the `"scripts"` block to include:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && cp -r src/db/migrations dist/db/migrations",
    "start": "node dist/index.js",
    "migrate": "tsx src/db/migrate.ts",
    "seed-events": "tsx scripts/seed-events.ts",
    "test-flow": "tsx scripts/test-flow.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4:** Create `vitest.config.ts` at the repo root

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/routes/funnels.ts', 'src/routes/attribution.ts', 'src/routes/cohorts.ts'],
    },
    testTimeout: 10000,
  },
});
```

- [ ] **Step 5:** Verify install + smoke test

```bash
npx vitest --version
# Expected: 2.x.x
```

- [ ] **Step 6:** Commit

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(deps): add lru-cache + vitest + supertest for funnel work"
```

---

### Task 5: Define funnel type system

**Files:**
- Create: `src/types/funnel.ts`

- [ ] **Step 1:** Create the file with the complete type system

```typescript
// src/types/funnel.ts

export type FunnelId =
  | 'acquisition'
  | 'activation'
  | 'conversion'
  | 'whale_pipeline'
  | 'loyalty'
  | 'referral'
  | 'retention';

export type SourceDim =
  | 'utm_source'
  | 'utm_medium'
  | 'channel'
  | 'kol_code'
  | 'wallet_size';

export type CohortDim = 'day' | 'week' | 'month';

export interface FunnelQueryParams {
  from?: string;        // ISO date
  to?: string;          // ISO date
  source?: string;      // e.g. 'twitter', 'discord'
  asset?: string;       // e.g. 'TSL2L'
  cohort?: CohortDim;
  walletSizeMin?: number;
  walletSizeMax?: number;
}

export interface FunnelStepResult {
  id: string;
  name: string;
  count: number;
  uniqueWallets: number;
  conversionFromPrev: number;        // % (0-100)
  conversionFromFirst: number;       // % (0-100)
  medianTimeToNextStep?: string;     // ISO 8601 duration, e.g. "PT2H30M"
  vs7dDelta: number;                 // % change vs 7 days ago (-100 to +∞)
  benchmark?: number;                // optional benchmark %
}

export interface FunnelResult {
  funnelId: FunnelId;
  steps: FunnelStepResult[];
  bySource?: Array<{ source: string; steps: number[] }>;
  cohorts?: Array<{ cohort: string; steps: number[] }>;
  computedAt: string;
  cacheKey: string;
  cacheTTLSeconds: number;
}

export interface ChannelROIRow {
  source: string;
  users: number;
  stitchedUsers: number;
  holders: number;
  whales: number;
  totalVolumeUSD: number;
  avgPositionUSD: number;
  attribution: 'first_touch' | 'last_touch' | 'multi_touch';
}

export interface WhaleOriginEdge {
  from: string;        // e.g. 'twitter'
  to: string;          // e.g. 'first_trade'
  value: number;       // # of whales flowing through
}

export interface CohortMatrix {
  dim: CohortDim;
  cohorts: Array<{
    cohort: string;          // e.g. '2026-05-W22'
    sizeAtStart: number;
    retention: number[];     // % retained at week 0, 1, 2, ...
  }>;
}

export interface WhaleStreamEvent {
  type: 'trade';
  wallet: string;
  asset: string;
  sizeUSD: number;
  side: 'long' | 'short';
  timestamp: string;          // ISO
}
```

- [ ] **Step 2:** Verify TypeScript compiles

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `src/types/funnel.ts`.

- [ ] **Step 3:** Commit

```bash
git add src/types/funnel.ts
git commit -m "feat(types): funnel + attribution + cohort type system"
```

---

### Task 6: Create cache utility

**Files:**
- Create: `src/lib/cache.ts`
- Create: `src/lib/queryParams.ts`
- Create: `src/__tests__/cache.test.ts`

- [ ] **Step 1:** Write the failing test

Create `src/__tests__/cache.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FunnelCache, buildCacheKey } from '../lib/cache';

describe('FunnelCache', () => {
  let cache: FunnelCache;

  beforeEach(() => {
    cache = new FunnelCache({ ttlSeconds: 60, maxEntries: 100 });
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves values', () => {
    cache.set('k1', { count: 42 });
    expect(cache.get('k1')).toEqual({ count: 42 });
  });

  it('evicts after TTL', async () => {
    const shortCache = new FunnelCache({ ttlSeconds: 0.05, maxEntries: 10 });
    shortCache.set('k1', { v: 1 });
    await new Promise(r => setTimeout(r, 100));
    expect(shortCache.get('k1')).toBeUndefined();
  });
});

describe('buildCacheKey', () => {
  it('produces stable keys regardless of param order', () => {
    const k1 = buildCacheKey('acquisition', { source: 'twitter', from: '2026-06-01' });
    const k2 = buildCacheKey('acquisition', { from: '2026-06-01', source: 'twitter' });
    expect(k1).toBe(k2);
  });

  it('differs when params differ', () => {
    const k1 = buildCacheKey('acquisition', { source: 'twitter' });
    const k2 = buildCacheKey('acquisition', { source: 'discord' });
    expect(k1).not.toBe(k2);
  });
});
```

- [ ] **Step 2:** Run test to verify it fails

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npx vitest run src/__tests__/cache.test.ts
```

Expected: FAIL — module `../lib/cache` not found.

- [ ] **Step 3:** Create `src/lib/cache.ts`

```typescript
// src/lib/cache.ts
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

export interface FunnelCacheOptions {
  ttlSeconds: number;
  maxEntries: number;
}

export class FunnelCache {
  private cache: LRUCache<string, unknown>;

  constructor(opts: FunnelCacheOptions) {
    this.cache = new LRUCache({
      max: opts.maxEntries,
      ttl: opts.ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  invalidate(predicate: (key: string) => boolean): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (predicate(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}

export function buildCacheKey(funnelId: string, params: Record<string, unknown>): string {
  const sortedEntries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  const serialized = JSON.stringify(sortedEntries);
  const hash = createHash('sha1').update(serialized).digest('hex').slice(0, 12);
  return `${funnelId}|${hash}`;
}
```

- [ ] **Step 4:** Run test to verify it passes

```bash
npx vitest run src/__tests__/cache.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5:** Create `src/lib/queryParams.ts`

```typescript
// src/lib/queryParams.ts
import type { FunnelQueryParams, CohortDim } from '../types/funnel';

const ALLOWED_COHORT_DIMS: CohortDim[] = ['day', 'week', 'month'];

export function parseQueryParams(raw: Record<string, string | undefined>): FunnelQueryParams {
  const parsed: FunnelQueryParams = {};

  if (raw.from && isValidISODate(raw.from)) parsed.from = raw.from;
  if (raw.to && isValidISODate(raw.to)) parsed.to = raw.to;
  if (raw.source && /^[a-z0-9_-]{1,40}$/i.test(raw.source)) parsed.source = raw.source.toLowerCase();
  if (raw.asset && /^[A-Z0-9]{2,10}$/.test(raw.asset)) parsed.asset = raw.asset.toUpperCase();
  if (raw.cohort && ALLOWED_COHORT_DIMS.includes(raw.cohort as CohortDim)) {
    parsed.cohort = raw.cohort as CohortDim;
  }

  const min = raw.walletSizeMin ? Number(raw.walletSizeMin) : NaN;
  if (Number.isFinite(min) && min >= 0) parsed.walletSizeMin = min;

  const max = raw.walletSizeMax ? Number(raw.walletSizeMax) : NaN;
  if (Number.isFinite(max) && max >= 0) parsed.walletSizeMax = max;

  return parsed;
}

function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z?)?$/.test(s)) return false;
  return !isNaN(Date.parse(s));
}
```

Note: The regex on `source` and `asset` is the input validation per the security guidance. We reject anything that doesn't match `[a-z0-9_-]` for source and `[A-Z0-9]` for asset — this prevents SQL injection vectors even though we use parameterized queries.

- [ ] **Step 6:** Commit

```bash
git add src/lib/cache.ts src/lib/queryParams.ts src/__tests__/cache.test.ts
git commit -m "feat(lib): LRU cache + query param parser with allowlist validation"
```

---

### Task 7: Build funnelService — Acquisition Funnel

**Files:**
- Create: `src/services/funnelService.ts`
- Create: `src/__tests__/funnelService.test.ts`

This is the first funnel implementation. The remaining 6 follow the same pattern.

- [ ] **Step 1:** Write the failing test

Create `src/__tests__/funnelService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFunnel } from '../services/funnelService';
import * as db from '../db/pool';

vi.mock('../db/pool');

describe('computeFunnel — acquisition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 4 steps with conversion percentages', async () => {
    // Mock the query function to return step counts
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'visit', count: '12415' },
      { step: 'landing', count: '8200' },
      { step: 'connect', count: '3387' },
      { step: 'first_trade', count: '430' },
    ] as any);

    const result = await computeFunnel('acquisition', {});
    expect(result.funnelId).toBe('acquisition');
    expect(result.steps).toHaveLength(4);
    expect(result.steps[0].name).toBe('GA4 Visit');
    expect(result.steps[0].count).toBe(12415);
    expect(result.steps[1].conversionFromPrev).toBeCloseTo(66.05, 1);
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(3.46, 1);
  });

  it('handles empty steps gracefully', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    const result = await computeFunnel('acquisition', {});
    expect(result.steps).toEqual([]);
  });
});
```

- [ ] **Step 2:** Run test to verify it fails

```bash
npx vitest run src/__tests__/funnelService.test.ts
```

Expected: FAIL — `computeFunnel` not exported.

- [ ] **Step 3:** Create `src/services/funnelService.ts`

```typescript
// src/services/funnelService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { FunnelId, FunnelQueryParams, FunnelResult, FunnelStepResult } from '../types/funnel';

const FUNNEL_TTL_SECONDS = 60;
const cache = new FunnelCache({ ttlSeconds: FUNNEL_TTL_SECONDS, maxEntries: 500 });

interface StepDef {
  id: string;
  name: string;
  benchmark?: number;
}

const FUNNEL_STEPS: Record<FunnelId, StepDef[]> = {
  acquisition: [
    { id: 'visit', name: 'GA4 Visit', benchmark: 100 },
    { id: 'landing', name: 'Landing Page', benchmark: 60 },
    { id: 'connect', name: 'Wallet Connect', benchmark: 25 },
    { id: 'first_trade', name: 'First Trade', benchmark: 8 },
  ],
  activation: [
    { id: 'connect', name: 'Wallet Connect' },
    { id: 'register', name: 'Register' },
    { id: 'kyc', name: 'KYC Complete' },
    { id: 'first_trade', name: 'First Trade' },
  ],
  conversion: [
    { id: 'first_trade', name: 'First Trade' },
    { id: 'second_trade', name: 'Second Trade' },
    { id: 'multi_asset', name: 'Multi-Asset Holder' },
    { id: 'active_holder', name: 'Active Holder' },
  ],
  whale_pipeline: [
    { id: 'holder', name: 'Holder' },
    { id: 'over_1k', name: '$1K+ Position' },
    { id: 'over_10k', name: '$10K+ Position' },
    { id: 'over_100k', name: '$100K+ Whale' },
  ],
  loyalty: [
    { id: 'trader', name: 'Trader' },
    { id: 'snag_linked', name: 'Snag Linked' },
    { id: 'badged', name: 'Badge Earned' },
    { id: 'top_tier', name: 'Top Tier Multiplier' },
  ],
  referral: [
    { id: 'user', name: 'Registered User' },
    { id: 'code_generated', name: 'Referral Code Created' },
    { id: 'referral_clicked', name: 'Referral Clicked' },
    { id: 'referral_traded', name: 'Referral Traded' },
  ],
  retention: [
    { id: 'active', name: 'Active' },
    { id: 'dormant_7d', name: 'Dormant 7d' },
    { id: 'reactivated', name: 'Reactivated' },
    { id: 'lost_30d', name: 'Lost 30d' },
  ],
};

const FUNNEL_QUERIES: Record<FunnelId, (params: FunnelQueryParams) => { sql: string; values: unknown[] }> = {
  acquisition: (params) => ({
    sql: `
      WITH ga4_visits AS (
        SELECT 'visit'::text AS step, COUNT(DISTINCT ga_user_id)::bigint AS count
        FROM users
        WHERE ga_user_id IS NOT NULL
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      landings AS (
        SELECT 'landing'::text AS step, COUNT(*)::bigint AS count
        FROM users
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      connects AS (
        SELECT 'connect'::text AS step, COUNT(*)::bigint AS count
        FROM users
        WHERE wallet IS NOT NULL AND wallet != ''
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      first_trades AS (
        SELECT 'first_trade'::text AS step, COUNT(DISTINCT wallet)::bigint AS count
        FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
      )
      SELECT step, count FROM ga4_visits
      UNION ALL SELECT step, count FROM landings
      UNION ALL SELECT step, count FROM connects
      UNION ALL SELECT step, count FROM first_trades
    `,
    values: [params.from ?? null, params.to ?? null],
  }),
  activation: () => ({
    sql: `SELECT 'placeholder'::text AS step, 0::bigint AS count WHERE FALSE`,
    values: [],
  }),
  conversion: () => ({
    sql: `SELECT 'placeholder'::text AS step, 0::bigint AS count WHERE FALSE`,
    values: [],
  }),
  whale_pipeline: () => ({
    sql: `SELECT 'placeholder'::text AS step, 0::bigint AS count WHERE FALSE`,
    values: [],
  }),
  loyalty: () => ({
    sql: `SELECT 'placeholder'::text AS step, 0::bigint AS count WHERE FALSE`,
    values: [],
  }),
  referral: () => ({
    sql: `SELECT 'placeholder'::text AS step, 0::bigint AS count WHERE FALSE`,
    values: [],
  }),
  retention: () => ({
    sql: `SELECT 'placeholder'::text AS step, 0::bigint AS count WHERE FALSE`,
    values: [],
  }),
};

export async function computeFunnel(
  funnelId: FunnelId,
  params: FunnelQueryParams,
): Promise<FunnelResult> {
  const cacheKey = buildCacheKey(funnelId, params as Record<string, unknown>);
  const cached = cache.get<FunnelResult>(cacheKey);
  if (cached) return cached;

  const { sql, values } = FUNNEL_QUERIES[funnelId](params);
  const rows = await query<{ step: string; count: string }>(sql, values);

  const stepDefs = FUNNEL_STEPS[funnelId];
  const stepCounts = new Map(rows.map(r => [r.step, Number(r.count)]));

  const steps: FunnelStepResult[] = stepDefs
    .filter(def => stepCounts.has(def.id))
    .map((def, i, arr) => {
      const count = stepCounts.get(def.id) ?? 0;
      const firstCount = stepCounts.get(arr[0].id) ?? 0;
      const prevCount = i > 0 ? (stepCounts.get(arr[i - 1].id) ?? 0) : count;
      return {
        id: def.id,
        name: def.name,
        count,
        uniqueWallets: count, // for v1, same as count; v2 will distinguish
        conversionFromPrev: prevCount > 0 ? (count / prevCount) * 100 : 0,
        conversionFromFirst: firstCount > 0 ? (count / firstCount) * 100 : 0,
        vs7dDelta: 0, // populated in v2 with historical comparison
        benchmark: def.benchmark,
      };
    });

  const result: FunnelResult = {
    funnelId,
    steps,
    computedAt: new Date().toISOString(),
    cacheKey,
    cacheTTLSeconds: FUNNEL_TTL_SECONDS,
  };

  cache.set(cacheKey, result);
  return result;
}

export function invalidateFunnelCache(funnelId?: FunnelId): void {
  if (funnelId) {
    cache.invalidate(key => key.startsWith(`${funnelId}|`));
  } else {
    cache.invalidate(() => true);
  }
}
```

- [ ] **Step 4:** Run test to verify it passes

```bash
npx vitest run src/__tests__/funnelService.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): funnelService with acquisition funnel + LRU cache"
```

---

### Task 8: Build activation funnel query

**Files:**
- Modify: `src/services/funnelService.ts` — replace `activation` placeholder

- [ ] **Step 1:** Write the failing test (add to existing file)

In `src/__tests__/funnelService.test.ts`, add:

```typescript
describe('computeFunnel — activation', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns connect→register→kyc→first_trade counts', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'connect', count: '3387' },
      { step: 'register', count: '3387' },
      { step: 'kyc', count: '1200' },
      { step: 'first_trade', count: '430' },
    ] as any);

    const result = await computeFunnel('activation', {});
    expect(result.steps).toHaveLength(4);
    expect(result.steps[2].name).toBe('KYC Complete');
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(12.69, 1);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL (placeholder returns no rows)

```bash
npx vitest run src/__tests__/funnelService.test.ts
```

- [ ] **Step 3:** Replace the `activation` entry in `FUNNEL_QUERIES`

```typescript
  activation: (params) => ({
    sql: `
      WITH connects AS (
        SELECT 'connect'::text AS step, COUNT(*)::bigint AS count
        FROM users WHERE wallet IS NOT NULL AND wallet != ''
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      registers AS (
        SELECT 'register'::text AS step, COUNT(*)::bigint AS count
        FROM users WHERE wallet IS NOT NULL AND wallet != ''
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      kyc_complete AS (
        SELECT 'kyc'::text AS step, COUNT(DISTINCT u.wallet)::bigint AS count
        FROM users u
        WHERE u.snag_user_id IS NOT NULL
          AND ($1::timestamp IS NULL OR u.created_at >= $1)
          AND ($2::timestamp IS NULL OR u.created_at <= $2)
      ),
      first_trades AS (
        SELECT 'first_trade'::text AS step, COUNT(DISTINCT wallet)::bigint AS count
        FROM positions
          WHERE ($1::timestamp IS NULL OR opened_at >= $1)
            AND ($2::timestamp IS NULL OR opened_at <= $2)
      )
      SELECT step, count FROM connects
      UNION ALL SELECT step, count FROM registers
      UNION ALL SELECT step, count FROM kyc_complete
      UNION ALL SELECT step, count FROM first_trades
    `,
    values: [params.from ?? null, params.to ?? null],
  }),
```

Note: connect and register collapse to the same count in v1 — Tomer's wallet-connect IS the register step. Tracking Specialist agent output will clarify whether to separate them in v2.

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): activation funnel query (connect→register→kyc→first_trade)"
```

---

### Task 9: Build conversion funnel query

**Files:**
- Modify: `src/services/funnelService.ts` — replace `conversion` placeholder

- [ ] **Step 1:** Write the failing test

Append to `src/__tests__/funnelService.test.ts`:

```typescript
describe('computeFunnel — conversion', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns first_trade→second→multi_asset→active steps', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'first_trade', count: '430' },
      { step: 'second_trade', count: '180' },
      { step: 'multi_asset', count: '60' },
      { step: 'active_holder', count: '30' },
    ] as any);

    const result = await computeFunnel('conversion', {});
    expect(result.steps).toHaveLength(4);
    expect(result.steps[1].conversionFromPrev).toBeCloseTo(41.86, 1);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Replace `conversion` query

```typescript
  conversion: (params) => ({
    sql: `
      WITH trade_counts AS (
        SELECT wallet, COUNT(*) AS trades, COUNT(DISTINCT asset) AS assets
        FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
        GROUP BY wallet
      ),
      open_positions AS (
        SELECT wallet FROM positions
        WHERE status = 'open'
          AND ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
        GROUP BY wallet
      )
      SELECT 'first_trade'::text AS step, COUNT(*)::bigint AS count FROM trade_counts WHERE trades >= 1
      UNION ALL
      SELECT 'second_trade'::text AS step, COUNT(*)::bigint AS count FROM trade_counts WHERE trades >= 2
      UNION ALL
      SELECT 'multi_asset'::text AS step, COUNT(*)::bigint AS count FROM trade_counts WHERE assets >= 2
      UNION ALL
      SELECT 'active_holder'::text AS step, COUNT(DISTINCT wallet)::bigint AS count FROM open_positions
    `,
    values: [params.from ?? null, params.to ?? null],
  }),
```

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): conversion funnel (first_trade→active_holder)"
```

---

### Task 10: Build whale_pipeline funnel query

**Files:**
- Modify: `src/services/funnelService.ts` — replace `whale_pipeline` placeholder

- [ ] **Step 1:** Write the failing test

Append to test file:

```typescript
describe('computeFunnel — whale_pipeline', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('segments by position size tiers', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'holder', count: '430' },
      { step: 'over_1k', count: '120' },
      { step: 'over_10k', count: '25' },
      { step: 'over_100k', count: '3' },
    ] as any);

    const result = await computeFunnel('whale_pipeline', {});
    expect(result.steps[3].count).toBe(3);
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(0.70, 1);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Replace `whale_pipeline` query

```typescript
  whale_pipeline: (params) => ({
    sql: `
      WITH max_positions AS (
        SELECT wallet, MAX(position_size_usd) AS max_size
        FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
        GROUP BY wallet
      )
      SELECT 'holder'::text AS step, COUNT(*)::bigint AS count FROM max_positions
      UNION ALL
      SELECT 'over_1k'::text AS step, COUNT(*)::bigint AS count FROM max_positions WHERE max_size >= 1000
      UNION ALL
      SELECT 'over_10k'::text AS step, COUNT(*)::bigint AS count FROM max_positions WHERE max_size >= 10000
      UNION ALL
      SELECT 'over_100k'::text AS step, COUNT(*)::bigint AS count FROM max_positions WHERE max_size >= 100000
    `,
    values: [params.from ?? null, params.to ?? null],
  }),
```

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): whale_pipeline funnel ($1K/$10K/$100K tiers)"
```

---

### Task 11: Build loyalty funnel query

**Files:**
- Modify: `src/services/funnelService.ts` — replace `loyalty` placeholder

- [ ] **Step 1:** Write the failing test

Append:

```typescript
describe('computeFunnel — loyalty', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('counts trader → snag_linked → badged → top tier', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'trader', count: '430' },
      { step: 'snag_linked', count: '180' },
      { step: 'badged', count: '120' },
      { step: 'top_tier', count: '20' },
    ] as any);

    const result = await computeFunnel('loyalty', {});
    expect(result.steps[1].name).toBe('Snag Linked');
    expect(result.steps[3].conversionFromFirst).toBeCloseTo(4.65, 1);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Replace `loyalty` query

```typescript
  loyalty: (params) => ({
    sql: `
      WITH traders AS (
        SELECT DISTINCT wallet FROM positions
        WHERE ($1::timestamp IS NULL OR opened_at >= $1)
          AND ($2::timestamp IS NULL OR opened_at <= $2)
      ),
      snag AS (
        SELECT u.wallet FROM users u
        INNER JOIN traders t ON t.wallet = u.wallet
        WHERE u.snag_user_id IS NOT NULL
      ),
      badged_wallets AS (
        SELECT DISTINCT b.wallet FROM badges b
        INNER JOIN traders t ON t.wallet = b.wallet
      ),
      top_tier AS (
        SELECT u.wallet FROM users u
        INNER JOIN traders t ON t.wallet = u.wallet
        WHERE u.claim_multiplier >= 2.0
      )
      SELECT 'trader'::text AS step, COUNT(*)::bigint AS count FROM traders
      UNION ALL SELECT 'snag_linked'::text AS step, COUNT(*)::bigint AS count FROM snag
      UNION ALL SELECT 'badged'::text AS step, COUNT(*)::bigint AS count FROM badged_wallets
      UNION ALL SELECT 'top_tier'::text AS step, COUNT(*)::bigint AS count FROM top_tier
    `,
    values: [params.from ?? null, params.to ?? null],
  }),
```

Note: `top_tier` threshold of `claim_multiplier >= 2.0` is a v1 guess. Growth Hacker agent output may revise this.

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): loyalty funnel (trader→snag→badged→top_tier)"
```

---

### Task 12: Build referral funnel query

**Files:**
- Modify: `src/services/funnelService.ts` — replace `referral` placeholder

- [ ] **Step 1:** Write the failing test

Append:

```typescript
describe('computeFunnel — referral', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('counts referral chain steps', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'user', count: '15455' },
      { step: 'code_generated', count: '2400' },
      { step: 'referral_clicked', count: '800' },
      { step: 'referral_traded', count: '120' },
    ] as any);
    const result = await computeFunnel('referral', {});
    expect(result.steps[3].count).toBe(120);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Replace `referral` query

```typescript
  referral: (params) => ({
    sql: `
      WITH all_users AS (
        SELECT wallet FROM users
        WHERE ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      code_holders AS (
        SELECT DISTINCT referred_by_code AS code FROM users WHERE referred_by_code IS NOT NULL
      ),
      referred_users AS (
        SELECT wallet FROM users
        WHERE referred_by_wallet IS NOT NULL
          AND ($1::timestamp IS NULL OR created_at >= $1)
          AND ($2::timestamp IS NULL OR created_at <= $2)
      ),
      referred_traders AS (
        SELECT DISTINCT p.wallet FROM positions p
        INNER JOIN referred_users r ON r.wallet = p.wallet
      )
      SELECT 'user'::text AS step, COUNT(*)::bigint AS count FROM all_users
      UNION ALL SELECT 'code_generated'::text AS step, COUNT(*)::bigint AS count FROM code_holders
      UNION ALL SELECT 'referral_clicked'::text AS step, COUNT(*)::bigint AS count FROM referred_users
      UNION ALL SELECT 'referral_traded'::text AS step, COUNT(*)::bigint AS count FROM referred_traders
    `,
    values: [params.from ?? null, params.to ?? null],
  }),
```

Note: "referral_clicked" maps to "referred user signed up" in v1 since we don't track raw clicks yet. Tracking Specialist agent output may add a clicks table.

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): referral funnel (user→code→clicked→traded)"
```

---

### Task 13: Build retention funnel query

**Files:**
- Modify: `src/services/funnelService.ts` — replace `retention` placeholder

- [ ] **Step 1:** Write the failing test

Append:

```typescript
describe('computeFunnel — retention', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('classifies users by activity recency', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { step: 'active', count: '430' },
      { step: 'dormant_7d', count: '180' },
      { step: 'reactivated', count: '40' },
      { step: 'lost_30d', count: '300' },
    ] as any);
    const result = await computeFunnel('retention', {});
    expect(result.steps).toHaveLength(4);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Replace `retention` query

```typescript
  retention: () => ({
    sql: `
      WITH last_trade AS (
        SELECT wallet, MAX(opened_at) AS last_at FROM positions GROUP BY wallet
      ),
      reactivated AS (
        SELECT lt.wallet FROM last_trade lt
        WHERE lt.last_at >= NOW() - INTERVAL '7 days'
          AND EXISTS (
            SELECT 1 FROM positions p2
            WHERE p2.wallet = lt.wallet
              AND p2.opened_at < NOW() - INTERVAL '30 days'
              AND p2.opened_at >= NOW() - INTERVAL '90 days'
          )
      )
      SELECT 'active'::text AS step, COUNT(*)::bigint AS count
        FROM last_trade WHERE last_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'dormant_7d'::text AS step, COUNT(*)::bigint AS count
        FROM last_trade WHERE last_at < NOW() - INTERVAL '7 days' AND last_at >= NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 'reactivated'::text AS step, COUNT(*)::bigint AS count FROM reactivated
      UNION ALL
      SELECT 'lost_30d'::text AS step, COUNT(*)::bigint AS count
        FROM last_trade WHERE last_at < NOW() - INTERVAL '30 days'
    `,
    values: [],
  }),
```

Note: `retention` does not take date params in v1 — it always reports "as of now." Date params apply in v2 when historical snapshots exist.

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/funnelService.ts src/__tests__/funnelService.test.ts
git commit -m "feat(funnels): retention funnel (active/dormant/reactivated/lost)"
```

---

## Backend — Attribution + Cohorts + Stream

### Task 14: Build attributionService — channel ROI

**Files:**
- Create: `src/services/attributionService.ts`
- Create: `src/__tests__/attributionService.test.ts`

- [ ] **Step 1:** Write the failing test

```typescript
// src/__tests__/attributionService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeChannelROI, computeWhaleOrigins } from '../services/attributionService';
import * as db from '../db/pool';

vi.mock('../db/pool');

describe('computeChannelROI', () => {
  beforeEach(() => vi.resetAllMocks());

  it('groups users and volume by utm_source', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { source: 'twitter', users: '4200', stitched_users: '900', holders: '180', whales: '14', total_volume_usd: '8200', avg_position_usd: '600' },
      { source: 'discord', users: '2100', stitched_users: '700', holders: '90', whales: '6', total_volume_usd: '3400', avg_position_usd: '550' },
    ] as any);

    const result = await computeChannelROI({});
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('twitter');
    expect(result[0].totalVolumeUSD).toBe(8200);
  });
});

describe('computeWhaleOrigins', () => {
  beforeEach(() => vi.resetAllMocks());

  it('produces sankey edges for top whales', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { from_node: 'twitter', to_node: 'first_trade', value: '14' },
      { from_node: 'discord', to_node: 'first_trade', value: '6' },
    ] as any);

    const result = await computeWhaleOrigins({});
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe('twitter');
    expect(result[0].value).toBe(14);
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

```bash
npx vitest run src/__tests__/attributionService.test.ts
```

- [ ] **Step 3:** Create `src/services/attributionService.ts`

```typescript
// src/services/attributionService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { ChannelROIRow, FunnelQueryParams, WhaleOriginEdge } from '../types/funnel';

const ATTRIBUTION_TTL_SECONDS = 300;
const cache = new FunnelCache({ ttlSeconds: ATTRIBUTION_TTL_SECONDS, maxEntries: 200 });

export async function computeChannelROI(params: FunnelQueryParams): Promise<ChannelROIRow[]> {
  const cacheKey = `channel_roi|${buildCacheKey('channel_roi', params as Record<string, unknown>)}`;
  const cached = cache.get<ChannelROIRow[]>(cacheKey);
  if (cached) return cached;

  // v1: source attribution is based on referred_by_code when present, else 'direct'
  // Tracking Specialist agent output will replace this with proper UTM-source columns
  const rows = await query<{
    source: string;
    users: string;
    stitched_users: string;
    holders: string;
    whales: string;
    total_volume_usd: string;
    avg_position_usd: string;
  }>(
    `
    WITH user_source AS (
      SELECT
        COALESCE(NULLIF(referred_by_code, ''), 'direct') AS source,
        wallet,
        (ga_user_id IS NOT NULL OR snag_user_id IS NOT NULL) AS is_stitched
      FROM users
      WHERE ($1::timestamp IS NULL OR created_at >= $1)
        AND ($2::timestamp IS NULL OR created_at <= $2)
    ),
    holders AS (
      SELECT DISTINCT wallet, SUM(position_size_usd) AS volume
      FROM positions
      WHERE ($1::timestamp IS NULL OR opened_at >= $1)
        AND ($2::timestamp IS NULL OR opened_at <= $2)
      GROUP BY wallet
    )
    SELECT
      us.source,
      COUNT(*)::bigint AS users,
      COUNT(*) FILTER (WHERE us.is_stitched)::bigint AS stitched_users,
      COUNT(*) FILTER (WHERE h.wallet IS NOT NULL)::bigint AS holders,
      COUNT(*) FILTER (WHERE h.volume >= 1000)::bigint AS whales,
      COALESCE(SUM(h.volume), 0)::bigint AS total_volume_usd,
      COALESCE(AVG(h.volume), 0)::bigint AS avg_position_usd
    FROM user_source us
    LEFT JOIN holders h ON h.wallet = us.wallet
    GROUP BY us.source
    ORDER BY total_volume_usd DESC
    LIMIT 50
    `,
    [params.from ?? null, params.to ?? null],
  );

  const result: ChannelROIRow[] = rows.map(r => ({
    source: r.source,
    users: Number(r.users),
    stitchedUsers: Number(r.stitched_users),
    holders: Number(r.holders),
    whales: Number(r.whales),
    totalVolumeUSD: Number(r.total_volume_usd),
    avgPositionUSD: Number(r.avg_position_usd),
    attribution: 'first_touch',
  }));

  cache.set(cacheKey, result);
  return result;
}

export async function computeWhaleOrigins(params: FunnelQueryParams): Promise<WhaleOriginEdge[]> {
  const cacheKey = `whale_origins|${buildCacheKey('whale_origins', params as Record<string, unknown>)}`;
  const cached = cache.get<WhaleOriginEdge[]>(cacheKey);
  if (cached) return cached;

  const rows = await query<{ from_node: string; to_node: string; value: string }>(
    `
    WITH whales AS (
      SELECT DISTINCT p.wallet FROM positions p
      WHERE p.position_size_usd >= 1000
        AND ($1::timestamp IS NULL OR p.opened_at >= $1)
        AND ($2::timestamp IS NULL OR p.opened_at <= $2)
    ),
    whale_sources AS (
      SELECT COALESCE(NULLIF(u.referred_by_code, ''), 'direct') AS source, w.wallet
      FROM whales w INNER JOIN users u ON u.wallet = w.wallet
    )
    SELECT source AS from_node, 'whale_trade'::text AS to_node, COUNT(*)::bigint AS value
    FROM whale_sources
    GROUP BY source
    ORDER BY value DESC
    LIMIT 50
    `,
    [params.from ?? null, params.to ?? null],
  );

  const result: WhaleOriginEdge[] = rows.map(r => ({
    from: r.from_node,
    to: r.to_node,
    value: Number(r.value),
  }));

  cache.set(cacheKey, result);
  return result;
}
```

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/attributionService.ts src/__tests__/attributionService.test.ts
git commit -m "feat(attribution): channel ROI + whale origins computation"
```

---

### Task 15: Build cohortService

**Files:**
- Create: `src/services/cohortService.ts`
- Create: `src/__tests__/cohortService.test.ts`

- [ ] **Step 1:** Write the failing test

```typescript
// src/__tests__/cohortService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeCohortMatrix } from '../services/cohortService';
import * as db from '../db/pool';

vi.mock('../db/pool');

describe('computeCohortMatrix', () => {
  beforeEach(() => vi.resetAllMocks());

  it('produces weekly retention matrix', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { cohort: '2026-05-W22', size_at_start: '100', retention: [100, 60, 40, 30] },
      { cohort: '2026-05-W21', size_at_start: '80',  retention: [100, 55, 35] },
    ] as any);

    const result = await computeCohortMatrix('week', {});
    expect(result.dim).toBe('week');
    expect(result.cohorts).toHaveLength(2);
    expect(result.cohorts[0].retention[1]).toBe(60);
  });

  it('rejects invalid dim', async () => {
    // @ts-expect-error testing runtime guard
    await expect(computeCohortMatrix('decade', {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Create `src/services/cohortService.ts`

```typescript
// src/services/cohortService.ts
import { query } from '../db/pool';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import type { CohortDim, CohortMatrix, FunnelQueryParams } from '../types/funnel';

const COHORT_TTL_SECONDS = 300;
const cache = new FunnelCache({ ttlSeconds: COHORT_TTL_SECONDS, maxEntries: 100 });

const ALLOWED_DIMS: CohortDim[] = ['day', 'week', 'month'];

const DATE_TRUNC: Record<CohortDim, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

const INTERVAL: Record<CohortDim, string> = {
  day: '1 day',
  week: '1 week',
  month: '1 month',
};

export async function computeCohortMatrix(
  dim: CohortDim,
  params: FunnelQueryParams,
): Promise<CohortMatrix> {
  if (!ALLOWED_DIMS.includes(dim)) {
    throw new Error(`Invalid cohort dim: ${dim}`);
  }

  const cacheKey = `cohort_${dim}|${buildCacheKey('cohort', params as Record<string, unknown>)}`;
  const cached = cache.get<CohortMatrix>(cacheKey);
  if (cached) return cached;

  // For SQL injection safety, we use DATE_TRUNC and INTERVAL lookup maps,
  // not direct string interpolation
  const trunc = DATE_TRUNC[dim];
  const interval = INTERVAL[dim];

  const rows = await query<{
    cohort: string;
    size_at_start: string;
    retention: number[];
  }>(
    `
    WITH user_cohorts AS (
      SELECT
        wallet,
        DATE_TRUNC('${trunc}', created_at) AS cohort_date
      FROM users
      WHERE ($1::timestamp IS NULL OR created_at >= $1)
        AND ($2::timestamp IS NULL OR created_at <= $2)
    ),
    cohort_sizes AS (
      SELECT cohort_date, COUNT(*) AS size FROM user_cohorts GROUP BY cohort_date
    ),
    activity AS (
      SELECT
        uc.cohort_date,
        FLOOR(EXTRACT(EPOCH FROM (p.opened_at - uc.cohort_date)) / EXTRACT(EPOCH FROM INTERVAL '${interval}'))::int AS period_offset,
        COUNT(DISTINCT p.wallet) AS active_users
      FROM user_cohorts uc
      LEFT JOIN positions p ON p.wallet = uc.wallet
      WHERE p.opened_at IS NOT NULL
      GROUP BY uc.cohort_date, period_offset
    ),
    matrix AS (
      SELECT
        cs.cohort_date,
        cs.size,
        ARRAY_AGG(
          COALESCE(a.active_users, 0)::float * 100.0 / NULLIF(cs.size, 0)
          ORDER BY a.period_offset
        ) AS retention
      FROM cohort_sizes cs
      LEFT JOIN activity a ON a.cohort_date = cs.cohort_date
      WHERE a.period_offset BETWEEN 0 AND 12
      GROUP BY cs.cohort_date, cs.size
    )
    SELECT
      TO_CHAR(cohort_date, 'IYYY-IW') AS cohort,
      size::text AS size_at_start,
      retention
    FROM matrix
    ORDER BY cohort_date DESC
    LIMIT 12
    `,
    [params.from ?? null, params.to ?? null],
  );

  const result: CohortMatrix = {
    dim,
    cohorts: rows.map(r => ({
      cohort: r.cohort,
      sizeAtStart: Number(r.size_at_start),
      retention: r.retention.map(v => Math.round(v * 10) / 10),
    })),
  };

  cache.set(cacheKey, result);
  return result;
}
```

Note: The DATE_TRUNC and INTERVAL string interpolation is safe because we lookup against `ALLOWED_DIMS` first. The `'${trunc}'` is a literal string from a fixed lookup, not user input.

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/cohortService.ts src/__tests__/cohortService.test.ts
git commit -m "feat(cohorts): cohort retention matrix service"
```

---

### Task 16: Build streamService (SSE pubsub)

**Files:**
- Create: `src/services/streamService.ts`
- Create: `src/__tests__/streamService.test.ts`

- [ ] **Step 1:** Write the failing test

```typescript
// src/__tests__/streamService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { whalePubsub, publishWhaleEvent } from '../services/streamService';
import type { WhaleStreamEvent } from '../types/funnel';

describe('whalePubsub', () => {
  it('delivers events to subscribers', () => {
    const events: WhaleStreamEvent[] = [];
    const unsub = whalePubsub.subscribe(e => events.push(e));

    publishWhaleEvent({
      type: 'trade',
      wallet: 'AbCd1234',
      asset: 'TSL2L',
      sizeUSD: 1500,
      side: 'long',
      timestamp: '2026-06-02T20:00:00Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0].asset).toBe('TSL2L');

    unsub();
    publishWhaleEvent({
      type: 'trade',
      wallet: 'AbCd1234',
      asset: 'SPX3L',
      sizeUSD: 1500,
      side: 'long',
      timestamp: '2026-06-02T20:00:01Z',
    });
    expect(events).toHaveLength(1);
  });

  it('filters by minimum size', () => {
    const events: WhaleStreamEvent[] = [];
    const unsub = whalePubsub.subscribe(e => events.push(e));

    publishWhaleEvent({
      type: 'trade',
      wallet: 'AbCd1234',
      asset: 'TSL2L',
      sizeUSD: 100,  // below default $1000 threshold
      side: 'long',
      timestamp: '2026-06-02T20:00:00Z',
    });

    expect(events).toHaveLength(0);
    unsub();
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Create `src/services/streamService.ts`

```typescript
// src/services/streamService.ts
import type { WhaleStreamEvent } from '../types/funnel';

const MIN_USD = Number(process.env.WHALE_TICKER_MIN_USD ?? '1000');

type Subscriber = (event: WhaleStreamEvent) => void;

class WhalePubsub {
  private subs = new Set<Subscriber>();

  subscribe(sub: Subscriber): () => void {
    this.subs.add(sub);
    return () => this.subs.delete(sub);
  }

  emit(event: WhaleStreamEvent): void {
    for (const sub of this.subs) {
      try {
        sub(event);
      } catch (err) {
        console.error('[stream] subscriber error', err);
      }
    }
  }

  count(): number {
    return this.subs.size;
  }
}

export const whalePubsub = new WhalePubsub();

export function publishWhaleEvent(event: WhaleStreamEvent): void {
  if (event.sizeUSD < MIN_USD) return;
  whalePubsub.emit(event);
}
```

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/services/streamService.ts src/__tests__/streamService.test.ts
git commit -m "feat(stream): whale event pubsub with $1K threshold"
```

---

## Backend — Routes

### Task 17: Create funnels route

**Files:**
- Create: `src/routes/funnels.ts`
- Create: `src/__tests__/funnelsRoute.test.ts`

- [ ] **Step 1:** Write the failing test

```typescript
// src/__tests__/funnelsRoute.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import funnelsRouter from '../routes/funnels';
import * as funnelService from '../services/funnelService';

vi.mock('../services/funnelService');

const ADMIN_KEY = 'ShiftRwa2026@@$$Key';
process.env.ADMIN_KEY = ADMIN_KEY;

function makeApp() {
  const app = express();
  app.use('/api/funnels', funnelsRouter);
  return app;
}

describe('GET /api/funnels/:funnelId', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects requests without x-admin-key', async () => {
    const res = await request(makeApp()).get('/api/funnels/acquisition');
    expect(res.status).toBe(401);
  });

  it('returns 400 for unknown funnel id', async () => {
    const res = await request(makeApp())
      .get('/api/funnels/unknown')
      .set('x-admin-key', ADMIN_KEY);
    expect(res.status).toBe(400);
  });

  it('returns funnel result for valid request', async () => {
    vi.spyOn(funnelService, 'computeFunnel').mockResolvedValueOnce({
      funnelId: 'acquisition',
      steps: [{ id: 'visit', name: 'Visit', count: 100, uniqueWallets: 100, conversionFromPrev: 100, conversionFromFirst: 100, vs7dDelta: 0 }],
      computedAt: new Date().toISOString(),
      cacheKey: 'acquisition|abc',
      cacheTTLSeconds: 60,
    });

    const res = await request(makeApp())
      .get('/api/funnels/acquisition?from=2026-06-01')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.funnelId).toBe('acquisition');
  });
});
```

- [ ] **Step 2:** Run test — expect FAIL

- [ ] **Step 3:** Create `src/routes/funnels.ts`

```typescript
// src/routes/funnels.ts
import { Router, type Request, type Response } from 'express';
import { computeFunnel } from '../services/funnelService';
import { parseQueryParams } from '../lib/queryParams';
import type { FunnelId } from '../types/funnel';

const VALID_FUNNELS: FunnelId[] = [
  'acquisition',
  'activation',
  'conversion',
  'whale_pipeline',
  'loyalty',
  'referral',
  'retention',
];

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/:funnelId', async (req: Request, res: Response) => {
  const { funnelId } = req.params;

  if (!VALID_FUNNELS.includes(funnelId as FunnelId)) {
    return res.status(400).json({ error: `invalid funnel id: ${funnelId}` });
  }

  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeFunnel(funnelId as FunnelId, params);
    res.json(result);
  } catch (err) {
    console.error('[funnels]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
```

- [ ] **Step 4:** Run test — expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/routes/funnels.ts src/__tests__/funnelsRoute.test.ts
git commit -m "feat(routes): GET /api/funnels/:funnelId with admin-key auth"
```

---

### Task 18: Create attribution + cohorts routes

**Files:**
- Create: `src/routes/attribution.ts`
- Create: `src/routes/cohorts.ts`

- [ ] **Step 1:** Create `src/routes/attribution.ts`

```typescript
// src/routes/attribution.ts
import { Router, type Request, type Response } from 'express';
import { computeChannelROI, computeWhaleOrigins } from '../services/attributionService';
import { parseQueryParams } from '../lib/queryParams';

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/channel-roi', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeChannelROI(params);
    res.json({ rows: result, computedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[attribution/channel-roi]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/whale-origins', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeWhaleOrigins(params);
    res.json({ edges: result, computedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[attribution/whale-origins]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
```

- [ ] **Step 2:** Create `src/routes/cohorts.ts`

```typescript
// src/routes/cohorts.ts
import { Router, type Request, type Response } from 'express';
import { computeCohortMatrix } from '../services/cohortService';
import { parseQueryParams } from '../lib/queryParams';
import type { CohortDim } from '../types/funnel';

const VALID_DIMS: CohortDim[] = ['day', 'week', 'month'];

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/:dim', async (req: Request, res: Response) => {
  const { dim } = req.params;
  if (!VALID_DIMS.includes(dim as CohortDim)) {
    return res.status(400).json({ error: `invalid cohort dim: ${dim}` });
  }
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeCohortMatrix(dim as CohortDim, params);
    res.json(result);
  } catch (err) {
    console.error('[cohorts]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
```

- [ ] **Step 3:** Add quick integration tests

Create `src/__tests__/attributionRoute.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import attributionRouter from '../routes/attribution';
import * as svc from '../services/attributionService';

vi.mock('../services/attributionService');
process.env.ADMIN_KEY = 'ShiftRwa2026@@$$Key';

describe('GET /api/attribution/channel-roi', () => {
  it('returns rows on success', async () => {
    vi.spyOn(svc, 'computeChannelROI').mockResolvedValueOnce([
      { source: 'twitter', users: 100, stitchedUsers: 30, holders: 10, whales: 1, totalVolumeUSD: 5000, avgPositionUSD: 500, attribution: 'first_touch' as const },
    ]);
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app)
      .get('/api/attribution/channel-roi')
      .set('x-admin-key', 'ShiftRwa2026@@$$Key');
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
  });
});
```

- [ ] **Step 4:** Run all tests

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 5:** Commit

```bash
git add src/routes/attribution.ts src/routes/cohorts.ts src/__tests__/attributionRoute.test.ts
git commit -m "feat(routes): /api/attribution/{channel-roi,whale-origins} + /api/cohorts/:dim"
```

---

### Task 19: Create SSE stream route

**Files:**
- Create: `src/routes/stream.ts`

- [ ] **Step 1:** Create `src/routes/stream.ts`

```typescript
// src/routes/stream.ts
import { Router, type Request, type Response } from 'express';
import { whalePubsub } from '../services/streamService';

const HEARTBEAT_MS = 15_000;
const router = Router();

router.get('/whales', (req: Request, res: Response) => {
  const adminKey = req.header('x-admin-key') ?? (req.query.adminKey as string | undefined);
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');  // disable nginx buffering
  res.flushHeaders();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: 'hello', timestamp: new Date().toISOString() });

  const unsub = whalePubsub.subscribe((event) => send(event));

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
  }, HEARTBEAT_MS);

  req.on('close', () => {
    unsub();
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;
```

Note: SSE auth accepts the key via query param `adminKey` as a fallback for EventSource browsers that can't set headers. The query-param path is acceptable here because (a) HTTPS encrypts query strings in transit, (b) admin context only, (c) the key is already exposed to the same admin frontend.

- [ ] **Step 2:** Smoke test it manually after Task 20 wires it into `index.ts`

- [ ] **Step 3:** Commit

```bash
git add src/routes/stream.ts
git commit -m "feat(stream): SSE /api/stream/whales endpoint with heartbeat"
```

---

### Task 20: Wire new routes into index.ts + hook Helius webhook

**Files:**
- Modify: `src/index.ts`
- Modify: `src/routes/webhook.ts` — emit to whalePubsub when on-chain trade ≥ $1K

- [ ] **Step 1:** Find the route imports block in `src/index.ts`

Run:

```bash
grep -n "import.*routes" "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/src/index.ts"
```

- [ ] **Step 2:** Add 4 new route imports

In `src/index.ts`, add after the existing route imports:

```typescript
import funnelsRoutes from './routes/funnels';
import attributionRoutes from './routes/attribution';
import cohortsRoutes from './routes/cohorts';
import streamRoutes from './routes/stream';
```

- [ ] **Step 3:** Mount the routes

Find the existing `app.use('/api/...')` mount block and add:

```typescript
app.use('/api/funnels', funnelsRoutes);
app.use('/api/attribution', attributionRoutes);
app.use('/api/cohorts', cohortsRoutes);
app.use('/api/stream', streamRoutes);
```

- [ ] **Step 4:** Hook the Helius webhook to publish whale events

Edit `src/routes/webhook.ts`. Find the handler where Helius events are processed. After a successful trade detection, add:

```typescript
import { publishWhaleEvent } from '../services/streamService';

// ...inside the trade-event handler, after successful processing:
publishWhaleEvent({
  type: 'trade',
  wallet: trade.wallet,
  asset: trade.asset,
  sizeUSD: trade.positionSizeUsd,
  side: trade.side,
  timestamp: new Date().toISOString(),
});
```

Adjust property names to match the existing trade object shape (read the webhook handler first).

- [ ] **Step 5:** Verify TypeScript compiles

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 6:** Run full test suite

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 7:** Set ADMIN_KEY env var locally and smoke-test

```bash
ADMIN_KEY=ShiftRwa2026@@\$\$Key npm run dev &
sleep 3
curl -s -H "x-admin-key: ShiftRwa2026@@\$\$Key" http://localhost:3001/api/funnels/acquisition | python3 -m json.tool
kill %1
```

Expected: JSON with `funnelId: "acquisition"` and `steps` array.

- [ ] **Step 8:** Commit

```bash
git add src/index.ts src/routes/webhook.ts
git commit -m "feat(routes): mount funnels/attribution/cohorts/stream + Helius→pubsub"
```

---

## Agent Dispatches (sequenced after backend ships)

### Task 21: Dispatch Growth Hacker agent (consumes Tracking Specialist output)

**Files:**
- Create: `docs/agents/growth-hacker-2026-06-02.md`

- [ ] **Step 1:** Verify Tracking Specialist output exists at `docs/agents/tracking-specialist-2026-06-02.md` and is real content (not the placeholder)

- [ ] **Step 2:** Dispatch the Growth Hacker via the Agent tool

Use `subagent_type: "Growth Hacker"`. Prompt:

```
You are dispatched to design the conversion-funnel taxonomy and success metrics for SHIFT RWA — a Solana-based leveraged-token platform with a community-to-trader conversion problem.

Required reading before you start:
- Spec: docs/superpowers/specs/2026-06-02-funnel-data-hub-design.md
- Tracking Specialist output: docs/agents/tracking-specialist-2026-06-02.md

Current funnel implementations (already shipped to feat/funnel-attribution-platform):
- Acquisition: visit → landing → connect → first_trade (currently 3.4% end-to-end)
- Activation: connect → register → kyc → first_trade
- Conversion: first_trade → second_trade → multi_asset → active_holder
- Whale Pipeline: holder → $1K+ → $10K+ → $100K+
- Loyalty: trader → snag_linked → badged → top_tier
- Referral: user → code_generated → referral_clicked → referral_traded
- Retention: active → dormant_7d → reactivated → lost_30d

Deliverables (write to docs/agents/growth-hacker-2026-06-02.md):
1. Refined funnel step names and definitions (where v1 is wrong)
2. Success metric per step (the % we should aim for + reasoning)
3. Realistic benchmarks for the SHIFT context (RWA crypto, leveraged tokens, Solana)
4. Top 5 viral-loop mechanics we should build into the platform (referral codes, tier-gated content, token-gated alpha, etc.)
5. Specific drop-off diagnosis: at which steps do we lose users today, what's likely causing it, what's the highest-ROI fix
6. Channel budget allocation framework: % of effort/spend per channel (X / Discord / TG / Reddit / KOLs / direct)
7. Cohort comparison framework: which segments matter most (paying vs. free, social-acquired vs. KOL-acquired)
8. 1-pager "next 30 days growth plan" tied to funnel improvements

Output is consumed by the Analytics Reporter (KPI tree design) and the frontend funnel UI labels.
```

- [ ] **Step 3:** Save the agent's output

- [ ] **Step 4:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add docs/agents/growth-hacker-2026-06-02.md
git commit -m "docs(agents): Growth Hacker — funnel taxonomy + 30-day growth plan"
```

---

### Task 22: Dispatch Analytics Reporter agent (consumes Growth Hacker output)

**Files:**
- Create: `docs/agents/analytics-reporter-2026-06-02.md`

- [ ] **Step 1:** Verify Growth Hacker output exists and is real content

- [ ] **Step 2:** Dispatch the Analytics Reporter via the Agent tool

Use `subagent_type: "Analytics Reporter"`. Prompt:

```
You are dispatched to design the KPI tree and dashboard layout for SHIFT RWA's new funnel data hub.

Required reading:
- Spec: docs/superpowers/specs/2026-06-02-funnel-data-hub-design.md
- Tracking Specialist: docs/agents/tracking-specialist-2026-06-02.md
- Growth Hacker: docs/agents/growth-hacker-2026-06-02.md

Deliverables (write to docs/agents/analytics-reporter-2026-06-02.md):
1. KPI tree — North Star Metric → Input metrics (3 tiers max) for the SHIFT business
2. For each KPI: target value, alert threshold (red/yellow/green), data source, owner
3. Dashboard layout priority: which 8 things go above the fold in the Funnels view, in priority order
4. Insight card templates: 6-10 "What changed?" 1-liners that should auto-generate from data deltas
5. Alert spec: which thresholds should trigger Slack/email alerts, what the message should say
6. Weekly executive memo template: SCQA-structured 1-pager covering what changed, why, what to do
7. Anti-vanity-metric checklist: which KPIs to deliberately NOT show because they mislead

Output is consumed by the frontend implementation (chart priority, insight cards) and the Executive Summary Generator agent in Sprint 3.
```

- [ ] **Step 3:** Save the agent's output

- [ ] **Step 4:** Commit

```bash
git add docs/agents/analytics-reporter-2026-06-02.md
git commit -m "docs(agents): Analytics Reporter — KPI tree + insight card templates"
```

---

## Frontend — Layout Shell + Filter Bar

### Task 23: Install frontend dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1:** Install runtime deps

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npm install framer-motion@^11 recharts@^3
```

- [ ] **Step 2:** Install dev deps

```bash
npm install -D vitest@^2 @vitest/ui@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25 @playwright/test@^1
```

- [ ] **Step 3:** Verify Next.js still builds

```bash
npx next build 2>&1 | tail -20
```

Expected: clean build (or warnings only — no errors).

- [ ] **Step 4:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add framer-motion + recharts + vitest + playwright"
```

---

### Task 24: Create API client + useFilters hook

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/hooks/useFilters.ts`

- [ ] **Step 1:** Create `frontend/lib/api.ts`

```typescript
// frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'ShiftRwa2026@@$$Key';

export interface ApiOptions {
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
}

export async function apiGet<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const qs = opts.query
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(opts.query)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';
  const res = await fetch(`${API_BASE}${path}${qs}`, {
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function sseURL(path: string): string {
  return `${API_BASE}${path}?adminKey=${encodeURIComponent(ADMIN_KEY)}`;
}
```

- [ ] **Step 2:** Create `frontend/hooks/useFilters.ts`

```typescript
"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface Filters {
  from?: string;
  to?: string;
  source?: string;
  asset?: string;
  cohort?: 'day' | 'week' | 'month';
  walletSizeMin?: number;
  walletSizeMax?: number;
}

const STORAGE_KEY = 'shift-data-hub-filters';

function readStorage(): Filters {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(filters: Filters): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch { /* quota — ignore */ }
}

function paramsToFilters(p: URLSearchParams): Filters {
  const f: Filters = {};
  const from = p.get('from'); if (from) f.from = from;
  const to = p.get('to'); if (to) f.to = to;
  const source = p.get('source'); if (source) f.source = source;
  const asset = p.get('asset'); if (asset) f.asset = asset;
  const cohort = p.get('cohort');
  if (cohort === 'day' || cohort === 'week' || cohort === 'month') f.cohort = cohort;
  const min = Number(p.get('walletSizeMin'));
  if (Number.isFinite(min) && min >= 0) f.walletSizeMin = min;
  const max = Number(p.get('walletSizeMax'));
  if (Number.isFinite(max) && max >= 0) f.walletSizeMax = max;
  return f;
}

function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.source) p.set('source', f.source);
  if (f.asset) p.set('asset', f.asset);
  if (f.cohort) p.set('cohort', f.cohort);
  if (f.walletSizeMin !== undefined) p.set('walletSizeMin', String(f.walletSizeMin));
  if (f.walletSizeMax !== undefined) p.set('walletSizeMax', String(f.walletSizeMax));
  return p;
}

export function useFilters(): [Filters, (next: Partial<Filters>) => void, () => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo<Filters>(() => {
    const fromUrl = paramsToFilters(new URLSearchParams(searchParams?.toString() ?? ''));
    return Object.keys(fromUrl).length > 0 ? fromUrl : readStorage();
  }, [searchParams]);

  const [filters, setFilters] = useState<Filters>(initial);

  useEffect(() => {
    writeStorage(filters);
    const p = filtersToParams(filters);
    const next = p.toString();
    const current = searchParams?.toString() ?? '';
    if (next !== current) {
      router.replace(`?${next}`, { scroll: false });
    }
  }, [filters, router, searchParams]);

  const update = useCallback((next: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => setFilters({}), []);

  return [filters, update, reset];
}
```

- [ ] **Step 3:** Commit

```bash
git add frontend/lib/api.ts frontend/hooks/useFilters.ts
git commit -m "feat(frontend): api client + useFilters hook (URL + localStorage)"
```

---

### Task 25: Create FilterBar component

**Files:**
- Create: `frontend/components/DataHub/shared/FilterBar.tsx`
- Create: `frontend/components/DataHub/shared/DateRangePicker.tsx`
- Create: `frontend/components/DataHub/shared/SourcePicker.tsx`
- Create: `frontend/components/DataHub/shared/AssetPicker.tsx`

- [ ] **Step 1:** Create `frontend/components/DataHub/shared/DateRangePicker.tsx`

```typescript
"use client";
import React from 'react';

const accent = "#00c896";
const accentBorder = "rgba(0,200,150,0.2)";

export function DateRangePicker({
  from, to, onChange,
}: { from?: string; to?: string; onChange: (next: { from?: string; to?: string }) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="date" value={from ?? ''}
        onChange={e => onChange({ from: e.target.value || undefined })}
        style={inputStyle}
        aria-label="From date"
      />
      <span style={{ color: '#3a7060', fontSize: 12 }}>→</span>
      <input
        type="date" value={to ?? ''}
        onChange={e => onChange({ to: e.target.value || undefined })}
        style={inputStyle}
        aria-label="To date"
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${accentBorder}`,
  borderRadius: 8,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  colorScheme: 'dark',
};
```

- [ ] **Step 2:** Create `frontend/components/DataHub/shared/SourcePicker.tsx`

```typescript
"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";

const SOURCES = ['direct', 'twitter', 'discord', 'telegram', 'reddit', 'kol', 'email'];

export function SourcePicker({
  value, onChange,
}: { value?: string; onChange: (next: string | undefined) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      style={selectStyle}
      aria-label="Source channel"
    >
      <option value="">All sources</option>
      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${accentBorder}`,
  borderRadius: 8,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};
```

- [ ] **Step 3:** Create `frontend/components/DataHub/shared/AssetPicker.tsx`

```typescript
"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";

const ASSETS = ['TSL2L', 'TSL1S', 'SOX3L', 'SOX3S', 'SPX3L', 'SPX3S'];

export function AssetPicker({
  value, onChange,
}: { value?: string; onChange: (next: string | undefined) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      style={selectStyle}
      aria-label="Asset"
    >
      <option value="">All assets</option>
      {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${accentBorder}`,
  borderRadius: 8,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};
```

- [ ] **Step 4:** Create `frontend/components/DataHub/shared/FilterBar.tsx`

```typescript
"use client";
import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { DateRangePicker } from './DateRangePicker';
import { SourcePicker } from './SourcePicker';
import { AssetPicker } from './AssetPicker';

const accent = "#00c896";
const accentDim = "rgba(0,200,150,0.15)";
const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function FilterBar() {
  const [filters, update, reset] = useFilters();
  const activeCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <div style={{
      background: panel,
      border: `1px solid ${accentBorder}`,
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#3a7060', textTransform: 'uppercase' }}>
        Filters
      </span>
      <DateRangePicker
        from={filters.from} to={filters.to}
        onChange={next => update(next)}
      />
      <SourcePicker value={filters.source} onChange={v => update({ source: v })} />
      <AssetPicker value={filters.asset} onChange={v => update({ asset: v })} />
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {activeCount > 0 && (
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              border: `1px solid ${accentBorder}`,
              color: accent,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5:** Build to verify

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 6:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/components/DataHub/shared/
git commit -m "feat(frontend): global FilterBar with date/source/asset pickers"
```

---

### Task 26: Create useFunnelData hook

**Files:**
- Create: `frontend/hooks/useFunnelData.ts`

- [ ] **Step 1:** Create `frontend/hooks/useFunnelData.ts`

```typescript
"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Filters } from './useFilters';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFunnelData<T>(path: string, filters: Filters): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(path, {
        signal: ctl.signal,
        query: filters as Record<string, string | number | undefined>,
      });
      if (!ctl.signal.aborted) setData(result);
    } catch (err) {
      if (!ctl.signal.aborted) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [path, JSON.stringify(filters)]); // stringify is intentional: filters is a shallow obj

  useEffect(() => {
    fetchOnce();
    return () => abortRef.current?.abort();
  }, [fetchOnce]);

  return { data, loading, error, refetch: fetchOnce };
}
```

- [ ] **Step 2:** Commit

```bash
git add frontend/hooks/useFunnelData.ts
git commit -m "feat(frontend): useFunnelData generic fetcher with abort + refetch"
```

---

### Task 27: Refactor page.tsx into layout-shell with 4 new views (skeletons)

**Files:**
- Create: `frontend/app/admin/data-hub/layout-shell.tsx`
- Create: `frontend/app/admin/data-hub/views/FunnelsView.tsx` (skeleton)
- Create: `frontend/app/admin/data-hub/views/AttributionView.tsx` (skeleton)
- Create: `frontend/app/admin/data-hub/views/CohortsView.tsx` (skeleton)
- Create: `frontend/app/admin/data-hub/views/RawDataView.tsx` (wraps existing 6-tab content)
- Modify: `frontend/app/admin/data-hub/page.tsx`

This is the biggest refactor in Sprint 0. The existing `page.tsx` (1029 lines) gets split.

- [ ] **Step 1:** Read the existing `page.tsx` to understand its current structure

```bash
wc -l "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend/app/admin/data-hub/page.tsx"
```

- [ ] **Step 2:** Create skeleton view files

`frontend/app/admin/data-hub/views/FunnelsView.tsx`:

```typescript
"use client";
import React from 'react';

const accent = "#00c896";
const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function FunnelsView() {
  return (
    <div style={{
      background: panel,
      border: `1px solid ${accentBorder}`,
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding: 48,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
        Funnels — Sprint 1
      </div>
      <div style={{ color: '#3a7060', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
        7 funnels are wired in the backend. The visualizations land in Sprint 1.
        Filter changes already round-trip to the API — open the network tab to verify.
      </div>
      <a
        href="/api/funnels/acquisition"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-block', marginTop: 20, padding: '8px 16px',
          background: 'rgba(0,200,150,0.15)', color: accent,
          border: `1px solid ${accentBorder}`, borderRadius: 8,
          fontSize: 12, textDecoration: 'none', fontWeight: 600,
        }}
      >
        Inspect acquisition funnel JSON →
      </a>
    </div>
  );
}
```

`frontend/app/admin/data-hub/views/AttributionView.tsx`:

```typescript
"use client";
import React from 'react';

const accent = "#00c896";
const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function AttributionView() {
  return (
    <div style={{ background: panel, border: `1px solid ${accentBorder}`, borderRadius: 16, backdropFilter: 'blur(12px)', padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Source Attribution — Sprint 2</div>
      <div style={{ color: '#3a7060', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
        Whale Origin Sankey, KOL leaderboard, channel ROI, and UTM cohorts land in Sprint 2.
      </div>
    </div>
  );
}
```

`frontend/app/admin/data-hub/views/CohortsView.tsx`:

```typescript
"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function CohortsView() {
  return (
    <div style={{ background: panel, border: `1px solid ${accentBorder}`, borderRadius: 16, backdropFilter: 'blur(12px)', padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🐋</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Trader Cohorts — Sprint 3</div>
      <div style={{ color: '#3a7060', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
        Whale Watch live ticker, retention heatmap, behavior segments, churn risk — all land in Sprint 3.
      </div>
    </div>
  );
}
```

- [ ] **Step 3:** Create `frontend/app/admin/data-hub/views/RawDataView.tsx`

This wraps the **existing** 6-tab content from `page.tsx`. The cleanest approach is to keep the existing content rendering in `page.tsx` for now and have `RawDataView` accept the same props.

```typescript
"use client";
import React from 'react';

// This view renders the existing 6-tab content. In Sprint 0 we keep the existing
// rendering in page.tsx by passing children through. The actual tab content (Markets,
// Analytics, etc.) is unchanged from main; we just gate it behind the new IA.
export function RawDataView({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

- [ ] **Step 4:** Create `frontend/app/admin/data-hub/layout-shell.tsx`

```typescript
"use client";
import React, { useState } from 'react';
import { FilterBar } from '@/components/DataHub/shared/FilterBar';

const accent = "#00c896";
const accentDim = "rgba(0,200,150,0.15)";
const accentBorder = "rgba(0,200,150,0.2)";
const bg = "#030d0a";

export type TopView = 'funnels' | 'attribution' | 'cohorts' | 'raw';

const TABS: Array<{ id: TopView; label: string; emoji: string }> = [
  { id: 'funnels',     label: 'Funnels',           emoji: '🎯' },
  { id: 'attribution', label: 'Source Attribution', emoji: '🔍' },
  { id: 'cohorts',     label: 'Trader Cohorts',    emoji: '🐋' },
  { id: 'raw',         label: 'Raw Data',          emoji: '📊' },
];

export function LayoutShell({
  activeView, onChangeView, children,
}: { activeView: TopView; onChangeView: (v: TopView) => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>SHIFT RWA — Data Hub</div>
          <div style={{ color: '#3a7060', fontSize: 12, marginTop: 2 }}>Funnel & Attribution Platform</div>
        </div>
        <nav style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, border: `1px solid ${accentBorder}` }}>
          {TABS.map(t => {
            const active = activeView === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChangeView(t.id)}
                style={{
                  background: active ? accentDim : 'transparent',
                  color: active ? accent : '#5a9070',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  fontFamily: 'inherit',
                  transition: 'all 120ms ease-out',
                }}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </header>
      <div style={{ marginBottom: 16 }}>
        <FilterBar />
      </div>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 5:** Refactor `frontend/app/admin/data-hub/page.tsx` — surgical edit

The existing `page.tsx` is 1029 lines. Do **not** rewrite it. Make exactly these 4 surgical edits:

**Edit 1 — Add imports** (near the top of the file, after existing imports):

```typescript
import { LayoutShell, type TopView } from './layout-shell';
import { FunnelsView } from './views/FunnelsView';
import { AttributionView } from './views/AttributionView';
import { CohortsView } from './views/CohortsView';
import { RawDataView } from './views/RawDataView';
```

**Edit 2 — Add the top-view state.** Find the existing `useState` block that declares `currentPage` (or the equivalent state holding `HubPage`). Above it, add:

```typescript
const [topView, setTopView] = useState<TopView>('funnels');
```

Do NOT remove `currentPage` — it still drives the existing 6-tab nav inside Raw Data.

**Edit 3 — Locate the main return block.** Run this to find the existing top-level render — it's the `return (...)` of the authenticated default export (NOT the `AuthGate` return).

```bash
grep -n "return (" "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend/app/admin/data-hub/page.tsx"
```

The authenticated return wraps everything in a top-level `<div>` with the page background and renders the 6-tab nav + KPI cards + tab content.

**Edit 4 — Wrap the existing return.** Keep the **entire body** of the existing authenticated return as-is. Wrap it in the new shell by replacing the outer `<div style={{ minHeight: '100vh', background: bg, ... }}>...</div>` with the following structure (keep the inner children intact — they remain identical):

```typescript
return (
  <LayoutShell activeView={topView} onChangeView={setTopView}>
    {topView === 'funnels' && <FunnelsView />}
    {topView === 'attribution' && <AttributionView />}
    {topView === 'cohorts' && <CohortsView />}
    {topView === 'raw' && (
      <RawDataView>
        {/*
          Paste the FULL existing JSX that was inside the outer <div style={{ minHeight... }}>
          here, unchanged. This is the existing 6-tab nav + KPI cards + tab content.
          Do not modify any of it — it must render byte-identically to current main.
        */}
      </RawDataView>
    )}
  </LayoutShell>
);
```

**Verification rule:** After the edit, running `git diff main -- frontend/app/admin/data-hub/page.tsx | grep -c '^-'` should show fewer than 10 deleted lines. We are wrapping, not rewriting.

**If you need to confirm the surgical extraction worked:** the existing 6-tab content must render byte-identically when you click "Raw Data" tab. Smoke-test by comparing screenshots of `/admin/data-hub` on `main` vs. this branch with `topView='raw'` selected — they should match.

- [ ] **Step 6:** Build to verify

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -30
```

Expected: clean build.

- [ ] **Step 7:** Smoke test locally

```bash
npx next dev
# Visit http://localhost:3000/admin/data-hub
# Verify:
# 1. Auth gate works
# 2. After auth, "Funnels" tab is selected by default
# 3. Clicking "Raw Data" shows the existing 6-tab content
# 4. FilterBar at top is visible
# 5. Setting a date in FilterBar updates the URL
```

- [ ] **Step 8:** Commit

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
git add frontend/app/admin/data-hub/
git commit -m "feat(frontend): layout shell + 4 view tabs + RawDataView wrapping existing 6-tab content"
```

---

## Sprint 0 Exit

### Task 28: Sprint 0 verification checklist

- [ ] **Step 1:** Run full backend test suite

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 2:** Check TypeScript strict-mode compilation (backend)

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3:** Build frontend

```bash
cd frontend && npx next build
```

Expected: clean build.

- [ ] **Step 4:** Manual API smoke test

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
ADMIN_KEY=ShiftRwa2026@@\$\$Key npm run dev &
sleep 4
for f in acquisition activation conversion whale_pipeline loyalty referral retention; do
  echo "=== $f ==="
  curl -s -H "x-admin-key: ShiftRwa2026@@\$\$Key" "http://localhost:3001/api/funnels/$f" | python3 -c "import json,sys; d=json.load(sys.stdin); print('steps:', len(d.get('steps',[])))"
done
echo "=== channel-roi ==="
curl -s -H "x-admin-key: ShiftRwa2026@@\$\$Key" "http://localhost:3001/api/attribution/channel-roi" | python3 -c "import json,sys; d=json.load(sys.stdin); print('rows:', len(d.get('rows',[])))"
echo "=== whale-origins ==="
curl -s -H "x-admin-key: ShiftRwa2026@@\$\$Key" "http://localhost:3001/api/attribution/whale-origins" | python3 -c "import json,sys; d=json.load(sys.stdin); print('edges:', len(d.get('edges',[])))"
echo "=== cohorts/week ==="
curl -s -H "x-admin-key: ShiftRwa2026@@\$\$Key" "http://localhost:3001/api/cohorts/week" | python3 -c "import json,sys; d=json.load(sys.stdin); print('cohorts:', len(d.get('cohorts',[])))"
kill %1
```

Expected: each endpoint returns a valid result with at least `steps:`, `rows:`, `edges:`, or `cohorts:` populated (counts may be small but should not error).

- [ ] **Step 5:** Verify all 4 agent docs exist with real content

```bash
ls -la docs/agents/
wc -l docs/agents/tracking-specialist-2026-06-02.md docs/agents/growth-hacker-2026-06-02.md docs/agents/analytics-reporter-2026-06-02.md docs/agents/trend-researcher-2026-06-02.md
```

Expected: 4 files, each > 30 lines (the Trend Researcher may be a placeholder if still running).

- [ ] **Step 6:** Sprint 0 exit checklist

- [ ] All 11 endpoints return real data: `GET /api/funnels/{7 ids}`, `GET /api/attribution/{channel-roi,whale-origins}`, `GET /api/cohorts/:dim`, `GET /api/stream/whales` (SSE)
- [ ] Layout shell renders with 4 top tabs + FilterBar
- [ ] Existing 6-tab content still works under "Raw Data" tab
- [ ] URL params persist filters
- [ ] All vitest tests pass
- [ ] TypeScript compiles clean
- [ ] `npx next build` succeeds
- [ ] 4 agent deliverables saved to `docs/agents/`

- [ ] **Step 7:** Tag the Sprint 0 milestone

```bash
git tag -a sprint-0-foundation -m "Sprint 0: backend funnel API + frontend layout shell"
echo "Sprint 0 complete. Ready to write Sprint 1 plan."
```

- [ ] **Step 8:** Decide deployment

Sprint 0 is non-breaking for the live `/admin/data-hub` if "Raw Data" defaults remain visible — but per Tomer's "create a new branch so we will not interfere with the operational one" instruction, do NOT deploy yet. Hold all changes on the `feat/funnel-attribution-platform` branch.

After verification, Tomer can:
- Cherry-pick Sprint 0 to `main` and deploy (low risk — additive new tabs + endpoints)
- Or hold the entire feature branch until Sprint 3 completes, then merge as one shipment

---

## Sprint 1 Preview (not in this plan)

Sprint 1 will produce a separate plan once Sprint 0 ships. Scope preview:
- Replace `FunnelsView` placeholder with full 7-funnel UI using Recharts
- AnimatedFunnel, FunnelStepCard, DropoffArrow components
- Drill-down modal
- Compare-mode toggle
- `frontend-design` + `taste-skill` pass
- Visual regression baseline

---

*End of Sprint 0 plan. Total tasks: 28. Estimated implementation time: 5-7 days of focused work.*
