#!/usr/bin/env tsx
/**
 * scripts/ingest-snag-xlsx.ts
 *
 * Idempotent MERGE of Snag user export XLSX into identity_links + user_profiles.
 * Safe to re-run — produces zero net new rows on a second pass.
 *
 * Usage:
 *   tsx scripts/ingest-snag-xlsx.ts <xlsx_path> [--dry-run] [--limit=N]
 *
 * Design doc: docs/db/snag-xlsx-ingest-design.md
 */

import ExcelJS from 'exceljs';
import { pool, queryOne } from '../src/db/pool';
import { linkIdentity, normalizeIdentityValue } from '../src/services/identityService';
import type { IdentityType } from '../src/types/identity';
import { IdentityConflictError } from '../src/types/identity';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SnagRow {
  snagUserId: string;
  wallet: string;
  displayName?: string;
  twitterName?: string;
  discordId?: string;    // stored value = snowflake (immutable), NOT username
  email?: string;
}

interface IngestCounters {
  rowsProcessed: number;
  skippedNoProfile: number;    // wallet not in users table OR no user_profile_id
  xHandleCreated: number;
  xHandleIdempotent: number;
  xHandleConflict: number;
  discordIdCreated: number;
  discordIdIdempotent: number;
  discordIdConflict: number;
  emailCreated: number;
  emailIdempotent: number;
  emailConflict: number;
  snagUserIdCreated: number;
  snagUserIdIdempotent: number;
  displayNamesUpdated: number;
  unexpectedErrors: number;
}

// ─── XLSX loading (exceljs — no known CVEs) ───────────────────────────────────

/**
 * Load the first worksheet of an XLSX file and return rows as plain objects.
 * Row 1 is treated as headers; subsequent rows are mapped to those headers.
 */
export async function loadWorkbook(path: string): Promise<Array<Record<string, unknown>>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  const headers: string[] = [];
  const rows: Array<Record<string, unknown>> = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      // header row
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '').trim();
      });
      return;
    }
    const obj: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber - 1];
      if (key) obj[key] = cell.value;
    });
    rows.push(obj);
  });
  return rows;
}

// ─── Row parsing ──────────────────────────────────────────────────────────────

/**
 * Normalise a raw XLSX cell value. Returns undefined for:
 *   - null / undefined
 *   - empty string
 *   - literal string "null" (case-insensitive)
 */
function norm(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'null') return undefined;
  return s;
}

/**
 * Parse a raw XLSX row dict into a typed SnagRow.
 * Returns null if mandatory fields (wallet, snag_user_id) are absent.
 */
export function parseRow(r: Record<string, unknown>): SnagRow | null {
  const wallet = norm(r['Wallet']);
  const snagUserId = norm(r['User ID']);
  if (!wallet || !snagUserId) return null;

  // Discord ID: store the SNOWFLAKE (numeric string), not the username.
  // Discord Name is intentionally dropped — mutable since 2023 username migration.
  const discordId = norm(r['Discord ID']);

  return {
    snagUserId,
    wallet,
    displayName: norm(r['Display Name']),
    twitterName: norm(r['Twitter Name']),
    discordId,
    email: norm(r['Email'])?.toLowerCase(),
  };
}

// ─── Profile resolution ───────────────────────────────────────────────────────

/**
 * Resolve the profile_id for a wallet.
 * Returns null if the wallet is not in users, or the user has no user_profile_id.
 * Does NOT create new users or profiles — this script only enriches existing profiles.
 */
async function resolveProfileId(wallet: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ user_profile_id: string | null }>(
      'SELECT user_profile_id FROM users WHERE wallet = $1 LIMIT 1',
      [wallet],
    );
    if (result.rowCount === 0) return null;          // wallet not registered
    return result.rows[0].user_profile_id ?? null;   // null = profile not yet created
  } finally {
    client.release();
  }
}

/**
 * Update display_name only if the current value is NULL.
 * Never overwrites an existing (admin-set or webhook-set) display name.
 */
