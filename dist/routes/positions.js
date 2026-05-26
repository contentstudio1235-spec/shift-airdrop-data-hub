"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const positionService_1 = require("../services/positionService");
const tokens_1 = require("../config/tokens");
const xpEngine_1 = require("../services/xpEngine");
const launchMultipliers_1 = require("../config/launchMultipliers");
const router = (0, express_1.Router)();
// Get active positions for a wallet with detailed XP projections
router.get('/:wallet/active', async (req, res) => {
    const { wallet } = req.params;
    try {
        const positions = await positionService_1.positionService.getActivePositions(wallet);
        const launchPhase = (0, launchMultipliers_1.getLaunchPhase)();
        // Get detailed XP breakdown
        const xpBreakdown = await xpEngine_1.xpEngine.getXPBreakdown(wallet);
        const breakdownMap = new Map(xpBreakdown.map(b => [b.asset, b]));
        // Add real-time projections for the frontend UX
        const enrichedPositions = positions.map(pos => {
            const { weeks, days } = positionService_1.positionService.getPositionAge(pos.opened_at);
            // Base multiplier from token configuration (e.g., SOX3L = 1.25x)
            const baseMultiplier = pos.asset_mint ? ((0, tokens_1.getTokenInfo)(pos.asset_mint)?.baseMultiplier ?? 1.0) : 1.0;
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
    }
    catch (error) {
        console.error('[API] Positions fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=positions.js.map