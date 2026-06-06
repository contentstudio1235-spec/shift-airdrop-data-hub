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

  it('includes firstSeenAt in returned rows', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([
      { profile_id: 'p1', primary_wallet: 'WAL', display_name: null, last_seen_at: '2026-06-04', first_seen_at: '2026-01-01', first_utm_source: null, stitched_pct: '50', lifetime_volume_usd: '0', holdings: 0, has_x: false, has_discord: false },
    ] as any).mockResolvedValueOnce([{ total: '1' }] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '1' } as any);
    const result = await searchProfiles({});
    expect(result.rows[0].firstSeenAt).toBe('2026-01-01');
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

  it('uses volume scalar subquery expression when sortBy=volume', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);

    await searchProfiles({ sortBy: 'volume', sortDir: 'desc' });
    const sql = spy.mock.calls[0][0] as string;
    // Must be a correlated scalar subquery against positions joined to identity_links
    // (NOT an outer-level SUM(pos.position_size_usd) which row-multiplies)
    expect(sql).toMatch(/ORDER BY\s*\(\s*SELECT COALESCE\(SUM\(ps\.position_size_usd\), 0\)\s+FROM positions ps\s+JOIN identity_links il2/);
    expect(sql).toMatch(/DESC NULLS LAST/);
    // Must NOT contain the buggy outer-level SUM(pos.position_size_usd) ORDER BY
    expect(sql).not.toMatch(/ORDER BY COALESCE\(SUM\(pos\.position_size_usd\), 0\)/);
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

// ─────────────────────────────────────────────────────────────────────────────
// METRIC RECONCILIATION — listing vs detail volume parity
//
// Bug: the listing endpoint (searchProfiles) computed lifetime_volume_usd via
//   COALESCE(SUM(pos.position_size_usd), 0)
// with `pos` joined through `identity_links il`. For a profile with N active
// identity_links rows, every position row was duplicated N times in the join,
// so the SUM was inflated by exactly N×. The detail endpoint (getProfile) was
// already correct — it uses a scalar subquery scoped only to positions.
//
// These tests assert listing.lifetimeVolumeUSD == detail.lifetimeStats.volumeUSD
// (within $0.01) for a synthetic profile with 7 identity_link rows and
// $629.7863 of position volume. With the buggy SQL this would diverge by 7×.
// ─────────────────────────────────────────────────────────────────────────────
describe('reconciliation: listing volume vs detail volume', () => {
  beforeEach(() => vi.resetAllMocks());

  // Ground-truth fixture matching the live bug report:
  // profile 160034d4-... has 7 identity_links and 6 open positions totaling $629.7863
  const PROFILE_ID = '160034d4-b198-4a9e-a481-9133eb720cce';
  const TRUE_LIFETIME_VOLUME_USD = 629.7863;
  const TRUE_HOLDINGS_VALUE_USD = 629.7863;
  const TRUE_HOLDINGS_COUNT = 6;
  const IDENTITY_LINK_ROWS = 7; // 1 wallet + 6 other identity types

  // Asserts the SQL is the *fixed* pattern (scalar subquery against positions),
  // NOT the buggy pattern (outer-level SUM(pos.position_size_usd)).
  function assertListingSqlIsFixed(sql: string) {
    // Must contain the correlated scalar subquery pattern
    expect(sql).toMatch(/SELECT COALESCE\(SUM\(ps\.position_size_usd\), 0\)\s+FROM positions ps\s+JOIN identity_links il2/);
    // Must NOT have the buggy outer-level SUM(pos.position_size_usd) on the SELECT list or HAVING
    expect(sql).not.toMatch(/COALESCE\(SUM\(pos\.position_size_usd\), 0\) AS lifetime_volume_usd/);
    expect(sql).not.toMatch(/COALESCE\(SUM\(pos\.position_size_usd\) FILTER \(WHERE pos\.status = 'open'\), 0\) AS holdings_value_usd/);
    // Must NOT join positions at the outer-query level
    expect(sql).not.toMatch(/LEFT JOIN positions pos/);
  }

  it('listing returns the SAME lifetimeVolumeUSD as detail returns volumeUSD', async () => {
    // Capture the SQL that searchProfiles sends, structurally verify the fix,
    // then return the ground-truth values (which is what the FIXED SQL would
    // produce against real data).
    const listingSqlSpy = vi.spyOn(db, 'query').mockImplementationOnce(async (sql: string) => {
      assertListingSqlIsFixed(sql);
      return [{
        profile_id: PROFILE_ID,
        primary_wallet: '54ex2ifuYVUvWyT9',
        display_name: 'Coinhunter Crypto',
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-06-05T00:00:00Z',
        first_utm_source: 'twitter',
        stitched_pct: '100.0',
        lifetime_volume_usd: String(TRUE_LIFETIME_VOLUME_USD),
        holdings_value_usd: String(TRUE_HOLDINGS_VALUE_USD),
        holdings: TRUE_HOLDINGS_COUNT,
        has_x: true,
        has_discord: true,
      }] as any;
    });
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '1' } as any);

    const listingResult = await searchProfiles({ q: '54ex2ifu', page: 1, pageSize: 5 });
    expect(listingSqlSpy).toHaveBeenCalled();
    expect(listingResult.rows).toHaveLength(1);

    const listingRow = listingResult.rows.find(r => r.profileId === PROFILE_ID);
    expect(listingRow).toBeDefined();
    const listingVolume = listingRow!.lifetimeVolumeUSD;

    // Now call detail endpoint — its SQL already uses scalar subqueries scoped
    // to positions, so it returns the true value directly.
    vi.spyOn(db, 'queryOne')
      .mockResolvedValueOnce({   // user_profiles row
        profile_id: PROFILE_ID,
        primary_wallet: '54ex2ifuYVUvWyT9',
        display_name: 'Coinhunter Crypto',
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-06-05T00:00:00Z',
        first_utm_source: 'twitter', first_utm_medium: null, first_utm_campaign: null,
        first_utm_content: null, first_utm_term: null, first_referrer: null,
        first_landing_path: null, attribution_locked_at: null,
        last_utm_source: 'twitter', last_utm_medium: null, last_utm_campaign: null,
        wallet_type: null, country_code: null,
        merged_into_profile_id: null, merged_at: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-05T00:00:00Z',
      } as any)
      .mockResolvedValueOnce({   // lifetimeStats — ground truth
        xp: '12500',
        volume_usd: String(TRUE_LIFETIME_VOLUME_USD),
        positions: String(TRUE_HOLDINGS_COUNT),
        badges: '4',
      } as any);
    vi.spyOn(db, 'query').mockResolvedValueOnce(
      // 7 identity_links rows — exactly the count that triggered the N× inflation
      Array.from({ length: IDENTITY_LINK_ROWS }, (_, i) => ({
        id: i + 1,
        profile_id: PROFILE_ID,
        identity_type: ['wallet', 'ga_client_id', 'snag_user_id', 'x_handle', 'discord_id', 'telegram_id', 'email'][i],
        identity_value: `link-${i}`,
        confidence: 'deterministic',
        evidence_event_id: null,
        linked_at: '2026-01-01T00:00:00Z',
        linked_by: 'system', unlinked_at: null, unlinked_by: null, unlink_reason: null,
      })) as any
    );

    const detailResult = await getProfile(PROFILE_ID);
    expect(detailResult).not.toBeNull();
    expect(detailResult!.links).toHaveLength(IDENTITY_LINK_ROWS);
    const detailVolume = detailResult!.lifetimeStats!.volumeUSD;

    // ── Reconciliation assertion ─────────────────────────────────────────────
    // Both endpoints MUST agree to within $0.01. Pre-fix: they diverged by 7×.
    const delta = Math.abs(listingVolume - detailVolume);
    expect(delta).toBeLessThanOrEqual(0.01);
    expect(listingVolume).toBeCloseTo(TRUE_LIFETIME_VOLUME_USD, 2);
    expect(detailVolume).toBeCloseTo(TRUE_LIFETIME_VOLUME_USD, 2);

    // Sanity: would a 7× inflation have been caught? Yes — the listing value
    // would have been 4408.50 vs detail 629.79, delta = 3778.71, well above 0.01.
    expect(delta).toBeLessThan(TRUE_LIFETIME_VOLUME_USD * (IDENTITY_LINK_ROWS - 1)); // would fail with row multiplication
  });

  it('listing SQL does NOT join positions at outer level (would cause row multiplication)', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);
    await searchProfiles({});
    const sql = spy.mock.calls[0][0] as string;
    assertListingSqlIsFixed(sql);
  });

  it('listing SQL uses scalar subqueries for volume + holdings_value + holdings', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);
    await searchProfiles({});
    const sql = spy.mock.calls[0][0] as string;
    // All three position-derived metrics must use the scoped subquery pattern
    const subqueryCount = (sql.match(/FROM positions ps\s+JOIN identity_links il2/g) || []).length;
    expect(subqueryCount).toBeGreaterThanOrEqual(3); // volume + holdings_value + holdings (more if sort_expr also uses one)
  });

  it('walletSizeMin HAVING clause uses scalar subquery (not outer-level SUM)', async () => {
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([] as any);
    vi.spyOn(db, 'queryOne').mockResolvedValueOnce({ total: '0' } as any);
    await searchProfiles({ walletSizeMin: 1000 });
    const sql = spy.mock.calls[0][0] as string;
    expect(sql).toMatch(/HAVING/);
    expect(sql).toMatch(/>= 1000/);
    // HAVING must use the scoped subquery, not COALESCE(SUM(pos.position_size_usd), 0)
    expect(sql).not.toMatch(/HAVING COALESCE\(SUM\(pos\.position_size_usd\), 0\) >=/);
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
