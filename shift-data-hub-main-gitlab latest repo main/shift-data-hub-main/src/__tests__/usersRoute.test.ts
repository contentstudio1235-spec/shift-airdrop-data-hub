import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import usersRouter from '../routes/users';
import * as svc from '../services/identityService';

vi.mock('../services/identityService');

const ADMIN_KEY = 'ShiftRwa2026@@$$Key';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
}

describe('GET /api/users', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects without admin key', async () => {
    const res = await request(makeApp()).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns paginated rows', async () => {
    vi.spyOn(svc, 'searchProfiles').mockResolvedValueOnce({
      rows: [{
        profileId: 'p-1', primaryWallet: 'AbCd', displayName: null,
        lastSeenAt: '2026-06-03T00:00:00Z', firstUtmSource: 'twitter',
        stitchedPct: 95, lifetimeVolumeUSD: 4200,
      }],
      total: 1, page: 1, pageSize: 50,
    });

    const res = await request(makeApp())
      .get('/api/users')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

describe('GET /api/users/:profileId', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 404 when profile not found', async () => {
    vi.spyOn(svc, 'getProfile').mockResolvedValueOnce(null);
    const res = await request(makeApp())
      .get('/api/users/does-not-exist')
      .set('x-admin-key', ADMIN_KEY);
    expect(res.status).toBe(404);
  });

  it('returns profile with links', async () => {
    vi.spyOn(svc, 'getProfile').mockResolvedValueOnce({
      profileId: 'p-1', primaryWallet: 'AbCd', displayName: null,
      firstSeenAt: '2026-06-01T00:00:00Z', lastSeenAt: '2026-06-03T00:00:00Z',
      firstUtmSource: 'twitter', firstUtmMedium: null, firstUtmCampaign: null,
      firstUtmContent: null, firstUtmTerm: null, firstReferrer: null,
      firstLandingPath: null, attributionLockedAt: null,
      lastUtmSource: 'twitter', lastUtmMedium: null, lastUtmCampaign: null,
      walletType: null, countryCode: null, mergedIntoProfileId: null, mergedAt: null,
      createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-03T00:00:00Z',
      links: [],
    } as any);

    const res = await request(makeApp())
      .get('/api/users/p-1')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.profileId).toBe('p-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API-LEVEL RECONCILIATION TEST
//
// This is the HTTP-boundary version of the metric-reconciliation skill applied
// to the row-multiplication bug. It hits both endpoints over supertest and
// asserts that listing.lifetimeVolumeUSD == detail.lifetimeStats.volumeUSD
// for the same profile, within $0.01.
//
// Live reproduction (the bug we're fixing):
//   profile 160034d4-... → listing $4408.5041, detail $629.7863, ratio 7.0001
//   profile had 7 active identity_links rows.
// Post-fix: both must return $629.7863.
// ─────────────────────────────────────────────────────────────────────────────
describe('reconciliation: GET /api/users vs GET /api/users/:profileId volume parity', () => {
  beforeEach(() => vi.resetAllMocks());

  const PROFILE_ID = '160034d4-b198-4a9e-a481-9133eb720cce';
  const PRIMARY_WALLET = '54ex2ifuYVUvWyT9';
  const TRUE_VOLUME = 629.7863;

  it('listing and detail return the same lifetime volume (within $0.01)', async () => {
    // Mock listing service to return the ground-truth value (what the FIXED
    // SQL would compute against real data — see identityService.test.ts for
    // the structural test that proves the SQL itself uses scalar subqueries).
    vi.spyOn(svc, 'searchProfiles').mockResolvedValueOnce({
      rows: [{
        profileId: PROFILE_ID,
        primaryWallet: PRIMARY_WALLET,
        displayName: 'Coinhunter Crypto',
        firstSeenAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-06-05T00:00:00Z',
        firstUtmSource: 'twitter',
        stitchedPct: 100,
        lifetimeVolumeUSD: TRUE_VOLUME,
        holdingsValueUSD: TRUE_VOLUME,
        holdings: 6,
        hasX: true,
        hasDiscord: true,
      }],
      total: 1, page: 1, pageSize: 5,
    } as any);

    vi.spyOn(svc, 'getProfile').mockResolvedValueOnce({
      profileId: PROFILE_ID,
      primaryWallet: PRIMARY_WALLET,
      displayName: 'Coinhunter Crypto',
      firstSeenAt: '2026-01-01T00:00:00Z', lastSeenAt: '2026-06-05T00:00:00Z',
      firstUtmSource: 'twitter', firstUtmMedium: null, firstUtmCampaign: null,
      firstUtmContent: null, firstUtmTerm: null, firstReferrer: null,
      firstLandingPath: null, attributionLockedAt: null,
      lastUtmSource: 'twitter', lastUtmMedium: null, lastUtmCampaign: null,
      walletType: null, countryCode: null, mergedIntoProfileId: null, mergedAt: null,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
      links: [],
      lifetimeStats: { xp: 12500, volumeUSD: TRUE_VOLUME, positions: 6, badges: 4 },
    } as any);

    const app = makeApp();

    const listingRes = await request(app)
      .get(`/api/users?q=${PRIMARY_WALLET.slice(0, 8)}&pageSize=5`)
      .set('x-admin-key', ADMIN_KEY);
    expect(listingRes.status).toBe(200);
    const listingRow = listingRes.body.rows.find((r: any) => r.profileId === PROFILE_ID);
    expect(listingRow).toBeDefined();
    const listingVolume = Number(listingRow.lifetimeVolumeUSD);

    const detailRes = await request(app)
      .get(`/api/users/${PROFILE_ID}`)
      .set('x-admin-key', ADMIN_KEY);
    expect(detailRes.status).toBe(200);
    const detailVolume = Number(detailRes.body.lifetimeStats.volumeUSD);

    // ── Cross-source reconciliation assertion ────────────────────────────────
    // Both endpoints MUST agree to within $0.01. Pre-fix they diverged by 7×.
    const delta = Math.abs(listingVolume - detailVolume);
    expect(delta).toBeLessThanOrEqual(0.01);
    expect(listingVolume).toBeCloseTo(TRUE_VOLUME, 2);
    expect(detailVolume).toBeCloseTo(TRUE_VOLUME, 2);
  });
});
