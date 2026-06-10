# Universal Identity Layer + Users Page — Sprint 2 Design Spec

**Spec ID:** `2026-06-03-universal-identity-users-page-design`
**Author:** Claude (Opus 4.7) for Tomer
**Status:** Draft — awaiting review
**Target system:** `https://shift-airdrop-data-hub.vercel.app/admin/data-hub` + backend at `https://shift-airdrop-backend.onrender.com`
**Repository:** `Shift-Airdrop-Backend`
**Branch:** `feat/universal-identity-users-page` (created off `main` after Sprint 1 merge)

---

## 1. Problem Statement

Sprint 0 + Sprint 1 shipped a Funnels view backed by 11 production endpoints. As of the first production verification (2026-06-03):

| Metric | Value | Implication |
|---|---|---|
| `stitchedPct` (acquisition extras header) | **22.85%** | 78% of users cannot be attributed to a source |
| `attributablePct` | **null** (returns "stitched_proxy") | UTM-based attribution is not yet computable |
| `dataQuality` flag on `/api/attribution/channel-roi` | **`sprint_0_placeholder`** | Channel ROI reads `referred_by_code` only, which is empty for ~95% of users |
| Acquisition funnel `visit` step | **1** (out of 16,020 landings) | The GA4 stitch is broken; only one wallet has `ga_user_id` populated |

**Every downstream metric — funnels, attribution, cohorts, KOL rankings, viral K — is computed against this 22% sample.** Sprint 2 fixes the underlying identity layer so the rest of the platform can produce trustworthy numbers.

The decision (per founder, 2026-06-03): **rescope Sprint 2 around Universal Identity + Users page**, defer the originally-planned Source Attribution UI (Whale Sankey, KOL leaderboard, Whale Watch live ticker) to Sprint 3.

---

## 2. Architecture Choice: Profile-Primary

**Decided 2026-06-03 by founder:** a single `user_profile` can have N linked wallets, N socials, N `ga_client_id`s, 0..1 Snag user ID.

Rationale:
- Trend Researcher's channel map documented that Solana whales commonly use hot+cold wallet pairs
- Standard CDP pattern (Segment, Rudderstack, mParticle all converge here)
- Merge complexity is one-time engineering; under-counting whales is forever-wrong KPIs

The existing `users` table is preserved. `users.user_profile_id` (new FK) joins to `user_profiles`. At backfill time, every existing wallet gets exactly one profile (1:1 ratio). Profiles merge later via evidence-based admin actions.

---

## 3. Scope

### In Scope (Sprint 2)

- **Backend:**
  - 1 new migration (`017_universal_identity.sql`) creating `user_profiles`, `identity_links`, `attribution_events`, `attribution_touches`
  - 1 new core service: `identityService.ts`
  - 8 new admin endpoints under `/api/users/*`
  - 2 new event ingest endpoints (`POST /api/track/landing`, `POST /api/track/wallet_connect`)
  - Wiring Helius + Snag webhooks into the identity service
  - 1 idempotent backfill script for the existing 15,455 wallets
- **Frontend:**
  - 5th top-level tab: 👤 Users (with `<UserCircle />` Phosphor icon)
  - `UsersView` two-pane layout (40% list / 60% detail)
  - 6 new components: UserListPane, UserListRow, UserDetailPane, IdentityCard, MergeProfilesDialog, AddLinkDialog, TimelineEntry (7 actually — TimelineCard wraps Entry rows)
  - Virtualized list (react-window) for 10K+ user scrolling
  - Cross-tab deep-linking: any wallet anywhere → `?tab=users&profile=<id>`
- **Manual admin override actions:** add link, unlink, merge profiles, "forget user" (GDPR soft-delete)

### Out of Scope (deferred)

