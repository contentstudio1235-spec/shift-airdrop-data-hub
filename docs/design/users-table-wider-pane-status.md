# Users Table Wider Pane — Implementation Status

**Branch:** `feat/users-wider-pane-cols`
**Spec:** `docs/design/users-table-wider-pane.md`
**Implemented:** 2026-06-04

## Implementation status

- T1 backend ✓ — `firstSeenAt` added to `ProfileSummary` type, `searchProfiles` SELECT, type annotation, and row map. Defensive test added.
- T2 hook ✓ — `firstSeenAt: string` added to frontend `ProfileSummary` interface in `useUsersList.ts`. All test fixtures updated.
- T3 UserListRow 10-col ✓ — Rebuilt to 10-column layout: `240px 160px 92px 80px 80px 56px 28px 28px 28px 32px`. FIRST SEEN, HOLDINGS, wider WALLET/NAME/badge cols all implemented. `GRID_COLUMNS` exported as single source of truth.
- T4 SortableHeader 10-col ✓ — Header rebuilt for 10 columns. HOLD is a sortable `<button>` (`sortKey: 'holdings'`). FIRST SEEN and TG are static `<span>` elements. `GRID_COLUMNS` imported from `UserListRow` (no circular dep). Skeleton rows updated to 10 cells.
- Build clean — `npm run build` (backend tsc): clean. `npx next build` (frontend): clean.
- Tests 86 pass (frontend), 97 pass (backend)
  - Frontend was 80 before; added 6 new tests (UserListRow: firstSeenAt, holdings >0, holdings=0; UserListPane: HOLD sortable, FIRST SEEN static, TG static)
  - Backend was 21 before; added 1 new test (firstSeenAt in returned rows)
- Follow-ups: wallet_alpha sort still not in backend safelist (existing carry-forward from Sprint 2.6). WALLET header renders as static span.
