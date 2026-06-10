# SHIFT RWA Data Hub — Funnel & Attribution Platform Design Spec

**Spec ID:** `2026-06-02-funnel-data-hub-design`
**Author:** Claude (Opus 4.7) for Tomer
**Status:** Draft — awaiting review
**Target system:** `https://shift-airdrop-data-hub.vercel.app/admin/data-hub`
**Repository:** `Shift-Airdrop-Backend` (Next.js 16.2.6 frontend + Express/TS backend)

---

## 1. Problem Statement

The current Data Hub surfaces *outputs* (KPIs, leaderboards, holders) but does not surface *funnels* — the path users take from social touchpoint → wallet connect → first trade → high-volume holder. As of 2026-06-02:

| Metric | Value | Implication |
|---|---|---|
| Registered users | 15,455 | Healthy top of funnel |
| Identity-stitched users | 3,387 (22%) | **78% of users cannot be attributed to a source** |
| Active holders | 430 | Visit-to-hold conversion is **3.4%** |
| Trading volume | $13,700 | Whale density is the lever |
| GA4 30d active users | 12,415 | Anonymous traffic dominates known traffic |

The team needs to **(a) attribute every wallet to its first source**, **(b) measure every step from touch to whale**, **(c) identify where high-volume traders come from**, and **(d) compute ROAS per channel**. This spec defines the platform to do that.

---

## 2. Scope

### In Scope (v1)

- New **Funnels** primary view with 7 funnels: Acquisition, Activation, Conversion, Whale Pipeline, Loyalty/Snag, Referral/Viral, Retention/Churn
- New **Source Attribution** view: Channel ROI, KOL leaderboard, UTM performance, Whale Origin Sankey
- New **Trader Cohorts** view: Whale Watch live ticker, Behavior Segments, Cohort Retention Heatmap, Churn Risk
- Reorganization of existing 6 tabs into a **Raw Data Drill-downs** section
- Global filter bar (date range, source, asset, cohort, wallet size)
- 11 new backend endpoints (7 funnel + 2 attribution + 1 cohort + 1 SSE stream) backed by Postgres SQL views
- Server-Sent Events stream for the Whale Watch live ticker
- Agent-driven workflow per phase (Tracking Specialist, Growth Hacker, Analytics Reporter, Trend Researcher, Behavioral Nudge Engine, Paid Media Auditor, Executive Summary Generator)
- Visual design via the `frontend-design` and `taste-skill` skills (anti-AI-slop)

### Out of Scope (deferred)

- Schema migrations (v1 reads from existing tables via views)
- Multi-property GA4 aggregation (single property `536531221` only)
- Predictive ML models beyond linear extrapolation
- Direct Discord/Telegram bot integration (UTM-only tracking for v1)
- Paid ads platform direct integrations (Google/Meta) — handled by Paid Media Auditor agent reports
- Mobile app version
- White-labelling for portfolio companies

---

## 3. Information Architecture

### Tab Structure (new)

```
/admin/data-hub
├── 🎯 Funnels                  [primary view, default on auth]
│   ├── Acquisition             GA4 channel → Landing → Wallet connect
│   ├── Activation              Connect → Register → KYC → First trade
│   ├── Conversion              First trade → Multi-trade → Holder
│   ├── Whale Pipeline          Holder → $1k+ → $10k+ → $100k+
│   ├── Loyalty / Snag          Trader → Linked → Badged → Top tier
│   ├── Referral / Viral        User → Code created → Referrals attributed
│   └── Retention / Churn       Active → Dormant → Reactivated → Lost
│
├── 🔍 Source Attribution
│   ├── Channel ROI             Source → Users → Volume → ROAS
│   ├── KOL Leaderboard         Referrer → Attributed volume → Tier
│   ├── UTM Performance         Campaign → Cohort → LTV curve
│   └── Whale Origin (Sankey)   $X+ trader → Trace back to first touch
│
├── 🐋 Trader Cohorts
│   ├── Whale Watch             Top 100 by volume, real-time positions
│   ├── Behavior Segments       Day-traders / HODLers / Cycle / Diamond hands
│   ├── Cohort Retention        Cohort by source × retention week heatmap
│   └── Churn Risk              Predictive risk scoring
│
├── 📊 Raw Data Drill-downs
│   ├── Markets                 (existing — kept as-is)
│   ├── GA4 Analytics           (existing — kept as-is)
│   ├── Identity Stitching      (existing — kept as-is)
│   ├── On-chain Holders        (existing — kept as-is)
│   ├── Leaderboard             (existing — linked to cohorts)
│   └── Admin Audit             (existing — kept as-is)
│
└── ⚙️ Global Filter Bar        Date range, source, asset, cohort, wallet size
                                Persisted to URL params + localStorage
```

