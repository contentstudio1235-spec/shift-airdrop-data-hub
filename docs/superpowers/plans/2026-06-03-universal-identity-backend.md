# Universal Identity Backend — Sub-Sprints 2.0 + 2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the backend half of Sprint 2 — Universal Identity schema, `identityService`, 8 admin endpoints, 2 ingest endpoints, Helius+Snag webhook wiring, and the idempotent backfill script. End state: `/api/users` returns paginated profiles for the existing 15,455 wallets, `/api/track/wallet_connect` stitches new users, and the data layer is ready for the UI sub-sprint.

**Architecture:** Profile-primary — `user_profiles` is the unified entity; `identity_links` is the stitching graph; `attribution_events` is the event log; `users` stays as-is with a new FK. All write paths go through `identityService.ts` (single source of stitching truth). Signature verification on `/api/track/wallet_connect` uses `tweetnacl` + `bs58`.

**Tech Stack:** Node.js 20, Express 5, TypeScript, `pg`, `vitest`, `supertest`. New deps: `tweetnacl@^1`, `bs58@^6`, `express-rate-limit@^7`. No new agent dispatches.

**Branch:** `feat/universal-identity-users-page` (already created off `main` at `sprint-1-funnels` tag)

**Spec reference:** `docs/superpowers/specs/2026-06-03-universal-identity-users-page-design.md`

**Out of scope for THIS plan (deferred to companion frontend plan):** Users page UI, frontend hooks, deep-linking, production backfill execution.

---

## File Structure

### New backend files
- `src/db/migrations/017_universal_identity.sql`
- `src/types/identity.ts`
- `src/services/identityService.ts`
- `src/lib/walletSignature.ts`
- `src/routes/users.ts`
- `src/routes/track.ts`
- `src/__tests__/identityService.test.ts`
- `src/__tests__/walletSignature.test.ts`
- `src/__tests__/usersRoute.test.ts`
- `src/__tests__/trackRoute.test.ts`
- `scripts/backfill-profiles.ts`

### Modified backend files
- `package.json` — add `tweetnacl`, `bs58`, `express-rate-limit`
- `src/index.ts` — mount `usersRoutes` + `trackRoutes`
- `src/services/heliusWebhookHandler.ts` — wire identity calls after trade processing
- Snag webhook handler (find via grep, likely `src/routes/snag.ts` or a service) — wire identity calls after `users.snag_user_id` is set
- `dist/` — recompile

---

## Sub-Sprint 2.0 — Schema + Service

### Task 1: Install backend dependencies

**Files:** `package.json`

- [ ] **Step 1:** Install runtime deps

```
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend"
npm install tweetnacl@^1.0.3 bs58@^6.0.0 express-rate-limit@^7
```

- [ ] **Step 2:** Verify install

```
node -e "console.log(require('tweetnacl').sign.detached.verify.length)"  # expect 3
node -e "console.log(require('bs58').decode('11111111111111111111111111111111').length)"  # expect 32
```

- [ ] **Step 3:** tsc clean: `npx tsc --noEmit` → exit 0

- [ ] **Step 4:** Commit: `chore(deps): tweetnacl + bs58 + express-rate-limit for identity service`

---

### Task 2: Migration 017_universal_identity.sql

**Files:** `src/db/migrations/017_universal_identity.sql`

Create the migration with EXACT schema from spec §4 (sections 4.1–4.5). All `CREATE TABLE` statements use `IF NOT EXISTS`. All `CREATE INDEX` use `IF NOT EXISTS`. The `CHECK` constraint uses `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` to make it idempotent. The `users.user_profile_id` `ALTER TABLE` uses `ADD COLUMN IF NOT EXISTS`.

Reference: copy the SQL block verbatim from spec §4 Sections 4.1, 4.2, 4.3, 4.4, 4.5. Add `COMMENT ON TABLE` for each new table.

