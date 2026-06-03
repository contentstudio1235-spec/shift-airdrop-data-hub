import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findOrCreateProfile, linkIdentity, unlinkIdentity, recordEvent, getProfile, searchProfiles, getTimeline, mergeProfiles } from '../services/identityService';
import { IdentityConflictError, ProfileNotFoundError, MergeWithoutEvidenceError } from '../types/identity';
import * as db from '../db/pool';

vi.mock('../db/pool');

function makeProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    profile_id: 'p-1',
    primary_wallet: 'AbCd1234',
    display_name: null,
    first_seen_at: '2026-06-01T00:00:00Z',
    last_seen_at: '2026-06-03T00:00:00Z',
    first_utm_source: null,
    first_utm_medium: null,
    first_utm_campaign: null,
    first_utm_content: null,
    first_utm_term: null,
    first_referrer: null,
    first_landing_path: null,
    attribution_locked_at: null,
    last_utm_source: null,
    last_utm_medium: null,
    last_utm_campaign: null,
    wallet_type: null,
    country_code: null,
    merged_into_profile_id: null,
    merged_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-03T00:00:00Z',
    ...overrides,
  };
}

describe('findOrCreateProfile', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns existing profile when identity is already linked', async () => {
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce(makeProfileRow({
      profile_id: 'p-existing',
      first_utm_source: 'twitter',
      last_utm_source: 'twitter',
    }) as any);

    const profile = await findOrCreateProfile({ type: 'wallet', value: 'AbCd1234' }, 'system');
    expect(profile.profileId).toBe('p-existing');
    expect(profile.primaryWallet).toBe('AbCd1234');
  });

  it('creates new profile + link when identity not found', async () => {
    vi.spyOn(db, 'queryOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeProfileRow({ profile_id: 'p-new', primary_wallet: 'NewWa11et' }) as any);
    vi.spyOn(db, 'execute').mockResolvedValueOnce(1);

    const profile = await findOrCreateProfile({ type: 'wallet', value: 'NewWa11et' }, 'system');
    expect(profile.profileId).toBe('p-new');
    expect(profile.primaryWallet).toBe('NewWa11et');
  });

  it('lowercases identity values for non-wallet types', async () => {
    const qOne = vi.spyOn(db, 'queryOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeProfileRow({ profile_id: 'p-2', primary_wallet: '' }) as any);
    vi.spyOn(db, 'execute').mockResolvedValueOnce(1);

    await findOrCreateProfile({ type: 'x_handle', value: 'CryptoTrader' }, 'system');
    const lookupCallArgs = qOne.mock.calls[0][1] as unknown[];
    expect(lookupCallArgs).toContain('cryptotrader');
  });

  it('preserves wallet case (Solana addresses are case-sensitive base58)', async () => {
    vi.spyOn(db, 'queryOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeProfileRow({ profile_id: 'p-3', primary_wallet: 'AbCd1234XyZ' }) as any);
    vi.spyOn(db, 'execute').mockResolvedValueOnce(1);

    const profile = await findOrCreateProfile({ type: 'wallet', value: 'AbCd1234XyZ' }, 'system');
    expect(profile.primaryWallet).toBe('AbCd1234XyZ');
  });
});

describe('linkIdentity', () => {
  beforeEach(() => vi.resetAllMocks());

  it('inserts a new link', async () => {
    vi.spyOn(db, 'queryOne')
      .mockResolvedValueOnce(null)   // no existing active link
      .mockResolvedValueOnce({
        id: 42, profile_id: 'p-1', identity_type: 'snag_user_id', identity_value: 'snag-abc',
        confidence: 'deterministic', evidence_event_id: null, linked_at: '2026-06-03T00:00:00Z',
        linked_by: 'system', unlinked_at: null, unlinked_by: null, unlink_reason: null,
      } as any);

    const link = await linkIdentity('p-1', 'snag_user_id', 'snag-abc', 'deterministic', { byActor: 'system' });
    expect(link.id).toBe(42);
    expect(link.identityValue).toBe('snag-abc');
  });

  it('throws IdentityConflictError when identity already linked to another profile', async () => {
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({
      profile_id: 'p-other', id: 1, identity_type: 'snag_user_id', identity_value: 'snag-abc',
      confidence: 'deterministic', evidence_event_id: null, linked_at: '...',
      linked_by: 'system', unlinked_at: null, unlinked_by: null, unlink_reason: null,
    } as any);

    await expect(
      linkIdentity('p-1', 'snag_user_id', 'snag-abc', 'deterministic', { byActor: 'system' })
    ).rejects.toBeInstanceOf(IdentityConflictError);
  });

  it('is idempotent when identity already linked to the SAME profile', async () => {
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({
      profile_id: 'p-1', id: 99, identity_type: 'snag_user_id', identity_value: 'snag-abc',
      confidence: 'deterministic', evidence_event_id: null, linked_at: '2026-06-03T00:00:00Z',
      linked_by: 'system', unlinked_at: null, unlinked_by: null, unlink_reason: null,
    } as any);

    const link = await linkIdentity('p-1', 'snag_user_id', 'snag-abc', 'deterministic', { byActor: 'system' });
    expect(link.id).toBe(99);
  });
});

describe('unlinkIdentity', () => {
  beforeEach(() => vi.resetAllMocks());

  it('soft-deletes the link', async () => {
    const exec = vi.spyOn(db, 'execute').mockResolvedValueOnce(1);
    await unlinkIdentity(42, 'duplicate snag account', 'admin-wallet');
    expect(exec).toHaveBeenCalled();
    const params = exec.mock.calls[0][1] as unknown[];
    expect(params).toContain('duplicate snag account');
    expect(params).toContain('admin-wallet');
  });
});

describe('recordEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('inserts an attribution_event and returns its id', async () => {
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ id: 1001 } as any);

    const result = await recordEvent({
      event_name: 'position_open',
      event_id: 'tx-abc-123',
      profile_id: 'p-1',
      wallet: 'AbCd1234',
      value_usd: 1500,
      asset: 'TSL2L',
    });
    expect(result.eventId).toBe(1001);
  });

  it('is idempotent — returns existing id on UNIQUE conflict', async () => {
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ id: 555 } as any);

    const result = await recordEvent({
      event_name: 'position_open',
      event_id: 'tx-abc-123',
      profile_id: 'p-1',
    });
    expect(result.eventId).toBe(555);
  });
});

