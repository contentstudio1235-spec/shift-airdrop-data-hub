// src/__tests__/snagWebhookHandler.test.ts
//
// Tests for SnagWebhookHandler.handleUserMetadata — social handle extraction.
//
// Key design constraints reflected here:
// - handleUserMetadata is called for event types 'user.metadata.updated' / 'UserMetadata'
// - Social handles live in the Snag UserMetadata payload as flat fields:
//     twitterUser, discordUser, telegramUsername
// - linkIdentity must be called with canonical identity types:
//     'x_handle', 'discord_id', 'telegram_id' (never 'social_x' etc.)
// - byActor MUST be 'snag_webhook'
// - IdentityConflictError on a social handle is swallowed + warned — never throws to caller
// - Webhook responds 200 even when linkIdentity fails (no 5xx)
// - Missing handles (undefined/null) are silently skipped — no linkIdentity call

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SnagWebhookHandler } from '../services/snagWebhookHandler';
import * as identitySvc from '../services/identityService';
import { IdentityConflictError } from '../types/identity';

// Mock the db pool so no real postgres calls happen
vi.mock('../db/pool', () => ({
  execute: vi.fn().mockResolvedValue(1),
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  pool: {} as any,
}));

// Mock the identity service — we assert on what's called, not implementation
vi.mock('../services/identityService');

// Config mock — bypass signature verification in tests
vi.mock('../config', () => ({
  config: {
    nodeEnv: 'test',
    snagWebhookSecret: '',  // empty → dev-mode bypass in verifySignature
    snagSocialRuleIds: {
      follow_x:       'rule-x',
      join_discord:   'rule-discord',
      join_telegram:  'rule-telegram',
      connect_wallet: 'rule-wallet',
      first_trade:    'rule-trade',
    },
  },
}));

// Helper — a stable profile object returned by findOrCreateProfile mocks
function makeProfile(profileId = 'p-test-1') {
  return {
    profileId,
    primaryWallet: 'TestWa11et1234',
    displayName: null,
    firstSeenAt: '2026-06-04T00:00:00Z',
    lastSeenAt:  '2026-06-04T00:00:00Z',
    firstUtmSource: null, firstUtmMedium: null, firstUtmCampaign: null,
    firstUtmContent: null, firstUtmTerm: null,
    firstReferrer: null, firstLandingPath: null,
    attributionLockedAt: null,
    lastUtmSource: null, lastUtmMedium: null, lastUtmCampaign: null,
    walletType: null, countryCode: null,
    mergedIntoProfileId: null, mergedAt: null,
    createdAt: '2026-06-04T00:00:00Z', updatedAt: '2026-06-04T00:00:00Z',
  };
}

// Helper — a stable identity link returned by linkIdentity mocks
function makeLink(type: string, value: string) {
  return {
    id: 99,
    profileId: 'p-test-1',
    identityType: type,
    identityValue: value,
    confidence: 'deterministic' as const,
    evidenceEventId: null,
    linkedAt: '2026-06-04T00:00:00Z',
    linkedBy: 'snag_webhook',
    unlinkedAt: null,
    unlinkedBy: null,
    unlinkReason: null,
  };
}

// Direct access to private method via type cast — avoids Express app overhead
function getHandler(): SnagWebhookHandler {
  return new SnagWebhookHandler();
}

// Cast to any to call private handleUserMetadata without TypeScript complaints
function callHandleUserMetadata(handler: SnagWebhookHandler, data: any): Promise<void> {
  return (handler as any).handleUserMetadata(data);
}

// ── UserMetadata event: X handle ─────────────────────────────────────────────