- **Probabilistic stitching** (same-IP / same-session within 30min) — Sprint 3
- **Auto-capture social handles** (user-facing profile dropdown with X/Discord/TG verification flow) — Sprint 3
- **Whale Origin Sankey + KOL leaderboard + Whale Watch live ticker UI** — Sprint 3 (the originally-planned Sprint 2 scope; depends on identity working)
- **Automated quarterly GDPR purge** — Sprint 3
- **Real-time profile-change SSE stream** (the existing whale stream stays as-is) — Sprint 3

---

## 4. Schema Design

### 4.1 `user_profiles` — the unified identity entity

```sql
CREATE TABLE user_profiles (
  profile_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name      TEXT,
  primary_wallet    VARCHAR(64) NOT NULL,

  -- Lifecycle
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- First-touch attribution (write-once)
  first_utm_source     TEXT,
  first_utm_medium     TEXT,
  first_utm_campaign   TEXT,
  first_utm_content    TEXT,
  first_utm_term       TEXT,
  first_referrer       TEXT,
  first_landing_path   TEXT,
  attribution_locked_at TIMESTAMPTZ,

  -- Last-touch (mutates)
  last_utm_source      TEXT,
  last_utm_medium      TEXT,
  last_utm_campaign    TEXT,

  -- Derived
  wallet_type          TEXT,
  country_code         TEXT,

  -- Merge state (soft-merge for audit trail)
  merged_into_profile_id UUID REFERENCES user_profiles(profile_id),
  merge_evidence_id    BIGINT,
  merged_at            TIMESTAMPTZ,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_primary_wallet ON user_profiles(primary_wallet) WHERE merged_into_profile_id IS NULL;
CREATE INDEX idx_profiles_first_utm      ON user_profiles(first_utm_source) WHERE merged_into_profile_id IS NULL;
CREATE INDEX idx_profiles_last_seen      ON user_profiles(last_seen_at DESC);

ALTER TABLE user_profiles ADD CONSTRAINT chk_first_utm_lower
  CHECK (first_utm_source IS NULL OR first_utm_source = LOWER(first_utm_source));
```

### 4.2 `identity_links` — the stitching graph

```sql
CREATE TABLE identity_links (
  id                BIGSERIAL PRIMARY KEY,
  profile_id        UUID NOT NULL REFERENCES user_profiles(profile_id),
  identity_type     VARCHAR(32) NOT NULL,
  identity_value    TEXT NOT NULL,
  confidence        VARCHAR(16) NOT NULL,
  evidence_event_id BIGINT,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by         TEXT,
  unlinked_at       TIMESTAMPTZ,
  unlinked_by       TEXT,
  unlink_reason     TEXT
);

-- Unique constraint: one identity value at a time can only be active on ONE profile
CREATE UNIQUE INDEX idx_links_unique_active
  ON identity_links(identity_type, identity_value)
  WHERE unlinked_at IS NULL;

CREATE INDEX idx_links_profile    ON identity_links(profile_id) WHERE unlinked_at IS NULL;
CREATE INDEX idx_links_linked_at  ON identity_links(linked_at DESC);

-- Allowed identity_type values:
-- 'wallet' | 'ga_client_id' | 'snag_user_id' | 'x_handle' | 'discord_id' | 'telegram_id' | 'email'

-- Allowed confidence values:
-- 'deterministic' | 'probabilistic' | 'manual'
```

### 4.3 `attribution_events` — event log (per Tracking Specialist §4.2)

```sql
CREATE TABLE attribution_events (
  id              BIGSERIAL PRIMARY KEY,
  event_name      TEXT NOT NULL,
  event_id        TEXT,
  profile_id      UUID REFERENCES user_profiles(profile_id),
  wallet          VARCHAR(64),
  ga_client_id    TEXT,
  session_id      TEXT,
  source          TEXT,
  medium          TEXT,
  campaign        TEXT,
  content         TEXT,
  term            TEXT,
  referrer        TEXT,
  landing_path    TEXT,
  asset           VARCHAR(64),
  value_usd       DECIMAL(18,4),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_name, event_id)
);

CREATE INDEX idx_ae_profile_event_time  ON attribution_events(profile_id, event_name, occurred_at DESC);
CREATE INDEX idx_ae_wallet_event_time   ON attribution_events(wallet, event_name, occurred_at DESC);
CREATE INDEX idx_ae_client_id_time      ON attribution_events(ga_client_id, occurred_at);
CREATE INDEX idx_ae_source_time         ON attribution_events(source, occurred_at);
```