describe('getProfile', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns null when profile not found', async () => {
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce(null);
    const result = await getProfile('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns profile with links and lifetime stats', async () => {
    vi.spyOn(db, 'queryOne')
      .mockResolvedValueOnce(makeProfileRow({
        profile_id: 'p-1',
        first_utm_source: 'twitter',
        last_utm_source: 'twitter',
      }) as any)
      .mockResolvedValueOnce({
        xp: '8420.5',
        volume_usd: '42500.0',
        positions: '12',
        badges: '4',
      } as any);

    vi.spyOn(db, 'query').mockResolvedValueOnce([
      {
        id: 1, profile_id: 'p-1', identity_type: 'wallet', identity_value: 'AbCd1234',
        confidence: 'deterministic', evidence_event_id: null, linked_at: '2026-06-01T00:00:00Z',
        linked_by: 'backfill', unlinked_at: null, unlinked_by: null, unlink_reason: null,
      },
    ] as any);

    const profile = await getProfile('p-1');
    expect(profile).not.toBeNull();
    expect(profile!.profileId).toBe('p-1');
    expect(profile!.links).toHaveLength(1);
    expect(profile!.lifetimeStats?.xp).toBe(8420.5);
    expect(profile!.lifetimeStats?.volumeUSD).toBe(42500);
  });
});