describe('handleUserMetadata — X handle (x_handle)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('links x_handle with canonical type and byActor=snag_webhook when twitterUser is present', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('x_handle', 'tomerwn'));

    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      twitterUser: 'tomerwn',
    });

    expect(identitySvc.linkIdentity).toHaveBeenCalledWith(
      'p-test-1',
      'x_handle',
      'tomerwn',
      'deterministic',
      { byActor: 'snag_webhook' },
    );
  });

  it('skips x_handle link when twitterUser is missing from payload', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValue(makeLink('discord_id', 'shift_user'));

    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      // twitterUser is absent
      discordUser: 'shift_user',
    });

    // linkIdentity should NOT be called for x_handle
    const xHandleCalls = vi.mocked(identitySvc.linkIdentity).mock.calls
      .filter(([, type]) => type === 'x_handle');
    expect(xHandleCalls).toHaveLength(0);
  });

  it('does not throw when x_handle is already linked to a different profile (IdentityConflictError)', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockRejectedValueOnce(
      new IdentityConflictError('p-other', 'x_handle', 'tomerwn'),
    );

    // Must resolve without throwing — conflict is swallowed
    await expect(
      callHandleUserMetadata(getHandler(), {
        walletAddress: 'TestWa11et1234',
        twitterUser: 'tomerwn',
      }),
    ).resolves.toBeUndefined();
  });

  it('skips x_handle when value exceeds 128 characters', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValue(makeLink('x_handle', 'x'));

    const tooLong = 'a'.repeat(129);
    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      twitterUser: tooLong,
    });

    const xHandleCalls = vi.mocked(identitySvc.linkIdentity).mock.calls
      .filter(([, type]) => type === 'x_handle');
    expect(xHandleCalls).toHaveLength(0);
  });
});

// ── UserMetadata event: Discord ───────────────────────────────────────────────

describe('handleUserMetadata — Discord (discord_id)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('links discord_id with canonical type and byActor=snag_webhook when discordUser is present', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('discord_id', 'shiftrwa_user'));

    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      discordUser: 'shiftrwa_user',
    });

    expect(identitySvc.linkIdentity).toHaveBeenCalledWith(
      'p-test-1',
      'discord_id',
      'shiftrwa_user',
      'deterministic',
      { byActor: 'snag_webhook' },
    );
  });

  it('does not throw when discord_id is already linked to a different profile', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockRejectedValueOnce(
      new IdentityConflictError('p-other', 'discord_id', 'shiftrwa_user'),
    );

    await expect(
      callHandleUserMetadata(getHandler(), {
        walletAddress: 'TestWa11et1234',
        discordUser: 'shiftrwa_user',
      }),
    ).resolves.toBeUndefined();
  });
});

// ── UserMetadata event: Telegram ──────────────────────────────────────────────

describe('handleUserMetadata — Telegram (telegram_id)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('links telegram_id with canonical type and byActor=snag_webhook when telegramUsername is present', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('telegram_id', 'shiftrwa_tg'));

    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      telegramUsername: 'shiftrwa_tg',
    });

    expect(identitySvc.linkIdentity).toHaveBeenCalledWith(
      'p-test-1',
      'telegram_id',
      'shiftrwa_tg',
      'deterministic',
      { byActor: 'snag_webhook' },
    );
  });

  it('does not throw when telegram_id is already linked to a different profile', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockRejectedValueOnce(
      new IdentityConflictError('p-other', 'telegram_id', 'shiftrwa_tg'),
    );

    await expect(
      callHandleUserMetadata(getHandler(), {
        walletAddress: 'TestWa11et1234',
        telegramUsername: 'shiftrwa_tg',
      }),
    ).resolves.toBeUndefined();
  });
});

// ── Multi-social payload (all three present) ──────────────────────────────────

