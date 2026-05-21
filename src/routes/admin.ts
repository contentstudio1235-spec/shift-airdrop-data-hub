// ============================================================
// Admin Routes — Sync triggers, KOL management
// ============================================================

import express from 'express';
import { snagSyncService } from '../services/snagSyncService';
import { referralService } from '../services/referralService';

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

// ── KOL Management ───────────────────────────────────────────────────────

/**
 * GET /api/admin/kol
 * List all KOL entries with referral counts
 */
router.get('/kol', verifyAdminSecret, async (_req, res) => {
  try {
    const kols = await referralService.listKols();
    res.json({ kols, total: kols.length });
  } catch (error) {
    console.error('[Admin] Failed to list KOLs:', error);
    res.status(500).json({ error: 'Failed to list KOLs' });
  }
});

/**
 * POST /api/admin/kol
 * Add or update a KOL whitelist entry
 * Body: { wallet, customCode, displayName?, multiplierBonus?, multiplierType?, notes? }
 */
router.post('/kol', verifyAdminSecret, async (req, res) => {
  try {
    const {
      wallet,
      customCode,
      displayName,
      multiplierBonus,
      multiplierType,
      notes,
    } = req.body;

    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    if (!customCode || customCode.length < 4) {
      return res.status(400).json({ error: 'Custom code must be at least 4 characters' });
    }
    if (!/^[A-Z0-9-]{4,32}$/i.test(customCode)) {
      return res.status(400).json({ error: 'Code must be alphanumeric with hyphens only (4–32 chars)' });
    }
    if (multiplierBonus !== undefined && (multiplierBonus < 1.0 || multiplierBonus > 2.0)) {
      return res.status(400).json({ error: 'Multiplier bonus must be between 1.0 and 2.0' });
    }
    if (multiplierType !== undefined && !['dynamic', 'permanent'].includes(multiplierType)) {
      return res.status(400).json({ error: 'multiplierType must be "dynamic" or "permanent"' });
    }

    const kol = await referralService.addKol({
      wallet,
      customCode,
      displayName,
      multiplierBonus: multiplierBonus ?? 1.5,
      multiplierType: multiplierType ?? 'dynamic',
      notes,
      createdBy: 'admin',
    });

    res.json({ success: true, kol });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Custom code already in use' });
    }
    console.error('[Admin] Failed to add KOL:', error);
    res.status(500).json({ error: 'Failed to add KOL' });
  }
});

/**
 * PATCH /api/admin/kol/:wallet
 * Update a KOL entry (activate/deactivate, change multiplier, etc.)
 */
router.patch('/kol/:wallet', verifyAdminSecret, async (req, res) => {
  try {
    const { wallet } = req.params as { wallet: string };
    const { customCode, displayName, multiplierBonus, multiplierType, isActive, notes } = req.body as any;

    if (multiplierBonus !== undefined && (multiplierBonus < 1.0 || multiplierBonus > 2.0)) {
      return res.status(400).json({ error: 'Multiplier bonus must be between 1.0 and 2.0' });
    }

    const updates: any = {};
    if (customCode !== undefined) updates.customCode = customCode;
    if (displayName !== undefined) updates.displayName = displayName;
    if (multiplierBonus !== undefined) updates.multiplierBonus = multiplierBonus;
    if (multiplierType !== undefined) updates.multiplierType = multiplierType;
    if (isActive !== undefined) updates.isActive = isActive;
    if (notes !== undefined) updates.notes = notes;

    const updated = await referralService.updateKol(wallet, updates);

    if (!updated) {
      return res.status(404).json({ error: 'KOL not found' });
    }

    res.json({ success: true, kol: updated });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Custom code already in use' });
    }
    console.error('[Admin] Failed to update KOL:', error);
    res.status(500).json({ error: 'Failed to update KOL' });
  }
});

/**
 * DELETE /api/admin/kol/:wallet
 * Deactivate (soft delete) a KOL
 */
router.delete('/kol/:wallet', verifyAdminSecret, async (req, res) => {
  try {
    const { wallet } = req.params as { wallet: string };
    const updated = await referralService.updateKol(wallet, { isActive: false });
    if (!updated) return res.status(404).json({ error: 'KOL not found' });
    res.json({ success: true, message: 'KOL deactivated' });
  } catch (error) {
    console.error('[Admin] Failed to deactivate KOL:', error);
    res.status(500).json({ error: 'Failed to deactivate KOL' });
  }
});

export default router;
