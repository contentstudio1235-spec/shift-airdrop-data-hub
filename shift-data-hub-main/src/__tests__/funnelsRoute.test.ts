// src/__tests__/funnelsRoute.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import funnelsRouter from '../routes/funnels';
import * as funnelService from '../services/funnelService';

vi.mock('../services/funnelService');

const ADMIN_KEY = 'ShiftRwa2026@@$$Key';
process.env.ADMIN_KEY = ADMIN_KEY;

function makeApp() {
  const app = express();
  app.use('/api/funnels', funnelsRouter);
  return app;
}

describe('GET /api/funnels/:funnelId', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects requests without x-admin-key', async () => {
    const res = await request(makeApp()).get('/api/funnels/acquisition');
    expect(res.status).toBe(401);
  });

  it('returns 400 for unknown funnel id', async () => {
    const res = await request(makeApp())
      .get('/api/funnels/unknown')
      .set('x-admin-key', ADMIN_KEY);
    expect(res.status).toBe(400);
  });

  it('returns funnel result for valid request', async () => {
    vi.spyOn(funnelService, 'computeFunnel').mockResolvedValueOnce({
      funnelId: 'acquisition',
      steps: [{ id: 'visit', name: 'Visit', count: 100, uniqueWallets: 100, conversionFromPrev: 100, conversionFromFirst: 100, vs7dDelta: 0 }],
      computedAt: new Date().toISOString(),
      cacheKey: 'acquisition|abc',
      cacheTTLSeconds: 60,
    });

    const res = await request(makeApp())
      .get('/api/funnels/acquisition?from=2026-06-01')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.funnelId).toBe('acquisition');
  });
});
