// src/routes/cohorts.ts
import { Router, type Request, type Response } from 'express';
import { computeCohortMatrix } from '../services/cohortService';
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
