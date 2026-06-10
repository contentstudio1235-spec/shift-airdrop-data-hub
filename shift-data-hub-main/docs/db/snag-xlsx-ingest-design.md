# Snag XLSX Ingest — Design Document

**Author:** Data Engineer agent  
**Date:** 2026-06-04  
**Branch:** feat/snag-xlsx-ingestion  
**Status:** Approved for implementation

---

## Problem

The Snag `rule.completed` webhook never delivers social identity fields (`twitter_name`, `discord_id`, `email`, `display_name`). The `UserMetadata` forward-fix (Sprint 2.7) captures these for new registrations but the 16,148 existing profiles accumulated before that fix have no `x_handle`, `discord_id`, or `email` identity_links and no `display_name`.

Snag's full user export (`Snag user data.xlsx`) is the backfill source.

---

## Sanity Scan

Export file: `Snag user data.xlsx` (Sheet1)

| Field | Count | % of Total |
|-------|-------|-----------|
| Total rows | 71,596 | 100% |
| Has wallet | 71,596 | 100% |
| Has Twitter Name | 56,189 | 78.5% |
| Has Discord ID (snowflake) | 11,123 | 15.5% |
| Has Discord Name | 11,123 | 15.5% |
| Has Email | 69,099 | 96.5% |
| Has Display Name | 7,629 | 10.7% |
| Is Blocked | 0 | 0% |

**Key insight:** The XLSX contains 71,596 Snag users, of which only ~16,148 are registered in our `users` table (wallet matches). The script will skip ~55,000 wallets that are not in our DB. This is expected and correct — we do not create phantom user records from the XLSX.

Of the registered population, we expect to enrich approximately:
- ~78.5% with `x_handle` links
- ~15.5% with `discord_id` links
- ~96.5% with `email` links
- ~10.7% with `display_name` (where currently NULL)

---

## Idempotency Strategy

### Re-run safety
The script is safe to run multiple times against the same XLSX. Re-running produces zero net new rows because:

1. `linkIdentity` (identityService.ts L164-201) checks `identity_type + identity_value` uniqueness first. If the link already exists for the same `profile_id`, it returns the existing row without inserting — guaranteed by `idx_links_unique_active` partial unique index.

2. Display name update uses `COALESCE(display_name, $newValue)` — if `display_name` is already set (from any prior source: webhook, admin edit, prior ingest run), the `COALESCE` returns the existing value and no change occurs.

3. Wallet → profile lookup uses `users.user_profile_id` (set by backfill-profiles.ts). No profile creation happens in this script.

### What happens on conflict
If `identity_type + identity_value` is already linked to a **different** `profile_id`, `linkIdentity` throws `IdentityConflictError`. The script catches this per-link, logs a warning, and continues processing the remaining links for that row. One conflicted link never aborts the row; one bad row never aborts the batch.

---

## Failure Isolation

Every error is caught at the row level. The batch never aborts due to a single bad row.

| Failure mode | Behavior |
|-------------|----------|
| No wallet in XLSX row | Skip — `[snag-ingest] no wallet for snag_user_id=X` |
| Wallet not in `users` table | Skip — `[snag-ingest] wallet not registered: W` |
| `user_profile_id` is NULL on user row | Skip — `[snag-ingest] no profile for wallet: W` |
| `IdentityConflictError` on one link | Log warn, continue other links for same row |
| Unexpected DB error | Log error with row index, continue to next row |

---

## Audit Trail

All `identity_links` rows inserted by this script carry:

```
linked_by = 'snag_xlsx_ingest_2026-06-04'
```

This value is stamped from the run date at startup. It allows:
- Identifying all rows introduced by this batch: `WHERE linked_by = 'snag_xlsx_ingest_2026-06-04'`
- Rolling back the batch if needed: `DELETE FROM identity_links WHERE linked_by = 'snag_xlsx_ingest_2026-06-04'`
- Distinguishing XLSX-sourced links from forward-fix (UserMetadata webhook) links

---

## Discord Identity Decision (Phase 4)

**Decision: Store the Discord Snowflake as `discord_id` value.**

The XLSX has two Discord fields:
- `Discord ID`: numeric snowflake (e.g. `468200508239380481`) — immutable, globally unique
- `Discord Name`: username (e.g. `ghozalin_046`) — mutable since Discord's 2023 username migration

We store the **snowflake** (`Discord ID` column) as the `identity_value` for type `discord_id`. Rationale:
- Discord snowflakes are immutable — they never change for the lifetime of the account
- Discord usernames can change freely post-2023
- The canonical join key for any Discord API call is the snowflake
- Frontend can display the human-readable username in the UI separately (Discord Name column available if needed)

Discord Name is **not** stored as a separate identity_link. It would add noise and conflict risk given its mutability. If display purposes require it, it can be fetched from Discord's API using the stored snowflake.

---

## Display Name Overwrite Protection

```sql
UPDATE user_profiles
SET display_name = COALESCE(display_name, $1), updated_at = NOW()
WHERE profile_id = $2 AND display_name IS NULL
```

`COALESCE(display_name, $newValue)` evaluates to `display_name` if it is already non-NULL. The `WHERE display_name IS NULL` guard makes this a no-op for profiles that already have a name set. An admin-set name is never overwritten.

---

## CLI Contract

```
tsx scripts/ingest-snag-xlsx.ts <xlsx_path> [--dry-run] [--limit=N]
```

| Flag | Behavior |
|------|----------|
| (none) | Real ingestion. Writes to DB. |
| `--dry-run` | Parse + classify rows. Print summary of what WOULD happen. Zero DB writes. |
| `--limit=N` | Process only first N rows. Useful for smoke-testing against production. |

---

## Batching

Rows are processed in batches of 50 with a brief `await` yield between batches. This prevents pool exhaustion (default pool size: 10) across 71,596 rows.

---

## Summary Output Format

```
[snag-ingest] === INGEST COMPLETE ===
[snag-ingest] Rows processed:        16,148
[snag-ingest] Rows skipped (no profile): 55,448
[snag-ingest] x_handle links created:    12,407
[snag-ingest] discord_id links created:  2,319
[snag-ingest] email links created:       14,891
[snag-ingest] snag_user_id links created: 8,204
[snag-ingest] display_names updated:     1,033
[snag-ingest] Conflicts (x_handle):      14
[snag-ingest] Conflicts (discord_id):    3
[snag-ingest] Conflicts (email):         28
[snag-ingest] Errors (unexpected):       0
[snag-ingest] Skipped (not in users):    55,448
[snag-ingest] linked_by tag:            snag_xlsx_ingest_2026-06-04
```

---

## Data Contract Per Layer

| Layer | Table | Role |
|-------|-------|------|
| Source | XLSX file | Raw Snag export — read-only, never modified |
| Silver | `identity_links` | Enriched identity stitching graph |
| Silver | `user_profiles.display_name` | Backfilled display names (null-safe) |
| Audit | `identity_links.linked_by` | Batch tag for traceability and rollback |