- [ ] **Step 1:** Create the file with the full SQL block from spec §4
- [ ] **Step 2:** Validate syntax via psql parse or db-fiddle
- [ ] **Step 3:** If you have a local Postgres, run: `DATABASE_URL=$LOCAL_DEV_DB npx tsx src/db/migrate.ts`
- [ ] **Step 4:** Commit: `feat(db): migration 017 — user_profiles + identity_links + attribution tables`

---

### Task 3: Type system

**Files:** `src/types/identity.ts`

Define all types from spec §5.1 + the error classes. The full type block is in the spec §5.1; copy verbatim. Types: `IdentityType`, `Confidence`, `IdentitySeed`, `Profile`, `IdentityLink`, `LifetimeStats`, `ProfileWithLinks`, `ProfileSummary`, `ProfileFilters`, `RecordEventInput`, `TimelineEntry`. Error classes: `IdentityConflictError`, `MergeWithoutEvidenceError`, `ProfileNotFoundError`.

- [ ] **Step 1:** Create the file
- [ ] **Step 2:** Verify `npx tsc --noEmit` clean
- [ ] **Step 3:** Commit: `feat(types): universal identity type system`

---

### Task 4: identityService — `findOrCreateProfile`

**Files:** `src/services/identityService.ts`, `src/__tests__/identityService.test.ts`

TDD. The service uses `query`, `queryOne` from `src/db/pool.ts`. Normalize rule: wallet stays case-sensitive (Solana base58); everything else lowercased.

- [ ] **Step 1:** Write 4 failing tests:
  - returns existing profile when identity is already linked
  - creates new profile + link when not found (verify both rows inserted)
  - lowercases identity values for non-wallet types
  - preserves wallet case (Solana addresses are case-sensitive)

Each test mocks `db.queryOne` and `db.execute` via `vi.spyOn`. Match return shapes to the `ProfileRow` interface — see spec §4.1 for column list.

- [ ] **Step 2:** Run → FAIL (module not found)

- [ ] **Step 3:** Implement `findOrCreateProfile(seed, byActor)`:
  - SELECT existing via `INNER JOIN identity_links ... WHERE l.identity_type=$1 AND l.identity_value=$2 AND l.unlinked_at IS NULL AND p.merged_into_profile_id IS NULL`
  - If found, return rowToProfile(row)
  - Else INSERT into `user_profiles` (primary_wallet = wallet if type='wallet', else '')
  - Then INSERT into `identity_links` with confidence='deterministic'
  - Return new profile

Helper functions: `normalizeIdentityValue(type, value)` (lowercase iff type !== 'wallet'), `rowToProfile(row)` (snake_case → camelCase converter).

- [ ] **Step 4:** Run → PASS (4/4)

- [ ] **Step 5:** Commit: `feat(identity): findOrCreateProfile with case-aware normalization`

---

### Task 5: linkIdentity + unlinkIdentity

**Files:** modify `src/services/identityService.ts`, `src/__tests__/identityService.test.ts`

- [ ] **Step 1:** Append 4 tests:
  - linkIdentity: inserts new link, returns it
  - linkIdentity: throws `IdentityConflictError` when value already on another profile
  - linkIdentity: idempotent (returns existing link when same profile)
  - unlinkIdentity: soft-deletes by setting `unlinked_at`, `unlink_reason`, `unlinked_by`

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement both methods. `linkIdentity` checks for existing active link first; if it belongs to a different profile, throw `IdentityConflictError(existingProfileId, type, value)`; if same profile, return the existing row (idempotent). `unlinkIdentity(linkId, reason, byActor)` does `UPDATE identity_links SET unlinked_at=NOW(), unlink_reason=$1, unlinked_by=$2 WHERE id=$3 AND unlinked_at IS NULL`.

Helper: `rowToLink(IdentityLinkRow)` converter.

- [ ] **Step 4:** Run → PASS (8/8)

- [ ] **Step 5:** Commit: `feat(identity): linkIdentity (idempotent + conflict) + unlinkIdentity (soft-delete)`

---

### Task 6: recordEvent + getProfile

**Files:** modify `src/services/identityService.ts`, `src/__tests__/identityService.test.ts`

