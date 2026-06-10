# Universal Identity UI — Sub-Sprint 2.2 Plan

> For agentic workers: REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Execute each task in an isolated agent thread, return diffs, and only proceed when the previous task is verified.

**Plan ID:** `2026-06-03-universal-identity-users-page-ui`
**Spec:** `docs/superpowers/specs/2026-06-03-universal-identity-users-page-design.md` (§8)
**Predecessor:** `docs/superpowers/plans/2026-06-03-universal-identity-backend.md` (Sub-Sprints 2.0 + 2.1, shipped via PR #2)
**Repository:** `Shift-Airdrop-Backend`
**Branch:** `feat/universal-identity-users-page` (existing — backend merged from this branch via PR #2; rebase onto `origin/main` first, then continue UI work)

---

## Goal

Ship the Users page UI consuming the 10 backend endpoints from Sub-Sprint 2.1. Add a 5th "Users" tab to `layout-shell.tsx`. Build the 2-pane layout per spec §8.2 (40% virtualized list / 60% detail). Wire deep-linking from every wallet display in the Data Hub.

---

## Architecture

A single `UsersView` orchestrates a filterable, virtualized list (react-window) and a detail pane composed of 4 cards (Identity / Source Attribution / Lifetime Stats / Timeline). State lives in 4 hooks — `useUsersList`, `useUserProfile`, `useUserTimeline`, `useIdentityActions` — each wrapping a thin slice of `apiGet` / `apiPost` / `apiPatch` / `apiDelete`. Mutations use optimistic UI with rollback on 4xx/5xx (the conflict path on `POST /links` returns 409 with a `suggestion: 'merge'` payload that flips the AddLinkDialog into a Merge confirmation).

---

## Tech Stack

Next.js 16, React 19, framer-motion (already installed), `react-window` (NEW), `@phosphor-icons/react`, inline-style React (NO Tailwind), vitest + Testing Library. Existing design tokens in `frontend/lib/chartTokens.ts` (TOKENS, MOTION, thresholdColor). Existing primitives in `frontend/components/DataHub/primitives/` (Card, ChartFrame, ThresholdPill, EmptyState, BigNumber, Sparkline).

---

## Endpoint Shapes (verified from shipped backend)

```
GET    /api/users?page=&pageSize=&source=&stitchPctMin=&walletSizeMin=&activitySince=&q=
       → { rows: ProfileSummary[], total, page, pageSize }
GET    /api/users/search?q=          → { rows: ProfileSummary[] }  // max 25
GET    /api/users/:profileId          → ProfileWithLinks | 404
GET    /api/users/:profileId/timeline?limit=30&before=ISO
       → { entries: TimelineEntry[] }
GET    /api/users/:profileId/positions?status=open|closed|all
       → { positions: [...] }
POST   /api/users/:profileId/links               body { type, value, confidence?, evidence? }
       → 201 IdentityLink | 409 { error:'identity_conflict', existingProfileId, suggestion:'merge' }
DELETE /api/users/:profileId/links/:linkId       body { reason }    → { unlinkedAt }
POST   /api/users/:profileId/merge               body { loserProfileId, reason } → Profile | 404 | 400
PATCH  /api/users/:profileId/primary-wallet      body { wallet }    → ProfileWithLinks | 400
POST   /api/users/:profileId/forget              body { reason }    → { forgottenAt }

ProfileSummary  = { profileId, primaryWallet, displayName, lastSeenAt, firstUtmSource, stitchedPct (0-100), lifetimeVolumeUSD }
ProfileWithLinks = Profile + { links: IdentityLink[], lifetimeStats?: { xp, volumeUSD, positions, badges } }
TimelineEntry   = { id, eventName, occurredAt, source, asset, valueUSD, payload }
```

All requests require `x-admin-key: ShiftRwa2026@@$$Key`. Already injected by `apiGet` in `frontend/lib/api.ts`; new helpers must do the same.

---

## File Structure

### New files (under `frontend/`)

```
app/admin/data-hub/views/
  UsersView.tsx                      # replace placeholder; orchestrator

components/DataHub/users/
  UserListPane.tsx                   # virtualized list + pagination footer
  UserListRow.tsx                    # one row, threshold pill, click handler
  UserDetailPane.tsx                 # composes 4 cards + empty state
  IdentityCard.tsx                   # linked identities table + Add/Merge buttons
  SourceAttributionCard.tsx          # first-touch + last-touch UTMs + lock state
  LifetimeStatsCard.tsx              # xp / volume / positions / badges
  TimelineCard.tsx                   # 30-event feed with "load more"
  TimelineEntry.tsx                  # one event row with icon + relative time
  AddLinkDialog.tsx                  # modal: type select + value + confidence + evidence
  MergeProfilesDialog.tsx            # modal: search-by-wallet + reason
  UnlinkDialog.tsx                   # modal: confirm + reason
  ForgetUserDialog.tsx               # modal: type-wallet-to-confirm + reason

hooks/
  useUsersList.ts                    # paginated list + filters + debounced search
  useUserProfile.ts                  # detail fetcher, aborts on profileId change
  useUserTimeline.ts                 # timeline fetcher with cursor pagination
  useIdentityActions.ts              # 5 mutations + optimistic UI + rollback

lib/
  navigation.ts                      # linkToProfile(walletOrProfileId) deep-link helper
```

### Modified files

```
app/admin/data-hub/layout-shell.tsx  # add UserCircle tab; widen TopView union
app/admin/data-hub/page.tsx          # route 'users' → <UsersView />
lib/api.ts                           # add apiPost, apiPatch, apiDelete + ApiError class
```

---

## Constraints

- Use design tokens from `chartTokens.ts` (TOKENS, MOTION) — no inline hex outside tokens
- Reuse `Card`, `ChartFrame`, `ThresholdPill`, `EmptyState` primitives — do NOT reinvent
- Every file starts with `"use client";`
- Inline-style React, NO Tailwind, NO emoji (Phosphor icons only)
- `react-window` for the list (10K+ rows expected; backend confirms 15,455 users today)
- Default landing tab stays `'raw'`; existing 4 tabs are unchanged; Users inserts at position 4 (between Trader Cohorts and Raw Data, per spec §8.1)
- All mutation paths write `admin_logs` server-side; the UI MUST NOT optimistically claim success without server confirmation for `forget` / `merge`
- `frontend/AGENTS.md` rule applies: this is Next 16 with breaking changes — read `node_modules/next/dist/docs/` before any non-trivial Next-API usage

---

## Tasks

### Task 1 — `frontend-design` + `taste-skill` design pass (MANDATORY, blocking)

**Skills:** `frontend-design`, then `taste-skill` (both ABSOLUTE-RULE per CLAUDE.md).

Inputs to `frontend-design`:
- The §8.2 ASCII layout from the spec
- Token file `frontend/lib/chartTokens.ts`
- Endpoint shapes above
- Constraint: "no emoji, no AI-slop, Phosphor icons, glassmorphism panels at rgba(8,18,14,0.9) with 12px blur, single accent #00c896"

Deliverable: `docs/design/sprint-2-users-page-design.md` with:
- Pixel-accurate 2-pane grid spec (40/60 split, 56px filter row, footer 48px)
- List row anatomy (wallet | display name | volume | last-seen | stitch pill — exact widths)
- Detail pane card stack order + spacing tokens
- Dialog spec for AddLink / Merge / Unlink / Forget (modal width, button order, destructive-action styling)
- Empty/error/loading states for both panes
- Phosphor icon map for TimelineEntry event types

Then invoke `taste-skill` against the produced spec. Fix every flag (anti-emoji, motion discipline ≤ 400ms, no gratuitous gradients, no glow on text, threshold pill at 8px only). Re-save the spec.

**Commit:** `docs(design): Sprint 2 Users page design spec + taste audit`

---

### Task 2 — Install `react-window`

```bash
cd frontend
npm install react-window @types/react-window
```

Verify in `frontend/package.json`. No code changes yet.

**Commit:** `chore(deps): react-window for virtualized Users list`

---

### Task 3 — Add mutation helpers to `frontend/lib/api.ts`

Append after the existing `apiGet` (keep `apiGet` unchanged):

```typescript
// ── Admin mutations (POST / PATCH / DELETE) ────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    public body: any,
  ) {
    super(`API ${path} → ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.name = 'ApiError';
  }
}

