# MR !26b: ReconciliationBadge on column headers (Cohorts + Users)

> Sub-skill: superpowers:subagent-driven-development.

**Goal:** Complete HARVEST-021's reconciliation visibility surface. MR !26 wired the badge to KPICards (Pulse). The Cohorts retention W4 column header has a FlagButton but no badge despite being a reconciled metric in the catalog. Extend the badge mount pattern to the two column-header primitives.

**Tech Stack:** React 19, Next.js 16, Vitest, inline styles. NO Tailwind. Phosphor icons.

---

## Task 1: Mount ReconciliationBadge on Cohorts HeaderCell + Users SortableHeader

**Files:**
- Modify: `frontend/app/admin/data-hub/views/CohortsView.tsx` — import ReconciliationBadge, mount next to FlagButton inside `HeaderCell` function (line ~561-565)
- Modify: `frontend/components/DataHub/users/UserListPane.tsx` — import ReconciliationBadge, mount next to FlagButton inside `SortableHeader` function (line ~127-130)
- Modify or create: tests for both

### Design

Both call sites already mount FlagButton conditionally on `col.flagMetricId`. Add `<ReconciliationBadge metricId={col.flagMetricId} />` AS A SIBLING (NOT replacing FlagButton). The badge renders null when not in catalog, so the only visible new affordance ships on Cohorts W4 column. Users `volume`/`value` columns won't badge yet (no reconciliation tests for them).

### Step 1: Read CohortsView HeaderCell + UserListPane SortableHeader

Look at lines 513-580 of CohortsView.tsx and lines 39-140 of UserListPane.tsx to understand the current structure.

### Step 2: Write failing tests

**Test A — Cohorts W4 column shows badge:**

Either extend `frontend/app/admin/data-hub/views/__tests__/CohortsView.test.tsx` if it exists, OR create a small test file. Find or create the existing test pattern by checking sibling tests.

Test name: `renders ReconciliationBadge on the W4 retention column header (catalog member)`. Render CohortsView with mocked hooks (match pattern from existing Cohorts tests). Assert `screen.getByLabelText(/cohorts.retentionWeek4 reconciled against second source/i)` is present.

Negative test: `does NOT render ReconciliationBadge on non-catalog columns` — assert no badge for `activationPct` column (not in catalog).

**Test B — Users column headers (negative coverage):**

In `frontend/components/DataHub/users/__tests__/` (extend existing test or create). Assert: `volume` and `value` columns do NOT have a reconciliation badge (because they're not in the catalog). This locks the intentional absence — if someone later adds these IDs to the catalog without a real recon test, this test will fail and flag the inconsistency.

### Step 3: Run failing tests

```bash
cd frontend && npx vitest run app/admin/data-hub/views/__tests__/CohortsView.test.tsx components/DataHub/users/__tests__/
```

Expected: FAIL on the positive test (badge missing).

### Step 4: Implement

**CohortsView.tsx**: import + mount.

```tsx
import { ReconciliationBadge } from '@/components/DataHub/primitives/ReconciliationBadge';
```

Inside `HeaderCell`, next to the existing `{column.flagMetricId && (<FlagButton ... />)}` block:

```tsx
{column.flagMetricId && (
  <ReconciliationBadge metricId={column.flagMetricId} />
)}
```

Place it BEFORE the FlagButton (so badge sits to the left of the flag affordance — visual order: label, badge, flag). Match the existing inline-style layout idiom.

**UserListPane.tsx**: same pattern — import, mount next to FlagButton in the SortableHeader render loop (~line 127).

### Step 5: Re-run tests — expect green

### Step 6: Sanity gates

```bash
cd frontend && npx vitest run    # expect all green except 3 pre-existing RegisterContent
cd frontend && npx next build    # expect no TS errors
```

### Step 7: Commit

```bash
git add frontend/app/admin/data-hub/views/CohortsView.tsx frontend/app/admin/data-hub/views/__tests__/CohortsView.test.tsx frontend/components/DataHub/users/UserListPane.tsx frontend/components/DataHub/users/__tests__/UserListPane.test.tsx
git commit -m "feat(hub): wire ReconciliationBadge on column headers (Cohorts + Users)

MR !26b — completes HARVEST-021 coverage. MR !26 wired the badge to
KPICards (Pulse). Column headers were left out — now extended via the
same pattern (mount as sibling of FlagButton, guarded by isReconciled).

Visible impact: Cohorts retention W4 column header now shows the ✓
badge (it's in the reconciliation catalog from cohortRetention.test.ts).
Users Volume/Value column headers do NOT show a badge because they
have no reconciliation test yet — negative-case tests pin this
intentional absence so future catalog additions stay honest.

After this MR, the full reconciliation surface is complete: every Hub
cell that's listed in RECONCILED_METRIC_IDS shows the badge.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

### Step 8: Report

DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED + test counts + commit SHA + concerns.

DO NOT:
- Add Users Volume/Value to the reconciliation catalog (no test exists for them)
- Refactor SortableHeader/HeaderCell
- Touch backend code
- Use --no-verify
- Skip TDD steps
