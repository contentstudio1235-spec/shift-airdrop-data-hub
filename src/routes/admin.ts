// ============================================================
// Admin Routes — Manual sync triggers (via Stratus Function)
// ============================================================

import express from 'express';
import { snagSyncService } from '../services/snagSyncService';

const router = express.Router();

/**
 * Middleware: Verify admin secret header
 * Protects the sync endpoint from unauthorized triggers
 */
const verifyAdminSecret = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const secret = req.headers['x-admin-key'] as string | undefined;
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret) {
    console.warn('[Admin] ADMIN_SECRET not configured');
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn('[Admin] Invalid admin secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

/**
 * POST /api/admin/sync
 * Trigger a full XP recalculation + badge evaluation + SNAG sync
 * Called by SNAG Stratus scheduled function every 10 minutes
 */
router.post('/sync', verifyAdminSecret, async (req, res) => {
  try {
    console.log('[Admin] Manual full sync triggered');
    const startTime = Date.now();

    await snagSyncService.fullSync();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Admin] Full sync completed in ${duration}s`);

    res.json({
      success: true,
      message: 'Full sync completed',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/queue-retry
 * Manually trigger SNAG sync queue retry worker
 */
router.post('/queue-retry', verifyAdminSecret, async (req, res) => {
  try {
    console.log('[Admin] Manual queue retry triggered');
    const startTime = Date.now();

    await snagSyncService.processRetryQueue();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Admin] Queue retry completed in ${duration}s`);

    res.json({
      success: true,
      message: 'Queue retry completed',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Queue retry failed:', error);
    res.status(500).json({
      success: false,
      error: 'Queue retry failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/health
 * Check admin endpoint is working
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
