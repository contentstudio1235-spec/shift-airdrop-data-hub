// ============================================================
// /api/utm route — integration tests (Phase A)
// ============================================================
// These tests would have caught the four BLOCKERs from the first Phase-A PR:
//
//   BLOCKER 1: response envelope shapes
//     - GET /violations  → { violations: [...] }       (not { rows, count })
//     - GET /campaigns   → { campaigns: [...] }        (not { rows, count })
//     - GET /approved-*  → bare string[]               (not { sources|mediums })
//     - POST /campaigns  → bare Campaign object        (not { campaign })
//
//   BLOCKER 2: every row uses camelCase JSON keys
//     (utmSource, displayName, isArchived, occurredAt, rawUrl, budgetUSD, ...).
//
//   BLOCKER 3: POST body uses camelCase field names
//     (displayName, destinationUrl, utmSource, ...).
//
// If anyone reverts the double-quoted aliases in the SELECT clauses, Postgres
// would lowercase the identifiers (`utmsource`, `displayname`) and the
// camelCase assertions here would fail loudly.
//
// DB pool is fully mocked — these are pure HTTP contract tests.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoisted mocks so that `import utmRouter` below resolves against the stubbed
// pool + service.
vi.mock('../../db/pool', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn().mockResolvedValue(1),
  pool: {} as any,
}));

vi.mock('../../services/utmService', () => ({
  getApprovedSources: vi.fn(),
  getApprovedMediums: vi.fn(),
}));

import utmRouter from '../utm';
import * as db from '../../db/pool';
import * as svc from '../../services/utmService';

const ADMIN_KEY = 'ShiftRwa2026@@$$Key';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/utm', utmRouter);
  return app;
}

const APPROVED_SOURCES = ['twitter', 'discord', 'direct', 'snag-referrals'];
const APPROVED_MEDIUMS = ['cpc', 'paid-social', 'kol', 'email'];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(svc.getApprovedSources).mockResolvedValue(APPROVED_SOURCES);
  vi.mocked(svc.getApprovedMediums).mockResolvedValue(APPROVED_MEDIUMS);
});

// ── Auth gate ────────────────────────────────────────────────────────────────

describe('/api/utm — auth gate', () => {
  it('rejects requests without x-admin-key', async () => {
    const res = await request(makeApp()).get('/api/utm/campaigns');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthorized' });
  });

  it('rejects requests with wrong x-admin-key', async () => {
    const res = await request(makeApp())
      .get('/api/utm/campaigns')
      .set('x-admin-key', 'wrong-key');
    expect(res.status).toBe(401);
  });
});

// ── GET /violations — envelope + camelCase ───────────────────────────────────

describe('GET /api/utm/violations', () => {
  it('returns { violations: [...] } with camelCase keys', async () => {
    // Simulate what the SELECT-with-aliases would return from pg.
    const fakeRows = [
      {
        id: 1,
        occurredAt: '2026-06-05T12:00:00Z',
        profileId: null,
        rawUrl: '/api/airdrop/register?utm_source=tiktok',
        rejectedField: 'utm_source',
        rejectedValue: 'tiktok',
        reason: 'not-on-approved-list',
        rawReferrer: null,
        userAgent: 'Mozilla/5.0',
      },
    ];
    vi.mocked(db.query).mockResolvedValueOnce(fakeRows);

    const res = await request(makeApp())
      .get('/api/utm/violations')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    // Envelope MUST be { violations: ... }, NOT { rows, count }.
    expect(res.body).toHaveProperty('violations');
    expect(res.body).not.toHaveProperty('rows');
    expect(res.body).not.toHaveProperty('count');
    expect(Array.isArray(res.body.violations)).toBe(true);

    // Each row MUST carry camelCase keys.
    const row = res.body.violations[0];
    expect(row).toHaveProperty('occurredAt');
    expect(row).toHaveProperty('rejectedField');
    expect(row).toHaveProperty('rejectedValue');
    expect(row).toHaveProperty('rawUrl');
    expect(row).not.toHaveProperty('occurred_at');
    expect(row).not.toHaveProperty('rejected_field');
    expect(row).not.toHaveProperty('raw_url');
  });

  it('aliases snake_case columns in the SQL using double quotes', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await request(makeApp())
      .get('/api/utm/violations')
      .set('x-admin-key', ADMIN_KEY);

    const [[sql]] = vi.mocked(db.query).mock.calls;
    // The double-quote-wrapped camelCase identifiers must be present —
    // without them Postgres lowercases the keys and the contract breaks.
    expect(sql).toContain('"occurredAt"');
    expect(sql).toContain('"rejectedField"');
    expect(sql).toContain('"rejectedValue"');
    expect(sql).toContain('"rawUrl"');
  });
});