### Default Landing Page

After auth, the user lands on **Funnels → Acquisition** by default. URL: `/admin/data-hub?view=funnels&funnel=acquisition`.

---

## 4. Backend Architecture

### 4.1 New Service Layer

**File:** `src/services/funnelService.ts` (new)

```typescript
interface FunnelDefinition {
  id: 'acquisition' | 'activation' | 'conversion' | 'whale_pipeline'
    | 'loyalty' | 'referral' | 'retention';
  name: string;
  steps: FunnelStepDef[];
  source_dim?: 'utm_source' | 'utm_medium' | 'channel' | 'kol_code' | 'wallet_size';
  cohort_dim?: 'day' | 'week' | 'month';
}

interface FunnelStepDef {
  id: string;
  name: string;
  sql_view: string;        // Reference to a Postgres view
  benchmark_pct?: number;  // Industry/historical benchmark for conversion
}

interface FunnelStepResult {
  name: string;
  count: number;
  uniqueWallets: number;
  conversionFromPrev: number;        // %
  conversionFromFirst: number;       // %
  medianTimeToNextStep?: string;     // ISO duration, e.g. "PT2H30M"
  vs7dDelta: number;                 // % change vs 7 days ago
}

interface FunnelResult {
  funnelId: string;
  steps: FunnelStepResult[];
  bySource?: Array<{ source: string; steps: number[] }>;
  cohorts?: Array<{ cohort: string; steps: number[] }>;
  computedAt: string;
  cacheKey: string;
  cacheTTLSeconds: number;
}
```

### 4.2 SQL Views (read-only, no migrations)

All funnels are computed from views over existing tables. Example for Acquisition Funnel:

```sql
-- view: v_funnel_acquisition_steps
CREATE OR REPLACE VIEW v_funnel_acquisition_steps AS
WITH ga4_visits AS (
  -- joined via ga_user_id in users
  SELECT ga_user_id, COUNT(DISTINCT session_id) AS sessions
  FROM users WHERE ga_user_id IS NOT NULL GROUP BY 1
),
landing AS (
  SELECT wallet, MIN(created_at) AS first_seen FROM users GROUP BY 1
),
connects AS (
  SELECT wallet FROM users WHERE wallet IS NOT NULL
),
first_trades AS (
  SELECT wallet, MIN(opened_at) AS first_trade FROM positions GROUP BY 1
)
SELECT
  'visit' AS step, COUNT(*) AS count FROM ga4_visits
UNION ALL
SELECT 'landing', COUNT(*) FROM landing
UNION ALL
SELECT 'connect', COUNT(*) FROM connects
UNION ALL
SELECT 'first_trade', COUNT(*) FROM first_trades;
```

Each funnel gets a primary `v_funnel_<id>_steps` view plus `v_funnel_<id>_by_source` and `v_funnel_<id>_cohorts` companion views.

### 4.3 New Endpoints

| Method | Path | Auth | Cache TTL | Owner |
|---|---|---|---|---|
| GET | `/api/funnels/acquisition` | `x-admin-key` | 60s | funnelService |
| GET | `/api/funnels/activation` | `x-admin-key` | 60s | funnelService |
| GET | `/api/funnels/conversion` | `x-admin-key` | 60s | funnelService |
| GET | `/api/funnels/whale-pipeline` | `x-admin-key` | 60s | funnelService |
| GET | `/api/funnels/loyalty` | `x-admin-key` | 60s | funnelService |
| GET | `/api/funnels/referral` | `x-admin-key` | 60s | funnelService |
| GET | `/api/funnels/retention` | `x-admin-key` | 60s | funnelService |
| GET | `/api/attribution/channel-roi` | `x-admin-key` | 5m | attributionService |
| GET | `/api/attribution/whale-origins` | `x-admin-key` | 5m | attributionService |
| GET | `/api/cohorts/:dim` | `x-admin-key` | 5m | cohortService |
| GET | `/api/stream/whales` | `x-admin-key` | SSE | streamService |

**Query parameters (all endpoints):** `from`, `to`, `source`, `asset`, `cohort`, `walletSizeMin`, `walletSizeMax`.

### 4.4 SSE Stream — Whale Ticker

