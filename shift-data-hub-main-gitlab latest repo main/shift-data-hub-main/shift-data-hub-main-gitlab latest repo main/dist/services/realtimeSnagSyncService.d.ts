interface SyncJob {
    wallet: string;
    type: 'xp' | 'multiplier' | 'badge' | 'certificate';
    value: number | string;
    timestamp: Date;
    attempt: number;
    maxAttempts: number;
}
export declare class RealtimeSnagSyncService {
    private queue;
    private processing;
    private debounceMs;
    private timers;
    /**
     * Queue a Shift Points (XP) change for real-time sync to SNAG
     * Debounces multiple updates from the same wallet
     */
    queueXPSync(wallet: string, xpAmount: number): void;
    /**
     * Queue a multiplier change for real-time sync to SNAG
     */
    queueMultiplierSync(wallet: string, newMultiplier: number): void;
    /**
     * Queue a badge award for real-time sync to SNAG
     */
    queueBadgeSync(wallet: string, badgeName: string): void;
    /**
     * Queue a certificate award for real-time sync to SNAG
     */
    queueCertificateSync(wallet: string, certificateName: string): void;
    /**
     * Process all queued sync jobs
     * Batches updates by type and walletfor efficient API calls
     */
    private processQueue;
    /**
     * Batch process XP syncs
     */
    private processXPBatch;
    /**
     * Batch process multiplier syncs
     * Note: Multipliers are synced via the regular syncMultipliers() call
     * triggered by XP updates, so we just mark them as processed here
     */
    private processMultiplierBatch;
    /**
     * Batch process badge syncs
     */
    private processBadgeBatch;
    /**
     * Batch process certificate syncs
     */
    private processCertificateBatch;
    /**
     * Log failed sync attempts for manual review
     */
    private logFailedSync;
    /**
     * Force process all queued jobs immediately (used for testing/debugging)
     */
    forceSync(): Promise<void>;
    /**
     * Get current queue status
     */
    getQueueStatus(): {
        size: number;
        jobs: SyncJob[];
    };
    /**
     * Clear the queue (use with caution)
     */
    clearQueue(): void;
}
export declare const realtimeSnagSyncService: RealtimeSnagSyncService;
export {};
//# sourceMappingURL=realtimeSnagSyncService.d.ts.map