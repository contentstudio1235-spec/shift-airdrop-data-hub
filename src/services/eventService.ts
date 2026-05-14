// ============================================================
// Event Service — Manual market event feed (FOMC, CPI, earnings)
// ============================================================

import { query, queryOne, execute } from '../db/pool';
import { Event, CreateEventRequest } from '../types';

export class EventService {
  /**
   * Get all currently active events.
   */
  async getActiveEvents(): Promise<Event[]> {
    const now = new Date();
    return query<Event>(
      `SELECT * FROM events 
       WHERE is_active = true AND start_time <= $1 AND end_time >= $1 
       ORDER BY start_time`,
      [now]
    );
  }

  /**
   * Get all events (including past and upcoming).
   */
  async getAllEvents(): Promise<Event[]> {
    return query<Event>('SELECT * FROM events ORDER BY start_time DESC LIMIT 50');
  }

  /**
   * Get events by type (macro or earnings).
   */
  async getEventsByType(type: string): Promise<Event[]> {
    return query<Event>(
      'SELECT * FROM events WHERE event_type = $1 AND is_active = true ORDER BY start_time DESC',
      [type]
    );
  }

  /**
   * Get upcoming events (starting within next 7 days).
   */
  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return query<Event>(
      `SELECT * FROM events 
       WHERE is_active = true AND start_time >= $1 AND start_time <= $2 
       ORDER BY start_time`,
      [now, sevenDaysOut]
    );
  }

  /**
   * Check if a specific asset is eligible for any active event.
   */
  async isAssetInActiveEvent(asset: string): Promise<Event | null> {
    const now = new Date();
    return queryOne<Event>(
      `SELECT * FROM events 
       WHERE is_active = true 
       AND start_time <= $1 AND end_time >= $1 
       AND $2 = ANY(eligible_assets)
       LIMIT 1`,
      [now, asset]
    );
  }

  /**
   * Create a new event (admin endpoint).
   */
  async createEvent(data: CreateEventRequest): Promise<Event> {
    const result = await query<Event>(
      `INSERT INTO events (event_name, event_type, start_time, end_time, eligible_assets, badge_reward) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        data.event_name,
        data.event_type,
        data.start_time,
        data.end_time,
        data.eligible_assets,
        data.badge_reward || null,
      ]
    );
    console.log(`[Events] ✅ Created event: ${data.event_name}`);
    return result[0];
  }

  /**
   * Deactivate an event.
   */
  async deactivateEvent(eventId: string): Promise<void> {
    await execute('UPDATE events SET is_active = false WHERE id = $1', [eventId]);
  }
}

export const eventService = new EventService();