`GET /api/stream/whales` — Server-Sent Events stream. Backed by:
1. Helius webhook → backend `/api/webhook/helius` (already wired)
2. Backend publishes to in-memory pubsub
3. SSE handler subscribes per-client and pushes JSON events: `{type: 'trade', wallet, asset, sizeUSD, side, timestamp}`

Filtered to positions ≥ `$1,000` to avoid noise. Configurable threshold via env `WHALE_TICKER_MIN_USD`.

### 4.5 Backend Caching

Postgres views are computed on-demand but wrapped in an LRU memory cache (`lru-cache` npm). Cache key = `${funnelId}|${queryStringHash}`. Invalidated on Helius webhook for affected wallets only.

### 4.6 Performance Targets

- p50 latency per funnel endpoint: < 300ms (warm cache)
- p99 latency: < 2s (cold cache, full SQL view scan)
- SSE event delivery: < 5s from on-chain confirmation
- Concurrent admin clients supported: ≥ 5

---

## 5. Frontend Architecture

### 5.1 File Structure (new files in **bold**)

```
frontend/
├── app/admin/data-hub/
│   ├── page.tsx                        (refactored — slimmed down to layout shell)
│   ├── **layout-shell.tsx**            Tab nav, global filter bar, auth gate
│   └── **views/**
│       ├── **FunnelsView.tsx**
│       ├── **AttributionView.tsx**
│       ├── **CohortsView.tsx**
│       └── **RawDataView.tsx**          (wraps existing 6 tab content)
│
├── components/DataHub/
│   ├── KPICards.tsx                    (existing)
│   ├── FunnelChart.tsx                 (existing — refactored into the new library)
│   ├── OnchainPanel.tsx                (existing)
│   ├── RealtimeLedger.tsx              (existing)
│   ├── types.ts                        (existing — extended)
│   ├── **funnels/**
│   │   ├── **AnimatedFunnel.tsx**       Step-by-step animated bars
│   │   ├── **FunnelStepCard.tsx**       Hover-to-explain tooltip card
│   │   ├── **DropoffArrow.tsx**         Inter-step drop-off visualization
│   │   └── **CompareModeToggle.tsx**    Date range / source comparison
│   ├── **attribution/**
│   │   ├── **WhaleOriginSankey.tsx**    Custom SVG Sankey diagram
│   │   ├── **ChannelROITable.tsx**
│   │   ├── **KOLLeaderboard.tsx**
│   │   └── **UTMCohortChart.tsx**
│   ├── **cohorts/**
│   │   ├── **WhaleWatchTicker.tsx**     SSE-fed horizontal scroll
│   │   ├── **BehaviorSegments.tsx**     Quadrant chart
│   │   ├── **CohortRetentionHeatmap.tsx** Custom SVG heatmap
│   │   └── **ChurnRiskList.tsx**
│   └── **shared/**
│       ├── **FilterBar.tsx**            Global filter bar
│       ├── **DateRangePicker.tsx**
│       ├── **SourcePicker.tsx**
│       ├── **AssetPicker.tsx**
│       ├── **ExportButton.tsx**         PNG / CSV / PDF
│       ├── **SavedViewsMenu.tsx**       localStorage-backed
│       └── **CommandPalette.tsx**       Cmd-K global search
│
├── hooks/
│   ├── useAdminAuth.ts                 (existing)
│   ├── **useFunnelData.ts**             Generic funnel fetcher with cache
│   ├── **useFilters.ts**                URL-params + localStorage filter state
│   ├── **useSSEStream.ts**              SSE subscription with reconnect
│   ├── **useKeyboardNav.ts**            1-7 jump, / focus, Cmd-K palette
│   └── **useSavedViews.ts**
│
└── lib/
    ├── **funnelTaxonomy.ts**            Funnel step definitions, benchmarks
    ├── **chartTokens.ts**               Color tokens, motion timings
    └── **exporters.ts**                 PNG/CSV/PDF generation
```

### 5.2 Visualization Library Choice

**Primary:** `recharts` (v3+, React-friendly, composable, tree-shakable, fits inline-style pattern).

**Custom SVG for signature pieces:**
- Whale Origin Sankey — built from scratch using `d3-sankey` layout helper + custom SVG paths to match brand
- Cohort Retention Heatmap — custom grid SVG with click-to-drill
- Whale Watch Ticker — pure CSS scrolling list, no chart lib needed
- Animated Funnel — `framer-motion` + custom bars

**Justification for two libraries:**
- Recharts gives us 80% of charts for 20% of the build effort
- Custom SVG for the 4 signature pieces makes the platform feel proprietary, not "another Metabase clone"

