"use strict";
// ============================================================
// XP Engine — Core XP calculation with position multipliers
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.xpEngine = exports.XPEngine = void 0;
const pool_1 = require("../db/pool");
const positionService_1 = require("./positionService");
const realtimeSnagSyncService_1 = require("./realtimeSnagSyncService");
const tokens_1 = require("../config/tokens");
const launchMultipliers_1 = require("../config/launchMultipliers");
class XPEngine {
    // ── Core Formulas ──
    /**
     * Position multiplier: grows 0.1x per week held, capped at 3.0x.
     * For tracked RWA tokens, applies additional base multiplier.
     * position_multiplier(t) = base_mult × min(1.0 + 0.10 × weeks_open, 3.0)
     */
    calculatePositionMultiplier(weeksOpen, assetMint) {
        const baseMultiplier = assetMint ? ((0, tokens_1.getTokenInfo)(assetMint)?.baseMultiplier ?? 1.0) : 1.0;
        const timeMultiplier = Math.min(1.0 + 0.10 * weeksOpen, 3.0);
        return baseMultiplier * timeMultiplier;
    }
    /**
     * Weekly XP for a single position (includes launch event multiplier).
     * weekly_position_XP = log₁₀(position_size_USD) × 100 × position_multiplier × launch_multiplier
     * Returns 0 for positions under $1 (log₁₀ is negative below $1 which would subtract XP).
     */
    calculateWeeklyXP(positionSizeUSD, multiplier, launchMultiplier = 1.0) {
        if (positionSizeUSD < 1)
            return 0; // log₁₀(x) < 0 for x < 1 → would reduce XP
        return Math.log10(positionSizeUSD) * 100 * multiplier * launchMultiplier;
    }
    /**
     * Calculate XP earned since last calculation for a position.
     * Prorates the weekly XP based on hours elapsed (includes launch event multiplier).
     */
    calculateXPSinceLastCalc(positionSizeUSD, multiplier, hoursSinceLastCalc, launchMultiplier = 1.0) {
        const weeklyXP = this.calculateWeeklyXP(positionSizeUSD, multiplier, launchMultiplier);
        const hoursInWeek = 7 * 24;
        return (weeklyXP / hoursInWeek) * hoursSinceLastCalc;
    }
    // ── Cron Job: Recalculate All XP ──
    /**
     * Main recalculation job — runs every minute (or configurable interval).
     * 1. Get all open positions
     * 2. Skip positions under 24h hold (anti-farm)
     * 3. Calculate position multiplier based on age + apply launch event multiplier
     * 4. Calculate XP earned since last calc
     * 5. Update position records
     * 6. Aggregate XP per wallet → update users.total_xp
     */
    async recalculateAllXP() {
        console.log('[XPEngine] Starting recalculation...');
        const now = new Date();
        // Get current launch event multiplier (typically 3.0x week 1, 2.0x week 2, 1.0x week 3+)
        const launchPhase = (0, launchMultipliers_1.getLaunchPhase)(now);
        const launchMultiplier = launchPhase.multiplier;
        // 1. Get all open positions
        const openPositions = await positionService_1.positionService.getAllOpenPositions();
        let positionsProcessed = 0;
        // 2. Process each position
        const walletXPDeltas = new Map();
        for (const position of openPositions) {
            // XP accrues from the moment of purchase (on-chain tx timestamp in opened_at).
            // No minimum hold gate — the claw-back on early sell (<24h) is handled at closePosition().
            // Late connectors get retroactive XP: when last_xp_calc is NULL, we calculate
            // from opened_at to now, giving them all earned XP in one shot.
            // Calculate age from on-chain open time
            const { weeks } = positionService_1.positionService.getPositionAge(position.opened_at, now);
            // Calculate multiplier (with RWA token bonus if applicable)
            const multiplier = this.calculatePositionMultiplier(weeks, position.asset_mint);
            // Calculate hours since last XP calc (or since opened — retroactive for new syncs)
            const lastCalc = position.last_xp_calc ? new Date(position.last_xp_calc) : new Date(position.opened_at);
            const hoursSinceLastCalc = (now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60);
            // Throttle to max once per 30 min to avoid micro-updates (except first-time / retroactive)
            const isFirstCalc = !position.last_xp_calc;
            if (!isFirstCalc && hoursSinceLastCalc < 0.5)
                continue;
            // Calculate new XP earned (now includes launch event multiplier)
            const xpDelta = this.calculateXPSinceLastCalc(Number(position.position_size_usd), multiplier, hoursSinceLastCalc, launchMultiplier);
            const newTotalXP = Number(position.xp_generated) + xpDelta;
            // Update position
            await positionService_1.positionService.updatePositionXP(position.id, newTotalXP, multiplier);
            // Track wallet XP delta
            const currentDelta = walletXPDeltas.get(position.wallet) || 0;
            walletXPDeltas.set(position.wallet, currentDelta + xpDelta);
            positionsProcessed++;
        }
        // 3. Update user total_xp + queue real-time SNAG sync
        let usersUpdated = 0;
        for (const [wallet, xpDelta] of walletXPDeltas) {
            if (xpDelta > 0) {
                await (0, pool_1.execute)(`UPDATE users SET total_xp = total_xp + $1, updated_at = NOW() WHERE wallet = $2`, [xpDelta, wallet]);
                // Queue real-time sync to SNAG (debounced, will batch within 2 seconds)
                await realtimeSnagSyncService_1.realtimeSnagSyncService.queueXPSync(wallet, xpDelta);
                usersUpdated++;
            }
        }
        console.log(`[XPEngine] ✅ Recalc: ${positionsProcessed} pos, ${usersUpdated} users | launch: ${launchPhase.label} (${launchMultiplier}x)`);
        return { usersUpdated, positionsProcessed };
    }
    /**
     * Get total XP for a wallet (from DB).
     */
    async getWalletXP(wallet) {
        const user = await (0, pool_1.query)('SELECT total_xp FROM users WHERE wallet = $1', [wallet]);
        return user[0] ? parseFloat(user[0].total_xp) : 0;
    }
    /**
     * Get XP breakdown per position for a wallet (includes launch event multiplier).
     */
    async getXPBreakdown(wallet) {
        const positions = await positionService_1.positionService.getActivePositions(wallet);
        const now = new Date();
        const launchPhase = (0, launchMultipliers_1.getLaunchPhase)(now);
        return positions.map((p) => {
            const { weeks } = positionService_1.positionService.getPositionAge(p.opened_at, now);
            const multiplier = this.calculatePositionMultiplier(weeks);
            const launchMultiplier = launchPhase.multiplier;
            const effectiveMultiplier = multiplier * launchMultiplier;
            const xpPerWeek = this.calculateWeeklyXP(Number(p.position_size_usd), multiplier, launchMultiplier);
            const xpPerHour = xpPerWeek / (7 * 24);
            return {
                asset: p.asset,
                positionSizeUSD: Number(p.position_size_usd),
                weeksHeld: weeks,
                multiplier,
                launchMultiplier,
                effectiveMultiplier,
                xpPerWeek,
                xpPerHour,
                totalXP: Number(p.xp_generated),
            };
        });
    }
}
exports.XPEngine = XPEngine;
exports.xpEngine = new XPEngine();
//# sourceMappingURL=xpEngine.js.map