// src/__tests__/attributionRoute.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import attributionRouter from '../routes/attribution';
import * as svc from '../services/attributionService';

vi.mock('../services/attributionService');
process.env.ADMIN_KEY = 'ShiftRwa2026@@$$Key';

describe('GET /api/attribution/channel-roi', () => {
  it('returns rows on success', async () => {
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
  });
});
