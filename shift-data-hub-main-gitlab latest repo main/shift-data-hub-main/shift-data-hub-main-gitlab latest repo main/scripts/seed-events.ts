// ============================================================
// Seed Events — Pre-populate market events for MVP
// ============================================================

import { pool } from '../src/db/pool';

async function seedEvents() {
  console.log('[Seed] Seeding market events...');

  const events = [
    {
      name: 'FOMC Rate Decision - June 2026',
      type: 'macro',
      start: '2026-06-11T18:00:00Z',
      end: '2026-06-12T06:00:00Z',
      assets: ['SOL', 'ETH', 'BTC'],
      badge: 'fomc_trader',
    },
    {
      name: 'CPI Release - May 2026',
      type: 'macro',
      start: '2026-05-13T12:30:00Z',
      end: '2026-05-14T00:00:00Z',
      assets: ['SOL', 'ETH', 'BTC'],
      badge: 'fomc_trader',
    },
    {
      name: 'NVIDIA Earnings Q1 2026',
      type: 'earnings',
      start: '2026-05-28T20:00:00Z',
      end: '2026-05-29T16:00:00Z',
      assets: ['RNDR', 'SOL'],
      badge: 'earnings_reactor',
    },
    {
      name: 'Tesla Earnings Q2 2026',
      type: 'earnings',
      start: '2026-07-23T20:00:00Z',
      end: '2026-07-24T16:00:00Z',
      assets: ['SOL'],
      badge: 'earnings_reactor',
    },
    {
      name: 'FOMC Rate Decision - July 2026',
      type: 'macro',
      start: '2026-07-30T18:00:00Z',
      end: '2026-07-31T06:00:00Z',
      assets: ['SOL', 'ETH', 'BTC'],
      badge: 'fomc_trader',
    },
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const event of events) {
      await client.query(
        `INSERT INTO events (event_name, event_type, start_time, end_time, eligible_assets, badge_reward) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT DO NOTHING`,
        [event.name, event.type, event.start, event.end, event.assets, event.badge]
      );
      console.log(`  ✅ ${event.name}`);
    }

    await client.query('COMMIT');
    console.log(`[Seed] ✅ ${events.length} events seeded`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seed] ❌ Seeding failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedEvents().catch(console.error);