### 5.3 Design System (preserved + extended)

| Token | Value | Where it appears |
|---|---|---|
| `bg` | `#030d0a` | Page background |
| `panel` | `rgba(8,18,14,0.9)` | All card backgrounds |
| `accent` | `#00c896` | Primary accent (single color) |
| `accentDim` | `rgba(0,200,150,0.15)` | Filled backgrounds |
| `accentBorder` | `rgba(0,200,150,0.2)` | Borders |
| `glass` | `backdrop-filter: blur(12px)` | Card effect |
| Font | system stack | All text |
| Style approach | **Inline React** | NO Tailwind, NO CSS-in-JS lib |

**New tokens:**
| Token | Value | Purpose |
|---|---|---|
| `warning` | `#ff9a3c` | Drop-off arrows, churn risk |
| `success` | `#5ee0a8` | Above-benchmark conversions |
| `glassDeep` | `rgba(4,10,8,0.95)` | Modal/overlay backgrounds |
| `motion.fast` | `120ms ease-out` | Hover transitions |
| `motion.medium` | `400ms cubic-bezier(0.4,0,0.2,1)` | Layout shifts |
| `motion.slow` | `1200ms cubic-bezier(0.16,1,0.3,1)` | Funnel reveal |

### 5.4 Interactivity Specifications

| Pattern | Detail |
|---|---|
| **Hover-to-explain** | Funnel step → tooltip card: count, % from prev, % from first, median time, vs 7d delta, vs benchmark, 1-line plain-English insight |
| **Click-to-drill** | Funnel step → modal: cohort of users at that step (paginated table), 3 sample wallets, top sources |
| **Live ticker** | SSE-fed horizontal scroll above all views. Auto-pauses on hover, click pauses/resumes |
| **Filter chips** | Global filter bar applies to ALL views; chips render the active filters with × to remove |
| **URL params** | All filters serialized to URL (`?from=...&source=...`) — shareable links |
| **Animated transitions** | Numbers tween via `framer-motion`; bars fill on mount; Sankey paths animate stroke-dashoffset |
| **Compare mode** | Toggle in top-right of any chart → side-by-side delta view (two date ranges OR two sources) |
| **Predictive overlays** | "Projected next 30d" — linear regression on trailing 90d data, rendered as dashed extension |
| **Keyboard nav** | `1-7` jumps to funnel tabs; `/` focuses filter input; `Cmd-K` opens command palette |
| **Saved views** | "Save current view" → name → stored in localStorage; menu lists saved views |
| **Export** | Each chart has a `⋯` menu → Export PNG / CSV / PDF; "Export full report" → multi-page PDF |
| **Empty/loading states** | Skeleton shimmers in accent color, never grey placeholder boxes |
| **Error states** | Friendly inline error card with retry button + link to admin log |
| **Accessibility** | All charts have `aria-label`s, keyboard-focusable, color-blind-safe palette validated |

### 5.5 The "AMAZING" Features (delight pass)

These are the deliberately impressive moments that make the dashboard feel premium:

1. **Whale Origin Sankey reveal animation** — on first paint, flows animate from left to right in 1.2s, each stream sized by attributed volume
2. **Funnel "rain" mode** — toggle that animates real-time events as particles falling through funnel steps (purely visual — uses the SSE stream)
3. **Cohort heatmap brush selection** — drag across heatmap cells → bottom panel shows the union cohort of users
4. **Whale spotlight** — top whale of the week pinned at top with full bio: source, first trade, total volume, current positions, social handles if known
5. **"What changed?" insight cards** — auto-generated 1-liners ("Wallet connects from Discord up 47% week-over-week — Telegram down 12%") at top of each view, driven by Executive Summary Generator agent
6. **Command palette (Cmd-K)** — fuzzy-search across funnels, wallets, KOLs, segments, saved views; arrow keys to navigate, Enter to open

---

## 6. Agent Assignments (per Tomer's mandate)

Each agency-agent owns a deliverable. The **Agents Orchestrator** coordinates handoffs to prevent the documented 73% handoff failure rate.

