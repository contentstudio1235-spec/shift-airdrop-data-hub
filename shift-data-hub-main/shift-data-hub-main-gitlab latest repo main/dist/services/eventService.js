"use strict";
// ============================================================
// Event Service — Manage real-world events that trigger badges
// ============================================================
// Handles event creation, retrieval, and eligibility checking
// Supports recurring events (FOMC calendar, earnings calendar, etc.)
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = exports.EventService = void 0;
const pool_1 = require("../db/pool");
class EventService {
    /**
     * Create a new event
     */
    async createEvent(eventName, eventType, startTime, endTime, createdBy, description, eligibleAssets, eligibleIndices, triggerThreshold, isRecurring, recurrenceRule) {
        const result = await (0, pool_1.queryOne)(`INSERT INTO events
       (event_name, event_type, description, start_time, end_time, eligible_assets,
        eligible_indices, trigger_threshold, is_recurring, recurrence_rule, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [
            eventName,
            eventType,
            description,
            startTime,
            endTime,
            eligibleAssets ? JSON.stringify(eligibleAssets) : null,
            eligibleIndices ? JSON.stringify(eligibleIndices) : null,
            triggerThreshold,
            isRecurring,
            recurrenceRule,
            createdBy,
        ]);
        console.log(`[EventService] ✅ Created event: ${eventName} (${eventType})`);
        return result;
    }
    /**
     * Get all events of a specific type
     */
    async getEventsByType(eventType) {
        return (0, pool_1.query)(`SELECT * FROM events
       WHERE event_type = $1 AND is_active != false
       ORDER BY start_time DESC`, [eventType]);
    }
    /**
     * Get all active events in a time range
     */
    async getActiveEventsInRange(startTime, endTime) {
        return (0, pool_1.query)(`SELECT * FROM events
       WHERE start_time <= $2 AND end_time >= $1
       ORDER BY start_time ASC`, [startTime, endTime]);
    }
    /**
     * Get a specific event by ID
     */
    async getEventById(eventId) {
        return (0, pool_1.queryOne)(`SELECT * FROM events WHERE id = $1`, [eventId]);
    }
    /**
     * Check if a wallet qualifies for event-based badge eligibility
     */
    async checkEventEligibility(wallet, eventId, asset) {
        const event = await this.getEventById(eventId);
        if (!event)
            return false;
        const eligibleAssets = event.eligible_assets || [];
        if (asset) {
            eligibleAssets.push(asset);
        }
        const match = await (0, pool_1.queryOne)(`SELECT id FROM positions
       WHERE wallet = $1
       AND opened_at >= $2 AND opened_at <= $3
       AND (asset = ANY($4))
       AND status != 'filtered'
       LIMIT 1`, [wallet, event.start_time, event.end_time, eligibleAssets]);
        return !!match;
    }
    /**
     * Check News Reactor eligibility (position opened within 60 minutes of headline)
     */
    async checkNewsReactorEligibility(wallet, headlineId, windowMinutes = 60) {
        const headline = await (0, pool_1.queryOne)(`SELECT * FROM news_feed WHERE id = $1`, [headlineId]);
        if (!headline)
            return false;
        const windowStart = new Date(headline.published_at.getTime() - windowMinutes * 60 * 1000);
        const windowEnd = new Date(headline.published_at.getTime() + windowMinutes * 60 * 1000);
        const match = await (0, pool_1.queryOne)(`SELECT id FROM positions
       WHERE wallet = $1
       AND opened_at >= $2 AND opened_at <= $3
       AND (asset = ANY($4))
       AND status != 'filtered'
       LIMIT 1`, [wallet, windowStart, windowEnd, headline.asset_symbols]);
        return !!match;
    }
    /**
     * Add a news headline
     */
    async addNewsHeadline(headline, source, marketImpact, publishedAt, assetSymbols, sentiment, createdBy) {
        const result = await (0, pool_1.queryOne)(`INSERT INTO news_feed
       (headline, source, market_impact, published_at, asset_symbols, sentiment, is_market_moving, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING *`, [headline, source, marketImpact, publishedAt, assetSymbols, sentiment, createdBy]);
        console.log(`[EventService] 📰 Added news: "${headline.slice(0, 50)}..."`);
        return result;
    }
    /**
     * Get recent news headlines (last 24 hours)
     */
    async getRecentNews(hoursBack = 24) {
        const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        return (0, pool_1.query)(`SELECT * FROM news_feed
       WHERE published_at >= $1 AND is_market_moving = true
       ORDER BY published_at DESC`, [cutoffTime]);
    }
    /**
     * Get news for a specific asset
     */
    async getNewsForAsset(assetSymbol, hoursBack = 24) {
        const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        return (0, pool_1.query)(`SELECT * FROM news_feed
       WHERE published_at >= $1 AND $2 = ANY(asset_symbols)
       ORDER BY published_at DESC`, [cutoffTime, assetSymbol]);
    }
    /**
     * Record event activity for analytics
     */
    async recordEventActivity(eventId, wallet, activityType, asset, positionSizeUSD, positionId) {
        await (0, pool_1.execute)(`INSERT INTO event_activity
       (event_id, wallet, position_id, activity_type, activity_time, asset, position_size_usd)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`, [eventId, wallet, positionId || null, activityType, asset, positionSizeUSD]);
    }
    /**
     * Get event activity count (analytics)
     */
    async getEventActivityCount(eventId) {
        const result = await (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM event_activity WHERE event_id = $1`, [eventId]);
        return parseInt(result?.count || '0', 10);
    }
    /**
     * Get participants in an event
     */
    async getEventParticipants(eventId) {
        const results = await (0, pool_1.query)(`SELECT DISTINCT wallet FROM event_activity WHERE event_id = $1`, [eventId]);
        return results.map((r) => r.wallet);
    }
}
exports.EventService = EventService;
exports.eventService = new EventService();
//# sourceMappingURL=eventService.js.map