async function apiMutate<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  opts: { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
    signal: opts.signal,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) throw new ApiError(res.status, path, parsed);
  return parsed as T;
}

export const apiPost   = <T>(p: string, b?: unknown, o?: { signal?: AbortSignal }) => apiMutate<T>('POST',   p, b, o);
export const apiPatch  = <T>(p: string, b?: unknown, o?: { signal?: AbortSignal }) => apiMutate<T>('PATCH',  p, b, o);
export const apiDelete = <T>(p: string, b?: unknown, o?: { signal?: AbortSignal }) => apiMutate<T>('DELETE', p, b, o);
```

**TDD:** add `frontend/lib/__tests__/api-mutations.test.ts` with 4 tests:
1. `apiPost` sends `x-admin-key` header
2. `apiPatch` serializes body as JSON
3. `apiDelete` throws `ApiError` with status + parsed body on 409
4. `ApiError.body.error === 'identity_conflict'` for the conflict-payload contract

Use `vi.stubGlobal('fetch', vi.fn())`.

**Commit:** `feat(api): apiPost / apiPatch / apiDelete with ApiError typed body`

---

### Task 4 — Add Users tab to `layout-shell.tsx`

Edit `frontend/app/admin/data-hub/layout-shell.tsx`:

1. Import `UserCircle` from `@phosphor-icons/react` alongside the existing icons.
2. Widen the `TopView` union to include `'users'`.
3. Insert into `TABS` between `'cohorts'` and `'raw'`:

```typescript
{ id: 'users', label: 'Users', Icon: UserCircle },
```

No other changes. The header layout, accent colors, and FilterBar mount stay identical.

**Commit:** `feat(layout): add Users tab between Cohorts and Raw Data`

---

### Task 5 — `useUsersList` hook (TDD)

`frontend/hooks/useUsersList.ts`:

```typescript
"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface UsersListFilters {
  q?: string;
  source?: string;
  stitchPctMin?: number;
  walletSizeMin?: number;
  activitySince?: string; // ISO
}

