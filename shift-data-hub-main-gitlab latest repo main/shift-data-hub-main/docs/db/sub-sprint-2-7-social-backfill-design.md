# Sub-Sprint 2.7 — Social Identity Backfill: Database Design

**Author:** Database Optimizer  
**Branch:** `feat/sprint-3-attribution-viz`  
**Status:** Design complete — hand off to Data Engineer

---

## Schema Assessment

### Does `identity_links` have the right unique index for idempotent inserts?

Yes. Migration 017 creates:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique_active
  ON identity_links(identity_type, identity_value) WHERE unlinked_at IS NULL;
```

This is a **partial unique index** on `(identity_type, identity_value)` filtered to active (non-unlinked) rows only. It is exactly the right shape for our `ON CONFLICT` clause. The constraint name for the `ON CONFLICT ON CONSTRAINT` syntax is `idx_links_unique_active`.

Note: PostgreSQL allows `ON CONFLICT ON CONSTRAINT <name>` only for actual named constraints (created via `CONSTRAINT` keyword), not for indexes. Since `idx_links_unique_active` is an index, not a constraint, the backfill SQL must use `ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING` instead. See the backfill SQL section for the correct form.

### Does a new index need to be added?

**NO.** The existing index `idx_ae_profile_event_time ON attribution_events(profile_id, event_name, occurred_at DESC)` already covers the `WHERE event_name = 'snag_task_complete' AND profile_id IS NOT NULL` filter pattern in the backfill queries. The `ON CONFLICT` resolution uses the existing partial unique index, which is a cheap index lookup.

**No migration 018 is needed.**

---

## Payload Shape Findings — CRITICAL FINDING

**The webhook handler does NOT save the social handle (X username, Discord username, Telegram username) into `attribution_events.payload` at all.**

Reading `snagWebhookHandler.ts` lines 104-181 precisely:

1. `handleRuleCompleted` extracts from the inbound Snag payload:
   - `walletAddress` — the user's Solana wallet
   - `ruleId` — the Snag rule ID
   - `snagUserId` — the Snag account ID (a UUID)

2. It maps `ruleId → taskId` (`x_follow`, `discord`, `telegram`, `wallet`, `first_trade`)

3. It writes exactly **two** `attribution_events` rows:
   - `event_name = 'snag_link'` with `payload = { snag_user_id: <snagUserId> }`
   - `event_name = 'snag_task_complete'` with `payload = { rule_id: <ruleId>, task_id: <taskId> }`

4. It calls `linkIdentity(profile, 'snag_user_id', snagUserId, ...)` — links the Snag UUID only.

**The social handle (the X @username, the Discord username, the Telegram username) is never read from `data`, never stored in `payload`, and never passed to `linkIdentity`.** The Snag webhook payload almost certainly contains the handle (Snag Stratus `rule.completed` events include the user's connected social account details), but the handler discards it.

### Consequence for backfill scope

There is **zero** social handle data in `attribution_events` today. The backfill SQL approach (mining payload JSONB for handles) cannot produce any rows — there is nothing to mine.

The correct backfill path is:

1. **Forward fix first (Data Engineer):** Update `handleRuleCompleted` to extract the social handle from `data` and call `linkIdentity` for `x_handle`, `discord_id`, or `telegram_id`. Start collecting data going forward.

2. **Historical backfill via Snag API (if needed):** If historical social links are required, query the Snag API directly for each `snag_user_id` we already have in `identity_links` to retrieve their connected social accounts. This is a separate workstream and requires Snag API rate-limit analysis.

3. **The SQL backfill below is written against the `snag_task_complete` event** to identify which profiles completed each social task — this gives us the set of profiles that *need* social links but don't have them yet. It is a **gap analysis query**, not a data-mining query.

---

## Backfill SQL

### Sanity scan — run first

```sql
-- Run before any INSERT. Establishes upper bound on backfill candidates.
SELECT
  COUNT(*) FILTER (WHERE event_name = 'x_follow')             AS x_events,
  COUNT(*) FILTER (WHERE event_name = 'discord')              AS discord_events,
  COUNT(*) FILTER (WHERE event_name = 'telegram')             AS telegram_events,
  COUNT(*) FILTER (WHERE event_name = 'snag_task_complete'
    AND payload->>'task_id' = 'x_follow')                     AS snag_x_task_completions,
  COUNT(*) FILTER (WHERE event_name = 'snag_task_complete'
    AND payload->>'task_id' = 'discord')                      AS snag_discord_task_completions,
  COUNT(*) FILTER (WHERE event_name = 'snag_task_complete'
    AND payload->>'task_id' = 'telegram')                     AS snag_telegram_task_completions
