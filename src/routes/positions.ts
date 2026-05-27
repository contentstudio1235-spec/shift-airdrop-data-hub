import { Router } from 'express';
import { positionService } from '../services/positionService';
import { getTokenInfo } from '../config/tokens';
import { xpEngine } from '../services/xpEngine';
import { getLaunchPhase } from '../config/launchMultipliers';

const router = Router();

// Get active positions for a wallet with detailed XP projections
router.get('/:wallet/active', async (req, res) => {
  const { wallet } = req.params;

  try {
    const positions = await positionService.getActivePositions(wallet);
    const launchPhase = getLaunchPhase();

    // Get detailed XP breakdown
    const xpBreakdown = await xpEngine.getXPBreakdown(wallet);
    const breakdownMap = new Map(xpBreakdown.map(b => [b.asset, b]));

    // Add real-time projections for the frontend UX
    const enrichedPositions = positions.map(pos => {
      const { weeks, days } = positionService.getPositionAge(pos.opened_at);

      // Base multiplier from token configuration (e.g., SOX3L = 1.25x)
      const baseMultiplier = pos.asset_mint ? (getTokenInfo(pos.asset_mint)?.baseMultiplier ?? 1.0) : 1.0;

      // Time multiplier increases by 0.1 every 7 days (1 week). Capped at 3.0.
      const timeMultiplier = Math.min(1.0 + (weeks * 0.10), 3.0);

      // Combined multiplier = base × time
      const currentMultiplier = baseMultiplier * timeMultiplier;
      const nextMultiplier = baseMultiplier * Math.min(timeMultiplier + 0.10, 3.0);

      const daysToNext = 7 - days;
      const progressionHook = currentMultiplier < 3.0
        ? `+0.1x in ${daysToNext} days`
        : `Max Multiplier Reached`;

      // XP calculations with launch event multiplier
      const baseSize = Math.max(Number(pos.position_size_usd), 10);
      const baseXpPerWeek = Math.log10(baseSize) * 100 * currentMultiplier;
      const xpPerWeek = Math.floor(baseXpPerWeek * launchPhase.multiplier);
      const xpPerHour = Math.floor((baseXpPerWeek * launchPhase.multiplier) / (7 * 24));

      // Launch event info
      const breakdownInfo = breakdownMap.get(pos.asset);

      return {
        id: pos.id,
        asset: pos.asset,
        positionSizeUsd: Number(pos.position_size_usd),
        openedAt: pos.opened_at,
        weeksHeld: weeks,
        daysHeld: days,
        currentMultiplier,
        nextMultiplier,
        launchMultiplier: launchPhase.multiplier,
        effectiveMultiplier: currentMultiplier * launchPhase.multiplier,
        xpPerWeek,
        xpPerHour,
        progressionHook,
        status: pos.status,
        launchPhase: {
          phase: launchPhase.phase,
          label: launchPhase.label,
          countdownDisplay: launchPhase.countdownDisplay,
        },
      };
    });

    res.json({
      positions: enrichedPositions,
      launchInfo: {
        phase: launchPhase.phase,
        label: launchPhase.label,
        multiplier: launchPhase.multiplier,
        countdownDisplay: launchPhase.countdownDisplay,
        daysIntoLaunch: launchPhase.daysIntoLaunch,
      },
    });
  } catch (error) {
    console.error('[API] Positions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get closed (historical) positions for a wallet
router.get('/:wallet/history', async (req, res) => {
  const { wallet } = req.params;

  try {
    const allPositions = await positionService.getAllPositions(wallet);
    const closedPositions = allPositions.filter(p => p.status === 'closed');

    const enrichedHistory = closedPositions.map(pos => {
      const openedAt = new Date(pos.opened_at);
      const closedAt = pos.closed_at ? new Date(pos.closed_at) : new Date();
      const diffMs = closedAt.getTime() - openedAt.getTime();
      const totalDays = diffMs / (1000 * 60 * 60 * 24);
      const weeksHeld = Math.floor(totalDays / 7);

      const baseMultiplier = pos.asset_mint
        ? (getTokenInfo(pos.asset_mint)?.baseMultiplier ?? 1.0)
        : 1.0;
      const timeMultiplier = Math.min(1.0 + (weeksHeld * 0.10), 3.0);
      const finalMultiplier = baseMultiplier * timeMultiplier;

      const baseSize = Math.max(Number(pos.position_size_usd), 10);
      const xpPerWeek = Math.floor(Math.log10(baseSize) * 100 * finalMultiplier);
      const totalSpEarned = Number(pos.xp_generated) > 0
        ? Math.floor(Number(pos.xp_generated))
        : Math.floor(xpPerWeek * Math.max(weeksHeld, 1));

      return {
        id: pos.id,
        asset: pos.asset,
        positionSizeUsd: Number(pos.position_size_usd),
        openedAt: pos.opened_at,
        closedAt: pos.closed_at,
        weeksHeld,
        finalMultiplier,
        xpPerWeek,
        totalSpEarned,
        status: 'closed' as const,
      };
    });

    res.json({ positions: enrichedHistory });
  } catch (error) {
    console.error('[API] Position history fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