export interface ProfileSummary {
  profileId: string;
  primaryWallet: string;
  displayName: string | null;
  lastSeenAt: string;
  firstUtmSource: string | null;
  stitchedPct: number;        // 0-100
  lifetimeVolumeUSD: number;
}

interface UsersListResponse {
  rows: ProfileSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export function useUsersList(filters: UsersListFilters, page: number, pageSize = 50) {
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNow = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<UsersListResponse>('/api/users', {
        signal: ctl.signal,
        query: { ...filters, page, pageSize } as Record<string, string | number | undefined>,
      });
      if (!ctl.signal.aborted) setData(result);
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [JSON.stringify(filters), page, pageSize]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchNow, filters.q ? 250 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [fetchNow, filters.q]);

  return { data, loading, error, refetch: fetchNow };
}
```

**TDD:** `frontend/hooks/__tests__/useUsersList.test.ts`:
1. Initial render → `loading=true`, fires `GET /api/users?page=1&pageSize=50`
2. Filter `q` debounces 250ms (advance timers, assert single fetch)
3. Pagination triggers immediate refetch (no debounce)
4. Aborts in-flight on filter change
5. Mock `apiGet` resolved value matches the contract `{ rows, total, page, pageSize }`

**Commit:** `feat(hooks): useUsersList — paginated profile fetch with debounced search`

---

### Task 6 — `useUserProfile` + `useUserTimeline` hooks (TDD)

`frontend/hooks/useUserProfile.ts`:

```typescript
"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface IdentityLink {
  linkId: string;
  type: 'wallet' | 'ga_client_id' | 'snag_user_id' | 'social_x' | 'social_discord' | 'social_telegram';
  value: string;
  confidence: 'deterministic' | 'probabilistic' | 'manual';
  linkedAt: string;
  linkedBy: string;
  unlinkedAt: string | null;
}

export interface ProfileWithLinks {
  profileId: string;
  primaryWallet: string;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  lastUtmSource: string | null;
  lastUtmMedium: string | null;
  lastUtmCampaign: string | null;
  attributionLockedAt: string | null;
  links: IdentityLink[];
  lifetimeStats?: { xp: number; volumeUSD: number; positions: number; badges: number };
}

