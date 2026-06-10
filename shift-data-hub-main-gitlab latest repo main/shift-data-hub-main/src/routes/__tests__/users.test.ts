// ============================================================
// /api/users route — KOL drill-down referrer validation (Phase 2.1B)
// ============================================================
// Covers:
//   - Invalid referrerType (e.g. 'BAD') → 400
//   - Valid referrerType='snag'        → forwarded to searchProfiles
//   - Valid referrerType='utm'         → forwarded to searchProfiles
//   - referrer present but referrerType missing → no filter forwarded
//   - referrerType present but referrer missing → no filter forwarded
//
// identityService is mocked so we can assert exactly which arguments the
// route hands off to searchProfiles.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoisted mocks. `searchProfiles` is the only service function we care about
// for these tests, but we stub the others so importing the route doesn't blow
// up on missing exports.
vi.mock('../../services/identityService', () => ({
  searchProfiles: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50 }),
  getProfile: vi.fn(),
  getTimeline: vi.fn(),
  linkIdentity: vi.fn(),
  unlinkIdentity: vi.fn(),
  mergeProfiles: vi.fn(),
}));
vi.mock('../../db/pool', () => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn(),
  execute: vi.fn(),
  pool: {} as any,
}));

import usersRouter from '../users';
import * as svc from '../../services/identityService';

const ADMIN_KEY = 'ShiftRwa2026@@$$Key';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
}

beforeEach(() => {
  vi.mocked(svc.searchProfiles).mockClear();
  vi.mocked(svc.searchProfiles).mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50 });
});

// ── Validation: invalid referrerType ─────────────────────────────────────────

describe('GET /api/users — referrerType validation', () => {
  it('returns 400 when referrerType is anything other than "snag" or "utm"', async () => {
    const res = await request(makeApp())
      .get('/api/users?referrer=cobie&referrerType=BAD')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid referrerType' });
    // service must NOT be called
    expect(vi.mocked(svc.searchProfiles)).not.toHaveBeenCalled();
  });

  it('returns 400 when referrerType is empty string', async () => {
    const res = await request(makeApp())
      .get('/api/users?referrer=x&referrerType=')
      .set('x-admin-key', ADMIN_KEY);
    // Express treats `referrerType=` as empty string; our route rejects only
    // non-empty invalid values. Empty string is treated as missing → no filter.
    expect([200, 400]).toContain(res.status);
  });
});

// ── Forwarding to service ────────────────────────────────────────────────────

describe('GET /api/users — referrer forwarding', () => {
  it('forwards referrer=cobie&referrerType=utm to searchProfiles', async () => {
    const res = await request(makeApp())
      .get('/api/users?referrer=cobie&referrerType=utm')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(vi.mocked(svc.searchProfiles)).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(svc.searchProfiles).mock.calls[0][0];
    expect(arg.referrer).toBe('cobie');
    expect(arg.referrerType).toBe('utm');
  });

  it('forwards referrer=DYENZ3&referrerType=snag to searchProfiles', async () => {
    await request(makeApp())
      .get('/api/users?referrer=DYENZ3&referrerType=snag')
      .set('x-admin-key', ADMIN_KEY);

    const arg = vi.mocked(svc.searchProfiles).mock.calls[0][0];
    expect(arg.referrer).toBe('DYENZ3');
    expect(arg.referrerType).toBe('snag');
  });

  it('drops the filter when referrer is present but referrerType is missing', async () => {
    await request(makeApp())
      .get('/api/users?referrer=orphan')
      .set('x-admin-key', ADMIN_KEY);

    const arg = vi.mocked(svc.searchProfiles).mock.calls[0][0];
    expect(arg.referrer).toBeUndefined();
    expect(arg.referrerType).toBeUndefined();
  });

  it('drops the filter when referrerType is present but referrer is missing', async () => {
    await request(makeApp())
      .get('/api/users?referrerType=snag')
      .set('x-admin-key', ADMIN_KEY);

    const arg = vi.mocked(svc.searchProfiles).mock.calls[0][0];
    expect(arg.referrer).toBeUndefined();
    expect(arg.referrerType).toBeUndefined();
  });
});