### 4.4 `attribution_touches` — multi-touch attribution (per Tracking Specialist §4.3)

```sql
CREATE TABLE attribution_touches (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    UUID REFERENCES user_profiles(profile_id),
  wallet        VARCHAR(64),
  source        TEXT,
  medium        TEXT,
  campaign      TEXT,
  touched_at    TIMESTAMPTZ NOT NULL,
  touch_index   INT NOT NULL,
  UNIQUE (profile_id, touch_index)
);

CREATE INDEX idx_at_profile_touch ON attribution_touches(profile_id, touched_at);
```

### 4.5 Backwards-compat: `users.user_profile_id`

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_users_profile ON users(user_profile_id);
```

Backfill populates this for all existing 15,455 users.

---

## 5. Service Layer — `identityService.ts`

### 5.1 Public API

```typescript
export interface IdentitySeed { type: IdentityType; value: string; }
export type IdentityType = 'wallet' | 'ga_client_id' | 'snag_user_id' | 'x_handle' | 'discord_id' | 'telegram_id' | 'email';
export type Confidence = 'deterministic' | 'probabilistic' | 'manual';

export interface Profile {
  profileId: string;
  displayName: string | null;
  primaryWallet: string;
  firstSeenAt: string;
  lastSeenAt: string;
  firstUtmSource: string | null;
  // ... full row
}

export interface IdentityLink {
  id: number;
  profileId: string;
  identityType: IdentityType;
  identityValue: string;
  confidence: Confidence;
  linkedAt: string;
  linkedBy: string | null;
  unlinkedAt: string | null;
}

export interface ProfileWithLinks extends Profile {
  links: IdentityLink[];
  lifetimeStats?: { xp: number; volumeUSD: number; positions: number; badges: number };
}

// Core ops
export async function findOrCreateProfile(seed: IdentitySeed, byActor: string): Promise<Profile>;
export async function linkIdentity(profileId: string, type: IdentityType, value: string, confidence: Confidence, evidence: { eventId?: number; byActor: string }): Promise<IdentityLink>;
export async function unlinkIdentity(linkId: number, reason: string, byActor: string): Promise<void>;
export async function mergeProfiles(winnerId: string, loserId: string, evidence: { byActor: string; reason: string }): Promise<Profile>;

// Event ingest (called by webhooks + track endpoints)
export interface RecordEventInput {
  event_name: string;
  event_id?: string;            // idempotency key — UNIQUE constraint via (event_name, event_id)
  profile_id?: string;
  wallet?: string;
  ga_client_id?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  asset?: string;
  value_usd?: number;
  occurred_at?: string;
  payload?: Record<string, unknown>;
}
export async function recordEvent(input: RecordEventInput): Promise<{ eventId: number }>;