FROM attribution_events;
```

Expected result given current payload shape: `x_events = 0`, `discord_events = 0`, `telegram_events = 0`. The `snag_task_complete` counts will show how many profiles completed each Snag social task (which is the population that needs social handles once the forward fix is deployed).

---

### Gap analysis queries (run after forward fix is deployed and handles start arriving)

These queries identify profiles that completed a social task but still lack the corresponding `identity_links` row. They are the input for any future Snag API backfill.

```sql
-- Profiles that completed x_follow task but have no x_handle identity link
SELECT DISTINCT ae.profile_id
FROM attribution_events ae
WHERE ae.event_name = 'snag_task_complete'
  AND ae.payload->>'task_id' = 'x_follow'
  AND ae.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM identity_links il
    WHERE il.profile_id = ae.profile_id
      AND il.identity_type = 'x_handle'
      AND il.unlinked_at IS NULL
  );

-- Profiles that completed discord task but have no discord_id identity link
SELECT DISTINCT ae.profile_id
FROM attribution_events ae
WHERE ae.event_name = 'snag_task_complete'
  AND ae.payload->>'task_id' = 'discord'
  AND ae.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM identity_links il
    WHERE il.profile_id = ae.profile_id
      AND il.identity_type = 'discord_id'
      AND il.unlinked_at IS NULL
  );

-- Profiles that completed telegram task but have no telegram_id identity link
SELECT DISTINCT ae.profile_id
FROM attribution_events ae
WHERE ae.event_name = 'snag_task_complete'
  AND ae.payload->>'task_id' = 'telegram'
  AND ae.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM identity_links il
    WHERE il.profile_id = ae.profile_id
      AND il.identity_type = 'telegram_id'
      AND il.unlinked_at IS NULL
  );
```

---

### Forward-path INSERT statements (for use after forward fix lands)

Once `handleRuleCompleted` stores the social handle in `payload` (e.g., `payload->>'x_handle'` for X), these are the idempotent INSERT statements. The exact JSON path depends on what the Data Engineer extracts from the Snag `data` object — see the "Uncertainty" section at the bottom of this document.

**Assumed payload shapes (to be confirmed by Data Engineer):**
- X: `event_name = 'x_follow'`, `payload->>'x_handle'` contains the Twitter/X username
- Discord: `event_name = 'discord'`, `payload->>'discord_username'` contains the Discord username  
- Telegram: `event_name = 'telegram'`, `payload->>'telegram_username'` contains the Telegram username

```sql
-- INSERT 1: X handles
-- Uses DISTINCT ON to pick earliest event per profile per handle (honest link history)
INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by, linked_at)
SELECT DISTINCT ON (ae.profile_id, ae.payload->>'x_handle')
       ae.profile_id,
       'x_handle',
       LOWER(TRIM(LEADING '@' FROM ae.payload->>'x_handle')),  -- normalize: strip @, lowercase
       'deterministic',
       'backfill_sub_sprint_2_7',
       MIN(ae.occurred_at) OVER (
         PARTITION BY ae.profile_id, ae.payload->>'x_handle'
       )
FROM attribution_events ae
WHERE ae.event_name = 'x_follow'
  AND ae.profile_id IS NOT NULL
  AND ae.payload->>'x_handle' IS NOT NULL
  AND ae.payload->>'x_handle' <> ''
ORDER BY ae.profile_id, ae.payload->>'x_handle', ae.occurred_at ASC
ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING;
```

```sql
-- INSERT 2: Discord handles
INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by, linked_at)
SELECT DISTINCT ON (ae.profile_id, ae.payload->>'discord_username')
       ae.profile_id,
       'discord_id',
       LOWER(TRIM(ae.payload->>'discord_username')),
       'deterministic',
       'backfill_sub_sprint_2_7',
       MIN(ae.occurred_at) OVER (
         PARTITION BY ae.profile_id, ae.payload->>'discord_username'
       )
FROM attribution_events ae
WHERE ae.event_name = 'discord'
  AND ae.profile_id IS NOT NULL
  AND ae.payload->>'discord_username' IS NOT NULL
  AND ae.payload->>'discord_username' <> ''
ORDER BY ae.profile_id, ae.payload->>'discord_username', ae.occurred_at ASC
ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING;
```

```sql
-- INSERT 3: Telegram handles
INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by, linked_at)
SELECT DISTINCT ON (ae.profile_id, ae.payload->>'telegram_username')
       ae.profile_id,
       'telegram_id',
       LOWER(TRIM(ae.payload->>'telegram_username')),
       'deterministic',
       'backfill_sub_sprint_2_7',
       MIN(ae.occurred_at) OVER (
         PARTITION BY ae.profile_id, ae.payload->>'telegram_username'
       )
FROM attribution_events ae
WHERE ae.event_name = 'telegram'
  AND ae.profile_id IS NOT NULL
  AND ae.payload->>'telegram_username' IS NOT NULL
  AND ae.payload->>'telegram_username' <> ''
