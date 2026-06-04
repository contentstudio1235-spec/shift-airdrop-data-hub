# Users Table Redesign — Implementation Status

**Branch:** `feat/users-table-redesign`
**Date:** 2026-06-04
**Engineer:** Frontend Developer Agent

## Implementation status (T4)

- T1 ✓ UserListRow 8-col grid landed
  - `gridTemplateColumns: '148px 96px 76px 64px 24px 24px 24px 28px'`, `columnGap: 10`
  - X (TwitterLogo), Discord (DiscordLogo), TG (TelegramLogo) as dedicated badge columns
  - All badge cells: `role="img"` + `aria-label` + `aria-hidden` on icon
  - TG permanently dim/regular (no Snag Telegram data — intentional per design doc)
  - Hover uses `TOKENS.tableRowHover`

- T2 ✓ SortableHeader pinned above virtualized list
  - `<button>` elements for VOLUME, LAST SEEN, X, DISCORD with `aria-sort`
  - WALLET rendered as static `<span>` (backend `wallet_alpha` safelist not yet added)
  - `aria-live="polite"` region announces sort direction changes to screen readers
  - Focus ring via `.sh-header-btn:focus-visible` CSS injection
  - `GRID_TEMPLATE` constant shared between header and row — pixel-perfect alignment

- T3 ✓ UsersView filter row redesign
  - Sort `<select>` (SORT_OPTIONS) and direction toggle `<button>` removed entirely
  - Has Social `<select>` added: Any / Has X / Has Discord / Has X + Discord / No social
  - Client-side filter via `useMemo` — no API query change
  - Count shows "N shown (filtered)" when social filter is active
  - Reset button counts `socialFilter !== 'any'` in its N tally
  - Search input `maxWidth` widened from 320 → 360px

- Build: clean
  - Backend `npm run build` → TypeScript clean
  - Frontend `npx next build` → clean, all routes static

- Tests: 80 pass (was 62 baseline, +18 new)
  - UserListRow: 7 tests
  - UserListPane (SortableHeader): 7 tests
  - UsersView (Has Social filter): 4 tests

## Backend safelist follow-up (out of scope this PR)

`wallet_alpha` sort key is NOT in the backend safelist (`src/routes/admin.ts` or wherever
`/api/users` validates `sortBy`). The WALLET column header is currently a static `<span>`.

**To flip WALLET to sortable** once the backend adds `wallet_alpha` to the safelist:
1. In `UserListPane.tsx`, change the WALLET entry in `HEADER_COLUMNS` from:
   `{ key: 'wallet', label: 'Wallet', width: '148px', align: 'left' }`
   to:
   `{ key: 'wallet', label: 'Wallet', width: '148px', align: 'left', sortKey: 'wallet_alpha' }`
2. No other frontend changes needed — the SortableHeader renders a button automatically
   when `sortKey` is defined.

## Known acceptable deviations from design contract

| Deviation | Justification |
|-----------|---------------|
| `font-family: monospace` on WALLET cell applied via inline style string not a TOKENS key | Design doc specifies monospace 13px but TOKENS has no fontFamily token. Used CSS string per inline-style convention. |
| JSDOM color normalization in tests: `#00c896` → `rgb(0, 200, 150)` | Test assertion updated to use regex match. No impact on production rendering. |
| `wallet_alpha` not sortable | Intentional — backend dependency. Static span as specified in design doc blocker note. |