// Reads
export async function getProfile(profileId: string): Promise<ProfileWithLinks | null>;
export async function searchProfiles(filters: ProfileFilters): Promise<{ rows: ProfileSummary[]; total: number; page: number; pageSize: number }>;
export async function getTimeline(profileId: string, params: { limit?: number; before?: string }): Promise<TimelineEntry[]>;
```

### 5.2 Stitching Rules (Deterministic Only — Sprint 2 Scope)

| Trigger | Stitching action |
|---|---|
| `POST /api/track/wallet_connect` carrying `{wallet, ga_client_id, session_id}` | `findOrCreateProfile({wallet})` → `linkIdentity(profile, 'ga_client_id', cid, 'deterministic')` → UPDATE all `attribution_events WHERE ga_client_id = cid AND profile_id IS NULL` to set `profile_id` and `wallet`. Lock `attribution_locked_at` if not set. |
| Snag webhook for `wallet` with `snag_user_id` | `findOrCreateProfile({wallet})` → `linkIdentity(profile, 'snag_user_id', snagId, 'deterministic')` |
| Helius webhook (trade) for new `wallet` | `findOrCreateProfile({wallet})` if no existing profile owns it |
| Referral click on `?ref=CODE` | `findOrCreateProfile` for the inviter via their existing `referral_code`; link incoming `ga_client_id` as the click source (no new identity yet) |

### 5.3 Merge Rules

`mergeProfiles(winnerId, loserId)` is an admin-only action. It:

1. Asserts `winnerId !== loserId`
2. Asserts neither profile is already merged (`merged_into_profile_id IS NULL`)
3. Within a TXN:
   - Sets `loser.merged_into_profile_id = winnerId`, `merged_at = NOW()`, `merge_evidence_id = ...`
   - UPDATEs all `identity_links` from loser → winner
   - UPDATEs all `attribution_events` and `attribution_touches` from loser → winner
   - UPDATEs all `users.user_profile_id` from loser → winner
   - Picks new `primary_wallet` for winner: keep winner's existing OR loser's if winner's primary is `merged_into_profile_id`'d wallet. **Default:** keep winner's. Admin can change with a separate `PATCH /api/users/:profileId/primary-wallet` call.
   - Recomputes `first_seen_at = MIN(...)`, `first_utm_*` if winner had none and loser did
   - Writes an `admin_logs` row with full before/after JSON
4. Returns the winner profile

### 5.4 Conflict Handling

| Scenario | Behavior |
|---|---|
| Trying to link an identity already linked to another profile | Throw `IdentityConflictError({existingProfileId, suggestion: 'merge'})`. Caller catches and decides to merge or reject. |
| Trying to merge two profiles that share no identity link | Throw `MergeWithoutEvidenceError`. Admin must provide an explicit evidence string via the merge dialog. |
| Identity value casing inconsistencies (e.g. `Twitter` vs `twitter`) | Service normalizes ALL identity values to `LOWER()` before INSERT/lookup. |

---

## 6. New Endpoints

### 6.1 Read endpoints

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/api/users` | `x-admin-key` | `?page=&pageSize=&source=&stitchPctMin=&walletSizeMin=&activitySince=&q=` | `{ rows: ProfileSummary[]; total; page; pageSize }` |
| GET | `/api/users/:profileId` | `x-admin-key` | — | `ProfileWithLinks` |
| GET | `/api/users/:profileId/timeline` | `x-admin-key` | `?limit=50&before=ISO` | `TimelineEntry[]` |
| GET | `/api/users/:profileId/positions` | `x-admin-key` | `?status=open|closed|all` | `Position[]` |
| GET | `/api/users/search` | `x-admin-key` | `?q=` | `ProfileSummary[]` (max 25) |

### 6.2 Write endpoints

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/users/:profileId/links` | `x-admin-key` | `{ type, value, confidence?, evidence? }` | `IdentityLink` |
| DELETE | `/api/users/:profileId/links/:linkId` | `x-admin-key` | `{ reason }` | `{ unlinkedAt }` |
| POST | `/api/users/:profileId/merge` | `x-admin-key` | `{ loserProfileId, reason }` | `Profile` (winner) |
| PATCH | `/api/users/:profileId/primary-wallet` | `x-admin-key` | `{ wallet }` | `Profile` |
| POST | `/api/users/:profileId/forget` | `x-admin-key` | `{ reason }` | `{ forgottenAt }` |

### 6.3 Event ingest endpoints (public — no admin auth)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/track/landing` | none (rate-limited by IP) | `{ client_id, session_id, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, referrer?, landing_path }` | `{ ok: true }` |
| POST | `/api/track/wallet_connect` | none (signature-gated) | `{ wallet, signature, message, client_id, session_id }` | `{ profileId, stitched: boolean }` |

