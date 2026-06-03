// src/routes/funnels.ts
import { Router, type Request, type Response } from 'express';
import { computeFunnel } from '../services/funnelService';
import { parseQueryParams } from '../lib/queryParams';
import type { FunnelId } from '../types/funnel';
import { config } from '../config';

const VALID_FUNNELS: FunnelId[] = [
  'acquisition',
  'activation',
  'conversion',
  'whale_pipeline',
  'loyalty',
  'referral',
  'retention',
];

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/:funnelId', async (req: Request, res: Response) => {
  const { funnelId } = req.params;

  if (!VALID_FUNNELS.includes(funnelId as FunnelId)) {
    return res.status(400).json({ error: `invalid funnel id: ${funnelId}` });
  }

  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeFunnel(funnelId as FunnelId, params);
    res.json(result);
  } catch (err) {
    console.error('[funnels]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