- [ ] **Step 1:** Append 4 tests:
  - recordEvent: INSERTs and returns id
  - recordEvent: idempotent via `ON CONFLICT (event_name, event_id) DO UPDATE SET ingested_at = ingested_at` (no-op so RETURNING works)
  - getProfile: returns null when not found
  - getProfile: returns profile + links array + lifetimeStats

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement:
  - `recordEvent(input)`: SQL INSERT with all 17 fields, `ON CONFLICT (event_name, event_id) DO UPDATE SET ingested_at = attribution_events.ingested_at RETURNING id`
  - `getProfile(profileId)`: SELECT user_profiles → if null return null. SELECT identity_links WHERE profile_id=$1 AND unlinked_at IS NULL. Compute lifetimeStats via aggregate query joining users + positions + badges via identity_links wallets. Return `{ ...rowToProfile(row), links, lifetimeStats }`.

- [ ] **Step 4:** Run → PASS (12/12)

- [ ] **Step 5:** Commit: `feat(identity): recordEvent (idempotent on event_id) + getProfile with lifetime stats`

---

### Task 7: searchProfiles + getTimeline

**Files:** modify both files

- [ ] **Step 1:** Append 3 tests:
  - searchProfiles: returns paginated rows with computed stitchedPct and lifetimeVolumeUSD
  - searchProfiles: applies source filter via parameterized SQL (verify $1 binding)
  - getTimeline: returns events newest-first

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement:
  - `searchProfiles(filters)`: Build WHERE clause with parameterized values. Always include `p.merged_into_profile_id IS NULL`. Optional filters: source, activitySince, q (LIKE on wallet/display_name/identity_value). Compute `stitched_pct = COUNT(DISTINCT identity_type) * 100.0 / 7.0`. Sum `position_size_usd` via JOIN to wallet identity_links. Apply HAVING for `walletSizeMin` and `stitchPctMin` — interpolate as `Number()` (sanitized) since HAVING on aggregates can't bind parameters cleanly. ORDER BY last_seen_at DESC, LIMIT + OFFSET from page/pageSize.
  - `getTimeline(profileId, {limit, before})`: SELECT attribution_events WHERE profile_id=$1 AND ($2 IS NULL OR occurred_at < $2) ORDER BY occurred_at DESC LIMIT $3. Default limit 30, max 200.

- [ ] **Step 4:** Run → PASS (15/15)

- [ ] **Step 5:** Commit: `feat(identity): searchProfiles (filterable + paginated) + getTimeline`

---

### Task 8: mergeProfiles

**Files:** modify both files. **Most complex op.** TXN with row locks.

- [ ] **Step 1:** Append 3 tests:
  - rejects merge into self
  - rejects when winner not found (mock `pool.connect()` returning a client with mocked `query()`)
  - rejects when reason is empty (`MergeWithoutEvidenceError`)

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement. Inside `mergeProfiles(winnerId, loserId, evidence)`:
  1. Validate `winnerId !== loserId` and `evidence.reason.trim() !== ''`
  2. `const client = await pool.connect()`. Wrap in try/finally with `client.release()`.
  3. BEGIN
  4. `SELECT * FROM user_profiles WHERE profile_id = ANY($1::uuid[]) AND merged_into_profile_id IS NULL ORDER BY profile_id FOR UPDATE` — pass `[[winnerId, loserId]]`. Assert 2 rows; if not, ROLLBACK and throw `ProfileNotFoundError`.
  5. Move identity_links from loser to winner, skipping any (type,value) pairs that already exist on winner (the unique-index conflict prevention).
  6. UPDATE attribution_events.profile_id loser → winner
  7. UPDATE attribution_touches.profile_id loser → winner
  8. UPDATE users.user_profile_id loser → winner
  9. UPDATE user_profiles SET merged_into_profile_id, merged_at on loser
  10. UPDATE winner: first_seen_at = LEAST, last_seen_at = GREATEST, first_utm_* = COALESCE(winner, loser)
  11. INSERT INTO admin_logs (verify columns first — read `src/db/migrations/007_admin_logs.sql` to match the actual schema)
  12. SELECT winner row, COMMIT, return rowToProfile

