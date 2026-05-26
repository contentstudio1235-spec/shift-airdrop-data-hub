"use strict";
/**
 * Activity Feed Service
 * Tracks and displays user actions for timeline/feed display
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityFeedService = exports.ActivityFeedService = void 0;
const pool_1 = require("../db/pool");
class ActivityFeedService {
    /**
     * Log an activity event
     */
    async logEvent(wallet, eventType, eventData = {}) {
        try {
            await (0, pool_1.execute)(`INSERT INTO activity_feed (wallet, event_type, event_data)
         VALUES ($1, $2, $3)`, [wallet, eventType, JSON.stringify(eventData)]);
        }
        catch (error) {
            console.error('[ActivityFeed] Error logging event:', error);
            // Don't throw — activity feed is non-critical
        }
    }
    /**
     * Get recent activity for a user
     */
    async getUserActivity(wallet, limit = 10) {
        try {
            const result = await pool_1.pool.query(`SELECT id, wallet, event_type, event_data, created_at
         FROM activity_feed
         WHERE wallet = $1
         ORDER BY created_at DESC
         LIMIT $2`, [wallet, limit]);
            return result.rows.map(row => this.formatEvent(row));
        }
        catch (error) {
            console.error('[ActivityFeed] Error fetching user activity:', error);
            return [];
        }
    }
    /**
     * Get global recent activity (all users)
     */
    async getGlobalActivity(limit = 50) {
        try {
            const result = await pool_1.pool.query(`SELECT id, wallet, event_type, event_data, created_at
         FROM activity_feed
         ORDER BY created_at DESC
         LIMIT $1`, [limit]);
            return result.rows.map(row => this.formatEvent(row));
        }
        catch (error) {
            console.error('[ActivityFeed] Error fetching global activity:', error);
            return [];
        }
    }
    /**
     * Format event data into display text
     */
    formatEvent(row) {
        const wallet = row.wallet;
        const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
        const eventData = typeof row.event_data === 'string'
            ? JSON.parse(row.event_data)
            : row.event_data;
        let displayText = '';
        switch (row.event_type) {
            case 'position_opened':
                displayText = `📈 ${shortWallet} opened a $${eventData.sizeUsd?.toFixed(0)} ${eventData.asset || 'position'}`;
                break;
            case 'position_closed':
                displayText = `🚫 ${shortWallet} closed a ${eventData.asset || 'position'}`;
                break;
            case 'badge_earned':
                displayText = `🏆 ${shortWallet} earned the ${eventData.badgeName || 'achievement'} badge`;
                break;
            case 'level_up':
                displayText = `⬆️ ${shortWallet} reached Level ${eventData.newLevel || '?'}`;
                break;
            case 'milestone_7day':
                displayText = `🔥 ${shortWallet} hit a 7-day streak!`;
                break;
            case 'milestone_30day':
                displayText = `🔥 ${shortWallet} hit a 30-day streak!`;
                break;
            case 'referral':
                displayText = `🎉 ${shortWallet} referred a new user`;
                break;
            default:
                displayText = `✨ ${shortWallet} did something amazing`;
        }
        return {
            id: row.id,
            wallet: row.wallet,
            eventType: row.event_type,
            eventData,
            createdAt: new Date(row.created_at),
            displayText,
        };
    }
    /**
     * Clean up old activity events (>30 days)
     */
    async cleanupOldEvents(daysOld = 30) {
        try {
            const result = await pool_1.pool.query(`DELETE FROM activity_feed
         WHERE created_at < NOW() - INTERVAL '${daysOld} days'`);
            return result.rowCount || 0;
        }
        catch (error) {
            console.error('[ActivityFeed] Error cleaning up:', error);
            return 0;
        }
    }
}
exports.ActivityFeedService = ActivityFeedService;
exports.activityFeedService = new ActivityFeedService();
//# sourceMappingURL=activityFeedService.js.map