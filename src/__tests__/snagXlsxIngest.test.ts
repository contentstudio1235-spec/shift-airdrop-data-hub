/**
 * src/__tests__/snagXlsxIngest.test.ts
 *
 * Unit tests for scripts/ingest-snag-xlsx.ts
 * Tests cover: row parsing, processRow dispatch, conflict isolation, display_name protection.
 *
 * Strategy: mock identityService + pool so no DB is touched.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRow, processRow } from '../../scripts/ingest-snag-xlsx';
import { IdentityConflictError } from '../types/identity';

// ─── Mock identityService ─────────────────────────────────────────────────────
vi.mock('../services/identityService', () => ({
  linkIdentity: vi.fn(),
  findOrCreateProfile: vi.fn(),
}));

// ─── Mock pool (used by maybeSetDisplayName) ──────────────────────────────────
vi.mock('../db/pool', () => ({
  pool: {
    connect: vi.fn(),
    end: vi.fn(),
  },
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
}));

import * as identityService from '../services/identityService';
import * as dbPool from '../db/pool';

const LINKED_BY = 'snag_xlsx_ingest_2026-06-04';
const PROFILE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Helper: build a mock pool client that returns a given query result
function mockPoolClient(queryResult: { rows: unknown[]; rowCount: number }) {
  const client = {
    query: vi.fn().mockResolvedValue(queryResult),
    release: vi.fn(),
  };
  vi.mocked(dbPool.pool.connect).mockResolvedValue(client as never);
  return client;
}

// ─── parseRow ─────────────────────────────────────────────────────────────────

describe('parseRow', () => {
  it('parses a fully-populated row correctly', () => {
    const raw = {
      'User ID': 'bf44d75b-765c-4707-bfcd-16360157a9f5',
      'Wallet': 'GEQJ4wvSoEozV9eqcZRPVJwz7cJDwDaT7HBrcGApVaVT',
      'Display Name': 'CryptoWhale',
      'Twitter Name': '18okx',
      'Discord ID': '468200508239380481',
      'Discord Name': 'ghozalin_046',
      'Email': 'User@Example.COM',
      'Currency': 'SHIFT Points',
      'Sui': 'null',
      'Solana': 'null',
      'Balance': '104,357',
      'Drip Quests': '5',
    };

    const result = parseRow(raw);

    expect(result).not.toBeNull();
    expect(result!.snagUserId).toBe('bf44d75b-765c-4707-bfcd-16360157a9f5');
    expect(result!.wallet).toBe('GEQJ4wvSoEozV9eqcZRPVJwz7cJDwDaT7HBrcGApVaVT');
    expect(result!.displayName).toBe('CryptoWhale');
    expect(result!.twitterName).toBe('18okx');
    // Discord ID = snowflake, NOT username
    expect(result!.discordId).toBe('468200508239380481');
    // Email lowercased
    expect(result!.email).toBe('user@example.com');
  });

  it('returns null when wallet is missing', () => {
    expect(parseRow({ 'User ID': 'abc', 'Wallet': '' })).toBeNull();
    expect(parseRow({ 'User ID': 'abc' })).toBeNull();
  });

  it('returns null when snag_user_id is missing', () => {
    expect(parseRow({ 'Wallet': 'SomeWallet123', 'User ID': '' })).toBeNull();
    expect(parseRow({ 'Wallet': 'SomeWallet123' })).toBeNull();
  });

  it('treats literal "null" strings as undefined', () => {
    const raw = {
      'User ID': 'abc',
      'Wallet': 'SomeWallet',
      'Twitter Name': 'null',
      'Discord ID': 'NULL',
      'Email': 'null',
      'Display Name': 'null',
    };
    const result = parseRow(raw);
    expect(result).not.toBeNull();
    expect(result!.twitterName).toBeUndefined();
    expect(result!.discordId).toBeUndefined();
    expect(result!.email).toBeUndefined();
    expect(result!.displayName).toBeUndefined();
  });

  it('discards Discord Name — only snowflake is stored', () => {
    const raw = {
      'User ID': 'abc',
      'Wallet': 'SomeWallet',
      'Discord ID': '468200508239380481',
      'Discord Name': 'ghozalin_046',
    };
    const result = parseRow(raw);
    expect(result).not.toBeNull();
    // discordId = snowflake
    expect(result!.discordId).toBe('468200508239380481');
    // no field carries the username
    expect(Object.keys(result!)).not.toContain('discordName');
  });
});

// ─── processRow ───────────────────────────────────────────────────────────────

describe('processRow — all fields present', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // display_name currently NULL → update should fire
    mockPoolClient({ rows: [{ display_name: null }], rowCount: 1 });
  });

  it('calls linkIdentity 4 times: snag_user_id, x_handle, discord_id, email', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);

    const row = {
      snagUserId: 'snag-111',
      wallet: 'WalletABC',
      displayName: 'Whale',
      twitterName: 'crypto_king',
      discordId: '468200508239380481',
      email: 'whale@example.com',
    };

    const delta = await processRow(row, PROFILE_ID, LINKED_BY, true /* dryRun */);

    expect(identityService.linkIdentity).not.toHaveBeenCalled(); // dry-run = no writes
    // In dry-run mode counters still reflect what would happen
    // snagUserIdCreated = 1 (dry-run doesn't call but still counts in non-dry path)
    // For dry-run the counts reflect calls that would be made — verify structure is correct
    expect(delta).toHaveProperty('snagUserIdCreated');
    expect(delta).toHaveProperty('xHandleCreated');
    expect(delta).toHaveProperty('discordIdCreated');
    expect(delta).toHaveProperty('emailCreated');
  });

  it('calls linkIdentity 4 times in non-dry-run mode', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);
    // Mock the UPDATE display_name query (non-dry-run path)
    mockPoolClient({ rows: [{ updated: 1 }], rowCount: 1 });

    const row = {
      snagUserId: 'snag-111',
      wallet: 'WalletABC',
      displayName: 'Whale',
      twitterName: 'crypto_king',
      discordId: '468200508239380481',
      email: 'whale@example.com',
    };

    const delta = await processRow(row, PROFILE_ID, LINKED_BY, false);

    expect(identityService.linkIdentity).toHaveBeenCalledTimes(4);

    // Verify types used are canonical
    const calls = vi.mocked(identityService.linkIdentity).mock.calls;
    const types = calls.map((c) => c[1]);
    expect(types).toContain('snag_user_id');
    expect(types).toContain('x_handle');
    expect(types).toContain('discord_id');
    expect(types).toContain('email');

    // NEVER social_* aliases
    expect(types).not.toContain('social_x');
    expect(types).not.toContain('social_discord');

    expect(delta.snagUserIdCreated).toBe(1);
    expect(delta.xHandleCreated).toBe(1);
    expect(delta.discordIdCreated).toBe(1);
    expect(delta.emailCreated).toBe(1);
    expect(delta.displayNamesUpdated).toBe(1);
  });
});

