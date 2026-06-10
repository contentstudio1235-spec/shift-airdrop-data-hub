"use strict";
// ============================================================
// Cron Jobs — Full sync every 5 min + queue retry every 2 min
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = initCronJobs;
exports.runManualSync = runManualSync;
const node_cron_1 = __importDefault(require("node-cron"));
const snagSyncService_1 = require("../services/snagSyncService");
let isRunning = false;
let isQueueRunning = false;
/**
 * Initialize all cron jobs.
 */
function initCronJobs() {
    // ── Full sync every 5 minutes ──
    // Recalculates all XP/badges/multipliers with near-real-time updates.
    // (Keeps Render free-tier container active as bonus side effect)
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        if (isRunning) {
            console.log('[Cron] Previous sync job still running, skipping...');
            return;
        }
        isRunning = true;
        const startTime = Date.now();
        console.log('[Cron] ⏰ Full sync job started');
        try {
            await snagSyncService_1.snagSyncService.fullSync();
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[Cron] ✅ Full sync complete in ${duration}s`);
        }
        catch (error) {
            console.error('[Cron] ❌ Full sync failed:', error);
        }
        finally {
            isRunning = false;
        }
    });
    // ── SNAG retry queue worker every 2 minutes ──
    // Retries failed SNAG push attempts with exponential backoff
    node_cron_1.default.schedule('*/2 * * * *', async () => {
        if (isQueueRunning)
            return;
        isQueueRunning = true;
        try {
            await snagSyncService_1.snagSyncService.processRetryQueue();
        }
        catch (error) {
            console.error('[Cron] ❌ Queue retry failed:', error);
        }
        finally {
            isQueueRunning = false;
        }
    });
    console.log('[Cron] ✅ Scheduled: full sync every 5 minutes, queue retry every 2 minutes');
}
/**
 * Run a manual sync (for testing / admin endpoint).
 */
async function runManualSync() {
    if (isRunning) {
        throw new Error('Sync already in progress');
    }
    isRunning = true;
    try {
        await snagSyncService_1.snagSyncService.fullSync();
    }
    finally {
        isRunning = false;
    }
}
//# sourceMappingURL=jobs.js.map