`/api/track/wallet_connect` verifies the signature against the wallet pubkey before stitching. Reject with 401 if invalid.

---

## 7. Backfill Strategy (`scripts/backfill-profiles.ts`)

Idempotent migration runs in 4 phases:

1. **Phase A — Create profile rows.** For each `users.wallet`, INSERT into `user_profiles` with `primary_wallet = wallet`, `first_seen_at = users.created_at`, `last_seen_at = users.updated_at`. Set `users.user_profile_id` to the new id. **Idempotent:** WHERE NOT EXISTS subquery.
2. **Phase B — Backfill identity links.** For each user with `ga_user_id IS NOT NULL`, INSERT identity_links (`profile_id`, `'ga_client_id'`, `ga_user_id`, `'deterministic'`, `linked_by='backfill_2026_06_03'`). Same for `snag_user_id`. Wallet links too (`'wallet'` type with the user's wallet value).
3. **Phase C — Backfill first-touch attribution.** SET `first_utm_source = COALESCE(referred_by_code, 'unknown_legacy')`. SET `attribution_locked_at = NOW()` to freeze the legacy data.
4. **Phase D — Verify.** Output counts: `profiles_created`, `wallet_links_created`, `ga_client_id_links_created`, `snag_user_id_links_created`, `unique_legacy_first_utm_sources`. Compute SHA-256 checksum of `(SELECT COUNT(*), MAX(profile_id::text), MIN(profile_id::text) FROM user_profiles)` for re-run idempotency check.

Script supports `--dry-run` flag — prints counts without writing. Production run mandatory: `--dry-run` first → review counts → then real run.

---

## 8. Frontend — Users Page

### 8.1 New tab

Add to `frontend/app/admin/data-hub/layout-shell.tsx`:

```typescript
import { Target, MagnifyingGlass, Waves, ChartBar, UserCircle } from '@phosphor-icons/react';

const TABS = [
  { id: 'funnels',     label: 'Funnels',            Icon: Target },
  { id: 'attribution', label: 'Source Attribution', Icon: MagnifyingGlass },
  { id: 'cohorts',     label: 'Trader Cohorts',     Icon: Waves },
  { id: 'users',       label: 'Users',              Icon: UserCircle },  // NEW
  { id: 'raw',         label: 'Raw Data',           Icon: ChartBar },
];
```

Update `TopView` type to include `'users'`.

### 8.2 Layout

`frontend/app/admin/data-hub/views/UsersView.tsx` (the new top-level view):

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Filter row (56px): search box | source ▾ | stitch% ▾ | wallet size ▾   │
│                    activity ▾ | "Reset" button (if active)              │
├────────────────────────────────────┬────────────────────────────────────┤
│ UserListPane (40% width)           │ UserDetailPane (60% width)         │
│ ──────────────────────────────────│ ──────────────────────────────────  │
│ Virtualized rows of UserListRow   │ Composed of:                       │
│ (10K+ entries with react-window)  │  - IdentityCard                     │
│                                    │  - SourceAttributionCard            │
│ Each row shows:                    │  - LifetimeStatsCard                │
│  - Wallet (truncated)              │  - TimelineCard (last 30 events)   │
│  - Display name (if set)           │                                    │
│  - Lifetime volume                 │  Empty state when no user selected: │
│  - Last activity (relative time)   │  "Select a user from the list"      │
│  - 8px threshold pill: red if      │                                    │
│    stitch% <50%, yellow 50-80%,    │                                    │
│    green >80% (uses thresholdColor)│                                    │
├────────────────────────────────────┴────────────────────────────────────┤
│ Footer: pagination [< 1 2 3 ... 312 >] + total count                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Components

All under `frontend/components/DataHub/users/`. All begin with `"use client"`.

| Component | Purpose |
|---|---|
| `UserListPane.tsx` | Virtualized list + footer pagination |
| `UserListRow.tsx` | One user row with stitch threshold pill |
| `UserDetailPane.tsx` | 4-card detail composition + actions |
| `IdentityCard.tsx` | Table of linked identities + Add Link / Merge buttons |
| `SourceAttributionCard.tsx` | First-touch + last-touch UTMs + lock state |
| `LifetimeStatsCard.tsx` | XP / multiplier / volume / position count / badge count |
| `TimelineCard.tsx` | Chronological event feed (last 30) |
| `TimelineEntry.tsx` | One timeline row with Phosphor event-type icon + relative time + plain-English description |
| `AddLinkDialog.tsx` | Modal — `identity_type` picker + value input + confidence + evidence text |
| `MergeProfilesDialog.tsx` | Modal — search-by-wallet picker + reason textarea + confirm |
| `UnlinkDialog.tsx` | Confirm + reason textarea |
| `ForgetUserDialog.tsx` | Hard confirm ("type the wallet to confirm") + reason |

### 8.4 Hooks

| Hook | Purpose |
|---|---|
| `useUsersList(filters, page)` | Calls `/api/users` with filters + pagination |
| `useUserProfile(profileId)` | Calls `/api/users/:profileId` |
| `useUserTimeline(profileId)` | Calls `/api/users/:profileId/timeline` |
| `useIdentityActions()` | Wraps the 5 mutation endpoints (add link, unlink, merge, primary-wallet, forget) |

All hooks use the existing `apiGet` + new `apiMutation` helper added to `frontend/lib/api.ts` (POST/PATCH/DELETE with admin key).

### 8.5 Deep-linking from other tabs

Every wallet display in Data Hub (funnel drill-down, attribution rows, on-chain holders, leaderboard) becomes a click target that navigates to `?tab=users&profile=<id>`. Implementation: a new helper `linkToProfile(walletOrProfileId)` in `frontend/lib/navigation.ts`. Existing wallet cells get wrapped with `<a href={linkToProfile(wallet)}>`.

### 8.6 Real-time updates

Sprint 2 ships polling (refetch on filter change + 30s background poll while detail pane is open). SSE for profile changes is Sprint 3.

---

## 9. Webhook Wiring

### 9.1 Helius webhook (`src/services/heliusWebhookHandler.ts`)

After the existing `publishWhaleEvent` call inside `handleBuy` and `handleSell`:

```typescript
// New: stitch wallet → profile and write attribution_event
const profile = await identityService.findOrCreateProfile({ type: 'wallet', value: wallet }, 'system');
await identityService.recordEvent({
  event_name: side === 'long' ? 'position_open' : 'position_close',
  event_id: txSignature,
  profile_id: profile.profileId,
  wallet,
  value_usd: positionSizeUSD,
  asset,
  occurred_at: trade.timestamp,
});
```

**Decision:** `recordEvent` lives inside `identityService.ts` as a public method, not in a separate file. The existing `attributionService.ts` (Sprint 0) only computes reads — it does not own writes. Sprint 2 keeps that separation: identity_service writes both profile changes AND attribution_events (they are causally coupled), while attribution_service stays read-only. Add to Section 5.1's public API:

```typescript
export interface RecordEventInput {
  event_name: string;
  event_id?: string;
  profile_id?: string;
  wallet?: string;
  ga_client_id?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  asset?: string;
  value_usd?: number;
  occurred_at?: string;
  payload?: Record<string, unknown>;
}

export async function recordEvent(input: RecordEventInput): Promise<{ eventId: number }>;
```

### 9.2 Snag webhook (`src/services/snagWebhook*` / wherever incoming Snag events land)

After the existing logic that sets `users.snag_user_id`:

```typescript
const wallet = req.body.wallet;
const snagUserId = req.body.snag_user_id;
const profile = await identityService.findOrCreateProfile({ type: 'wallet', value: wallet }, 'system');
await identityService.linkIdentity(profile.profileId, 'snag_user_id', snagUserId, 'deterministic', { byActor: 'system' });
```

### 9.3 Tracking endpoints (new)

`POST /api/track/landing`:
1. Validate body schema (zod or manual — match existing patterns)
2. Rate-limit by IP (5/sec, 100/min)
3. Insert attribution_event with `profile_id = NULL, wallet = NULL, ga_client_id = body.client_id`
4. Return 200

`POST /api/track/wallet_connect`:
1. Validate body schema
2. Verify the signature via `tweetnacl-util` (existing dep in wallet adapters)
3. Call `identityService.findOrCreateProfile({type:'wallet', value: wallet}, 'system')`
4. `linkIdentity(profile, 'ga_client_id', body.client_id, 'deterministic')`
5. Backfill: `UPDATE attribution_events SET profile_id = $1, wallet = $2 WHERE ga_client_id = $3 AND profile_id IS NULL`
6. Set `first_utm_*` on profile from earliest matching event (if not locked)
7. Return `{ profileId, stitched: true }`

---

## 10. Performance Targets

- p50 latency `/api/users` (list): < 200ms with filters
- p99 latency `/api/users/:profileId`: < 500ms (single profile + last 30 events)
- Backfill of 15,455 users: < 30 seconds end-to-end
- `attribution_events` table growth: ~1 row per user event; assume 10K events/day initially. Index maintenance acceptable.
- Concurrent admin clients on Users page: ≥ 3

---

## 11. Testing Strategy

### Backend
- **Vitest unit tests:**
  - `identityService.test.ts` — 12 tests covering all 7 public ops + 3 conflict scenarios + idempotency
  - `attributionService.test.ts` (new helper) — event recording, idempotency on `event_id` UNIQUE constraint
- **Endpoint tests** (supertest): all 8 new endpoints + 2 ingest endpoints — auth, validation, happy path, 404s
- **Migration test:** seed 5 users → run migration → assert exact row counts in all 4 new tables
- **Backfill test:** run script in dry-run + real mode against the test DB seeded with 100 users; verify checksums match between runs

### Frontend
- **Vitest + Testing Library:** UserListRow snapshot, UserDetailPane render with mocked profile, AddLinkDialog form validation
- **No Playwright in Sprint 2** (Sprint 3 adds visual regression)
- **Manual UX validation:** open Users tab → search → click row → see detail → add link (admin) → unlink → merge → forget

---

## 12. Acceptance Criteria

Sprint 2 ships when all of:

1. [ ] Migration `017_universal_identity.sql` applied to prod DB without error
2. [ ] All 15,455 existing users have a `user_profile_id`
3. [ ] All users with `ga_user_id IS NOT NULL` have an `identity_links` row
4. [ ] All users with `snag_user_id IS NOT NULL` have an `identity_links` row
5. [ ] `POST /api/track/wallet_connect` returns `stitched: true` for a test signature
6. [ ] Helius webhook on a fresh trade creates a profile + attribution_event row
7. [ ] Snag webhook on a fresh link adds an identity_links row
8. [ ] `/api/users?page=1&pageSize=50` returns 50 ProfileSummary rows in < 200ms
9. [ ] Users tab loads + virtualized list scrolls smoothly
10. [ ] Click row → detail pane populates < 500ms
11. [ ] Add Link / Unlink / Merge / Primary-wallet / Forget all work end-to-end with admin audit logs written
12. [ ] Deep-link from any wallet in any other tab → Users tab with that profile selected
13. [ ] Backend tests: all pass (target: ≥ 50 total — 29 from Sprint 0+1 + ~20 new)
14. [ ] Frontend tests: all pass (target: ≥ 18 total — 14 from Sprint 1 + ~4 new)
15. [ ] `npx tsc --noEmit` and `npx next build` clean

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backfill writes wrong data to 15,455 prod users | Medium | High | Mandatory `--dry-run` first + checksums + commit transaction at end, not per-row |
| Profile merge data loss if winner/loser mid-merge gets new event | Low | High | Merge runs in a TXN with row locks via SELECT FOR UPDATE on both profiles |
| `identity_links` unique constraint conflict during backfill (ghost old GA4 IDs) | Medium | Medium | Backfill uses `ON CONFLICT DO NOTHING` for the link inserts |
| Sigverify on `/api/track/wallet_connect` is wrong, allowing identity hijack | Low | Critical | Use `tweetnacl` `sign.detached.verify` against the wallet pubkey decoded from base58; reject if invalid OR if message timestamp older than 5 min |
| Users page perf at 100K+ rows | Low | Medium | Virtualized list with `react-window`; query is paginated with seek-based cursor for >10K rows in Sprint 3 |
| Snag rate limits during background sync | Low | Low | Queue + 50/min throttle (existing pattern in `snag_sync_queue`) |
| GDPR "forget user" doesn't actually purge | Medium | Medium | `forget` nullifies identifiable columns AND deletes `identity_links` rows (the social handles), keeps the profile row for analytical continuity. Document this. |

---

## 14. Open Questions (Defensible Defaults — Confirm or Override)

1. **`primary_wallet` on merge:** *Default:* keep winner's. Admin can override via `PATCH /:profileId/primary-wallet`.
2. **Probabilistic stitching scope:** *Default:* Sprint 3 only.
3. **Social handle auto-capture:** *Default:* Sprint 2 ships storage + manual admin entry; auto-capture flow Sprint 3.
4. **Snag external_id sync:** *Default:* Sprint 2 ships a background job that writes our `profile_id` into Snag's `external_attributes`. Non-blocking; runs hourly.
5. **GDPR forget behavior:** *Default:* nullify identifiers + delete identity_links; keep profile row + attribution_events (anonymized) for analytics. Documented in `/admin/data-hub` help text.
6. **Audit logs:** *Default:* every write op writes to `admin_logs` with before/after JSON.
7. **Backfill `unknown_legacy` UTM:** *Default:* yes — locks attribution to "unknown_legacy" for users with no `referred_by_code`. Allows the funnel UI to show "78% legacy / 22% attributed" as a clear data quality signal.

---

## 15. Phased Delivery

| Sub-sprint | Duration | Scope | Exit criteria |
|---|---|---|---|
| **2.0 — Schema + service** | 3 days | Migration + identityService.ts + TDD + backfill script with --dry-run | All schemas applied locally; identityService tests pass; backfill dry-run matches expected counts |
| **2.1 — Endpoints + ingest + webhook wiring** | 3 days | 8 admin endpoints + 2 ingest endpoints + Helius/Snag wiring | All endpoints respond with valid shapes; supertest tests pass; webhook smoke test |
| **2.2 — Users page UI** | 5 days | Tab + 2-pane layout + 11 components + 4 hooks + deep-linking | Users tab loads, lists, drills, mutates; integrates with Sprint 1 deep-links |
| **2.3 — Backfill + deploy** | 1 day | Run prod backfill, verify checksums, push code | Production verified — profiles populated, `/api/users` live |

Total: ~12 working days.

---

## 16. References

- Spec: `docs/superpowers/specs/2026-06-02-funnel-data-hub-design.md` (Sprint 0/1 spec)
- Tracking Specialist deliverable: `docs/agents/tracking-specialist-2026-06-02.md` (sections 3 + 4 — the basis for 60% of this spec)
- Sprint 0 plan: `docs/superpowers/plans/2026-06-02-funnel-platform-sprint-0-foundation.md`
- Sprint 1 plan: `docs/superpowers/plans/2026-06-03-funnel-platform-sprint-1-funnels-view.md`
- Sprint 1 design: `docs/design/sprint-1-funnels-view-design.md`
- Existing users schema: `src/db/schema.sql`
- Existing migrations: `src/db/migrations/002_snag_rebuild.sql` (Snag stitch), `003_referral_multiplier.sql` (referral codes), `016_ga4_identity_stitching.sql` (ga_user_id)
- claude-mem session: shift-rwa project tag

---

*End of Sprint 2 design spec. Ready for review.*