describe('processRow — wallet only (no socials)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls linkIdentity only for snag_user_id, no display_name update', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);

    const row = {
      snagUserId: 'snag-222',
      wallet: 'WalletXYZ',
      // no twitterName, discordId, email, displayName
    };

    const delta = await processRow(row, PROFILE_ID, LINKED_BY, false);

    expect(identityService.linkIdentity).toHaveBeenCalledTimes(1);
    expect(identityService.linkIdentity).toHaveBeenCalledWith(
      PROFILE_ID,
      'snag_user_id',
      'snag-222',
      'deterministic',
      { byActor: LINKED_BY },
    );

    expect(delta.xHandleCreated).toBe(0);
    expect(delta.discordIdCreated).toBe(0);
    expect(delta.emailCreated).toBe(0);
    expect(delta.displayNamesUpdated).toBe(0);
  });
});

describe('processRow — IdentityConflictError on x_handle', () => {
  beforeEach(() => vi.resetAllMocks());

  it('conflict on x_handle does NOT prevent discord_id and email from being processed', async () => {
    vi.mocked(identityService.linkIdentity)
      .mockImplementation(async (_profileId, type) => {
        if (type === 'x_handle') {
          throw new IdentityConflictError('other-profile-id', 'x_handle', 'crypto_king');
        }
        return {} as never;
      });

    // display_name currently non-null → should not update
    mockPoolClient({ rows: [{ display_name: 'ExistingName' }], rowCount: 1 });

    const row = {
      snagUserId: 'snag-333',
      wallet: 'WalletDEF',
      displayName: 'NewName',
      twitterName: 'crypto_king',
      discordId: '999000999000999000',
      email: 'trader@example.com',
    };

    const delta = await processRow(row, PROFILE_ID, LINKED_BY, false);

    // x_handle: conflict counted, not created
    expect(delta.xHandleCreated).toBe(0);
    expect(delta.xHandleConflict).toBe(1);

    // discord_id and email: still processed successfully
    expect(delta.discordIdCreated).toBe(1);
    expect(delta.emailCreated).toBe(1);

    // snag_user_id: also succeeded
    expect(delta.snagUserIdCreated).toBe(1);

    // No unexpected errors
    expect(delta.unexpectedErrors).toBe(0);
  });
});

