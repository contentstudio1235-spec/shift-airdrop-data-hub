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
