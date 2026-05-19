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
  // Every 10 minutes — full recalculation + sync (keeps Render free tier container active)
  cron.schedule('*/10 * * * *', async () => {
    if (isRunning) {
      console.log('[Cron] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();
    console.log('[Cron] ⏰ Sync job started');

    try {
      // Full sync: recalculate XP → evaluate badges → push to SNAG
      await snagSyncService.fullSync();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Cron] ✅ Sync job complete in ${duration}s`);
    } catch (error) {
      console.error('[Cron] ❌ Sync job failed:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('[Cron] ✅ Scheduled: full sync every 10 minutes');
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
