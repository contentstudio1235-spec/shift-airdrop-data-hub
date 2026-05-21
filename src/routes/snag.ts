// ============================================================
// SNAG Routes — Points and completed tasks endpoints
// ============================================================

import { Router } from 'express';
import { snagSyncService } from '../services/snagSyncService';
import { query } from '../db/pool';

const router = Router();

/**
 * GET /api/snag/points/:wallet
 * Returns the user's SNAG loyalty points balance.
 */
router.get('/points/:wallet', async (req, res) => {
  const { wallet } = req.params;

  if (!wallet || wallet.length < 32) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  try {
    const loyaltyPoints = await snagSyncService.getUserPoints(wallet);
    res.json({ wallet, loyaltyPoints });
  } catch (error) {
    console.error('[SNAG] Failed to fetch points:', error);
    res.status(500).json({ error: 'Failed to fetch SNAG points' });
  }
});

/**
 * GET /api/snag/tasks/:wallet
 * Returns the list of social task IDs the user has completed via SNAG.
 */
router.get('/tasks/:wallet', async (req, res) => {
  const { wallet } = req.params;

  if (!wallet || wallet.length < 32) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  try {
    const rows = await query<{ task_id: string; completed_at: Date }>(
      'SELECT task_id, completed_at FROM snag_completed_tasks WHERE wallet = $1',
      [wallet]
    );

    res.json({
      wallet,
      completedTasks: rows.map(r => r.task_id),
      completedAt: Object.fromEntries(rows.map(r => [r.task_id, r.completed_at])),
    });
  } catch (error) {
    console.error('[SNAG] Failed to fetch tasks:', error);
    res.status(500).json({ error: 'Failed to fetch completed tasks' });
  }
});

export default router;
