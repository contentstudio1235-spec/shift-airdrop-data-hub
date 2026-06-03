// src/__tests__/attributionRoute.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import attributionRouter from '../routes/attribution';
import * as svc from '../services/attributionService';
import * as streamSvc from '../services/whaleStreamService';
vi.mock('../services/whaleStreamService');

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

describe('GET /api/attribution/whale-origins', () => {
  it('returns Sankey-shaped payload (nodes + edges + totals)', async () => {
    vi.spyOn(svc, 'computeWhaleOrigins').mockResolvedValueOnce({
      nodes: [
        { id: 'src:direct', label: 'direct', kind: 'source', value: 5408 },
        { id: 'coh:whale', label: 'whale', kind: 'cohort', value: 3 },
        { id: 'out:active', label: 'active', kind: 'outcome', value: 3 },
      ],
      edges: [
        { from: 'src:direct', to: 'coh:whale', value: 3 },
        { from: 'coh:whale', to: 'out:active', value: 3 },
      ],
      totals: { sourceUsers: 5408, whales: 3, whaleVolumeUSD: 21311 },
      computedAt: '2026-06-04T00:00:00Z',
      dataQuality: 'sprint_2_3_live',
    });
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app)
      .get('/api/attribution/whale-origins')
      .set('x-admin-key', 'ShiftRwa2026@@$$Key');
    expect(res.status).toBe(200);
    expect(res.body.nodes).toHaveLength(3);
    expect(res.body.edges).toHaveLength(2);
    expect(res.body.totals.whales).toBe(3);
  });
});

describe('GET /api/attribution/kol-leaderboard', () => {
  it('returns ranked rows + totals', async () => {
    vi.spyOn(svc, 'computeKOLLeaderboard').mockResolvedValueOnce({
      rows: [{
        referrer: 'abc123', source: 'snag_referrals', users: 100, holders: 15,
        whales: 1, holderRate: 15, totalVolumeUSD: 4000, avgVolumePerUserUSD: 40,
        score: 42.5, firstSeenAt: '2026-01-01', lastSeenAt: '2026-06-04',
      }],
      totals: { totalReferrers: 1, activeReferrers: 1 },
      computedAt: '2026-06-04T00:00:00Z',
      dataQuality: 'sprint_2_3_live',
    });
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app)
      .get('/api/attribution/kol-leaderboard?limit=10')
      .set('x-admin-key', 'ShiftRwa2026@@$$Key');
    expect(res.status).toBe(200);
    expect(res.body.rows[0].holderRate).toBe(15);
  });

  it('clamps invalid limit to 50', async () => {
    const spy = vi.spyOn(svc, 'computeKOLLeaderboard').mockResolvedValueOnce({
      rows: [], totals: { totalReferrers: 0, activeReferrers: 0 },
      computedAt: '2026-06-04T00:00:00Z', dataQuality: 'sprint_2_3_live',
    });
    const app = express();
    app.use('/api/attribution', attributionRouter);
    await request(app).get('/api/attribution/kol-leaderboard?limit=99999').set('x-admin-key', 'ShiftRwa2026@@$$Key');
    expect(spy).toHaveBeenCalledWith(expect.anything(), 50);
  });
});

describe('GET /api/attribution/whale-stream', () => {
  it('rejects without admin key', async () => {
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app).get('/api/attribution/whale-stream');
    expect(res.status).toBe(401);
  });

  it('accepts adminKey via query param', async () => {
    vi.spyOn(streamSvc, 'fetchInitialWhales').mockResolvedValueOnce([]);
    const app = express();
    app.use('/api/attribution', attributionRouter);
    const res = await request(app)
      .get('/api/attribution/whale-stream?adminKey=ShiftRwa2026@@$$Key')
      .timeout({ response: 200, deadline: 500 })
      .catch(e => e.response);
    expect(res?.status ?? 200).not.toBe(401);
  });
});
