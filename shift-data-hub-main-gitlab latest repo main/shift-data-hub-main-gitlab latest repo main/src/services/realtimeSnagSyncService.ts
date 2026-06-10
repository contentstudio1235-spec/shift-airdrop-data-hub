// ============================================================
// Real-time SNAG Sync Service
// ============================================================
// Pushes Shift Points (XP) and multiplier changes to SNAG immediately
// when they occur, instead of waiting for cron-based polling

import { snagSyncService } from './snagSyncService';
import { multiplierService } from './multiplierService';
import { execute } from '../db/pool';

interface SyncJob {
  wallet: string;
  type: 'xp' | 'multiplier' | 'badge' | 'certificate';
  value: number | string;
  timestamp: Date;
  attempt: number;
  maxAttempts: number;
}

export class RealtimeSnagSyncService {
  private queue: Map<string, SyncJob> = new Map();
  private processing = false;
  private debounceMs = 2000; // Batch updates within 2 seconds
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Queue a Shift Points (XP) change for real-time sync to SNAG
   * Debounces multiple updates from the same wallet
   */
  queueXPSync(wallet: string, xpAmount: number): void {
    const key = `xp:${wallet}`;

    // Clear any pending timer for this wallet
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Queue the sync job
    this.queue.set(key, {
      wallet,
      type: 'xp',
      value: xpAmount,
      timestamp: new Date(),
      attempt: 0,
      maxAttempts: 3,
    });

    // Debounce: wait a bit to batch multiple updates
    const timer = setTimeout(() => {
      this.processQueue().catch((err) => {
        console.error('[RealtimeSnagSync] Queue processing failed:', err);
      });
    }, this.debounceMs);

    this.timers.set(key, timer);
    console.log(`[RealtimeSnagSync] Queued XP sync for ${wallet.slice(0, 8)}...`);
  }

  /**
   * Queue a multiplier change for real-time sync to SNAG
   */
  queueMultiplierSync(wallet: string, newMultiplier: number): void {
    const key = `mult:${wallet}`;

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    this.queue.set(key, {
      wallet,
      type: 'multiplier',
      value: newMultiplier,
      timestamp: new Date(),
      attempt: 0,
      maxAttempts: 3,
    });

    const timer = setTimeout(() => {
      this.processQueue().catch((err) => {
        console.error('[RealtimeSnagSync] Queue processing failed:', err);
      });
    }, this.debounceMs);

    this.timers.set(key, timer);
    console.log(`[RealtimeSnagSync] Queued multiplier sync for ${wallet.slice(0, 8)}...`);
  }

  /**
   * Queue a badge award for real-time sync to SNAG
   */
  queueBadgeSync(wallet: string, badgeName: string): void {
    const key = `badge:${wallet}:${badgeName}`;

    this.queue.set(key, {
      wallet,
      type: 'badge',
      value: badgeName,
      timestamp: new Date(),
      attempt: 0,
      maxAttempts: 3,
    });

    // Badges sync immediately (not debounced)
    this.processQueue().catch((err) => {
      console.error('[RealtimeSnagSync] Badge sync failed:', err);
    });

    console.log(`[RealtimeSnagSync] Queued badge ${badgeName} for ${wallet.slice(0, 8)}...`);
  }

  /**
   * Queue a certificate award for real-time sync to SNAG
   */
  queueCertificateSync(wallet: string, certificateName: string): void {
    const key = `cert:${wallet}:${certificateName}`;

    this.queue.set(key, {
      wallet,
      type: 'certificate',
      value: certificateName,
      timestamp: new Date(),
      attempt: 0,
      maxAttempts: 3,
    });

    // Certificates sync immediately (not debounced, like badges)
    this.processQueue().catch((err) => {
      console.error('[RealtimeSnagSync] Certificate sync failed:', err);
    });

    console.log(`[RealtimeSnagSync] Queued certificate ${certificateName} for ${wallet.slice(0, 8)}...`);
  }