async function maybeSetDisplayName(
  profileId: string,
  displayName: string,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) {
    // In dry-run, check whether the name is currently null to count accurately
    const client = await pool.connect();
    try {
      const r = await client.query<{ display_name: string | null }>(
        'SELECT display_name FROM user_profiles WHERE profile_id = $1 LIMIT 1',
        [profileId],
      );
      return r.rows[0]?.display_name === null || r.rows[0]?.display_name === undefined;
    } finally {
      client.release();
    }
  }

  const client = await pool.connect();
  try {
    const r = await client.query<{ updated: number }>(
      `UPDATE user_profiles
          SET display_name = $1, updated_at = NOW()
        WHERE profile_id = $2
          AND display_name IS NULL
       RETURNING 1 AS updated`,
      [displayName, profileId],
    );
    return (r.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

// ─── Dry-run prediction ───────────────────────────────────────────────────────

/**
 * In dry-run mode, predict what linkIdentity would do for a given (type, value)
 * by reading identity_links directly — no writes.
 *
 * Returns:
 *   'created'    — no existing row → real run would INSERT
 *   'idempotent' — existing row belongs to SAME profile → real run would no-op
 *   'conflict'   — existing row belongs to DIFFERENT profile → real run would throw IdentityConflictError
 */
export async function predictLink(
  profileId: string,
  type: IdentityType,
  value: string,
): Promise<'created' | 'idempotent' | 'conflict'> {
  const existing = await queryOne<{ profile_id: string }>(
    `SELECT profile_id FROM identity_links WHERE identity_type = $1 AND identity_value = $2 AND unlinked_at IS NULL`,
    [type, normalizeIdentityValue(type, value)],
  );
  if (!existing) return 'created';
  if (existing.profile_id === profileId) return 'idempotent';
  return 'conflict';
}

// ─── Per-row processor ────────────────────────────────────────────────────────

/**
 * Process a single parsed SnagRow.
 * All identity link errors are swallowed at the link level — one conflict
 * never prevents the other links for the same row from being processed.
 * Returns per-row delta counters.
 */
export async function processRow(
  row: SnagRow,
  profileId: string,
  linkedBy: string,
  dryRun: boolean,
): Promise<Partial<IngestCounters>> {
  const delta: Partial<IngestCounters> = {
    xHandleCreated: 0,
    xHandleIdempotent: 0,
    xHandleConflict: 0,
    discordIdCreated: 0,
    discordIdIdempotent: 0,
    discordIdConflict: 0,
    emailCreated: 0,
    emailIdempotent: 0,
    emailConflict: 0,
    snagUserIdCreated: 0,
    snagUserIdIdempotent: 0,
    displayNamesUpdated: 0,
    unexpectedErrors: 0,
  };

  // Helper: attempt one linkIdentity call, tally the result.
  // In dry-run mode, queries identity_links to predict create/idempotent/conflict accurately.
  async function attemptLink(
    type: IdentityType,
    value: string,
    createdKey: keyof IngestCounters,
    idempotentKey: keyof IngestCounters,
    conflictKey: keyof IngestCounters,
  ) {
    try {
      if (dryRun) {
        const outcome = await predictLink(profileId, type, value);
        if (outcome === 'created') {
          (delta[createdKey] as number) = ((delta[createdKey] as number) ?? 0) + 1;
        } else if (outcome === 'idempotent') {
          (delta[idempotentKey] as number) = ((delta[idempotentKey] as number) ?? 0) + 1;
        } else {
          // conflict
          (delta[conflictKey] as number) = ((delta[conflictKey] as number) ?? 0) + 1;
        }
        return;
      }
      await linkIdentity(profileId, type, value, 'deterministic', { byActor: linkedBy });
      (delta[createdKey] as number) = ((delta[createdKey] as number) ?? 0) + 1;
    } catch (err) {
      if (err instanceof IdentityConflictError) {
        console.warn(
          `[snag-ingest] CONFLICT ${type}=${value} already linked to profile ${err.existingProfileId} (our profile=${profileId}) — skipping this link`,
        );
        (delta[conflictKey] as number) = ((delta[conflictKey] as number) ?? 0) + 1;
      } else {
        process.stderr.write('[snag-ingest] unexpected error linking ' + String(type) + '=' + String(value) + ': ' + String(err) + '\n');
        delta.unexpectedErrors = (delta.unexpectedErrors ?? 0) + 1;
      }
    }
  }

  // 1. snag_user_id (always present if we got here)
  await attemptLink('snag_user_id', row.snagUserId, 'snagUserIdCreated', 'snagUserIdIdempotent', 'unexpectedErrors');

  // 2. x_handle
  if (row.twitterName) {
    await attemptLink('x_handle', row.twitterName, 'xHandleCreated', 'xHandleIdempotent', 'xHandleConflict');
  }

  // 3. discord_id (stored as snowflake)
  if (row.discordId) {
    await attemptLink('discord_id', row.discordId, 'discordIdCreated', 'discordIdIdempotent', 'discordIdConflict');
  }

  // 4. email
  if (row.email) {
    await attemptLink('email', row.email, 'emailCreated', 'emailIdempotent', 'emailConflict');
  }

  // 5. display_name — only if current value is NULL
  if (row.displayName) {
    const updated = await maybeSetDisplayName(profileId, row.displayName, dryRun);
    if (updated) delta.displayNamesUpdated = 1;
  }

  return delta;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Argument parsing ──────────────────────────────────────────────────────
  const args = process.argv.slice(2);
  const xlsxPath = args.find((a) => !a.startsWith('--')); // first non-flag arg = file path
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  if (!xlsxPath) {
    console.error('Usage: tsx scripts/ingest-snag-xlsx.ts <xlsx_path> [--dry-run] [--limit=N]');
    process.exit(1);
  }

  const runDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const linkedBy = `snag_xlsx_ingest_${runDate}`;

  console.log(`[snag-ingest] Starting${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`[snag-ingest] File:       ${xlsxPath}`);
  console.log(`[snag-ingest] linked_by:  ${linkedBy}`);
  if (limit) console.log(`[snag-ingest] Limit:      ${limit}`);

  // ── Parse XLSX ────────────────────────────────────────────────────────────
  console.log('[snag-ingest] Loading workbook...');
  const rawRows = await loadWorkbook(xlsxPath);

  const targetRows = limit ? rawRows.slice(0, limit) : rawRows;
  console.log(`[snag-ingest] Rows to process: ${targetRows.length}`);

  // ── Counters ──────────────────────────────────────────────────────────────
  const counters: IngestCounters = {
    rowsProcessed: 0,
    skippedNoProfile: 0,
    xHandleCreated: 0,
    xHandleIdempotent: 0,
    xHandleConflict: 0,
    discordIdCreated: 0,
    discordIdIdempotent: 0,
    discordIdConflict: 0,
    emailCreated: 0,
    emailIdempotent: 0,
    emailConflict: 0,
    snagUserIdCreated: 0,
    snagUserIdIdempotent: 0,
    displayNamesUpdated: 0,
    unexpectedErrors: 0,
  };

  // ── Process in batches to avoid pool exhaustion (pool max: 5) ────────────
  const BATCH_SIZE = 10;

  for (let i = 0; i < targetRows.length; i += BATCH_SIZE) {
    const batch = targetRows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (rawRow, batchIdx) => {
        const rowIdx = i + batchIdx;

        // Parse row
        const row = parseRow(rawRow);
        if (!row) {
          console.warn(`[snag-ingest] row ${rowIdx}: no wallet or snag_user_id — skipping`);
          counters.skippedNoProfile++;
          return;
        }

        // Resolve profile
        let profileId: string | null;
        try {
          profileId = await resolveProfileId(row.wallet);
        } catch (err) {
          process.stderr.write('[snag-ingest] row ' + String(rowIdx) + ': failed to resolve wallet ' + String(row.wallet) + ': ' + String(err) + '\n');
          counters.unexpectedErrors++;
          return;
        }

        if (!profileId) {
          console.log(`[snag-ingest] wallet not registered: ${row.wallet} (snag_user_id=${row.snagUserId})`);
          counters.skippedNoProfile++;
          return;
        }

        // Process links
        counters.rowsProcessed++;
        try {
          const delta = await processRow(row, profileId, linkedBy, dryRun);
          counters.xHandleCreated += delta.xHandleCreated ?? 0;
          counters.xHandleIdempotent += delta.xHandleIdempotent ?? 0;
          counters.xHandleConflict += delta.xHandleConflict ?? 0;
          counters.discordIdCreated += delta.discordIdCreated ?? 0;
          counters.discordIdIdempotent += delta.discordIdIdempotent ?? 0;
          counters.discordIdConflict += delta.discordIdConflict ?? 0;
          counters.emailCreated += delta.emailCreated ?? 0;
          counters.emailIdempotent += delta.emailIdempotent ?? 0;
          counters.emailConflict += delta.emailConflict ?? 0;
          counters.snagUserIdCreated += delta.snagUserIdCreated ?? 0;
          counters.snagUserIdIdempotent += delta.snagUserIdIdempotent ?? 0;
          counters.displayNamesUpdated += delta.displayNamesUpdated ?? 0;
          counters.unexpectedErrors += delta.unexpectedErrors ?? 0;
        } catch (err) {
          process.stderr.write('[snag-ingest] row ' + String(rowIdx) + ': unexpected error for wallet ' + String(row.wallet) + ': ' + String(err) + '\n');
          counters.unexpectedErrors++;
        }
      }),
    );

    // Progress log every 1000 rows
    const processed = Math.min(i + BATCH_SIZE, targetRows.length);
    if (processed % 1000 < BATCH_SIZE || processed === targetRows.length) {
      console.log(`[snag-ingest] Progress: ${processed}/${targetRows.length} rows`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const dryLabel = dryRun ? ' (DRY RUN — no writes)' : '';
  console.log('');
  console.log(`[snag-ingest] === INGEST COMPLETE${dryLabel} ===`);
  console.log(`[snag-ingest] Rows matched to profiles:    ${counters.rowsProcessed}`);
  console.log(`[snag-ingest] Rows skipped (not in users): ${counters.skippedNoProfile}`);
  console.log('');
  console.log(`[snag-ingest] x_handle:    would create ${counters.xHandleCreated}, idempotent ${counters.xHandleIdempotent}, conflict ${counters.xHandleConflict}`);
  console.log(`[snag-ingest] discord_id:  would create ${counters.discordIdCreated}, idempotent ${counters.discordIdIdempotent}, conflict ${counters.discordIdConflict}`);
  console.log(`[snag-ingest] email:        would create ${counters.emailCreated}, idempotent ${counters.emailIdempotent}, conflict ${counters.emailConflict}`);
  console.log(`[snag-ingest] snag_user_id: would create ${counters.snagUserIdCreated}, idempotent ${counters.snagUserIdIdempotent}`);
  console.log(`[snag-ingest] display_names updated:       ${counters.displayNamesUpdated}`);
  console.log(`[snag-ingest] unexpected errors:           ${counters.unexpectedErrors}`);
  console.log(`[snag-ingest] linked_by tag:               ${linkedBy}`);

  await pool.end();
  process.exit(counters.unexpectedErrors > 0 ? 1 : 0);
}

// Only auto-run when executed directly (tsx scripts/ingest-snag-xlsx.ts).
// Skipped when imported by vitest or other test runners.
const isMain = process.argv[1]?.endsWith('ingest-snag-xlsx.ts') ||
               process.argv[1]?.endsWith('ingest-snag-xlsx.js');
if (isMain) {
  main().catch((err) => {
    console.error('[snag-ingest] Fatal error:', err);
    process.exit(1);
  });
}
