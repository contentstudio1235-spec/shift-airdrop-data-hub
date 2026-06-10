// src/__tests__/attributionRoute.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import attributionRouter from '../routes/attribution';
import * as svc from '../services/attributionService';

vi.mock('../services/attributionService');
process.env.ADMIN_KEY = 'ShiftRwa2026@@$$Key';

describe('GET /api/attribution/channel-roi', () => {
  it('returns rows + sprint_2_3_live dataQuality on success', async () => {
    vi.spyOn(svc, 'computeChannelROI').mockResolvedValueOnce([
      { source: 'twitter', users: 100, stitchedUsers: 30, holders: 10, whales: 1, totalVolumeUSD: 5000, avgPositionUSD: 500, attribution: 'first_touch' as const },
    ]);
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app)
      .get('/api/attribution/channel-roi')
      .set('x-admin-key', 'ShiftRwa2026@@$$Key');
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.dataQuality).toBe('sprint_2_3_live');
  });
});

describe('GET /api/attribution/overview', () => {
  it('returns channels + campaigns + coverage in one payload', async () => {
    vi.spyOn(svc, 'computeChannelROI').mockResolvedValueOnce([
      { source: 'twitter', users: 100, stitchedUsers: 30, holders: 10, whales: 1, totalVolumeUSD: 5000, avgPositionUSD: 500, attribution: 'first_touch' as const },
    ]);
    vi.spyOn(svc, 'computeTopCampaigns').mockResolvedValueOnce([
      { campaign: 'airdrop-q1', source: 'twitter', medium: 'social', profiles: 50 },
    ]);
    vi.spyOn(svc, 'computeAttributionCoverage').mockResolvedValueOnce({
      total: 1000, withUtm: 100, withReferralOnly: 200, neither: 700,
      percentWithSignal: 30, percentWithUtm: 10,
    });
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app)
      .get('/api/attribution/overview')
      .set('x-admin-key', 'ShiftRwa2026@@$$Key');
    expect(res.status).toBe(200);
    expect(res.body.channels).toHaveLength(1);
    expect(res.body.campaigns).toHaveLength(1);
    expect(res.body.coverage.percentWithUtm).toBe(10);
    expect(res.body.dataQuality).toBe('sprint_2_3_live');
  });

  it('rejects without admin key', async () => {
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app).get('/api/attribution/overview');
    expect(res.status).toBe(401);
  });
});
