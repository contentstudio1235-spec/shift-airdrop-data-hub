// ============================================================
// Cron Jobs — Scheduled tasks (hourly)
// ============================================================

import cron from 'node-cron';
import { snagSyncService } from '../services/snagSyncService';

let isRunning = false;

/**
 * Initialize all cron jobs.
 */
export function initCronJobs(): void {
  // Every hour at :00 — full recalculation + sync
  cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      console.log('[Cron] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();
    console.log('[Cron] ⏰ Hourly job started');

    try {
      // Full sync: recalculate XP → evaluate badges → push to SNAG
      await snagSyncService.fullSync();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Cron] ✅ Hourly job complete in ${duration}s`);
    } catch (error) {
      console.error('[Cron] ❌ Hourly job failed:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('[Cron] ✅ Scheduled: full sync every hour at :00');
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
