// src/routes/attribution.ts
import { Router, type Request, type Response } from 'express';
import { computeChannelROI, computeWhaleOrigins } from '../services/attributionService';
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
      dataQuality: 'sprint_0_placeholder',
      note: 'Source attribution uses referred_by_code only. Full UTM stitching lands per Tracking Specialist spec in later sprint.',
    });
  } catch (err) {
    console.error('[attribution/channel-roi]', err);
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