| Phase | Agency Agent | Skill Invoked | Deliverable | Consumes |
|---|---|---|---|---|
| 0 | **Tracking & Measurement Specialist** | — | UTM schema, server-side event spec, GA4↔wallet stitching plan | Existing GA4 + Postgres |
| 1 | **Growth Hacker** | — | Funnel taxonomy doc, success metrics, benchmark targets | Tracking spec |
| 1 | **Analytics Reporter** | — | KPI tree, alert thresholds, layout priority for each view | Funnel taxonomy |
| 1 | **Trend Researcher** | — | "Where the whales come from" research; X/Discord/TG/Reddit source mapping | — |
| 2 | (implementation) | `frontend-design` + `taste-skill` (mandatory per CLAUDE.md) | Component spec, motion design, anti-AI-slop review | Funnel taxonomy + KPI tree |
| 3 | **Behavioral Nudge Engine** | — | Nudge spec for connect → first-trade, in-product prompts | Funnel taxonomy |
| 3 | **Paid Media Auditor** | — | (when ads are running) Waste report, prioritized fixes | Channel ROI data |
| Reporting | **Executive Summary Generator** | — | Weekly auto-memo at `/api/reports/weekly` + Slack/email | All endpoints |
| All | **Agents Orchestrator** | — | Coordinates handoffs; maintains a project plan; weekly status synthesis | All agents |

### Agent Dispatch Order

```
Sprint 0:
  parallel → Tracking Specialist, Trend Researcher
  sequential → Growth Hacker (consumes Tracking output)
  sequential → Analytics Reporter (consumes Growth Hacker output)

Sprint 1:
  parallel → frontend-design + taste-skill (UI), Backend implementation

Sprint 2:
  parallel → Backend SSE, Frontend Sankey

Sprint 3:
  parallel → Behavioral Nudge Engine, Executive Summary Generator

Continuous:
  Agents Orchestrator → weekly synthesis memo
```

---

## 7. Testing Strategy

### 7.1 Backend

- **Unit tests** (Vitest): `funnelService.ts` — each step calculation, cache key generation, query parameter handling.
- **SQL view tests**: Seeded dataset (20 fixture users with known funnel positions) → assert each view returns expected counts.
- **Snapshot tests**: API response shape per endpoint.
- **Load tests**: k6 script hitting all 10 endpoints with realistic query params at 10 RPS for 5min — assert p99 < 2s.

### 7.2 Frontend

- **Visual regression**: Playwright screenshot tests on each chart in isolation (Storybook-style).
- **Accessibility**: axe-core in CI, must pass WCAG AA on all views.
- **Integration**: Synthetic data seeder → mounts each view → asserts step counts match seeded data.
- **E2E**: Playwright script that authenticates, navigates all tabs, applies filters, exports PNG — must complete in < 30s.

### 7.3 Manual UX Validation

Per CLAUDE.md "test the golden path and edge cases" rule:
- Auth flow → land on Funnels → switch to each funnel → apply each filter → drill into a step → export → save view → load saved view.
- Browser test on Chrome, Safari, Firefox at 1440px and 1920px.
- Reduced-motion preference honored.

---

## 8. Phased Delivery Plan

| Sprint | Duration | Scope | Exit Criteria |
|---|---|---|---|
| **0 — Foundation** | 1 wk | Backend funnel service + 7 endpoints + SQL views. Frontend layout shell + filter bar + tab skeleton. Tracking Specialist agent delivers UTM schema. Trend Researcher dispatched in parallel (output consumed by Sprint 2). | All 7 endpoints return real data; layout shell renders; tracking spec approved; Trend Researcher dispatched |
| **1 — Funnels view** | 2 wks | 7 funnels rendering with Recharts, animated, drill-down modal. Growth Hacker + Analytics Reporter agents deliver taxonomy + KPI tree. `frontend-design` + `taste-skill` review pass. | All 7 funnels live; visual regression baseline committed; agent deliverables in `docs/agents/` |
| **2 — Source attribution + Whale Watch** | 2 wks | Whale Origin Sankey, KOL leaderboard, Channel ROI table, UTM cohort chart. SSE Whale Watch ticker. Trend Researcher source map (dispatched Sprint 0) informs Sankey implementation. | Sankey renders for top 100 whales; ticker streams real Helius events; load test p99 < 2s |
| **3 — Cohorts + polish + agents loop** | 1 wk | Cohort heatmap, behavior segments, churn risk, keyboard nav, exports, command palette, saved views. Behavioral Nudge Engine + Executive Summary Generator agents ship. | All acceptance criteria below pass; weekly memo auto-generates; nudge spec delivered to product |

**Total:** 6 weeks of implementation across 4 sprints.

---

## 9. Acceptance Criteria

The platform is "done" when:

