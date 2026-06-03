import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findOrCreateProfile, linkIdentity, unlinkIdentity, recordEvent, getProfile } from '../services/identityService';
import { IdentityConflictError } from '../types/identity';
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
