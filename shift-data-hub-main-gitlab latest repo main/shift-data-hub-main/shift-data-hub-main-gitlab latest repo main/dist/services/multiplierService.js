"use strict";
// ============================================================
// Multiplier Service — Claim multiplier (macro loyalty progression)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiplierService = exports.MultiplierService = void 0;
const pool_1 = require("../db/pool");
const config_1 = require("../config");
const realtimeSnagSyncService_1 = require("./realtimeSnagSyncService");
/**
 * Claim Multiplier is SEPARATE from Position Multiplier.
 *
 * Position multiplier → affects XP generation per position
 * Claim multiplier   → affects final airdrop claim amount
 *
 * Claim multiplier grows based on:
 * - Time active (weekly/monthly bonuses)
 * - Badges earned
 * - Streak maintenance
 */
class MultiplierService {
    /**
     * Recalculate claim multiplier for all users.
     * Called by cron every hour.
     */
    async recalculateAllMultipliers() {
        const users = await (0, pool_1.query)('SELECT * FROM users');
        let updated = 0;
        for (const user of users) {
            const newMultiplier = await this.calculateClaimMultiplier(user.wallet);
            const currentMultiplier = Number(user.claim_multiplier);
            if (Math.abs(newMultiplier - currentMultiplier) > 0.001) {
                await this.updateClaimMultiplier(user.wallet, currentMultiplier, newMultiplier);
                updated++;
            }
        }
        console.log(`[Multiplier] ✅ Updated ${updated} claim multipliers`);
        return updated;
    }
    /**
     * Calculate claim multiplier for a wallet.
     */
    async calculateClaimMultiplier(wallet) {
        let multiplier = 1.0;
        // 1. Time-based bonus: +0.1x per active week
        const weeksActive = await this.getActiveWeeks(wallet);
        multiplier += weeksActive * config_1.config.claimMultiplier.weeklyBonus;
        // 2. Badge bonus: +0.1x per badge earned
        const badgeCount = await this.getBadgeCount(wallet);
        multiplier += badgeCount * config_1.config.claimMultiplier.badgeBonus;
        // 3. Streak bonus: +0.05x per streak day (capped at 30 days worth)
        const user = await (0, pool_1.queryOne)('SELECT current_streak FROM users WHERE wallet = $1', [wallet]);
        const streak = user?.current_streak || 0;
        const streakBonus = Math.min(streak, 30) * 0.05;
        multiplier += streakBonus;
        // Cap at max multiplier
        return Math.min(multiplier, config_1.config.claimMultiplier.maxMultiplier);
    }
    /**
     * Get number of distinct weeks the user has been active (had open positions).
     */
    async getActiveWeeks(wallet) {
        const result = await (0, pool_1.queryOne)(`SELECT COUNT(DISTINCT DATE_TRUNC('week', opened_at)) as weeks 
       FROM positions WHERE wallet = $1 AND status != 'filtered'`, [wallet]);
        return parseInt(result?.weeks || '0', 10);
    }
    /**
     * Get number of badges earned by wallet.
     */
    async getBadgeCount(wallet) {
        const result = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM badges WHERE wallet = $1', [wallet]);
        return parseInt(result?.count || '0', 10);
    }
    /**
     * Update claim multiplier with audit log + real-time SNAG sync.
     */
    async updateClaimMultiplier(wallet, oldValue, newValue) {
        await (0, pool_1.execute)('UPDATE users SET claim_multiplier = $1, updated_at = NOW() WHERE wallet = $2', [newValue, wallet]);
        await (0, pool_1.execute)(`INSERT INTO claim_multiplier_log (wallet, old_value, new_value, reason)
       VALUES ($1, $2, $3, $4)`, [wallet, oldValue, newValue, 'scheduled_recalc']);
        // Queue real-time sync to SNAG (debounced, will batch within 2 seconds)
        await realtimeSnagSyncService_1.realtimeSnagSyncService.queueMultiplierSync(wallet, newValue);
    }
    /**
     * Update streak counter.
     * Called when we detect activity within the last 24 hours.
     */
    async updateStreak(wallet) {
        const user = await (0, pool_1.queryOne)('SELECT last_active, current_streak FROM users WHERE wallet = $1', [wallet]);
        if (!user)
            return;
        const now = new Date();
        const lastActive = user.last_active ? new Date(user.last_active) : null;
        if (lastActive) {
            const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
            if (hoursSinceActive <= 48) {
                // Continue streak
                await (0, pool_1.execute)('UPDATE users SET current_streak = current_streak + 1, last_active = NOW() WHERE wallet = $1', [wallet]);
            }
            else {
                // Break streak — reset
                await (0, pool_1.execute)('UPDATE users SET current_streak = 1, last_active = NOW() WHERE wallet = $1', [wallet]);
            }
        }
    }
    /**
     * Get multiplier info for display.
     */
    async getMultiplierInfo(wallet) {
        const weeksActive = await this.getActiveWeeks(wallet);
        const badgeCount = await this.getBadgeCount(wallet);
        const user = await (0, pool_1.queryOne)('SELECT current_streak, claim_multiplier FROM users WHERE wallet = $1', [wallet]);
        const streak = user?.current_streak || 0;
        const timeBonus = weeksActive * config_1.config.claimMultiplier.weeklyBonus;
        const badgeBonusVal = badgeCount * config_1.config.claimMultiplier.badgeBonus;
        const streakBonus = Math.min(streak, 30) * 0.05;
        // Determine next milestone
        let nextMilestone = '';
        if (badgeCount < 4) {
            nextMilestone = `Earn ${4 - badgeCount} more badge(s) for +${((4 - badgeCount) * 0.1).toFixed(1)}x`;
        }
        else if (streak < 7) {
            nextMilestone = `${7 - streak} more days for weekly streak bonus`;
        }
        else {
            nextMilestone = `+0.1x in ${7 - (weeksActive % 7)} days (weekly time bonus)`;
        }
        return {
            claimMultiplier: Number(user?.claim_multiplier || 1.0),
            breakdown: {
                base: 1.0,
                timeBonus,
                badgeBonus: badgeBonusVal,
                streakBonus,
            },
            nextMilestone,
        };
    }
}
exports.MultiplierService = MultiplierService;
exports.multiplierService = new MultiplierService();
//# sourceMappingURL=multiplierService.js.map