export function useUserProfile(profileId: string | null) {
  const [data, setData] = useState<ProfileWithLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchNow = useCallback(async () => {
    if (!profileId) { setData(null); return; }
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<ProfileWithLinks>(`/api/users/${profileId}`, { signal: ctl.signal });
      if (!ctl.signal.aborted) setData(result);
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchNow(); return () => abortRef.current?.abort(); }, [fetchNow]);
  return { data, loading, error, refetch: fetchNow };
}
```

`frontend/hooks/useUserTimeline.ts` — same pattern, hits `/api/users/:profileId/timeline?limit=30`, exposes `loadMore(beforeISO)` that appends.

**TDD:** 3 tests per hook — initial load, aborts on profileId change, null profileId is a no-op.

**Commit:** `feat(hooks): useUserProfile + useUserTimeline with abort on id change`

---

### Task 7 — `useIdentityActions` hook (TDD)

`frontend/hooks/useIdentityActions.ts` wraps the 5 mutation endpoints. Public surface:

```typescript
addLink(profileId, { type, value, confidence?, evidence? })  → IdentityLink | { conflict: { existingProfileId } }
unlinkIdentity(profileId, linkId, reason)                    → { unlinkedAt }
mergeProfiles(winnerId, loserId, reason)                     → Profile
setPrimaryWallet(profileId, wallet)                          → ProfileWithLinks
forgetUser(profileId, reason)                                → { forgottenAt }
```

Each method returns a discriminated union `{ ok: true; data: T } | { ok: false; error: ApiError }`. On 409 from `addLink`, the hook returns `{ ok: false, error }` and the dialog reads `error.body.existingProfileId` to offer the merge path.

No optimistic mutation here — destructive ops MUST await server confirmation. Caller refetches profile after success.

**TDD:** `frontend/hooks/__tests__/useIdentityActions.test.ts`:
1. `addLink` 201 returns `{ ok: true, data: IdentityLink }`
2. `addLink` 409 returns `{ ok: false, error: ApiError }` with `error.body.existingProfileId`
3. `mergeProfiles` 400 surfaces error
4. `forgetUser` requires non-empty reason (client-side guard throws before fetch)
5. `setPrimaryWallet` PATCHes correct body

**Commit:** `feat(hooks): useIdentityActions — 5 mutation wrappers with typed conflict path`

---

### Task 8 — `UserListPane` + `UserListRow` (virtualized)

`frontend/components/DataHub/users/UserListRow.tsx` (pure-visual, NO tests per Sprint 1 pattern):

- Props: `{ row: ProfileSummary; isSelected: boolean; onClick: () => void; style: React.CSSProperties }` (style is required for react-window)
- Layout: 4 columns — wallet (truncated `XXXX...XXXX`), display name fallback to "—", lifetime volume (use `fmtUSD` from `page.tsx` — extract to `frontend/lib/format.ts` in this task), relative last-seen
- 8px threshold pill using `thresholdColor(stitchedPct, { red:0, yellow:50, green:80 })`
- Selected row: `background: TOKENS.accentDim`, left border 2px `TOKENS.accent`
- Height 56px, hover `transition: all 120ms ease-out`

`frontend/components/DataHub/users/UserListPane.tsx`:

```typescript
"use client";
import { FixedSizeList } from 'react-window';
import { UserListRow } from './UserListRow';
// ...
const ROW_HEIGHT = 56;