On any error: ROLLBACK and rethrow.

**Important:** before writing the admin_logs INSERT, read `src/db/migrations/007_admin_logs.sql` to confirm the column names. If they don't match `(action, resource_type, admin_wallet, metadata)`, adjust the INSERT.

- [ ] **Step 4:** Run → PASS (18/18)

- [ ] **Step 5:** Commit: `feat(identity): mergeProfiles in TXN with row locks + audit log`

---

### Task 9: Sub-Sprint 2.0 verification + tag

- [ ] **Step 1:** Run full suite: `npx vitest run` → expect 45+ tests pass (29 prior + 16 new)
- [ ] **Step 2:** `npx tsc --noEmit` → exit 0
- [ ] **Step 3:** Tag: `git tag -a sprint-2-0-identity-service -m "Sub-Sprint 2.0: schema + identityService"`

---

## Sub-Sprint 2.1 — Routes + Ingest + Webhook Wiring

### Task 10: walletSignature helper

**Files:** `src/lib/walletSignature.ts`, `src/__tests__/walletSignature.test.ts`

- [ ] **Step 1:** Write 4 failing tests:
  - accepts a valid signature (build envelope with `nacl.sign.keyPair()` + `bs58.encode`)
  - rejects tampered message
  - rejects empty signature
  - rejects malformed bs58 wallet

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement:
  - `verifyWalletSignature({wallet, message, signature})`: bs58-decode wallet (assert length 32) and signature (assert length 64). Use `nacl.sign.detached.verify(messageBytes, sig, pubkey)`. Catch decode errors and return false.
  - `isSignatureFresh(message, maxAgeSeconds = 300)`: Parse `/^shift-connect:(\d{10,13})$/`. Reject if older than maxAgeSeconds.

- [ ] **Step 4:** Run → PASS (4/4)

- [ ] **Step 5:** Commit: `feat(lib): tweetnacl-based wallet signature verify + freshness check`

---

### Task 11: /api/users routes

**Files:** `src/routes/users.ts`, `src/__tests__/usersRoute.test.ts`

The route module gates all endpoints with the existing `config.adminKey` middleware (same pattern as Sprint 0 routes).

- [ ] **Step 1:** Write 4 failing tests via supertest:
  - GET /api/users without auth → 401
  - GET /api/users with auth → 200 + rows array
  - GET /api/users/:nonexistent → 404
  - GET /api/users/:existingId → 200 + profile

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement all 8 endpoints. Each calls into `identityService`:
  - `GET /` → `searchProfiles(filters)`
  - `GET /search` → `searchProfiles({q, pageSize: 25})` with stricter limit
  - `GET /:profileId` → `getProfile(id)` → 404 if null
  - `GET /:profileId/timeline` → `getTimeline(id, {limit, before})`
  - `GET /:profileId/positions` → SELECT positions JOIN identity_links WHERE profile_id=$1 (no service method; inline query is fine)
  - `POST /:profileId/links` → validate `type` against allowlist + `value` length, then `linkIdentity(profileId, type, value, confidence, {byActor:'admin'})`. Catch `IdentityConflictError` → 409 with `{existingProfileId, suggestion:'merge'}`.
  - `DELETE /:profileId/links/:linkId` → `unlinkIdentity(linkId, reason, 'admin')`
  - `POST /:profileId/merge` → validate reason length > 0, then `mergeProfiles(winnerId, loserId, {byActor:'admin', reason})`. Catch `ProfileNotFoundError` → 404, `MergeWithoutEvidenceError` → 400.
  - `PATCH /:profileId/primary-wallet` → verify wallet is in this profile's links first (SELECT identity_links), then `UPDATE user_profiles SET primary_wallet`. Return `getProfile(id)`.
  - `POST /:profileId/forget` (GDPR) → UPDATE user_profiles nullifying display_name/country_code/wallet_type/first_referrer/first_landing_path. UPDATE identity_links SET unlinked_at=NOW(), unlink_reason='gdpr_forget: ...' WHERE profile_id=$1 AND unlinked_at IS NULL.