1. [ ] All 7 funnels render with real data, drilldowns work, drop-offs are visualized
2. [ ] Whale Origin Sankey renders for top 100 wallets with traceable source attribution
3. [ ] SSE ticker streams whale trades within 5s of on-chain confirmation
4. [ ] Cohort retention heatmap renders for any source × time-window selection
5. [ ] Global filter bar propagates to all views; filters serialize to URL
6. [ ] Compare mode works for date ranges AND sources on any chart
7. [ ] Keyboard nav (1-7, /, Cmd-K) works across all views
8. [ ] Saved views persist across sessions
9. [ ] Export PNG/CSV/PDF works for each chart and full-report PDF
10. [ ] All 7 agent deliverables landed in `docs/agents/`
11. [ ] `frontend-design` + `taste-skill` pass with zero AI-slop flags
12. [ ] All tests pass (unit + visual regression + accessibility + load)
13. [ ] Backend p99 < 2s; SSE event delivery < 5s
14. [ ] Visual review at 1440px and 1920px on Chrome/Safari/Firefox passes
15. [ ] Reduced-motion preference honored

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 78% of users unstitched — funnels show wrong absolute numbers | High | High | Tracking Specialist Phase 0 deliverable focuses on raising stitch rate; show "% attributable" in every funnel header |
| Next.js 16 quirks (per AGENTS.md "NOT the Next.js you know") | High | Medium | First task of Sprint 0 is reading `node_modules/next/dist/docs/` for the patterns we'll use |
| Render free-tier cold starts make SSE flaky | Medium | Medium | Heartbeat every 15s; auto-reconnect with exponential backoff; consider Render paid tier |
| Recharts ≠ matches custom dark glassmorphism out of the box | Medium | Low | Custom theme provider; signature pieces (Sankey, Heatmap) built as custom SVG |
| Helius webhook volume during whale activity spikes | Low | Medium | Rate-limit per wallet; SSE batches every 1s minimum |
| Agent outputs conflict at handoff boundaries | Medium | Medium | Agents Orchestrator runs weekly sync; standardized handoff contracts per NEXUS playbook |
| Inline-style pattern doesn't scale to 30+ new components | Medium | Medium | Extract shared style tokens to `lib/chartTokens.ts`; pure-function style builders |
| Postgres view performance under filter combinatorics | Medium | High | LRU cache; materialized views for top 5 query patterns; query plan review in Sprint 2 |

---

## 11. Open Questions for User Review

These are flagged for the user to confirm before implementation begins. Each has a defensible default that I'll proceed with if no answer given:

1. **Sprint cadence:** 6 weeks total feels right for "AMAZING" — confirm or compress?
   *Default:* 6 weeks across 4 sprints.

2. **Agent invocation depth:** Each agent produces a deliverable doc (e.g., `docs/agents/tracking-specialist-2026-06-02.md`). Confirm we're not blocked on actual external agent runs vs. me simulating their output following the agent definition?
   *Default:* I dispatch agents via the `Agent` tool with their full prompt context, capture their outputs to disk, then implement against those outputs. This honors the "no shortcuts" rule.

3. **Sankey wallet labels:** Display full wallet OR truncated (`AbCd...XyZw`)? Privacy concern for the admin view?
   *Default:* Truncated by default, with a toggle to show full when an admin has the lock-icon unlocked.

4. **Cmd-K command palette scope:** Just navigation, or also actions (export, refresh, save view, trigger agent)?
   *Default:* Both — nav + actions. Power-user feature.

5. **Live ticker — keep visible across ALL views or just Whale Watch?**
   *Default:* All views, collapsible to a thin strip when not focused.

6. **Compare-mode feature scope:** Implement for v1 or defer to v2?
   *Default:* Implement for v1 — it's a 1-day feature and is one of the "AMAZING" anchors.

7. **Snapshot the whole spec into the project's `journal.md`?**
   *Default:* Yes, append a 1-line entry pointing to this spec file.

---

## 12. References

- Project root: `/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend`
- Existing Data Hub: `frontend/app/admin/data-hub/page.tsx`
- Existing types: `frontend/components/DataHub/types.ts`
- Backend routes: `src/routes/`
- Project memory: claude-mem session `cb2fcdd2-fc78-4215-b08b-430dd6af4dc7` (project tag `shift-rwa`)
- Brainstorming skill: `superpowers:brainstorming`
- Next.js 16 caveat: `frontend/AGENTS.md` — "NOT the Next.js you know"
- Agency Agents source: `~/.claude/agents/agency-agents/`
- NEXUS orchestration framework: `~/.claude/agents/agency-agents/strategy/`

---

*End of design spec. Ready for review.*
