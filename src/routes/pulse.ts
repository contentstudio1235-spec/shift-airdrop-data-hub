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

export default router;
