"use strict";
// ============================================================
// Anti-Farm Service — Filter dust, wash trades, cooldowns
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.antiFarmService = exports.AntiFarmService = void 0;
const pool_1 = require("../db/pool");
const config_1 = require("../config");
class AntiFarmService {
    /**
     * Master filter — returns true if the position should be REJECTED.
     */
    async shouldFilter(wallet, asset, positionSizeUSD, timestamp) {
        // Rule 1: Dust filter — reject positions below minimum size
        // BYPASS for SHIFT Test Token (so it can be tested even with low value)
        const isShiftToken = asset === config_1.config.shiftTokenMint;
        if (!isShiftToken && this.isDust(positionSizeUSD)) {
            await this.logFlag(wallet, 'dust', null, { size: positionSizeUSD, min: config_1.config.antiFarm.minPositionSizeUSD });
            return { filtered: true, reason: 'dust', details: { size: positionSizeUSD } };
        }
        // Rule 2: Wash trade detection — same asset closed and reopened rapidly
        const isWash = await this.isWashTrade(wallet, asset, timestamp);
        if (isWash) {
            await this.logFlag(wallet, 'wash_trade', null, { asset, timestamp: timestamp.toISOString() });
            return { filtered: true, reason: 'wash_trade', details: { asset } };
        }
        // Rule 3: Cooldown — prevent spam reopening after close
        const onCooldown = await this.isOnCooldown(wallet, asset);
        if (onCooldown) {
            await this.logFlag(wallet, 'cooldown', null, { asset, cooldownMinutes: config_1.config.antiFarm.cooldownMinutes });
            return { filtered: true, reason: 'cooldown', details: { asset } };
        }
        return { filtered: false };
    }
    /**
     * Check if a position has been held long enough to earn XP.
     * Called during XP recalculation, NOT during position open.
     */
    isUnderMinHold(openedAt, referenceDate) {
        const now = referenceDate || new Date();
        const hoursHeld = (now.getTime() - new Date(openedAt).getTime()) / (1000 * 60 * 60);
        return hoursHeld < config_1.config.antiFarm.minHoldHours;
    }
    /**
     * Rule 1: Position size below minimum threshold.
     */
    isDust(positionSizeUSD) {
        return positionSizeUSD < config_1.config.antiFarm.minPositionSizeUSD;
    }
    /**
     * Rule 2: Detect wash trading — opposite direction, same asset, rapid close/open.
     * Checks if there was a close event on same asset within the wash trade window.
     */
    async isWashTrade(wallet, asset, timestamp) {
        const windowMs = config_1.config.antiFarm.washTradeWindowMinutes * 60 * 1000;
        const windowStart = new Date(timestamp.getTime() - windowMs);
        const recentClose = await (0, pool_1.queryOne)(`SELECT id FROM positions 
       WHERE wallet = $1 AND asset = $2 AND status = 'closed' 
       AND closed_at >= $3 AND closed_at <= $4
       LIMIT 1`, [wallet, asset, windowStart, timestamp]);
        return !!recentClose;
    }
    /**
     * Rule 3: Prevent reopening same asset too quickly after closing.
     */
    async isOnCooldown(wallet, asset) {
        const cooldownMs = config_1.config.antiFarm.cooldownMinutes * 60 * 1000;
        const cooldownStart = new Date(Date.now() - cooldownMs);
        const recentClose = await (0, pool_1.queryOne)(`SELECT id FROM positions 
       WHERE wallet = $1 AND asset = $2 AND status = 'closed' 
       AND closed_at >= $3
       LIMIT 1`, [wallet, asset, cooldownStart]);
        return !!recentClose;
    }
    /**
     * Log anti-farm flag for audit.
     */
    async logFlag(wallet, reason, positionId, details) {
        await (0, pool_1.execute)(`INSERT INTO anti_farm_log (wallet, reason, position_id, details) 
       VALUES ($1, $2, $3, $4)`, [wallet, reason, positionId, JSON.stringify(details)]);
    }
}
exports.AntiFarmService = AntiFarmService;
exports.antiFarmService = new AntiFarmService();
//# sourceMappingURL=antiFarmService.js.map