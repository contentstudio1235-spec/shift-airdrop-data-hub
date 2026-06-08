// ============================================================
// Pulse Route — GET /api/pulse/snapshot
// ============================================================
// Single read-only endpoint that returns the full Pulse-tab
// payload. Auth: same `x-admin-key` header as the rest of the
// admin/data-hub surface.
// ============================================================

import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import { getPulseSnapshot } from '../services/pulseService';
import { getLaunchThisWeekSnapshot } from '../services/launchThisWeekService';

const router = Router();

// Admin-key gate — mirror users.ts / admin.ts pattern.
router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

/**
 * GET /api/pulse/snapshot
 * Returns the entire Pulse snapshot (see src/types/pulse.ts).
 */
router.get('/snapshot', async (_req: Request, res: Response) => {
  try {
    const snapshot = await getPulseSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('[pulse/snapshot]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /api/pulse/launch-this-week
 * HARVEST-001 (MR !30, score 81). Per-channel marketing performance for
 * campaigns launched this week. See src/services/launchThisWeekService.ts
 * for the synthesis decisions encoded in the query + gating logic.
 */
router.get('/launch-this-week', async (_req: Request, res: Response) => {
  try {
    const snapshot = await getLaunchThisWeekSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('[pulse/launch-this-week]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