Allowlists:
```typescript
const VALID_IDENTITY_TYPES: IdentityType[] = ['wallet','ga_client_id','snag_user_id','x_handle','discord_id','telegram_id','email'];
const VALID_CONFIDENCE: Confidence[] = ['deterministic','probabilistic','manual'];
```

- [ ] **Step 4:** Run → PASS (4/4)

- [ ] **Step 5:** Commit: `feat(routes): /api/users CRUD with auth + validation + GDPR forget`

---

### Task 12: /api/track ingest with rate limiting

**Files:** `src/routes/track.ts`, `src/__tests__/trackRoute.test.ts`

These routes are PUBLIC (no admin auth) — protected by signature verification + rate limiting.

- [ ] **Step 1:** Write 4 failing tests:
  - POST /landing without client_id → 400
  - POST /landing with client_id → 200, calls `recordEvent`
  - POST /wallet_connect with invalid signature → 401
  - POST /wallet_connect with valid signature → 200, returns `{profileId, stitched: true}`

For wallet_connect test, mock `verifyWalletSignature` and `isSignatureFresh` from `../lib/walletSignature`.

- [ ] **Step 2:** Run → FAIL

- [ ] **Step 3:** Implement:
  - `landingLimiter`: `rateLimit({windowMs: 60000, max: 100, standardHeaders: true})`
  - `walletConnectLimiter`: same but `max: 20`
  - `POST /landing`: validate `client_id` is non-empty string. Lowercase all utm_* values. Call `recordEvent({event_name: 'landing', ga_client_id, source, ...})`. Return `{ok: true}`.
  - `POST /wallet_connect`:
    1. Validate body has wallet, signature, message, client_id
    2. `isSignatureFresh(message, 300)` else 401 `stale_signature`
    3. `verifyWalletSignature(envelope)` else 401 `invalid_signature`
    4. `findOrCreateProfile({type:'wallet', value: wallet}, 'system')`
    5. `linkIdentity(profile, 'ga_client_id', client_id, 'deterministic', {byActor:'system'})` — wrap in try/catch for `IdentityConflictError` (log warn, continue)
    6. UPDATE attribution_events SET profile_id=$1, wallet=$2 WHERE ga_client_id=$3 AND profile_id IS NULL (backfill the pre-connect events)
    7. UPDATE user_profiles SET first_utm_* = COALESCE(profile, earliest_event.source) WHERE attribution_locked_at IS NULL (subquery from earliest attribution_events row for this client_id)
    8. `recordEvent({event_name: 'wallet_connect', profile_id, wallet, ga_client_id, session_id})`
    9. Return `{profileId, stitched: true}`

- [ ] **Step 4:** Run → PASS (4/4)

- [ ] **Step 5:** Commit: `feat(routes): /api/track/{landing,wallet_connect} with sig verify + rate limiting`

---

### Task 13: Helius webhook wiring

**Files:** modify `src/services/heliusWebhookHandler.ts`

- [ ] **Step 1:** `grep -nE "handleBuy|handleSell|publishWhaleEvent|positionSizeUSD" src/services/heliusWebhookHandler.ts` to locate the methods and confirm property names.

- [ ] **Step 2:** Add import: `import { findOrCreateProfile, recordEvent } from './identityService';`

- [ ] **Step 3:** In `handleBuy`, AFTER existing `publishWhaleEvent(...)` call, add a try/catch block:
  - `const profile = await findOrCreateProfile({type:'wallet', value: trade.wallet}, 'system')`
  - `await recordEvent({event_name:'position_open', event_id: trade.txSignature ?? \`${trade.wallet}-${Date.now()}\`, profile_id: profile.profileId, wallet: trade.wallet, asset: trade.asset, value_usd: trade.positionSizeUSD, occurred_at: trade.timestamp instanceof Date ? trade.timestamp.toISOString() : trade.timestamp, payload: {side:'long'}})`
  - Catch any error: `console.error('[helius/handleBuy] identity wiring failed', err)` — DO NOT throw (must not block trade processing).

