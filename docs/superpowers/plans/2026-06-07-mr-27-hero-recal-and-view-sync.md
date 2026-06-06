# MR !27: Pulse hero recalibration + URL→view sync

> Sub-skill: superpowers:subagent-driven-development.

**Goal:** Close two related Phase 1.6 findings in one PR:
- **HARVEST-016 (FAIL)** — Pulse hero shows X1 stats, 0/3 answer M1's daily questions.
- **HARVEST-006+008 (SUBTLE)** — KOL drill URL writes `?view=users` but the data-hub page doesn't react; user must manually click Users tab.
- Plus **HARVEST-015 (SUBTLE)** as a side effect — stitch coverage % currently buried, now surfaced on Pulse hero.

**Tech Stack:** React 19, Next.js 16, Vitest, inline styles, NO Tailwind, Phosphor icons.

**Design call (operator-impact, not implementation):**

Pre-existing hero shows 3 X1/founder baseline stats (Registered Users, Active Holders, AUM). HARVEST-016's verdict says these are wrong for M1. The minimum-disruption + maximum-information fix is to **swap one** of the three (Active Holders → Stitch Coverage). Reasoning:

- **Active Holders** stays available on Cohorts tab (where M2 actually drills it).
- **Stitch Coverage** (66.0% in prod, `kpis.stitchPct` already on the backend response) is the **load-bearing trust signal** for everything else — if stitch% is low, every "best ROI source" / "top KOL" / per-channel attribution becomes suspect. HARVEST-005's "Direct = unattributed" caveat was only the symptom of low stitch%.
- This is a 1-card swap, not a full hero rebuild. Reduces risk; we can re-trim later once we see operator behavior in `hub_events` telemetry.

**Registered Users + AUM stay** — both universal-readable + already on the X1 board snapshot path (D8 in v2 plan).

**Tomer can redirect this design call.** If he wants the full M1 trio (Stitch Coverage + UTM Coverage + Biggest Leak %), say so in the next session and we ship MR !27a as a follow-up.

---

## Task 1: Combined Pulse hero swap + URL→view sync

