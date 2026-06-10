// src/routes/cohorts.ts
import { Router, type Request, type Response } from 'express';
import {
  computeCohortMatrix,
  getCohortsSnapshot,
} from '../services/cohortService';
import { parseQueryParams } from '../lib/queryParams';
import type { CohortDim } from '../types/funnel';
import { config } from '../config';

const VALID_DIMS: CohortDim[] = ['day', 'week', 'month'];

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

/**
 * GET /api/cohorts/snapshot
 * Weekly signup cohorts (up to 12, newest first) with activation,
 * retention, AUM, whale count, and identity-stitch metrics +
 * summary trend block. Cached server-side for 60 seconds.
 *
 * Must be mounted BEFORE the `/:dim` catch-all so "snapshot" isn't
 * interpreted as a cohort-dim parameter.
 */
router.get('/snapshot', async (_req: Request, res: Response) => {
  try {
    const snapshot = await getCohortsSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('[cohorts/snapshot]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/:dim', async (req: Request, res: Response) => {
  const { dim } = req.params;
  if (!VALID_DIMS.includes(dim as CohortDim)) {
    return res.status(400).json({ error: `invalid cohort dim: ${dim}` });
  }
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeCohortMatrix(dim as CohortDim, params);
    res.json(result);
  } catch (err) {
    console.error('[cohorts]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
