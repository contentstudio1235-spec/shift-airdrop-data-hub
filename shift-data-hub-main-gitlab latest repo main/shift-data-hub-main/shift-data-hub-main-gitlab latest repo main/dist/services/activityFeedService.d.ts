/**
 * Activity Feed Service
 * Tracks and displays user actions for timeline/feed display
 */
export interface ActivityEvent {
    id: number;
    wallet: string;
    eventType: string;
    eventData: Record<string, any>;
    createdAt: Date;
    displayText: string;
}
export declare class ActivityFeedService {
    /**
     * Log an activity event
     */
    logEvent(wallet: string, eventType: string, eventData?: Record<string, any>): Promise<void>;
    /**
     * Get recent activity for a user
     */
    getUserActivity(wallet: string, limit?: number): Promise<ActivityEvent[]>;
    /**
     * Get global recent activity (all users)
     */
    getGlobalActivity(limit?: number): Promise<ActivityEvent[]>;
    /**
     * Format event data into display text
     */
    private formatEvent;
    /**
     * Clean up old activity events (>30 days)
     */
    cleanupOldEvents(daysOld?: number): Promise<number>;
}
export declare const activityFeedService: ActivityFeedService;
//# sourceMappingURL=activityFeedService.d.ts.map