ORDER BY ae.profile_id, ae.payload->>'telegram_username', ae.occurred_at ASC
ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING;
```

**Note on `ON CONFLICT` syntax:** The index `idx_links_unique_active` is a partial index, not a named constraint. PostgreSQL requires the full predicate to be restated in the conflict target: `ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING`. The `ON CONFLICT ON CONSTRAINT idx_links_unique_active` form will fail with `there is no unique constraint matching given keys`.

**Note on `identity_type` values:** `src/types/identity.ts` defines the union as `'x_handle' | 'discord_id' | 'telegram_id'` — not `social_x`, `social_discord`, `social_telegram` as referenced in the task brief. The SQL above uses the actual TypeScript enum values. The `ProfileSummary.hasX` and `hasDiscord` fields in the query layer should filter on `'x_handle'` and `'discord_id'` respectively.

---

## Query Plan Reasoning

### INSERT 1 — X handles

- **Filter on `event_name`:** The composite index `idx_ae_profile_event_time ON attribution_events(profile_id, event_name, occurred_at DESC)` is not usable for an `event_name`-only filter (leading column is `profile_id`). PostgreSQL will perform a **sequential scan** on `attribution_events` filtered by `event_name = 'x_follow'`. Given that `x_follow` events will be a small fraction of total rows (one per user who followed), this scan is acceptable. If the table grows to millions of rows and this becomes slow, a dedicated `idx_ae_event_name ON attribution_events(event_name)` partial index could be added — but that is premature at current scale.
- **DISTINCT ON cost:** O(n log n) sort on `(profile_id, payload->>'x_handle', occurred_at)` — acceptable for a one-shot backfill.
- **ON CONFLICT cost:** Each conflict check is a single partial unique index lookup on `idx_links_unique_active` — O(log n) per row. Cheap.
- **Estimated affected rows:** At most equal to the number of distinct `(profile_id, x_handle)` pairs in `attribution_events` where `event_name = 'x_follow'`. Currently 0 (no handle data exists yet).

### INSERT 2 — Discord handles

- Same plan reasoning as INSERT 1. Seq scan on `event_name = 'discord'`, cheap conflict resolution.

### INSERT 3 — Telegram handles

- Same plan reasoning as INSERT 1. Seq scan on `event_name = 'telegram'`, cheap conflict resolution.

**Summary:** All three INSERTs will seq-scan `attribution_events` for a one-time backfill. This is correct and expected. The table has a UNIQUE constraint on `(event_name, event_id)` which keeps duplicate event ingestion from accumulating rows, so the table size is bounded. No new index is needed for backfill correctness or performance.

---

## Dry-Run Output Contract

The backfill script at `scripts/backfill-social-identities.ts` must, when invoked with `--dry-run`, print:

```
=== DRY RUN — sub-sprint 2.7 social identity backfill ===

[Sanity scan]
  x_events in attribution_events:              <N>
  discord_events in attribution_events:         <N>
  telegram_events in attribution_events:        <N>
  snag_task_complete (x_follow):               <N>
  snag_task_complete (discord):                <N>
  snag_task_complete (telegram):               <N>

[Expected affected rows — if run for real]
  x_handle links to insert:                   <N>   (SELECT COUNT(*) wrapping INSERT 1 SELECT)
  discord_id links to insert:                 <N>   (SELECT COUNT(*) wrapping INSERT 2 SELECT)
  telegram_id links to insert:                <N>   (SELECT COUNT(*) wrapping INSERT 3 SELECT)

[No new index migration — 018 is not needed]

[SQL that would run]
  <paste INSERT 1 SQL>
  <paste INSERT 2 SQL>
  <paste INSERT 3 SQL>

=== DRY RUN complete — no rows written ===
```

The "expected affected rows" counts must be derived by wrapping the SELECT portion of each INSERT in `SELECT COUNT(*)` (not by running the INSERT inside a transaction and rolling back, to avoid lock contention on prod).

---

## Identity Type Mismatch — Action Required Before Backfill

The task brief references `social_x`, `social_discord`, `social_telegram` as `identity_type` values. The actual codebase (`src/types/identity.ts`) defines:

```typescript
export type IdentityType =
  | 'wallet'
  | 'ga_client_id'
  | 'snag_user_id'
  | 'x_handle'      // NOT 'social_x'
  | 'discord_id'    // NOT 'social_discord'
  | 'telegram_id'   // NOT 'social_telegram'
  | 'email';
