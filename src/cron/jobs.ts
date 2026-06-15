// ============================================================
// Cron Jobs — Full sync every 15 min + queue retry every 5 min
// ============================================================

import cron from 'node-cron';
import { snagSyncService } from '../services/snagSyncService';
import { positionPriceService } from '../services/positionPriceService';
import { referralCommissionService } from '../services/referralCommissionService';

let isRunning = false;
let isQueueRunning = false;
let isPriceRunning = false;
let isCommissionRunning = false;

/**
 * Initialize all cron jobs.
 */
export function initCronJobs(): void {
  // ── Full sync every 15 minutes ──
  // Recalculates all XP/badges/multipliers for all users.
  cron.schedule('*/15 * * * *', async () => {
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

  // ── SNAG retry queue worker every 5 minutes ──
  // Retries failed SNAG push attempts with exponential backoff
  cron.schedule('*/5 * * * *', async () => {
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

  // ── Live price update every 30 minutes ──
  // Fetches current market prices for all open positions and updates:
  //   • current_price
  //   • position_size_usd = token_amount × current_price
  // This ensures XP is calculated on LIVE holding value, not stale entry price.
  cron.schedule('*/30 * * * *', async () => {
    if (isPriceRunning) {
      console.log('[Cron] Previous price update still running, skipping…');
      return;
    }

    isPriceRunning = true;
    try {
      await positionPriceService.updateAllOpenPositionPrices();
    } catch (err) {
      console.error('[Cron] ❌ Price update failed:', err);
    } finally {
      isPriceRunning = false;
    }
  });

  // ── Referral commission calculation every 30 minutes ──
  // Diffs current total_xp vs last_commission_xp for all referred wallets,
  // awards 10-15% commission to referrer (500 SP/month cap per pair).
  cron.schedule('*/30 * * * *', async () => {
    if (isCommissionRunning) return;
    isCommissionRunning = true;
    try {
      const result = await referralCommissionService.processAllPendingCommissions();
      if (result.position > 0) {
        console.log(`[Cron] ✅ Referral commissions: ${result.position} wallets processed`);
      }
    } catch (err) {
      console.error('[Cron] ❌ Commission calculation failed:', err);
    } finally {
      isCommissionRunning = false;
    }
  });

  console.log('[Cron] ✅ Scheduled: full sync every 15 min, price update every 30 min, queue retry every 5 min, commissions every 30 min');
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