- [ ] **Step 4:** Same pattern in `handleSell` with `event_name: 'position_close'`, `payload: {side: 'short'}`, `value_usd: closed?.position_size_usd ?? null`.

- [ ] **Step 5:** Match property names against actual code. If `trade.txSignature` doesn't exist, use whatever signature field is present.

- [ ] **Step 6:** `npx tsc --noEmit` clean, `npx vitest run` all pass (mock identityService in any Helius test that calls into it)

- [ ] **Step 7:** Commit: `feat(webhook): Helius trades stitch into identity + write attribution_event`

---

### Task 14: Snag webhook wiring

**Files:** modify the Snag webhook handler (likely `src/routes/snag.ts` or a service called from it)

- [ ] **Step 1:** Locate the handler: `grep -rnE "snag.*webhook|snag.*handler|snag_user_id" src/routes/ src/services/ | head -20`

- [ ] **Step 2:** Add import: `import { findOrCreateProfile, linkIdentity, recordEvent } from '../services/identityService';` (adjust path)

- [ ] **Step 3:** In the handler where `users.snag_user_id` is set (or after Snag link event arrives), add try/catch:
  - `const profile = await findOrCreateProfile({type:'wallet', value: wallet}, 'system')`
  - `await linkIdentity(profile.profileId, 'snag_user_id', snagUserId, 'deterministic', {byActor:'system'})`
  - `await recordEvent({event_name:'snag_link', event_id: \`snag-${wallet}-${snagUserId}\`, profile_id: profile.profileId, wallet, payload: {snag_user_id: snagUserId}})`
  - Non-fatal: log and continue on error.

For badge events from Snag, also `recordEvent({event_name:'badge_earn', ...})`.

- [ ] **Step 4:** tsc + vitest pass

- [ ] **Step 5:** Commit: `feat(webhook): Snag events stitch snag_user_id + write attribution_event`

---

### Task 15: Mount new routes

**Files:** modify `src/index.ts`

- [ ] **Step 1:** Add imports near other route imports:
```
import usersRoutes from './routes/users';
import trackRoutes from './routes/track';
```

- [ ] **Step 2:** Mount near other `app.use('/api/...', ...)` calls:
```
app.use('/api/users', usersRoutes);
app.use('/api/track', trackRoutes);
```

- [ ] **Step 3:** tsc + vitest pass

- [ ] **Step 4:** Local smoke (with dev DB):
```
ADMIN_KEY=ShiftRwa2026@@\$\$Key DATABASE_URL=$LOCAL_DEV_DB npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3001/api/users"  # 401
curl -s -o /dev/null -w "%{http_code}\n" -H "x-admin-key: ShiftRwa2026@@\$\$Key" "http://localhost:3001/api/users?pageSize=2"  # 200
curl -s -X POST -H "Content-Type: application/json" -d '{"client_id":"test"}' "http://localhost:3001/api/track/landing"  # {"ok":true}
kill %1 2>/dev/null
```

- [ ] **Step 5:** Commit: `feat(routes): mount /api/users and /api/track`

---

### Task 16: Backfill script

**Files:** `scripts/backfill-profiles.ts`

Idempotent. Single TXN. `--dry-run` flag. Outputs checksum.