**Files:**
- Modify: `frontend/components/DataHub/pulse/PulseView.tsx` — swap the middle KPICard from `kpis.activeHolders` + `PULSE_ACTIVE_HOLDERS` to `kpis.stitchPct` + `PULSE_IDENTITY_LINKS_PCT`, label "Stitch Coverage", icon (something attribution-flavored: try `LinkSimple` or `ShareNetwork` Phosphor), format as percent.
- Modify: `frontend/components/DataHub/pulse/__tests__/PulseView.test.tsx` — adjust the hero render test to assert Stitch Coverage card present in place of Active Holders; assert badge count is still ≥3 (since stitchPct is reconciled? — NO it isn't in the catalog yet, so badge count drops to 2; either add `PULSE_IDENTITY_LINKS_PCT` to reconciliation catalog OR update the assertion to ≥2).
- Modify: `frontend/app/admin/data-hub/page.tsx` — add a `useEffect` after `topView` state declaration that subscribes to `searchParams` and updates `topView` when URL `?view=` changes externally (drill-down case).
- Create or modify: `frontend/app/admin/data-hub/__tests__/page.test.tsx` (if exists) OR a smaller targeted test in `frontend/hooks/` — add a regression test that asserts when searchParams changes from `?view=pulse` to `?view=users`, the rendered LayoutShell receives `activeView="users"`. If a full page test is too heavy, extract the effect logic into a custom hook `useTopViewFromUrl` and test that hook in isolation.

### Step 1: Read existing files

- `frontend/components/DataHub/pulse/PulseView.tsx` lines around the 3 KPICard renders (~127-160)
- `frontend/components/DataHub/pulse/__tests__/PulseView.test.tsx` — see what's currently asserted
- `frontend/app/admin/data-hub/page.tsx` lines 921-1010 — the activeView state mgmt
- `frontend/types/pulse.ts` — confirm `kpis.stitchPct: PulseKPI` (already there)

### Step 2: Write failing tests

**Test A (PulseView hero swap)** — add or modify in `PulseView.test.tsx`:
```tsx
it('renders Stitch Coverage card in the hero (replaces Active Holders)', async () => {
  render(<PulseView />);
  await waitFor(() => {
    // Stitch Coverage card present
    expect(screen.queryByText(/Stitch Coverage/i)).toBeInTheDocument();
    // Active Holders no longer in hero (still might appear in Cohorts but not here)
    expect(screen.queryAllByText('Active Holders').length).toBe(0);
  });
});
```

**Test B (URL→view sync)** — add to a new test file `frontend/app/admin/data-hub/__tests__/view-sync.test.tsx` OR extract logic into `useTopViewFromUrl` hook and test there. Decision: extract into hook for isolation.

Create `frontend/hooks/useTopViewFromUrl.ts`:
```ts
"use client";
import { useEffect } from 'react';
import { type TopView } from '@/app/admin/data-hub/layout-shell';

const VALID_VIEWS: ReadonlyArray<TopView> = ['pulse','funnels','attribution','cohorts','users','raw'];

function isValidTopView(v: string | null | undefined): v is TopView {
  return !!v && (VALID_VIEWS as readonly string[]).includes(v);
}

/**
 * Sync local topView state with `?view=` URL param. Used by the data-hub
 * page shell so drill-down URL writes (e.g. KOL row click writing
 * `?view=users&referrer=...`) actually switch the visible view.
 */
export function useSyncTopViewFromUrl(
  searchParams: URLSearchParams | null,
  topView: TopView,
  setTopView: (v: TopView) => void,
): void {
  useEffect(() => {
    const urlView = searchParams?.get('view') ?? null;
    if (isValidTopView(urlView) && urlView !== topView) {
      setTopView(urlView);
    }
  }, [searchParams, topView, setTopView]);
}
```

Test `frontend/hooks/__tests__/useSyncTopViewFromUrl.test.tsx`:
```tsx
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSyncTopViewFromUrl } from '../useTopViewFromUrl';

describe('useSyncTopViewFromUrl', () => {
  it('calls setTopView when URL ?view= changes to a different valid view', () => {
    const setTopView = vi.fn();
    const params = new URLSearchParams('view=users');
    renderHook(() => useSyncTopViewFromUrl(params, 'pulse', setTopView));
    expect(setTopView).toHaveBeenCalledWith('users');
  });

  it('does NOT call setTopView when URL view matches current view', () => {
    const setTopView = vi.fn();
    const params = new URLSearchParams('view=pulse');
    renderHook(() => useSyncTopViewFromUrl(params, 'pulse', setTopView));
    expect(setTopView).not.toHaveBeenCalled();
  });

  it('does NOT call setTopView for invalid view names', () => {
    const setTopView = vi.fn();
    const params = new URLSearchParams('view=garbage');
    renderHook(() => useSyncTopViewFromUrl(params, 'pulse', setTopView));
    expect(setTopView).not.toHaveBeenCalled();
  });

  it('handles null searchParams gracefully (no-op)', () => {
    const setTopView = vi.fn();
    renderHook(() => useSyncTopViewFromUrl(null, 'pulse', setTopView));
    expect(setTopView).not.toHaveBeenCalled();
  });
});
```

Run vitest — expect failures.

### Step 3: Implement

**3.1 — Pulse hero swap:**
Modify `frontend/components/DataHub/pulse/PulseView.tsx`. Replace the Active Holders KPICard block (find by `label="Active Holders"`) with:

```tsx
<KPICard
  label="Stitch Coverage"
  value={kpis.stitchPct.value}
  delta={kpis.stitchPct.delta24h}
  deltaPct={kpis.stitchPct.delta24hPct}
  formatValue={(n) => `${n.toFixed(1)}%`}
  icon={<LinkSimple size={11} weight="fill" color={TOKENS.textFaint} />}
  tab={HUB_TABS.PULSE}
  metricId={HUB_METRIC_IDS.PULSE_IDENTITY_LINKS_PCT}
  asOf={lastUpdated?.toISOString() ?? null}
/>
```

Ensure `LinkSimple` is imported from `@phosphor-icons/react` (look at existing import line at top of file).

**3.2 — useTopViewFromUrl hook:**
Create `frontend/hooks/useTopViewFromUrl.ts` with the contents above.

**3.3 — Wire hook into data-hub page:**
In `frontend/app/admin/data-hub/page.tsx`, around line 930 (after `const [topView, setTopView] = useState<TopView>(initialView);`), import and call:
```ts
import { useSyncTopViewFromUrl } from '@/hooks/useTopViewFromUrl';
// ...
useSyncTopViewFromUrl(searchParams, topView, setTopView);
```

### Step 4: Re-run tests — expect green

### Step 5: Adjust PulseView reconciliation badge count assertion

The existing PulseView test asserts `badges.length >= 3` from MR !26. After swapping Active Holders → Stitch Coverage:
- Active Holders was reconciled (in catalog) — removing it drops 1 badge
- Stitch Coverage is NOT in `RECONCILED_METRIC_IDS` (the catalog has only 5: registered/active/aum/openWhales/cohortRetention)

Two options:
- Option A: Add `PULSE_IDENTITY_LINKS_PCT` to `RECONCILED_METRIC_IDS` — only valid if there IS a reconciliation test for stitch%. (Check `src/services/__tests__/reconciliation/` — does identityLinks.test.ts exist? If no, do NOT add it. Badge would be misleading.)
- Option B: Update the badge-count assertion from `>= 3` to `>= 2` (registered + aum still reconciled). Honest representation.

Per the catalog file's existing comment: "Removing an entry silently hides the badge — keep this list in sync with the actual test catalog." Adding stitchPct without a real test would violate this. So go with **Option B** — update assertion to `>= 2` AND in the same PR add a TODO comment in `reconciliationCatalog.ts` noting that `PULSE_IDENTITY_LINKS_PCT` should be added once a `identityLinksPct.test.ts` reconciliation lands.

### Step 6: Sanity gates

```bash
cd frontend && npx vitest run    # expect all green (excluding 3 pre-existing RegisterContent)
cd frontend && npx next build    # expect no TS errors
```

### Step 7: Commit

```bash
git add frontend/components/DataHub/pulse/PulseView.tsx frontend/components/DataHub/pulse/__tests__/PulseView.test.tsx frontend/hooks/useTopViewFromUrl.ts frontend/hooks/__tests__/useSyncTopViewFromUrl.test.tsx frontend/app/admin/data-hub/page.tsx frontend/lib/reconciliationCatalog.ts
git commit -m "feat(hub): pulse hero stitch coverage + url→view sync

MR !27 — Phase 1.6 third fix. Two related findings closed in one PR.

1. HARVEST-016 / HARVEST-015 (Pulse hero recalibration):
   Swap Active Holders → Stitch Coverage on the Pulse hero. Stitch% is
   the load-bearing trust signal (HARVEST-005's Direct caveat is the
   symptom of low stitch%) and was previously buried on Source Attribution
   + Cohorts tabs. Registered Users + AUM remain as the X1 baseline trio
   counterpart. Active Holders still surfaces on Cohorts where M2 drills
   it. This is a 1-card swap — more aggressive M1 recalibration can ship
   in a follow-up after operator behavior shows up in hub_events
   telemetry.

2. HARVEST-006+008 (URL→view sync):
   data-hub/page.tsx computed initialView once at mount; subsequent URL
   ?view= writes (KOL drill, whale row click) updated the URL but the
   page-level topView state didn't react. Extracted the sync logic into
   useSyncTopViewFromUrl hook with isolated tests. Hook subscribes to
   searchParams and updates topView when URL view changes to a different
   valid value.

Also: pulse.identityLinksPct is NOT in the reconciliation catalog because
no identityLinksPct.test.ts exists in src/services/__tests__/reconciliation/.
PulseView test badge-count assertion adjusted from >= 3 to >= 2 to honestly
reflect this. TODO comment added in reconciliationCatalog.ts to add
PULSE_IDENTITY_LINKS_PCT once the reconciliation test ships.

7 files touched, 4 new tests added (hook isolation tests).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

### Step 8: Report DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED

DO NOT:
- Replace all 3 hero KPIs (out of scope — design call for follow-up)
- Add stitchPct to reconciliation catalog without a real test
- Touch backend code
- Refactor surrounding files
- Use --no-verify
- Skip TDD