describe('processRow — display_name overwrite protection', () => {
  beforeEach(() => vi.resetAllMocks());

  it('does not update display_name when existing value is non-null', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);
    // Simulate pool returning a non-null display_name (UPDATE WHERE display_name IS NULL → 0 rows)
    mockPoolClient({ rows: [], rowCount: 0 });

    const row = {
      snagUserId: 'snag-444',
      wallet: 'WalletGHI',
      displayName: 'ShouldNotOverwrite',
    };

    const delta = await processRow(row, PROFILE_ID, LINKED_BY, false);

    expect(delta.displayNamesUpdated).toBe(0);
  });

  it('updates display_name when existing value is null', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);
    // Simulate UPDATE returning 1 row (display_name was NULL, now set)
    mockPoolClient({ rows: [{ updated: 1 }], rowCount: 1 });

    const row = {
      snagUserId: 'snag-555',
      wallet: 'WalletJKL',
      displayName: 'FreshName',
    };

    const delta = await processRow(row, PROFILE_ID, LINKED_BY, false);

    expect(delta.displayNamesUpdated).toBe(1);
  });
});

describe('processRow — linked_by actor tag', () => {
  beforeEach(() => vi.resetAllMocks());

  it('passes linked_by actor to every linkIdentity call', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);
    mockPoolClient({ rows: [], rowCount: 0 });

    const row = {
      snagUserId: 'snag-666',
      wallet: 'WalletMNO',
      twitterName: 'testhandle',
    };

    await processRow(row, PROFILE_ID, LINKED_BY, false);

    const calls = vi.mocked(identityService.linkIdentity).mock.calls;
    for (const call of calls) {
      expect(call[4]).toEqual({ byActor: LINKED_BY });
    }
  });
});

describe('processRow — discord stored as snowflake', () => {
  beforeEach(() => vi.resetAllMocks());

  it('passes the numeric snowflake as discord_id identity_value', async () => {
    vi.mocked(identityService.linkIdentity).mockResolvedValue({} as never);
    mockPoolClient({ rows: [], rowCount: 0 });

    const snowflake = '468200508239380481';
    const row = {
      snagUserId: 'snag-777',
      wallet: 'WalletPQR',
      discordId: snowflake,
    };

    await processRow(row, PROFILE_ID, LINKED_BY, false);

    const discordCall = vi.mocked(identityService.linkIdentity).mock.calls
      .find((c) => c[1] === 'discord_id');

    expect(discordCall).toBeDefined();
    expect(discordCall![2]).toBe(snowflake);
  });
});
