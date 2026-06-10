import { Router } from 'express';
import { query } from '../db/pool';

const router = Router();

// Define all possible badges for the UI
const ALL_BADGES = [
  { id: 'first_trade', name: 'First Trade', description: 'Complete your first swap', type: 'achievement' },
  { id: 'diamond_hands', name: 'Diamond Hands', description: 'Hold a position for 30 days', type: 'achievement' },
  { id: 'earnings_reactor', name: 'Earnings Reactor', description: 'Trade during an earnings event', type: 'event' },
  { id: 'fomc_trader', name: 'FOMC Trader', description: 'Trade during FOMC volatility', type: 'event' },
];

// Get badges for a wallet (earned vs locked)
router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    const earnedRows = await query(
      `SELECT badge_name, earned_at FROM badges WHERE wallet = $1`,
      [wallet]
    );

    const earnedNames = new Set(earnedRows.map((r: any) => r.badge_name));

    const badges = ALL_BADGES.map(b => ({
      ...b,
      earned: earnedNames.has(b.id),
      earnedAt: earnedRows.find((r: any) => r.badge_name === b.id)?.earned_at || null
    }));

    res.json({ badges });
  } catch (error) {
    console.error('[API] Badges fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