// ── GET /campaigns — envelope + camelCase ────────────────────────────────────

describe('GET /api/utm/campaigns', () => {
  const fakeCampaignRow = {
    id: 42,
    createdAt: '2026-06-05T10:00:00Z',
    createdBy: 'admin',
    displayName: 'Smoke Test',
    destinationUrl: 'https://shiftrwa.xyz/register',
    utmSource: 'twitter',
    utmMedium: 'paid-social',
    utmCampaign: 'test-2026q2',
    utmContent: null,
    utmTerm: null,
    notes: null,
    budgetUSD: 1000,
    expectedReach: 50000,
    fullUrl: 'https://shiftrwa.xyz/register?utm_source=twitter&utm_medium=paid-social&utm_campaign=test-2026q2',
    shortUrl: null,
    isArchived: false,
  };

  it('returns { campaigns: [...] } with camelCase keys', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([fakeCampaignRow]);

    const res = await request(makeApp())
      .get('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('campaigns');
    expect(res.body).not.toHaveProperty('rows');
    expect(Array.isArray(res.body.campaigns)).toBe(true);

    const row = res.body.campaigns[0];
    expect(row.displayName).toBe('Smoke Test');
    expect(row.utmSource).toBe('twitter');
    expect(row.budgetUSD).toBe(1000);
    expect(row.isArchived).toBe(false);
    expect(row.fullUrl).toContain('utm_source=twitter');
    expect(row).not.toHaveProperty('display_name');
    expect(row).not.toHaveProperty('utm_source');
    expect(row).not.toHaveProperty('is_archived');
    expect(row).not.toHaveProperty('budget_usd');
  });

  it('SELECT uses all the required camelCase aliases', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await request(makeApp())
      .get('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY);

    const [[sql]] = vi.mocked(db.query).mock.calls;
    for (const alias of [
      '"createdAt"', '"createdBy"', '"displayName"', '"destinationUrl"',
      '"utmSource"', '"utmMedium"', '"utmCampaign"', '"utmContent"', '"utmTerm"',
      '"budgetUSD"', '"expectedReach"', '"fullUrl"', '"shortUrl"', '"isArchived"',
    ]) {
      expect(sql).toContain(alias);
    }
  });
});

// ── GET /approved-sources + /approved-mediums — bare arrays ─────────────────

describe('GET /api/utm/approved-sources', () => {
  it('returns a bare string[] (not wrapped in { sources })', async () => {
    const res = await request(makeApp())
      .get('/api/utm/approved-sources')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(APPROVED_SOURCES);
  });
});

describe('GET /api/utm/approved-mediums', () => {
  it('returns a bare string[] (not wrapped in { mediums })', async () => {
    const res = await request(makeApp())
      .get('/api/utm/approved-mediums')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(APPROVED_MEDIUMS);
  });
});

// ── POST /campaigns — camelCase round-trip ──────────────────────────────────

