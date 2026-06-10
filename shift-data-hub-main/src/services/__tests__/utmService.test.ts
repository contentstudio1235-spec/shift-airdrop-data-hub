// ============================================================
// utmService — unit tests (Phase A)
// ============================================================
// Mocks the DB pool so allow-list lookups return a known seed set.
// Covers every rule from the spec + edge cases.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../db/pool';
import {
  normalizeUtm,
  _resetUtmCaches,
  SNAG_ROLLUP_SOURCE,
  type RawUtm,
  type UtmEvidence,
} from '../utmService';

vi.mock('../../db/pool');

// ── Seed used to stub the allow-list lookups ─────────────────────────────────

const APPROVED_SOURCES = [
  'twitter', 'discord', 'telegram', 'reddit', 'youtube', 'medium',
  'linkedin', 'hackernoon', 'coingecko', 'coinmarketcap', 'direct',
  'snag-referrals',
];

const APPROVED_MEDIUMS = [
  'cpc', 'paid-social', 'social', 'referral', 'email', 'kol',
  'affiliate', 'qr', 'display',
];

/**
 * Stub `db.query` so that:
 *   - SELECT source FROM utm_approved_sources  → APPROVED_SOURCES
 *   - SELECT medium FROM utm_approved_mediums  → APPROVED_MEDIUMS
 * The service issues these on cache miss; we reset caches before each test.
 */
function stubAllowLists() {
  vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
    if (text.includes('utm_approved_sources')) {
      return APPROVED_SOURCES.map(source => ({ source })) as any;
    }
    if (text.includes('utm_approved_mediums')) {
      return APPROVED_MEDIUMS.map(medium => ({ medium })) as any;
    }
    return [] as any;
  });
}

const evidence: UtmEvidence = {
  rawUrl: '/api/airdrop/register?utm_source=twitter&utm_medium=kol',
  referrer: 'https://t.co/abc',
  userAgent: 'Mozilla/5.0',
};

beforeEach(() => {
  vi.resetAllMocks();
  _resetUtmCaches();
  stubAllowLists();
});

// ── 1. Approved source passes through unchanged (after lowercase) ────────────

describe('normalizeUtm — approved source', () => {
  it('returns approved source untouched (lowercase pre-applied)', async () => {
    const raw: RawUtm = { source: 'twitter' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBe('twitter');
    expect(out.violations).toEqual([]);
  });
});

// ── 2. Approved medium passes through unchanged ──────────────────────────────

describe('normalizeUtm — approved medium', () => {
  it('returns approved medium untouched (lowercase pre-applied)', async () => {
    const raw: RawUtm = { source: 'twitter', medium: 'kol' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.medium).toBe('kol');
    expect(out.violations).toEqual([]);
  });
});

// ── 3. Unapproved source → null + violation logged ───────────────────────────

describe('normalizeUtm — unapproved source', () => {
  it('nulls the source and emits a not-on-approved-list violation', async () => {
    const raw: RawUtm = { source: 'tiktok' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBeNull();
    expect(out.violations).toHaveLength(1);
    expect(out.violations[0]).toMatchObject({
      field: 'utm_source',
      rejectedValue: 'tiktok',
      reason: 'not-on-approved-list',
    });
  });
});

// ── 4. Snag 6-char code rolls up to snag-referrals (no violation) ────────────

describe('normalizeUtm — Snag referral code rollup', () => {
  it('rolls up uppercase 6-char A-Z0-9 code with no violation', async () => {
    const raw: RawUtm = { source: 'DYENZ3' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBe(SNAG_ROLLUP_SOURCE);
    expect(out.source).toBe('snag-referrals');
    expect(out.violations).toEqual([]);
  });

  it('rolls up uppercase + digit 6-char codes (e.g. 6MCTDC)', async () => {
    const raw: RawUtm = { source: '6MCTDC' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBe('snag-referrals');
    expect(out.violations).toEqual([]);
  });

  it('does NOT roll up lowercase 6-char strings (avoid catching english words)', async () => {
    // 'safari' is 6 chars, lowercase, would falsely match a case-insensitive regex.
    // The strict A-Z0-9 pattern protects against this collision.
    const raw: RawUtm = { source: 'safari' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBeNull();
    // 'safari' is in BROWSER_UA_SOURCES, so it should be rejected as user-agent.
    expect(out.violations[0]?.reason).toBe('user-agent');
  });
});

// ── 5. Browser/UA source → null + reason='user-agent' ───────────────────────

describe('normalizeUtm — browser UA source rejection', () => {
  it('rejects trust_ios_browser with user-agent reason', async () => {
    const raw: RawUtm = { source: 'trust_ios_browser' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBeNull();
    expect(out.violations).toHaveLength(1);
    expect(out.violations[0]).toMatchObject({
      field: 'utm_source',
      rejectedValue: 'trust_ios_browser',
      reason: 'user-agent',
    });
  });

  it('rejects safari with user-agent reason', async () => {
    const raw: RawUtm = { source: 'safari' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBeNull();
    expect(out.violations[0]?.reason).toBe('user-agent');
  });
});

// ── 6. Uppercase source → lowercased + no violation ──────────────────────────

describe('normalizeUtm — case normalization', () => {
  it('lowercases an approved uppercase source without flagging it', async () => {
    const raw: RawUtm = { source: 'TWITTER' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBe('twitter');
    expect(out.violations).toEqual([]);
  });

  it('lowercases an approved mixed-case medium without flagging it', async () => {
    const raw: RawUtm = { source: 'twitter', medium: 'Paid-Social' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.medium).toBe('paid-social');
    expect(out.violations).toEqual([]);
  });
});

// ── 7. Campaign with underscores → kept as-is + format-violation flagged ─────

describe('normalizeUtm — campaign formatting', () => {
  it('keeps underscore-containing campaign value but flags format-violation', async () => {
    const raw: RawUtm = {
      source: 'twitter',
      medium: 'kol',
      campaign: 'airdrop_launch_2026q2',
    };
    const out = await normalizeUtm(raw, evidence);
    // Value preserved (not auto-normalized) but flagged
    expect(out.campaign).toBe('airdrop_launch_2026q2');
    const campaignViolation = out.violations.find(v => v.field === 'utm_campaign');
    expect(campaignViolation).toBeDefined();
    expect(campaignViolation!.reason).toBe('format-violation');
  });

  it('accepts a clean hyphenated campaign with no violation', async () => {
    const raw: RawUtm = {
      source: 'twitter',
      medium: 'kol',
      campaign: 'airdrop-launch-2026q2',
    };
    const out = await normalizeUtm(raw, evidence);
    expect(out.campaign).toBe('airdrop-launch-2026q2');
    expect(out.violations).toEqual([]);
  });
});

// ── 8. Null/empty inputs → no-op, no violations ─────────────────────────────

describe('normalizeUtm — empty inputs', () => {
  it('returns all-null with no violations on a fully empty raw input', async () => {
    const raw: RawUtm = {};
    const out = await normalizeUtm(raw, evidence);
    expect(out).toEqual({
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null,
      violations: [],
    });
  });

  it('treats whitespace-only strings as null with no violations', async () => {
    const raw: RawUtm = { source: '   ', medium: '\t', campaign: '' };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBeNull();
    expect(out.medium).toBeNull();
    expect(out.campaign).toBeNull();
    expect(out.violations).toEqual([]);
  });

  it('handles array-form query values (Express duplicates) by taking the first', async () => {
    const raw: RawUtm = { source: ['twitter', 'discord'] };
    const out = await normalizeUtm(raw, evidence);
    expect(out.source).toBe('twitter');
    expect(out.violations).toEqual([]);
  });
});