describe('searchProfiles', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns paginated profile summaries', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      {
        profile_id: 'p-1', primary_wallet: 'AbCd1234', display_name: null,
        last_seen_at: '2026-06-03T00:00:00Z', first_utm_source: 'twitter',
        stitched_pct: '95.0', lifetime_volume_usd: '4200.0',
        holdings: '3', has_x: true, has_discord: false,
      },
    ] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '1' } as any);

    const result = await searchProfiles({ page: 1, pageSize: 50 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].profileId).toBe('p-1');
    expect(result.rows[0].stitchedPct).toBe(95);
    expect(result.rows[0].holdings).toBe(3);
    expect(result.rows[0].hasX).toBe(true);
    expect(result.rows[0].hasDiscord).toBe(false);
    expect(result.total).toBe(1);
  });

  it('applies source filter via parameterized SQL', async () => {
    const qSpy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);

    await searchProfiles({ source: 'twitter', page: 1, pageSize: 50 });
    const params = qSpy.mock.calls[0][1] as unknown[];
    expect(params).toContain('twitter');
  });
});

describe('searchProfiles sort', () => {
  beforeEach(() => vi.resetAllMocks());

  it('defaults to last_seen DESC when sortBy not provided', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);

    await searchProfiles({});
    const sql = spy.mock.calls[0][0] as string;
    expect(sql).toMatch(/ORDER BY p\.last_seen_at DESC NULLS LAST/);
  });

  it('uses volume SUM expression when sortBy=volume', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);

    await searchProfiles({ sortBy: 'volume', sortDir: 'desc' });
    const sql = spy.mock.calls[0][0] as string;
    expect(sql).toMatch(/ORDER BY COALESCE\(SUM\(pos\.position_size_usd\), 0\) DESC/);
  });

  it('rejects unknown sortBy by falling back to last_seen', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);

    await searchProfiles({ sortBy: 'DROP TABLE users' as any });
    const sql = spy.mock.calls[0][0] as string;
    expect(sql).toMatch(/ORDER BY p\.last_seen_at/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });
});

describe('getTimeline', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns events for a profile, newest first', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { id: 1, event_name: 'position_open', occurred_at: '2026-06-03T01:00:00Z',
        source: 'twitter', asset: 'TSL2L', value_usd: '1500.0', payload: {} },
      { id: 2, event_name: 'wallet_connect', occurred_at: '2026-06-02T01:00:00Z',
        source: 'twitter', asset: null, value_usd: null, payload: {} },
    ] as any);

    const entries = await getTimeline('p-1', { limit: 30 });
    expect(entries).toHaveLength(2);
    expect(entries[0].eventName).toBe('position_open');
    expect(entries[0].valueUSD).toBe(1500);
  });
});

describe('mergeProfiles', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects merge into self', async () => {
    await expect(
      mergeProfiles('p-1', 'p-1', { byActor: 'admin', reason: 'test' })
    ).rejects.toThrow(/itself/i);
  });

  it('rejects merge with empty reason', async () => {
    await expect(
      mergeProfiles('p-1', 'p-2', { byActor: 'admin', reason: '   ' })
    ).rejects.toBeInstanceOf(MergeWithoutEvidenceError);
  });

  it('rejects merge when one of the profiles is not found', async () => {
    // Mock pool.connect to return a client whose SELECT FOR UPDATE returns only 1 row
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({})                    // BEGIN
        .mockResolvedValueOnce({ rows: [             // SELECT ... FOR UPDATE — only 1 of 2 found
          { profile_id: 'p-1', primary_wallet: 'AbCd', display_name: null,
            first_seen_at: '2026-06-01T00:00:00Z', last_seen_at: '2026-06-03T00:00:00Z',
            first_utm_source: null, first_utm_medium: null, first_utm_campaign: null,
            first_utm_content: null, first_utm_term: null, first_referrer: null,
            first_landing_path: null, attribution_locked_at: null,
            last_utm_source: null, last_utm_medium: null, last_utm_campaign: null,
            wallet_type: null, country_code: null, merged_into_profile_id: null,
            merged_at: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-03T00:00:00Z' },
        ] })
        .mockResolvedValueOnce({}),                   // ROLLBACK
      release: vi.fn(),
    };
    vi.spyOn(db.pool, 'connect').mockResolvedValueOnce(mockClient as any);

    await expect(
      mergeProfiles('p-1', 'p-missing', { byActor: 'admin', reason: 'duplicate' })
    ).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});