describe('handleUserMetadata — all three social handles in one payload', () => {
  beforeEach(() => vi.resetAllMocks());

  it('links all three identities when payload includes all three handles', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity')
      .mockResolvedValueOnce(makeLink('x_handle', 'tomerwn'))
      .mockResolvedValueOnce(makeLink('discord_id', 'shiftrwa_user'))
      .mockResolvedValueOnce(makeLink('telegram_id', 'shiftrwa_tg'));

    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      twitterUser:    'tomerwn',
      discordUser:    'shiftrwa_user',
      telegramUsername: 'shiftrwa_tg',
    });

    expect(identitySvc.linkIdentity).toHaveBeenCalledTimes(3);
    expect(identitySvc.linkIdentity).toHaveBeenCalledWith('p-test-1', 'x_handle',    'tomerwn',       'deterministic', { byActor: 'snag_webhook' });
    expect(identitySvc.linkIdentity).toHaveBeenCalledWith('p-test-1', 'discord_id',  'shiftrwa_user', 'deterministic', { byActor: 'snag_webhook' });
    expect(identitySvc.linkIdentity).toHaveBeenCalledWith('p-test-1', 'telegram_id', 'shiftrwa_tg',   'deterministic', { byActor: 'snag_webhook' });
  });

  it('continues processing remaining handles when one throws IdentityConflictError', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity')
      .mockRejectedValueOnce(new IdentityConflictError('p-other', 'x_handle', 'tomerwn'))  // X conflicts
      .mockResolvedValueOnce(makeLink('discord_id', 'shiftrwa_user'))                        // Discord succeeds
      .mockResolvedValueOnce(makeLink('telegram_id', 'shiftrwa_tg'));                        // Telegram succeeds

    await expect(
      callHandleUserMetadata(getHandler(), {
        walletAddress:    'TestWa11et1234',
        twitterUser:      'tomerwn',
        discordUser:      'shiftrwa_user',
        telegramUsername: 'shiftrwa_tg',
      }),
    ).resolves.toBeUndefined();

    // All three were attempted despite the first conflict
    expect(identitySvc.linkIdentity).toHaveBeenCalledTimes(3);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('handleUserMetadata — edge cases', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns early without calling findOrCreateProfile when neither walletAddress nor userId is present', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());

    await callHandleUserMetadata(getHandler(), { twitterUser: 'someone' });

    expect(identitySvc.findOrCreateProfile).not.toHaveBeenCalled();
    expect(identitySvc.linkIdentity).not.toHaveBeenCalled();
  });

  it('resolves profile via snag_user_id when walletAddress is absent but userId is present', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('x_handle', 'tomerwn'));

    await callHandleUserMetadata(getHandler(), {
      userId: 'snag-uuid-abc',
      twitterUser: 'tomerwn',
    });

    expect(identitySvc.findOrCreateProfile).toHaveBeenCalledWith(
      { type: 'snag_user_id', value: 'snag-uuid-abc' },
      'system',
    );
  });

  it('handles nested user.walletAddress (Snag LoyaltyRuleStatus shape)', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('discord_id', 'shift_discord'));

    await callHandleUserMetadata(getHandler(), {
      user: { id: 'snag-uuid-123', walletAddress: 'NestedWallet1' },
      discordUser: 'shift_discord',
    });

    expect(identitySvc.findOrCreateProfile).toHaveBeenCalledWith(
      { type: 'wallet', value: 'NestedWallet1' },
      'system',
    );
    expect(identitySvc.linkIdentity).toHaveBeenCalledWith(
      'p-test-1',
      'discord_id',
      'shift_discord',
      'deterministic',
      { byActor: 'snag_webhook' },
    );
  });

  it('skips any handle that is an empty string', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValue(makeLink('x_handle', 'x'));

    await callHandleUserMetadata(getHandler(), {
      walletAddress: 'TestWa11et1234',
      twitterUser: '',   // empty — must be skipped
    });

    expect(identitySvc.linkIdentity).not.toHaveBeenCalled();
  });

  it('does not call linkIdentity at all when findOrCreateProfile throws', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockRejectedValueOnce(new Error('DB down'));
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValue(makeLink('x_handle', 'x'));

    // Must resolve (not throw) — error is caught internally
    await expect(
      callHandleUserMetadata(getHandler(), {
        walletAddress: 'TestWa11et1234',
        twitterUser: 'tomerwn',
      }),
    ).resolves.toBeUndefined();

    expect(identitySvc.linkIdentity).not.toHaveBeenCalled();
  });
});

// ── processEvent routing ──────────────────────────────────────────────────────

describe('processEvent — UserMetadata routing', () => {
  beforeEach(() => vi.resetAllMocks());

  it('routes user.metadata.updated to handleUserMetadata', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('x_handle', 'routingtest'));

    const handler = getHandler();
    // Call private processEvent via cast
    await (handler as any).processEvent({
      type: 'user.metadata.updated',
      data: {
        walletAddress: 'TestWa11et1234',
        twitterUser: 'routingtest',
      },
    });

    expect(identitySvc.linkIdentity).toHaveBeenCalledWith(
      'p-test-1', 'x_handle', 'routingtest', 'deterministic', { byActor: 'snag_webhook' },
    );
  });

  it('routes UserMetadata (PascalCase) event type to handleUserMetadata', async () => {
    vi.spyOn(identitySvc, 'findOrCreateProfile').mockResolvedValueOnce(makeProfile());
    vi.spyOn(identitySvc, 'linkIdentity').mockResolvedValueOnce(makeLink('discord_id', 'pascaltest'));

    const handler = getHandler();
    await (handler as any).processEvent({
      type: 'UserMetadata',
      data: {
        walletAddress: 'TestWa11et1234',
        discordUser: 'pascaltest',
      },
    });

    expect(identitySvc.linkIdentity).toHaveBeenCalledWith(
      'p-test-1', 'discord_id', 'pascaltest', 'deterministic', { byActor: 'snag_webhook' },
    );
  });
});
