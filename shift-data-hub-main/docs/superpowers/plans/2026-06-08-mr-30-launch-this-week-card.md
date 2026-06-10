# MR !30: HARVEST-001 — "Launch This Week" Pulse card

Synthesizes 4 Agency Agent outputs (Analytics Reporter / UX Researcher / Product Manager / Workflow Architect) into a single shippable PR. Persona harvest score 81 — top of Phase 2. M1's #1 daily question: "How do I track ads + sponsored + KOL?"

## Synthesis decisions (locked)

| Question | Decision | Source |
|---|---|---|
| Primary metric (label) | "CAC" (operator vocabulary) | UX + PM + WA |
| Primary metric (formula) | `spend / count(stitched holders w/ first_trade)` (Analytics Reporter's CPSH) | AR |
| Secondary metrics | Stitch Rate %, Median Hours-to-First-Trade | AR |
| Active-campaign filter | `is_archived = FALSE AND created_at >= date_trunc('week', now())` | AR + PM |
| Confidence gates | paid ≥50 stitched sessions; KOL/affiliate ≥20 holders; organic ≥30; universal ≥3 first-trades for CAC | AR |
| Direct = Unattributed handling | EXCLUDE from ranked list; footer chip surfaces coverage gap | AR (PM concurs via badge) |
| Per-channel attribution coverage | Badge per row + muted CAC when <50% coverage | PM |
| Window | Hardcoded 7d, static badge, no selector | All 3 |
| spend=null fallback | Re-rank by HTFT, show "Add spend →" inline link | AR + UX |
| Card placement on Pulse | Between hero KPI row and AUM sparkline | UX + WA |
| Card shape | Horizontal strip of mini-cards, ranked L-to-R by CAC ascending | UX |
| Drill-down URL | `?view=attribution&source={channel}&fwindow=7d` (KOL: `&referrer={code}&referrerType=snag`) | UX + WA |
| Backend approach | New endpoint `/api/pulse/launch-this-week` (clean separation from existing /attribution) | (this plan) |
| Schema migration | NOT NEEDED — `campaigns.budget_usd` already exists (migration 021) | (discovery) |
| PR scope | One MR, backend + frontend together | PM |
| Card limit | Top 5 ranked + "gathering signal" sub-list | AR + UX |

## Files to change

### Backend (3 files)

1. **`src/types/pulse.ts`** — add `LaunchThisWeekChannel` + `LaunchThisWeekSnapshot` types.

2. **`src/services/launchThisWeekService.ts`** *(NEW)* — query logic:
   - Get active campaigns (this week, not archived)
   - For each `utm_source` from active campaigns: aggregate signups, stitched holders, total sessions, sum(budget_usd)
   - Compute CAC, stitch%, HTFT median
   - Apply per-channel-type confidence gates
   - Exclude `utm_source='direct'`
   - Return `{ rankedChannels, gatheringSignal, coverageOverall, computedAt }`

3. **`src/routes/pulse.ts`** — add `GET /launch-this-week` handler.

### Frontend (4 files; 2 new)

1. **`frontend/types/pulse.ts`** — type sync with backend.

2. **`frontend/hooks/useLaunchThisWeek.ts`** *(NEW)* — fetch hook (60s poll, mirrors `usePulseSnapshot` pattern).

3. **`frontend/components/DataHub/pulse/LaunchThisWeekCard.tsx`** *(NEW)* — horizontal strip:
   - Header: "Launch this week" title + "Last 7d" static badge (right)
   - Channel mini-cards (max 5), each: channel name, CAC value, Stitch %, HTFT median, per-channel coverage badge
   - Each card clickable → drill-down URL (`?view=attribution&source={channel}&fwindow=7d`; KOL variant adds `referrer` + `referrerType`)
   - When `spend=null` per row: dashed "CAC —" + "[Add spend →]" link to UTM admin
   - When coverage < 50% per row: muted CAC + tooltip "CAC may be understated — only X% attributed"
   - Footer: "X of N channels missing spend" (when applicable) + global coverage chip "⚠ Y% of holders unattributed — improve coverage →"
   - Empty state (day 1, no conversions): show configured channels at 40% opacity with "0 signups · awaiting first conversion" + footer "First conversion usually lands 18-36h after launch. Check Source Attribution for traffic →"
   - Truly-empty state (no active campaigns): hide the card OR show explicit "No active campaigns this week. Launch one via Engineering → UTM →"
   - `role="list"` on strip; `aria-live="polite"` for rank changes

4. **`frontend/components/DataHub/pulse/PulseView.tsx`** — mount the card between line 168 (hero KPI grid end) and line 171 (twoCol AUM+Signups).

## Out of scope (V2 / follow-ups)

- Inline spend editor (V1: deep-link to UTM admin)
- Auto-spend ingestion (V2: CSV import; V3: ad platform APIs)
- ROI column (revenue/spend — revenue attribution path not fully wired)
- Drill-down panel from card row (V1: full nav to Source Attribution)
- Campaign Actions panel (`POST /admin/campaigns/:id/state`)
- Hero recalibration (HARVEST-016, separate PR)
- UTM coverage remediation surface (HARVEST-002, separate PR)
