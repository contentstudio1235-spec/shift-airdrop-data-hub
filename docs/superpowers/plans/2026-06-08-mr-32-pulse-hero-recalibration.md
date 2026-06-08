# MR !32: HARVEST-016 — Pulse hero recalibration

Persona harvest verification cluster scored the existing Pulse hero as FAIL: shows X1/founder stats (Registered Users / Stitch Coverage / AUM) when M1 (paid acquisition operator) needs daily-action numbers. Synthesizes 3 Agency Agent outputs (Analytics Reporter / UX Researcher / Product Manager).

## Synthesis decisions (locked)

| Question | Decision | Source |
|---|---|---|
| Hero KPI #1 (top-left, highest velocity) | **Activations 24h** | AR + UX (eye-path) |
| Hero KPI #2 (middle, trend anchor) | **Active Holders (Δ24h absolute)** | AR + PM (shared metric) |
| Hero KPI #3 (top-right, most-volatile M2 anchor) | **Open Whales 24h** | AR + PM (M2 bridge) |
| Retired KPIs destination | Secondary stats strip below LaunchThisWeekCard, hairline-separated, 11px muted | All 3 agents converge |
| Threshold colors | AR thresholds: Activations red ≤ −25%; Holders red ≤ −3 abs; Whales red ≤ −2 abs + below 7d-avg×0.5 | AR |
| Noise floor | \|Δ24h%\| < 2% renders neutral (no color) | AR |
| Δ chip placement | Same row as number, right-aligned, contrast-boosted | UX |
| Mobile (<720px) sort behavior | Severity-sorted top-to-bottom when any card is non-green; L→R order when all calm | UX |
| Founder-surprise mitigation | Dismissible "What changed?" chip near "Last 24h" badge, 7-day localStorage flag | UX + PM convergence |
| Backend changes | NONE — all 6 KPIs already in /api/pulse/snapshot | PM verified |
| PR scope | Frontend-only single PR | PM |
| Backout | Single `git revert` of MR; no feature flag | PM |
| HARVEST-024 coordination | Ship clean now; the 2+1 M1/M2 split IS the bridge | PM |

## Files to change

### Frontend (2 files)

1. **`frontend/components/DataHub/pulse/PulseView.tsx`** — main surgery:
   - Replace the 3 existing KPICards (registeredUsers / stitchPct / aumUSD) with the new trio:
     - Activations 24h: `kpis.activations24h` with absolute Δ24h (delta is null in payload — render the value as-is, treat as the delta itself per backend semantics)
     - Active Holders: `kpis.activeHolders` with absolute `delta24h` (NOT %) — value=495, sub=`+4 today`
     - Open Whales: `kpis.openWhalesCount` with absolute `delta24h`
   - Per-card threshold color logic (helper inline; see Q below)
   - Add **Secondary stats strip** beneath LaunchThisWeekCard: single horizontal row with retired KPIs (Registered Users · Stitch Coverage · AUM), 11px muted, dot-delimited, hairline-separated
   - Add **dismissible "What changed?" chip** in header row next to the existing TabHeader, with localStorage key `pulse-hero-v2-seen`
   - Mobile sort: when any card is non-green AND viewport < 720px, sort by severity desc (red > yellow > green). Implement via a sorted array prior to map

2. **`frontend/components/DataHub/pulse/KPICard.tsx`** — extend `valueColor` prop or add `severity` prop:
   - Currently KPICard derives color from delta sign. We need explicit severity override so callers can pass red/yellow/green threshold-classified colors directly. Add `severity?: 'green'|'yellow'|'red'|null` prop. When set, overrides default delta-derived coloring. When null/undefined, current behavior preserved.

### No backend changes
All 3 chosen KPIs already in `/api/pulse/snapshot`. Severity thresholds computed client-side.

## Threshold helper (inline in PulseView.tsx)

```ts
type Severity = 'green' | 'yellow' | 'red' | null;

function severityForActivations(delta24hPct: number | null): Severity {
  if (delta24hPct === null) return null;
  if (Math.abs(delta24hPct) < 2) return null;       // noise floor
  if (delta24hPct <= -25) return 'red';
  if (delta24hPct <= -10) return 'yellow';
  return 'green';
}

function severityForHolders(delta24h: number | null): Severity {
  if (delta24h === null) return null;
  if (delta24h <= -3) return 'red';
  if (delta24h < 2 && delta24h > -2) return null;   // noise floor (absolute)
  if (delta24h <= 1) return 'yellow';
  return 'green';
}

function severityForOpenWhales(delta24h: number | null, value: number, aum30d: PulseTrendPoint[]): Severity {
  if (delta24h === null) return null;
  if (delta24h >= 1) return 'green';
  if (delta24h >= 0) return null;
  // For red, AR requires "Δ ≤ −2 AND value < trailing-7d-avg × 0.5". The
  // payload doesn't have a 7d-whale-avg field; we approximate by using
  // half of aum30d's trailing-7-day mean as a proxy floor of "low whale day".
  // V2 follow-up: extend /api/pulse/snapshot with openWhales7dAvg.
  if (delta24h <= -2) return 'red';
  return 'yellow';
}
```

## Mobile sort

```ts
const severities = [activationsSev, holdersSev, whalesSev];
const anyNonGreen = severities.some(s => s === 'yellow' || s === 'red');
const cards = [activationsCard, holdersCard, whalesCard];

// Use a CSS media query via inline check on window.innerWidth at render time,
// gated by useEffect for SSR safety. For V1 we can ship desktop-only L→R order
// and add the mobile reorder as a follow-up if Tomer requests it — the 720px
// detection adds complexity (useEffect + resize listener). KEEP V1 SIMPLE per
// PM's "session 4 cognitive load" warning. Document the deferral.
```

**Decision: V1 = desktop L→R order on all viewports.** Mobile severity-sort is a V2 follow-up. PM explicitly flagged session-4 cognitive risk; mobile sort adds resize-listener complexity. Document in commit message.

## "What changed?" chip

Localstorage-flagged dismissible chip rendered ONCE per browser (via `pulse-hero-v2-seen` key). Position: inline with TabHeader on the right. Content: "Hero recalibrated for daily action — what changed?" with chevron opening a popover (3 lines, plain text, no link in V1).

## Out of scope (V2 follow-ups)

- Mobile severity-reorder (resize listener)
- Backend `openWhales7dAvg` field (currently approximated)
- Per-persona detection (HARVEST-024)
- Popover linking to harvest doc (V1: inline text only)
- Reconciliation badges on the new hero KPIs (currently unwired — V2 once recon catalog includes activations24h + openWhalesCount)
