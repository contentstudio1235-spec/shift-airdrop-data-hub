// ============================================================
// Cron Jobs — Full sync every 10 min + queue retry every 2 min
// ============================================================

import cron from 'node-cron';
import { snagSyncService } from '../services/snagSyncService';

let isRunning = false;
let isQueueRunning = false;

/**
 * Initialize all cron jobs.
 */
export function initCronJobs(): void {
  // ── Full sync every minute ──
  // Recalculates all XP/badges/multipliers with near-real-time updates.
  // (Keeps Render free-tier container active as bonus side effect)
  cron.schedule('* * * * *', async () => {
    if (isRunning) {
      console.log('[Cron] Previous sync job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();
    console.log('[Cron] ⏰ Full sync job started');

    try {
      await snagSyncService.fullSync();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Cron] ✅ Full sync complete in ${duration}s`);
    } catch (error) {
      console.error('[Cron] ❌ Full sync failed:', error);
    } finally {
      isRunning = false;
    }
  });

  // ── SNAG retry queue worker every 2 minutes ──
  // Retries failed SNAG push attempts with exponential backoff
  cron.schedule('*/2 * * * *', async () => {
    if (isQueueRunning) return;

    isQueueRunning = true;
    try {
      await snagSyncService.processRetryQueue();
    } catch (error) {
      console.error('[Cron] ❌ Queue retry failed:', error);
    } finally {
      isQueueRunning = false;
    }
  });

  console.log('[Cron] ✅ Scheduled: full sync every 10 minutes, queue retry every 2 minutes');
}

/**
 * Run a manual sync (for testing / admin endpoint).
 */
export async function runManualSync(): Promise<void> {
  if (isRunning) {
    throw new Error('Sync already in progress');
  }

  isRunning = true;
  try {
    await snagSyncService.fullSync();
  } finally {
    isRunning = false;
  }
}