  /**
   * Process all queued sync jobs
   * Batches updates by type and walletfor efficient API calls
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.size === 0) {
      return;
    }

    this.processing = true;

    try {
      // Group jobs by type
      const xpJobs = Array.from(this.queue.values()).filter((j) => j.type === 'xp');
      const multiplierJobs = Array.from(this.queue.values()).filter((j) => j.type === 'multiplier');
      const badgeJobs = Array.from(this.queue.values()).filter((j) => j.type === 'badge');
      const certificateJobs = Array.from(this.queue.values()).filter((j) => j.type === 'certificate');

      // Process XP syncs
      if (xpJobs.length > 0) {
        await this.processXPBatch(xpJobs);
      }

      // Process multiplier syncs
      if (multiplierJobs.length > 0) {
        await this.processMultiplierBatch(multiplierJobs);
      }

      // Process badge syncs
      if (badgeJobs.length > 0) {
        await this.processBadgeBatch(badgeJobs);
      }

      // Process certificate syncs
      if (certificateJobs.length > 0) {
        await this.processCertificateBatch(certificateJobs);
      }
    } catch (err) {
      console.error('[RealtimeSnagSync] Processing error:', err);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Batch process XP syncs
   */
  private async processXPBatch(jobs: SyncJob[]): Promise<void> {
    const xpEntries = jobs.map((j) => ({
      wallet: j.wallet,
      xpDelta: j.value as number,
    }));

    try {
      const { succeeded, failed } = await snagSyncService.batchPushXP(xpEntries);

      // Remove succeeded jobs from queue
      for (const wallet of succeeded) {
        this.queue.delete(`xp:${wallet}`);
      }

      // Retry failed jobs
      for (const wallet of failed) {
        const job = jobs.find((j) => j.wallet === wallet);
        if (job) {
          job.attempt++;
          if (job.attempt >= job.maxAttempts) {
            console.warn(`[RealtimeSnagSync] Max retries exceeded for ${wallet.slice(0, 8)}...`);
            this.queue.delete(`xp:${wallet}`);
            // Log to database for manual review
            await this.logFailedSync(wallet, 'xp', job.value as number);
          }
        }
      }

      console.log(`[RealtimeSnagSync] XP batch: ${succeeded.length}/${xpEntries.length} synced`);
    } catch (err) {
      console.error('[RealtimeSnagSync] XP batch failed:', err);
    }
  }

  /**
   * Batch process multiplier syncs
   * Note: Multipliers are synced via the regular syncMultipliers() call
   * triggered by XP updates, so we just mark them as processed here
   */
  private async processMultiplierBatch(jobs: SyncJob[]): Promise<void> {
    try {
      // Multiplier changes are applied to the database by the calling service
      // and will be picked up by the next full sync cycle.
      // Just remove from queue to mark as processed.
      for (const job of jobs) {
        this.queue.delete(`mult:${job.wallet}`);
      }
      console.log(`[RealtimeSnagSync] Marked ${jobs.length} multiplier updates for sync`);
    } catch (err) {
      console.error('[RealtimeSnagSync] Multiplier batch failed:', err);
    }
  }

  /**
   * Batch process badge syncs
   */
  private async processBadgeBatch(jobs: SyncJob[]): Promise<void> {
    try {
      for (const job of jobs) {
        await (snagSyncService as any).awardBadgeInSnag(job.wallet, job.value as string);
        this.queue.delete(`badge:${job.wallet}:${job.value}`);
      }
      console.log(`[RealtimeSnagSync] Synced ${jobs.length} badge awards`);
    } catch (err) {
      console.error('[RealtimeSnagSync] Badge batch failed:', err);
    }
  }

  /**
   * Batch process certificate syncs
   */
  private async processCertificateBatch(jobs: SyncJob[]): Promise<void> {
    try {
      for (const job of jobs) {
        // Sync certificate like badge (treat as achievement)
        // Certificates are prefixed with "cert_" for SNAG to distinguish from badges
        await (snagSyncService as any).awardBadgeInSnag(job.wallet, `cert_${job.value as string}`);
        this.queue.delete(`cert:${job.wallet}:${job.value}`);
      }
      console.log(`[RealtimeSnagSync] Synced ${jobs.length} certificate awards`);
    } catch (err) {
      console.error('[RealtimeSnagSync] Certificate batch failed:', err);
    }
  }

  /**
   * Log failed sync attempts for manual review
   */
  private async logFailedSync(wallet: string, syncType: string, value: number | string): Promise<void> {
    try {
      await execute(
        `INSERT INTO snag_sync_failures (wallet, sync_type, value, failure_reason, failed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [wallet, syncType, JSON.stringify(value), 'Max retries exceeded in real-time sync']
      );
    } catch (err) {
      console.error('[RealtimeSnagSync] Failed to log sync failure:', err);
    }
  }

  /**
   * Force process all queued jobs immediately (used for testing/debugging)
   */
  async forceSync(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { size: number; jobs: SyncJob[] } {
    return {
      size: this.queue.size,
      jobs: Array.from(this.queue.values()),
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  clearQueue(): void {
    this.queue.clear();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    console.log('[RealtimeSnagSync] Queue cleared');
  }
}

// Export singleton
export const realtimeSnagSyncService = new RealtimeSnagSyncService();
