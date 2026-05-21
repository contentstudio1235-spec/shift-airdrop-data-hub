import { Router } from 'express';
import { positionService } from '../services/positionService';
import { getTokenInfo } from '../config/tokens';

const router = Router();

// Get active positions for a wallet
router.get('/:wallet/active', async (req, res) => {
  const { wallet } = req.params;

  try {
    const positions = await positionService.getActivePositions(wallet);
    
    // Add real-time projections for the frontend UX
    const enrichedPositions = positions.map(pos => {
      const { weeks, days, hours } = positionService.getPositionAge(pos.opened_at);

      // Base multiplier from token configuration (e.g., SOX3L = 1.25x)
      const baseMultiplier = getTokenInfo(pos.asset_mint)?.baseMultiplier ?? 1.0;

      // Time multiplier increases by 0.1 every 7 days (1 week). Capped at 3.0.
      const timeMultiplier = Math.min(1.0 + (weeks * 0.10), 3.0);

      // Combined multiplier = base × time
      const currentMultiplier = baseMultiplier * timeMultiplier;
      const nextMultiplier = baseMultiplier * Math.min(timeMultiplier + 0.10, 3.0);
      
      const daysToNext = 7 - days;
      const progressionHook = currentMultiplier < 3.0 
        ? `+0.1x in ${daysToNext} days`
        : `Max Multiplier Reached`;

      // Base XP per week: log10(max(size, 10)) * 100 * multiplier
      const baseSize = Math.max(Number(pos.position_size_usd), 10);
      const xpPerWeek = Math.log10(baseSize) * 100 * currentMultiplier;

      return {
        id: pos.id,
        asset: pos.asset,
        positionSizeUsd: Number(pos.position_size_usd),
        openedAt: pos.opened_at,
        weeksHeld: weeks,
        daysHeld: days,
        currentMultiplier,
        nextMultiplier,
        xpPerWeek: Math.floor(xpPerWeek),
        progressionHook,
        status: pos.status
      };
    });

    res.json({ positions: enrichedPositions });
  } catch (error) {
    console.error('[API] Positions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