- [ ] **Step 1:** Create the script with this shape:
  - `import { pool } from '../src/db/pool';` + `import crypto from 'crypto';`
  - `interface BackfillCounts` with: usersScanned, profilesCreated, walletLinksCreated, gaLinksCreated, snagLinksCreated, firstUtmBackfilled, legacyUnknowns
  - `async function run(dryRun: boolean)`:
    1. `client = await pool.connect()` + BEGIN
    2. Count users where `user_profile_id IS NULL` → usersScanned. If zero, ROLLBACK + return.
    3. **Phase A:** `INSERT INTO user_profiles (primary_wallet, first_seen_at, last_seen_at, created_at, updated_at) SELECT wallet, created_at, COALESCE(updated_at, created_at), created_at, COALESCE(updated_at, created_at) FROM users WHERE user_profile_id IS NULL RETURNING profile_id` → profilesCreated
    4. **Phase A.2:** `UPDATE users u SET user_profile_id = p.profile_id FROM user_profiles p WHERE u.wallet = p.primary_wallet AND u.user_profile_id IS NULL`
    5. **Phase B.1:** `INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by) SELECT u.user_profile_id, 'wallet', u.wallet, 'deterministic', 'backfill_2026_06_03' FROM users u WHERE u.user_profile_id IS NOT NULL ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING` → walletLinksCreated
    6. **Phase B.2:** Same pattern for `ga_user_id` → 'ga_client_id'
    7. **Phase B.3:** Same pattern for `snag_user_id` → 'snag_user_id'
    8. **Phase C:** `UPDATE user_profiles p SET first_utm_source = LOWER(COALESCE(u.referred_by_code, 'unknown_legacy')), attribution_locked_at = NOW() FROM users u WHERE u.user_profile_id = p.profile_id AND p.first_utm_source IS NULL` → firstUtmBackfilled
    9. Count `legacyUnknowns` via `WHERE first_utm_source = 'unknown_legacy'`
    10. If `dryRun`: ROLLBACK and print counts JSON.
    11. Else compute checksum via `md5(COUNT::text || ':' || MIN(profile_id::text) || ':' || MAX(profile_id::text)) FROM user_profiles`. Print checksum + counts. COMMIT.
  - On any error: ROLLBACK + rethrow.
  - Main: `const dryRun = process.argv.includes('--dry-run'); run(dryRun).then(...).catch(...)`

- [ ] **Step 2:** Smoke test if local DB available: `tsx scripts/backfill-profiles.ts --dry-run`

- [ ] **Step 3:** Commit: `feat(scripts): idempotent backfill-profiles with --dry-run + checksum`

---

### Task 17: Sub-Sprint 2.1 verification + tag

- [ ] **Step 1:** `npx vitest run` → 57+ tests pass (29 prior + 16 identity + 4 walletSig + 4 usersRoute + 4 trackRoute)
- [ ] **Step 2:** `npx tsc --noEmit` clean
- [ ] **Step 3:** Local smoke against dev DB (curl all new endpoints)
- [ ] **Step 4:** `npm run build` (recompile dist)
- [ ] **Step 5:** Tag: `git tag -a sprint-2-1-identity-api -m "Sub-Sprint 2.1: identity API + ingest endpoints + webhook wiring"`
- [ ] **Step 6:** Commit dist artifacts: `git add dist/ && git commit -m "build: compile Sub-Sprint 2.1 dist artifacts for Render"`

---

## Backend Plan Complete

Total tasks: 17. Sub-sprints 2.0 + 2.1 produce a working, testable backend API. The companion **frontend plan** (Sub-Sprint 2.2 — Users page UI) and **production deploy plan** (Sub-Sprint 2.3 — backfill + deploy) are separate documents to be written after Sub-Sprint 2.1 ships.

The Sub-Sprint 2.2 frontend plan will:
- Run frontend-design + taste-skill against real endpoint shapes
- Add 11 components (UserListPane, UserListRow, UserDetailPane, IdentityCard, MergeProfilesDialog, AddLinkDialog, TimelineCard, TimelineEntry, SourceAttributionCard, LifetimeStatsCard, ForgetUserDialog)
- Add 4 hooks (useUsersList, useUserProfile, useUserTimeline, useIdentityActions)
- Add 5th top tab with Phosphor `UserCircle` icon
- Add cross-tab deep-linking

Estimated implementation time for THIS plan (Sub-Sprints 2.0 + 2.1): 6-8 days.

---

*End of backend plan.*
