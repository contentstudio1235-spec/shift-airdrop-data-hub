# MR !25b: UsersView wallet param + view= URL contract

> Sub-skill: superpowers:subagent-driven-development.

**Goal:** Close the Layer C gap surfaced by HARVEST-014/022 re-verification. The chain `WhaleWatch row click → /admin/data-hub?view=users&wallet=ABC → IdentityCard renders for that wallet` is now end-to-end correct except for one component: `UsersView` itself doesn't read `wallet` from URL and writes `tab=users` (still the old contract). Two surgical fixes inside `UsersView`.

**Tech Stack:** React 19, Next.js 16, Vitest, inline styles. NO Tailwind. Read `frontend/AGENTS.md` re Next.js breaking changes before coding.

---

## Task 1: Fix UsersView URL contract + wallet preservation

**Files:**
- Modify: `frontend/components/DataHub/users/UsersView.tsx` (lines 40, 57, 99-132)
- Modify or create: `frontend/components/DataHub/users/__tests__/UsersView.test.tsx`

### Context (verbatim from verification)

> "MR !25 Layer A (whale-row emits `view=users`) and Layer B (`useFilters` preserves `wallet`) both verified working, but IdentityCard never auto-renders because `UsersView` reads only `profileId` from URL (not `wallet`) and its own URL-sync strips `wallet` on in-pane filter change."

Two bugs in `UsersView.tsx`:

1. **Line 101** writes `next.set('tab', 'users')` — should be `view`. The router reads `view=`. Outdated contract.
2. **Lines 40-65** read `profileId`, `q`, `source`, `sortBy`, `sortDir`, `referrer`, `referrerType` from URL — but NOT `wallet`. So a deep-link with `?wallet=X` has nothing to do with it.

### Fix decision (apply this exact approach)

- Add `const initialWallet = params?.get('wallet') ?? null;` near line 40.
- On mount, if `initialWallet` is set AND `initialQuery` is empty, **pre-populate the search box with the wallet** (`q: initialQuery || initialWallet || undefined` at line 58). This re-uses the existing search affordance — UserListPane already searches `q` against wallet/name/socials per the placeholder copy at line 215. The matched profile appears as the only row; user clicks; IdentityCard mounts.
- Line 101: replace `next.set('tab', 'users')` with `next.set('view', 'users')`.
- Lines 112-126 (the foreign-params preservation block): add a section that reads `wallet` from existing URL and preserves it through the writeback. Same shape as the `view` preservation at lines 113-115. **Crucial:** only preserve wallet if `q` is empty or matches wallet — otherwise the user has typed a different search and we shouldn't keep stale wallet in URL.

### Step 1: Write failing tests

In `frontend/components/DataHub/users/__tests__/UsersView.test.tsx` (extend if present), add tests with these names:

- `URL ?wallet=ABC pre-populates the search query on mount`
- `URL writeback emits view=users not tab=users`
- `URL writeback preserves wallet when search query equals wallet`

The mock pattern: see `frontend/components/DataHub/attribution/__tests__/KOLLeaderboard.test.tsx` — it already has a working `vi.mock('next/navigation', ...)`. Match its shape. Use `renderHook` only if needed; for component-render tests use `render` with appropriate hook mocks (useUsersList probably needs mocking — check existing tests in this folder).

Run:
```bash
cd frontend && npx vitest run components/DataHub/users/__tests__/UsersView.test.tsx
```
Expected: FAIL.

### Step 2: Implement the 3 changes in UsersView.tsx

Apply the fix decision above. Show your edits via Edit tool — don't rewrite the whole file.

### Step 3: Re-run tests — expect PASS

### Step 4: Run the full vitest suite + next build

```bash
cd frontend && npx vitest run
cd frontend && npx next build
```

Expected: green (excluding the 3 pre-existing RegisterContent failures noted in MR !25).

### Step 5: Commit

```bash
git add frontend/components/DataHub/users/UsersView.tsx frontend/components/DataHub/users/__tests__/UsersView.test.tsx
git commit -m "fix(hub): UsersView reads wallet URL param + writes view= not tab=

MR !25b — Layer C of the whale-row → IdentityCard drill chain. Closes the
last gap surfaced by docs/qa/2026-06-06-phase1-verification/HARVEST-014-022-whalewatch-RETEST.md.

- UsersView line 101 was still writing tab=users from before the IA migration
  to view= — UsersView's writeback ran AFTER WhaleWatch's correct view= write
  in MR !25, silently reverting the URL on first filter render. Fixed.

- UsersView did not read wallet from URL on mount. Now reads ?wallet=X and
  pre-populates the search query when q is empty — the matching profile
  appears as the only row, click → IdentityCard mounts. Re-uses the existing
  wallet search affordance instead of bolting on a wallet-to-profileId lookup.

- URL writeback now preserves wallet when q matches wallet, otherwise drops
  it (typing a new search shouldn't keep the deep-link wallet stale).

Adds 3 regression tests to lock the contract.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

### Step 6: No explicit vercel deploy

Per MR !25's lesson — the repo-root vercel CLI errors on root dir double-append. Git push to main auto-deploys; that's the canonical path.

### Step 7: Report status

DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED + test counts + commit SHA + any concerns.
