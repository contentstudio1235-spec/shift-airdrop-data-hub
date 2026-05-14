// ============================================================
// Admin Routes — Event management + manual sync
// ============================================================

import { Router } from 'express';
import { eventService } from '../services/eventService';
import { runManualSync } from '../cron/jobs';
import { CreateEventRequest } from '../types';

const router = Router();

/**
 * POST /api/admin/events
 * Create a new market event (FOMC, CPI, earnings).
 */
router.post('/events', async (req, res) => {
  try {
    const data: CreateEventRequest = req.body;

    // Basic validation
    if (!data.event_name || !data.event_type || !data.start_time || !data.end_time) {
      res.status(400).json({ error: 'Missing required fields: event_name, event_type, start_time, end_time' });
      return;
    }

    if (!['macro', 'earnings'].includes(data.event_type)) {
      res.status(400).json({ error: 'event_type must be "macro" or "earnings"' });
      return;
    }

    const event = await eventService.createEvent(data);
    res.status(201).json(event);
  } catch (error) {
    console.error('[Admin] Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/events
 * List all events.
 */
router.get('/events', async (_req, res) => {
  try {
    const events = await eventService.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error('[Admin] List events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/events/:id/deactivate
 * Deactivate an event.
 */
router.patch('/events/:id/deactivate', async (req, res) => {
  try {
    await eventService.deactivateEvent(req.params.id);
    res.json({ status: 'deactivated' });
  } catch (error) {
    console.error('[Admin] Deactivate event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/sync
 * Trigger a manual full sync (recalc XP + push to SNAG).
 */
router.post('/sync', async (_req, res) => {
  try {
    await runManualSync();
    res.json({ status: 'sync_complete' });
  } catch (error: any) {
    console.error('[Admin] Manual sync error:', error);
    res.status(409).json({ error: error.message || 'Sync failed' });
  }
});

export default router;