```

The `ProfileSummary` interface defines `hasX: boolean` and `hasDiscord: boolean` — without comments pointing to `social_x`. The admin users list query that drives these sort fields must filter on `identity_type = 'x_handle'` and `identity_type = 'discord_id'`, not `social_x` / `social_discord`. If the query layer uses the wrong type strings, `hasX` and `hasDiscord` will always be false even after a successful backfill — this is the most likely cause of the current 0-row count if the forward fix has already been partially deployed.

---

## Payload Shape — Confirmed

**Source:** Snag Stratus webhook docs at `https://docs.snagsolutions.io/stratus/subscriptions` and the Get Users API schema at `https://docs.snagsolutions.io/api-reference/identity/get-users.md`, fetched 2026-06-04.

### Critical finding: social handles are NOT in `rule.completed` / `LoyaltyRuleStatus`

The `LoyaltyRuleStatus` event (emitted as `rule.completed` or `loyalty.rule.completed`) contains:

```json
{
  "id": "...",
  "websiteId": "...",
  "organizationId": "...",
  "userId": "...",
  "loyaltyRuleId": "...",
  "progress": 100,
  "fulfilledAt": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "loyaltyRule": { "id": "...", "name": "..." },
  "user": { "id": "...", "walletAddress": "..." }
}
```

There are **no social handles** (`twitterUser`, `discordUser`, `telegramUsername`) in this event. The `user` object contains only `id` and `walletAddress`.

### Social handles live in the `UserMetadata` event

A separate Snag Stratus event — `UserMetadata` (emitted when a user's profile is created or updated) — carries social handles as flat fields on the `userMetadata` object. Confirmed field names from the Snag API schema:

```
X / Twitter:  event.twitterUser        // string, the Twitter/X username (not nested — flat field)
Discord:      event.discordUser        // string, the Discord username (flat field)
Telegram:     event.telegramUsername   // string, the Telegram username (flat field, different naming convention)
```

These are flat string fields, not nested objects. The `UserMetadata` event fires when a user connects or updates their social account — which happens at social task verification time on Snag's side, overlapping with but separate from the `LoyaltyRuleStatus` event.

### Confirmed wallet resolution path

Since `UserMetadata` does not directly include `walletAddress` in the event body (only `userId` and `userMetadata.user.walletAddress`), the handler must resolve the profile via `snag_user_id` or wallet from the `UserMetadata` payload's `user.walletAddress` field.

### Consequence for the forward fix

The extraction logic must be added to a **new `handleUserMetadata` handler** in `snagWebhookHandler.ts`, NOT inside `handleRuleCompleted`. The `processEvent` router must be extended to recognise the `UserMetadata` event type string from Snag and dispatch to the new handler.

### Confirmed JSON paths for production implementation

```
X handle:        data.twitterUser                    // flat string on the userMetadata payload
Discord:         data.discordUser                    // flat string on the userMetadata payload
Telegram:        data.telegramUsername               // flat string (note: different key from Twitter/Discord pattern)
Wallet:          data.user?.walletAddress || data.walletAddress
Snag User ID:    data.userId || data.user?.id
```

---

## Why Backfill Is Not Feasible (Sub-Sprint 2.7)

A SQL backfill against `attribution_events.payload` is not possible because:

1. The handler never wrote social handles into `attribution_events.payload` — confirmed by the Database Optimizer's reading of the handler code.
2. The Snag `rule.completed` webhook does not include social handles at all — confirmed by doc inspection above.

The only feasible historical backfill path is a **Snag REST API enrichment loop**: for each `snag_user_id` in `identity_links`, call the Snag `GET /users` API, read `userMetadata.twitterUser` / `discordUser` / `telegramUsername`, and upsert into `identity_links`. This requires Snag API rate-limit analysis and is out of scope for Sub-Sprint 2.7. No `scripts/backfill-social-identities.ts` is created.

---

## Summary

| Item | Value |
|------|-------|
| Unique index for idempotent insert | `idx_links_unique_active` (partial, correct shape) |
| New migration needed | NO |
| Social handles in `rule.completed` payload | NO — not present in `LoyaltyRuleStatus` event |
| Social handles in `UserMetadata` payload | YES — `twitterUser`, `discordUser`, `telegramUsername` (flat fields) |
| Backfill rows producible today | 0 — no handle data in attribution_events |
| Backfill via Snag REST API | Out of scope for Sub-Sprint 2.7 |
| Correct `ON CONFLICT` syntax | `ON CONFLICT (identity_type, identity_value) WHERE unlinked_at IS NULL DO NOTHING` |
| Correct identity_type for X | `'x_handle'` (not `'social_x'`) |
| Correct identity_type for Discord | `'discord_id'` (not `'social_discord'`) |
| Correct identity_type for Telegram | `'telegram_id'` (not `'social_telegram'`) |
| Forward fix location | New `handleUserMetadata` in `snagWebhookHandler.ts` |
| Backfill script | NOT created — backfill blocked pending Snag API integration |
