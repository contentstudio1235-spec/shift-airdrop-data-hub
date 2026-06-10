// src/routes/attribution.ts
import { Router, type Request, type Response } from 'express';
import {
  computeChannelROI,
  computeWhaleOrigins,
  computeTopCampaigns,
  computeAttributionCoverage,
} from '../services/attributionService';
import { parseQueryParams } from '../lib/queryParams';
import { config } from '../config';

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/channel-roi', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeChannelROI(params);
    res.json({
      rows: result,
      computedAt: new Date().toISOString(),
      dataQuality: 'sprint_2_3_live',
      note: 'UTM-first with referred_by_code fallback. UTM data accrues post Sprint 2.3 (deployed 2026-06-03).',
    });
  } catch (err) {
    console.error('[attribution/channel-roi]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const [channels, campaigns, coverage] = await Promise.all([
      computeChannelROI(params),
      computeTopCampaigns(params, 10),
      computeAttributionCoverage(params),
    ]);
    res.json({
      channels,
      campaigns,
      coverage,
      computedAt: new Date().toISOString(),
      dataQuality: 'sprint_2_3_live',
      note: 'UTM-first attribution. Stitching activated Sprint 2.3 (2026-06-03) — UTM coverage grows daily as new traffic lands.',
    });
  } catch (err) {
    console.error('[attribution/overview]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/whale-origins', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeWhaleOrigins(params);
    res.json({
      edges: result,
      computedAt: new Date().toISOString(),
      dataQuality: 'sprint_0_placeholder',
      note: 'Source attribution uses referred_by_code only. Full UTM stitching lands per Tracking Specialist spec in later sprint.',
    });
  } catch (err) {
    console.error('[attribution/whale-origins]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