describe('POST /api/utm/campaigns', () => {
  const validBody = {
    displayName: 'Smoke Test',
    destinationUrl: 'https://shiftrwa.xyz/register',
    utmSource: 'twitter',
    utmMedium: 'paid-social',
    utmCampaign: 'test-2026q2',
    budgetUSD: 1000,
    expectedReach: 50000,
  };

  it('accepts camelCase body and returns bare camelCase Campaign on 201', async () => {
    const insertedRow = {
      id: 1,
      createdAt: '2026-06-05T10:00:00Z',
      createdBy: 'admin',
      displayName: 'Smoke Test',
      destinationUrl: 'https://shiftrwa.xyz/register',
      utmSource: 'twitter',
      utmMedium: 'paid-social',
      utmCampaign: 'test-2026q2',
      utmContent: null,
      utmTerm: null,
      notes: null,
      budgetUSD: 1000,
      expectedReach: 50000,
      fullUrl: 'https://shiftrwa.xyz/register?utm_source=twitter&utm_medium=paid-social&utm_campaign=test-2026q2',
      shortUrl: null,
      isArchived: false,
    };
    vi.mocked(db.queryOne).mockResolvedValueOnce(insertedRow);

    const res = await request(makeApp())
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send(validBody);

    expect(res.status).toBe(201);
    // BARE object — NOT wrapped in { campaign }.
    expect(res.body).not.toHaveProperty('campaign');
    expect(res.body.id).toBe(1);
    expect(res.body.displayName).toBe('Smoke Test');
    expect(res.body.utmSource).toBe('twitter');
    expect(res.body.budgetUSD).toBe(1000);
    expect(res.body.fullUrl).toContain('utm_source=twitter');
    expect(res.body.isArchived).toBe(false);
  });

  it('rejects snake_case body fields (frontend MUST send camelCase)', async () => {
    // If someone sends the OLD snake_case shape, displayName is missing and
    // the route returns 400 — proves we read body.displayName not body.display_name.
    const res = await request(makeApp())
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        display_name: 'old shape',
        destination_url: 'https://shiftrwa.xyz/register',
        utm_source: 'twitter',
        utm_medium: 'paid-social',
        utm_campaign: 'test-2026q2',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('displayName_required');
  });

  it('passes camelCase values through to the INSERT params in order', async () => {
    vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 1 });

    await request(makeApp())
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send(validBody);

    expect(db.queryOne).toHaveBeenCalledTimes(1);
    const [[sql, params]] = vi.mocked(db.queryOne).mock.calls;

    // RETURNING clause aliases — proves the round-trip shape is enforced.
    expect(sql).toContain('"displayName"');
    expect(sql).toContain('"utmSource"');
    expect(sql).toContain('"budgetUSD"');
    expect(sql).toContain('"isArchived"');

    // Param order: created_by, display_name, destination_url, source, medium,
    // campaign, content, term, notes, budget_usd, expected_reach, full_url, short_url
    expect(params).toBeDefined();
    const p = params as unknown[];
    expect(p[0]).toBe('admin');               // createdBy default
    expect(p[1]).toBe('Smoke Test');          // displayName
    expect(p[2]).toBe('https://shiftrwa.xyz/register'); // destinationUrl
    expect(p[3]).toBe('twitter');             // utmSource
    expect(p[4]).toBe('paid-social');         // utmMedium
    expect(p[5]).toBe('test-2026q2');         // utmCampaign
    expect(p[9]).toBe(1000);                  // budgetUSD
    expect(p[10]).toBe(50000);                // expectedReach
  });

  it('rejects unapproved utmSource', async () => {
    const res = await request(makeApp())
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send({ ...validBody, utmSource: 'tiktok' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('utmSource_not_approved');
    expect(res.body.approved).toEqual(APPROVED_SOURCES);
  });

  it('rejects malformed utmCampaign (must be lowercase + hyphens)', async () => {
    const res = await request(makeApp())
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send({ ...validBody, utmCampaign: 'Bad Campaign Name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('utmCampaign_format_invalid');
  });

  it('rejects invalid destinationUrl', async () => {
    const res = await request(makeApp())
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send({ ...validBody, destinationUrl: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('destinationUrl_invalid');
  });
});

// ── POST → GET round-trip (the test that would have caught everything) ───────

describe('POST → GET /api/utm/campaigns round-trip', () => {
  it('a campaign created via POST is readable via GET with identical camelCase shape', async () => {
    const created = {
      id: 99,
      createdAt: '2026-06-05T10:00:00Z',
      createdBy: 'admin',
      displayName: 'Round Trip',
      destinationUrl: 'https://shiftrwa.xyz/register',
      utmSource: 'twitter',
      utmMedium: 'kol',
      utmCampaign: 'launch-q2',
      utmContent: null,
      utmTerm: null,
      notes: null,
      budgetUSD: null,
      expectedReach: null,
      fullUrl: 'https://shiftrwa.xyz/register?utm_source=twitter&utm_medium=kol&utm_campaign=launch-q2',
      shortUrl: null,
      isArchived: false,
    };

    vi.mocked(db.queryOne).mockResolvedValueOnce(created);
    const app = makeApp();

    const postRes = await request(app)
      .post('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        displayName: 'Round Trip',
        destinationUrl: 'https://shiftrwa.xyz/register',
        utmSource: 'twitter',
        utmMedium: 'kol',
        utmCampaign: 'launch-q2',
      });

    expect(postRes.status).toBe(201);
    const postedKeys = Object.keys(postRes.body).sort();

    // Now GET — same row shape, just wrapped in { campaigns }.
    vi.mocked(db.query).mockResolvedValueOnce([created]);
    const getRes = await request(app)
      .get('/api/utm/campaigns')
      .set('x-admin-key', ADMIN_KEY);

    expect(getRes.status).toBe(200);
    expect(getRes.body.campaigns[0]).toEqual(postRes.body);
    const gotKeys = Object.keys(getRes.body.campaigns[0]).sort();
    expect(gotKeys).toEqual(postedKeys);
  });
});