export function UserListPane({ rows, total, page, pageSize, selectedId, onSelect, onPageChange, loading }: Props) {
  // height = container height minus 48px footer
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FixedSizeList
          height={/* measured */ 600}
          itemCount={rows.length}
          itemSize={ROW_HEIGHT}
          width="100%"
        >
          {({ index, style }) => (
            <UserListRow
              row={rows[index]}
              isSelected={rows[index].profileId === selectedId}
              onClick={() => onSelect(rows[index].profileId)}
              style={style}
            />
          )}
        </FixedSizeList>
      </div>
      <PaginationFooter total={total} page={page} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
```

Use a `ResizeObserver` (via small inline hook) to measure pane height so `react-window` gets accurate `height`.

**Note (Next 16):** consult `node_modules/next/dist/docs/` before any Server Component boundary changes. `UserListPane` and `UserListRow` are client components.

**Commit:** `feat(users): virtualized UserListPane + UserListRow with threshold pill`

---

### Task 9 — `UserDetailPane` composition

`frontend/components/DataHub/users/UserDetailPane.tsx`:

- Props: `{ profileId: string | null }`
- Calls `useUserProfile(profileId)` + `useUserTimeline(profileId)`
- Empty state (no profileId): `<EmptyState icon={UserCircle} title="Select a user" body="Pick a row from the list to inspect identity, attribution, and timeline." />`
- Loading state: skeleton cards (4 stacked `<Card />` primitives with shimmer)
- Error state: red `<Card />` with retry button → `refetch()`
- Loaded: stacked cards in order — `IdentityCard`, `SourceAttributionCard`, `LifetimeStatsCard`, `TimelineCard`. 16px gap between cards.

Header strip at top of pane: primary wallet (full), `fmtWallet` truncation toggle on click, copy-to-clipboard button (Phosphor `Copy` icon), display name editable inline (writes via `useIdentityActions.setDisplayName` — NOT in scope yet, leave the input read-only with a TODO comment).

**Commit:** `feat(users): UserDetailPane composing 4 cards + header strip`

---

### Task 10 — `IdentityCard`

`frontend/components/DataHub/users/IdentityCard.tsx`:

- Table of `links: IdentityLink[]` with columns: type (Phosphor icon + label), value (truncated for wallets), confidence (small pill: deterministic = green, probabilistic = yellow, manual = blue), linked-at relative time, actions (Unlink button → opens `UnlinkDialog`)
- Header row buttons: "Add Link" (opens `AddLinkDialog`), "Merge" (opens `MergeProfilesDialog`), "Set Primary Wallet" (only enabled when ≥ 2 wallet links — opens a small dropdown of wallet values, calls `setPrimaryWallet`)
- Confidence pill colors come from TOKENS.threshold; do NOT introduce a new color

Icon map (define inside this file as a const):
```typescript
const IDENTITY_ICONS = {
  wallet: Wallet,
  ga_client_id: ChartLineUp,
  snag_user_id: Trophy,
  social_x: TwitterLogo,
  social_discord: DiscordLogo,
  social_telegram: TelegramLogo,
};
```

**Commit:** `feat(users): IdentityCard — links table + Add/Merge/SetPrimary actions`

---

### Task 11 — `SourceAttributionCard`

Two-column grid (first-touch vs last-touch). Each column shows:
- UTM source / medium / campaign / content / term (faint "—" if null)
- Referrer + landing path
- For first-touch: lock badge if `attributionLockedAt !== null`, with relative timestamp ("locked 3 days ago")

If `firstUtmSource === 'unknown_legacy'` (backfill marker), render a yellow info badge: "Legacy user — pre-tracking acquisition".

**Commit:** `feat(users): SourceAttributionCard — first/last-touch UTMs + lock state`

---

### Task 12 — `LifetimeStatsCard`

4 `BigNumber` primitives in a 2x2 grid:
- XP (no formatting)
- Lifetime Volume (fmtUSD)
- Positions count
- Badges count

If `lifetimeStats` is `undefined` (backend optional), render `EmptyState` "No on-chain activity yet".

**Commit:** `feat(users): LifetimeStatsCard — 2x2 BigNumber grid`

---

### Task 13 — `TimelineCard` + `TimelineEntry`

`TimelineCard` shows up to 30 entries from `useUserTimeline`. Has a "Load older" button at bottom that calls `loadMore(oldestEntry.occurredAt)`.

`TimelineEntry` icon map (Phosphor):
```typescript
const EVENT_ICONS = {
  position_open: TrendUp,
  position_close: TrendDown,
  badge_earn: Trophy,
  snag_link: LinkSimple,
  wallet_connect: Wallet,
  landing: Eye,
  utm_touch: MagnifyingGlass,
  gdpr_forget: ShieldWarning,
  identity_merge: ArrowsMerge,
  identity_link: LinkSimple,
  identity_unlink: LinkBreak,
};
```

Each row: icon (24px) | event name in human English | source pill (faint) | asset + valueUSD (right-aligned) | relative time. Source pill maps `helius` / `snag` / `ga4` / `system` / `manual` (admin actor). `payload` is hidden by default; click row to expand a `<pre>` JSON view (max-height 200px, overflow scroll).

**Commit:** `feat(users): TimelineCard + TimelineEntry with event-type icon map`

---

### Task 14 — `AddLinkDialog`

Modal form (centered overlay, 480px wide, glassmorphism panel, ESC closes, click-outside closes):
- `type` select: wallet | ga_client_id | snag_user_id | social_x | social_discord | social_telegram
- `value` text input — placeholder + format hint per type
- `confidence` select: deterministic | probabilistic | manual (default `manual` from this UI)
- `evidence` textarea (required if confidence === 'manual')
- Submit → `useIdentityActions.addLink(profileId, payload)`
- On 409: flip the modal into a "Conflict" state showing `existingProfileId` with two buttons: "Cancel" or "Merge into existing" (opens `MergeProfilesDialog` pre-filled with `loserProfileId = profileId, winnerId = existingProfileId`)
- On 201: close modal + refetch profile

No tests (UI modal — manual QA path covers it).

**Commit:** `feat(users): AddLinkDialog with 409 conflict → merge handoff`

---

### Task 15 — `MergeProfilesDialog`

Modal:
- Winner profile = current profile (display read-only header)
- Loser profile selector: wallet input → debounced `GET /api/users/search?q=` (max 25 results) → click row to pick → show selected profile summary
- `reason` textarea (required, min 10 chars)
- Confirm button is destructive-styled (red border, hover red fill) and disabled until both fields valid
- On submit → `mergeProfiles(winnerId, loserId, reason)` → close + refetch + show toast "Merged X into Y"

**Commit:** `feat(users): MergeProfilesDialog with debounced search + reason gate`

---

### Task 16 — `UnlinkDialog` + `ForgetUserDialog`

`UnlinkDialog`: small confirm (320px), shows the link being removed, requires `reason` (min 10 chars), destructive button.

`ForgetUserDialog`: hard confirm. Requires:
1. Typing the full primary wallet into a confirmation input (case-sensitive match)
2. `reason` (min 20 chars)
3. Red banner explaining: "This nullifies identifiable columns and deletes identity_links. Profile row + attribution_events are retained anonymized for analytics."
4. Submit only enabled when wallet matches AND reason is valid
5. On success → close pane (clear selectedId) + refetch list + toast

**Commit:** `feat(users): UnlinkDialog + ForgetUserDialog with hard-confirm gates`

---

### Task 17 — Deep-linking helper + integration

`frontend/lib/navigation.ts`:

```typescript
"use client";
import { useSearchParams, useRouter } from 'next/navigation';

export function linkToProfile(walletOrProfileId: string): string {
  // walletOrProfileId can be either; UsersView resolves via search-by-wallet
  return `/admin/data-hub?tab=users&profile=${encodeURIComponent(walletOrProfileId)}`;
}

export function useProfileDeepLink() {
  const params = useSearchParams();
  const router = useRouter();
  const profile = params.get('profile');
  const setProfile = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set('profile', id); else next.delete('profile');
    router.replace(`?${next.toString()}`, { scroll: false });
  };
  return { profile, setProfile };
}
```

Wire into `UsersView` so the selected `profileId` is mirrored in the URL. On mount, if `profile` is a wallet (not UUID), call `GET /api/users/search?q=<wallet>` and pick the first match.

Sweep these existing files for wallet cells and wrap them with `<a href={linkToProfile(wallet)}>` (style: `color: TOKENS.accent`, no underline, hover underline):
- `frontend/components/DataHub/funnels/*.tsx` (drill-down rows that surface a wallet)
- `frontend/components/DataHub/RealtimeLedger.tsx`
- Any wallet display inside `RawDataView.tsx`

For Funnels view and Attribution view rows that don't currently show a wallet, no change.

**Commit:** `feat(users): deep-linking — linkToProfile helper + wallet cell wraps`

---

### Task 18 — `UsersView` composition

`frontend/app/admin/data-hub/views/UsersView.tsx`:

- Filter row (sticky, 56px): search box (binds to `filters.q`), source select (populated from a static list for now: organic, x, discord, telegram, kol, referral, unknown_legacy), stitch% min slider, wallet size min input, activity since date picker, Reset button (only visible when any filter is set)
- 2-pane grid: `display: 'grid'; gridTemplateColumns: '40% 60%'; gap: 16; height: 'calc(100vh - 56px - 56px - 24px)'` (viewport minus header minus filter minus padding)
- Left: `<UserListPane ...>`
- Right: `<UserDetailPane profileId={selectedId} />`
- `useProfileDeepLink` syncs URL ↔ selectedId
- `useUsersList` drives the list
- On detail-pane mutations: refetch list (so the row reflects new state, e.g. updated stitchedPct after AddLink)

**Commit:** `feat(users): UsersView orchestrator with filter row + 2-pane grid`

---

### Task 19 — Route `'users'` in `page.tsx`

Edit `frontend/app/admin/data-hub/page.tsx`:

1. Import `UsersView` from `./views/UsersView`
2. Add the case in the existing view switch:

```typescript
case 'users':
  return <UsersView />;
```

3. The default landing tab MUST remain `'raw'` per the constraint. Do not change the initial state.

**Commit:** `feat(users): mount UsersView at the users tab`

---

### Task 20 — Final verification, tag, merge

1. `cd frontend && npx next build` — must complete clean (strict TS)
2. `cd frontend && npx vitest run` — all tests pass (existing 14 from Sprint 1 + ~14 new)
3. Manual smoke test on Vercel preview:
   - Open `/admin/data-hub`, click Users tab
   - Search "ABC" → list debounces + filters
   - Click row → detail loads < 500ms
   - Add Link with intentional conflict → modal flips to merge prompt
   - Merge with valid reason → list refetches, row removed
   - Forget user with wallet-match gate → row disappears, detail empties
   - From Funnels view, click any wallet → lands on Users tab with that profile pre-selected
4. `cd frontend && npx vercel deploy --prod --yes`
5. Verify production: `https://shift-airdrop-data-hub.vercel.app/admin/data-hub` Users tab loads
6. Tag: `git tag sprint-2-2-users-ui && git push --tags`
7. Open PR `feat/universal-identity-users-page` → `main` with body referencing the spec and this plan; merge once green
8. After merge, sprint exits when all §12 acceptance criteria 9-12 in the spec are checked

**Commit:** `chore(release): sprint-2-2 Users page UI shipped`

---

## Test Inventory

| File | Tests | Type |
|---|---|---|
| `frontend/lib/__tests__/api-mutations.test.ts` | 4 | unit |
| `frontend/hooks/__tests__/useUsersList.test.ts` | 5 | unit (hook) |
| `frontend/hooks/__tests__/useUserProfile.test.ts` | 3 | unit (hook) |
| `frontend/hooks/__tests__/useUserTimeline.test.ts` | 3 | unit (hook) |
| `frontend/hooks/__tests__/useIdentityActions.test.ts` | 5 | unit (hook) |

Total new: ~20. No tests for pure-visual components (Card / Pane / Dialog) per the Sprint 1 pattern. Target total frontend suite: 14 + 20 = 34, exceeding spec §12 criterion 14 (≥ 18).

---

## Rollback Plan

If Vercel preview shows a regression in Funnels / Attribution / Cohorts / Raw Data (the existing 4 tabs), revert the merge commit on `feat/universal-identity-users-page`. The backend (already on main) is unaffected — the 10 endpoints stay live. UI work is fully additive: no modifications to existing view components except adding `<a href={linkToProfile(...)}>` wraps, which can be selectively reverted per file.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `react-window` SSR boundary issues in Next 16 | Medium | Medium | Components are `"use client"`; verify `next build` succeeds before merge |
| Deep-link wallet → profile lookup adds latency | Low | Low | Cache `wallet → profileId` resolution in `sessionStorage` for the session |
| Filter UI doesn't match `frontend-design` output | Medium | Low | Task 1 is blocking; design spec must be merged before Task 18 |
| Forget user gate is bypassable | Low | Critical | Wallet-match check is case-sensitive; server still requires admin key + writes audit log |
| `apiPost` 409 contract drift | Low | High | Contract test in `api-mutations.test.ts` asserts `error.body.error === 'identity_conflict'` |

---

## References

- Spec: `docs/superpowers/specs/2026-06-03-universal-identity-users-page-design.md` (§8 covers UI scope)
- Backend plan: `docs/superpowers/plans/2026-06-03-universal-identity-backend.md`
- Sprint 1 plan (pattern reference): `docs/superpowers/plans/2026-06-03-funnel-platform-sprint-1-funnels-view.md`
- Tokens: `frontend/lib/chartTokens.ts`
- API client: `frontend/lib/api.ts`
- Existing layout: `frontend/app/admin/data-hub/layout-shell.tsx`
- Existing views: `frontend/app/admin/data-hub/views/{Funnels,Attribution,Cohorts,RawData}View.tsx`
- Next 16 docs (MANDATORY before non-trivial Next API usage): `frontend/node_modules/next/dist/docs/`

---

*End of Sub-Sprint 2.2 plan. Ready for `superpowers:subagent-driven-development` execution.*
