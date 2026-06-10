import { Router } from 'express';
import { query } from '../db/pool';

const router = Router();

// Get active and upcoming events
router.get('/', async (req, res) => {
  try {
    const events = await query(
      `SELECT * FROM events 
       WHERE end_time > NOW() AND is_active = true
       ORDER BY start_time ASC`
    );

    res.json({ events });
  } catch (error) {
    console.error('[API] Events fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Create new event
router.post('/', async (req, res) => {
  const { event_name, event_type, start_time, end_time, eligible_assets, badge_reward } = req.body;
  
  // Basic admin check could be added here
  
  try {
    await query(
      `INSERT INTO events (event_name, event_type, start_time, end_time, eligible_assets, badge_reward)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event_name, event_type, start_time, end_time, eligible_assets, badge_reward]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Events create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
