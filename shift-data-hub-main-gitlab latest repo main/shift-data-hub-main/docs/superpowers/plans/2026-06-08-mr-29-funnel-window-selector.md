# MR !29: Funnel time-window selector (F1)

**HARVEST-003 fix; Phase 2 unblocking.** Synthesizes three Agency Agent outputs (Analytics Reporter / UX Researcher / Product Manager) into a single shippable PR.

## Synthesis decisions (locked)

| Question | Decision | Source |
|---|---|---|
| Window options | `7d / 30d / 90d / all` | All 3 agents |
| Default | `30d` | AR + UX (PM dissented; absorbed via UX's hint pattern) |
| Cohort window vs conversion budget | One selector; budget == cohort window; implicit | Analytics Reporter |
| Confidence gate threshold | n < 100 grayed (matches Cohorts skill) | UX (n<30 was too loose) |
| Apply to | All 3 funnels rendered in FunnelsView | PM explicit; AR/UX implicit |
| URL contract | `?fwindow=30d`, joins FOREIGN_PARAMS allowlist | UX Researcher |
| Persistence across views | Pulse/Cohorts ignore; Funnels/Sources/Users respect | UX Researcher |
| AnomalyCallout copy | Auto-recompute per window with assumption disclosure | AR + UX merged |
| First-3-loads hint | "Now showing last 30 days. View all-time →" via localStorage counter | UX Researcher |
| Persistent label | "Showing: Last 30 days" chip next to funnel title | PM Researcher |
| Reconciliation backend check | DEFERRED to follow-up MR | (this plan, "don't gold-plate") |
| Sequencing | Single PR, backend + frontend together | PM (Phase 1 split caused half-shipped) |

## Files to change

### Backend (1 file)

**`src/lib/queryParams.ts`** — add `fwindow` derivation
- Recognize whitelisted values `7d | 30d | 90d | all`
- If `fwindow` set AND != `all`, derive `from = (NOW - N days).toISOString()` and assign to `parsed.from`
- If `fwindow=all`, leave `from` unset (no filter)
- Explicit `from` in query still wins over `fwindow`-derived from (backward compat for already-shared dated URLs)
- No changes to `funnelService.ts` — existing SQL already handles `$1::timestamp IS NULL OR created_at >= $1`

### Frontend (5 files; 1 new)

1. **`frontend/hooks/useFilters.ts`** — add `fwindow?: '7d' | '30d' | '90d' | 'all'` to `Filters`; parse + serialize in helpers.

2. **`frontend/components/DataHub/funnels/FunnelWindowSelector.tsx`** *(NEW)* — segmented control. Inline styles, accent `#00c896`. Props: `value`, `onChange`. Renders 4 pills.

3. **`frontend/app/admin/data-hub/views/FunnelsView.tsx`** — wire selector:
   - Default: useEffect on mount sets `fwindow='30d'` if undefined
   - Place `<FunnelWindowSelector>` in `ChartFrame.rightActions` (alongside `FunnelSelector`)
   - Add `"Showing: Last 30 days"` chip in subtitle
   - First-3-loads hint via `localStorage` key `funnels-window-hint-loads`
   - AnomalyCallout copy uses dynamic `{windowLabel}` and `{revenueWindowLabel}` per synthesis template
   - Per-step confidence gate: when `step.count < 100`, override the displayed step with grayed style + "Insufficient signal — n={count}" label (handled in the rendered AnomalyCallout fallback; deeper AnimatedFunnel work deferred to v2)

4. **`frontend/hooks/__tests__/useFilters.test.tsx`** — round-trip test: setting `fwindow=30d` writes to URL, reading from URL parses correctly, foreign-params survive.

5. **`frontend/lib/format.ts`** *(if not present)* — add `windowLabel()` helper. Skip if already exists.

## Implementation order (TDD-ish)

1. Write failing useFilters test for fwindow round-trip → run vitest → expect FAIL
2. Update useFilters.ts → re-run → expect PASS
3. Create FunnelWindowSelector.tsx
4. Update FunnelsView.tsx (default, integration, copy update, hint, confidence gate)
5. Update queryParams.ts (backend)
6. Run all tests: `cd frontend && npx vitest run` + backend `npm test`
7. Build: `npx next build` (frontend) + `npm run build` (backend)
8. Dispatch Code Reviewer agent for review
9. Commit + push to GitLab `main`
10. Trigger Render deploy + Vercel deploy

## Out of scope (V2 / follow-up MRs)

- Per-funnel window memory (currently global to all 3 funnels)
- Comparison mode (30d vs prior 30d delta)
- Window selector on WhaleWatch + other surfaces
- Backend reconciliation: `sum(daily buckets) == all-time ± 0.5%`
- AnimatedFunnel internal small-N visual treatment (per-bar grayed)
- HARVEST-024 per-persona default landing hook
