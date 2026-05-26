// ============================================================
// Event Service — Manage real-world events that trigger badges
// ============================================================
// Handles event creation, retrieval, and eligibility checking
// Supports recurring events (FOMC calendar, earnings calendar, etc.)

import { query, queryOne, execute } from '../db/pool';

interface Event {
  id: string;
  event_name: string;
  event_type: 'earnings' | 'macro' | 'geopolitical' | 'news_headline' | 'custom';
  description?: string;
  start_time: Date;
  end_time: Date;
  eligible_assets?: string[];
  eligible_indices?: string[];
  trigger_threshold?: number;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_by: string;
  created_at: Date;
  updated_at?: Date;
}

interface NewsHeadline {
  id: string;
  headline: string;
  source: string;
  market_impact: number;
  published_at: Date;
  asset_symbols: string[];
  sentiment: 'bearish' | 'neutral' | 'bullish';
  is_market_moving: boolean;
  created_by: string;
  created_at: Date;
}

interface EventBadgeTrigger {
  id: number;
  badge_name: string;
  event_type: string;
  event_name_pattern: string;
  trigger_condition: string;
  multiplier_bonus: number;
  duration_type: string;
  dynamic_duration_days: number;
  is_active: boolean;
}

export class EventService {
  /**
   * Create a new event
   */
  async createEvent(
    eventName: string,
    eventType: string,
    startTime: Date,
    endTime: Date,
    createdBy: string,
    description?: string,
    eligibleAssets?: string[],
    eligibleIndices?: string[],
    triggerThreshold?: number,
    isRecurring?: boolean,
    recurrenceRule?: string
  ): Promise<Event> {
    const result = await queryOne<Event>(
      `INSERT INTO events
       (event_name, event_type, description, start_time, end_time, eligible_assets,
        eligible_indices, trigger_threshold, is_recurring, recurrence_rule, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
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
      ]
    );

    console.log(`[EventService] ✅ Created event: ${eventName} (${eventType})`);
    return result!;
  }

  /**
   * Get all events of a specific type
   */
  async getEventsByType(eventType: string): Promise<Event[]> {
    return query<Event>(
      `SELECT * FROM events
       WHERE event_type = $1 AND is_active != false
       ORDER BY start_time DESC`,
      [eventType]
    );
  }

  /**
   * Get all active events in a time range
   */
  async getActiveEventsInRange(startTime: Date, endTime: Date): Promise<Event[]> {
    return query<Event>(
      `SELECT * FROM events
       WHERE start_time <= $2 AND end_time >= $1
       ORDER BY start_time ASC`,
      [startTime, endTime]
    );
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    return queryOne<Event>(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );
  }

  /**
   * Check if a wallet qualifies for event-based badge eligibility
   */
  async checkEventEligibility(
    wallet: string,
    eventId: string,
    asset?: string
  ): Promise<boolean> {
    const event = await this.getEventById(eventId);
    if (!event) return false;

    const eligibleAssets = event.eligible_assets || [];
    if (asset) {
      eligibleAssets.push(asset);
    }

    const match = await queryOne(
      `SELECT id FROM positions
       WHERE wallet = $1
       AND opened_at >= $2 AND opened_at <= $3
       AND (asset = ANY($4))
       AND status != 'filtered'
       LIMIT 1`,
      [wallet, event.start_time, event.end_time, eligibleAssets]
    );

    return !!match;
  }

  /**
   * Check News Reactor eligibility (position opened within 60 minutes of headline)
   */
  async checkNewsReactorEligibility(
    wallet: string,
    headlineId: string,
    windowMinutes: number = 60
  ): Promise<boolean> {
    const headline = await queryOne<NewsHeadline>(
      `SELECT * FROM news_feed WHERE id = $1`,
      [headlineId]
    );

    if (!headline) return false;

    const windowStart = new Date(headline.published_at.getTime() - windowMinutes * 60 * 1000);
    const windowEnd = new Date(headline.published_at.getTime() + windowMinutes * 60 * 1000);

    const match = await queryOne(
      `SELECT id FROM positions
       WHERE wallet = $1
       AND opened_at >= $2 AND opened_at <= $3
       AND (asset = ANY($4))
       AND status != 'filtered'
       LIMIT 1`,
      [wallet, windowStart, windowEnd, headline.asset_symbols]
    );

    return !!match;
  }

  /**
   * Add a news headline
   */
  async addNewsHeadline(
    headline: string,
    source: string,
    marketImpact: number,
    publishedAt: Date,
    assetSymbols: string[],
    sentiment: 'bearish' | 'neutral' | 'bullish',
    createdBy: string
  ): Promise<NewsHeadline> {
    const result = await queryOne<NewsHeadline>(
      `INSERT INTO news_feed
       (headline, source, market_impact, published_at, asset_symbols, sentiment, is_market_moving, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING *`,
      [headline, source, marketImpact, publishedAt, assetSymbols, sentiment, createdBy]
    );

    console.log(`[EventService] 📰 Added news: "${headline.slice(0, 50)}..."`);
    return result!;
  }

  /**
   * Get recent news headlines (last 24 hours)
   */
  async getRecentNews(hoursBack: number = 24): Promise<NewsHeadline[]> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return query<NewsHeadline>(
      `SELECT * FROM news_feed
       WHERE published_at >= $1 AND is_market_moving = true
       ORDER BY published_at DESC`,
      [cutoffTime]
    );
  }

  /**
   * Get news for a specific asset
   */
  async getNewsForAsset(assetSymbol: string, hoursBack: number = 24): Promise<NewsHeadline[]> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return query<NewsHeadline>(
      `SELECT * FROM news_feed
       WHERE published_at >= $1 AND $2 = ANY(asset_symbols)
       ORDER BY published_at DESC`,
      [cutoffTime, assetSymbol]
    );
  }

  /**
   * Record event activity for analytics
   */
  async recordEventActivity(
    eventId: string,
    wallet: string,
    activityType: string,
    asset: string,
    positionSizeUSD: number,
    positionId?: string
  ): Promise<void> {
    await execute(
      `INSERT INTO event_activity
       (event_id, wallet, position_id, activity_type, activity_time, asset, position_size_usd)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
      [eventId, wallet, positionId || null, activityType, asset, positionSizeUSD]
    );
  }

  /**
   * Get event activity count (analytics)
   */
  async getEventActivityCount(eventId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM event_activity WHERE event_id = $1`,
      [eventId]
    );
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Get participants in an event
   */
  async getEventParticipants(eventId: string): Promise<string[]> {
    const results = await query<{ wallet: string }>(
      `SELECT DISTINCT wallet FROM event_activity WHERE event_id = $1`,
      [eventId]
    );
    return results.map((r) => r.wallet);
  }
}

export const eventService = new EventService();
