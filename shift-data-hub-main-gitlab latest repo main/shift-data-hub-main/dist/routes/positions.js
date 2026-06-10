"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const positionService_1 = require("../services/positionService");
const tokens_1 = require("../config/tokens");
const xpEngine_1 = require("../services/xpEngine");
const launchMultipliers_1 = require("../config/launchMultipliers");
const jupiterPriceService_1 = require("../services/jupiterPriceService");
const pnlService_1 = require("../services/pnlService");
const router = (0, express_1.Router)();
// Get active positions for a wallet with detailed XP projections and P&L
router.get('/:wallet/active', async (req, res) => {
    const { wallet } = req.params;
    try {
        const positions = await positionService_1.positionService.getActivePositions(wallet);
        const launchPhase = (0, launchMultipliers_1.getLaunchPhase)();
        // Get detailed XP breakdown
        const xpBreakdown = await xpEngine_1.xpEngine.getXPBreakdown(wallet);
        const breakdownMap = new Map(xpBreakdown.map(b => [b.asset, b]));
        // Fetch current prices for P&L calculation
        const assetMints = [...new Set(positions.map(p => p.asset_mint || p.asset).filter(Boolean))];
        const prices = await jupiterPriceService_1.jupiterPriceService.getPrices(assetMints);
        // Add real-time projections and P&L for the frontend UX
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
            // XP calculations with launch event multiplier — no artificial floor
            const posSize = Number(pos.position_size_usd);
            const baseXpPerWeek = posSize > 0 ? Math.log10(posSize) * 100 * currentMultiplier : 0;
            const xpPerWeek = Math.floor(baseXpPerWeek * launchPhase.multiplier);
            const xpPerHour = Math.floor((baseXpPerWeek * launchPhase.multiplier) / (7 * 24));
            // Launch event info
            const breakdownInfo = breakdownMap.get(pos.asset);
            // P&L calculation
            const currentPrice = prices[pos.asset_mint || pos.asset] || 0;
            const pnlData = (0, pnlService_1.calculatePositionPnL)(pos, currentPrice);
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
                // P&L fields
                priceAtOpen: pos.price_at_open ? Number(pos.price_at_open) : undefined,
                currentPrice,
                pnlUsd: pnlData?.unrealizedUsd,
                pnlPct: pnlData?.unrealizedPct,
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
// Get closed (historical) positions for a wallet with P&L data
router.get('/:wallet/history', async (req, res) => {
    const { wallet } = req.params;
    try {
        const allPositions = await positionService_1.positionService.getAllPositions(wallet);
        const closedPositions = allPositions.filter(p => p.status === 'closed');
        const enrichedHistory = closedPositions.map(pos => {
            const openedAt = new Date(pos.opened_at);
            const closedAt = pos.closed_at ? new Date(pos.closed_at) : new Date();
            const diffMs = closedAt.getTime() - openedAt.getTime();
            const totalDays = diffMs / (1000 * 60 * 60 * 24);
            const weeksHeld = Math.floor(totalDays / 7);
            const baseMultiplier = pos.asset_mint
                ? ((0, tokens_1.getTokenInfo)(pos.asset_mint)?.baseMultiplier ?? 1.0)
                : 1.0;
            const timeMultiplier = Math.min(1.0 + (weeksHeld * 0.10), 3.0);
            const finalMultiplier = baseMultiplier * timeMultiplier;
            const histPosSize = Number(pos.position_size_usd);
            const xpPerWeek = histPosSize > 0
                ? Math.floor(Math.log10(histPosSize) * 100 * finalMultiplier)
                : 0;
            const totalSpEarned = Number(pos.xp_generated) > 0
                ? Math.floor(Number(pos.xp_generated))
                : Math.floor(xpPerWeek * Math.max(weeksHeld, 1));
            // P&L for closed position (if prices are recorded)
            const pnlData = pos.price_at_close
                ? (0, pnlService_1.calculatePositionPnL)(pos, Number(pos.price_at_close))
                : null;
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
                status: 'closed',
                // P&L fields
                priceAtOpen: pos.price_at_open ? Number(pos.price_at_open) : undefined,
                priceAtClose: pos.price_at_close ? Number(pos.price_at_close) : undefined,
                pnlUsd: pnlData?.realizedUsd,
                pnlPct: pnlData?.realizedPct,
            };
        });
        res.json({ positions: enrichedHistory });
    }
    catch (error) {
        console.error('[API] Position history fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=positions.js.map