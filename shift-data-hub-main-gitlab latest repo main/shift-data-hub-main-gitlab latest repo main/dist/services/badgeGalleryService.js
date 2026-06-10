"use strict";
/**
 * Badge Gallery Service
 * Manages badge definitions and user badge progress
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeGalleryService = exports.BadgeGalleryService = void 0;
const pool_1 = require("../db/pool");
class BadgeGalleryService {
    /**
     * Get all badge definitions
     */
    async getAllBadges() {
        try {
            const result = await pool_1.pool.query(`SELECT badge_name, display_name, description, icon, rarity, unlock_requirement
         FROM badge_definitions
         WHERE is_active = true
         ORDER BY
           CASE rarity
             WHEN 'legend' THEN 1
             WHEN 'epic' THEN 2
             WHEN 'rare' THEN 3
             ELSE 4
           END,
           display_name`);
            return result.rows.map(row => ({
                badgeName: row.badge_name,
                displayName: row.display_name,
                description: row.description,
                icon: row.icon,
                rarity: row.rarity,
                unlockRequirement: row.unlock_requirement,
            }));
        }
        catch (error) {
            console.error('[BadgeGallery] Error fetching all badges:', error);
            return [];
        }
    }
    /**
     * Get user's badge progress (earned + locked)
     */
    async getUserBadges(wallet) {
        try {
            const result = await pool_1.pool.query(`SELECT
           bd.badge_name,
           bd.display_name,
           bd.description,
           bd.icon,
           bd.rarity,
           bd.unlock_requirement,
           b.earned_at IS NOT NULL as earned,
           b.earned_at
         FROM badge_definitions bd
         LEFT JOIN badges b ON bd.badge_name = b.badge_name AND b.wallet = $1
         WHERE bd.is_active = true
         ORDER BY
           b.earned_at DESC NULLS LAST,
           CASE bd.rarity
             WHEN 'legend' THEN 1
             WHEN 'epic' THEN 2
             WHEN 'rare' THEN 3
             ELSE 4
           END,
           bd.display_name`, [wallet]);
            return result.rows.map(row => ({
                badgeName: row.badge_name,
                displayName: row.display_name,
                description: row.description,
                icon: row.icon,
                rarity: row.rarity,
                unlockRequirement: row.unlock_requirement,
                earned: row.earned,
                earnedAt: row.earned_at ? new Date(row.earned_at) : null,
            }));
        }
        catch (error) {
            console.error('[BadgeGallery] Error fetching user badges:', error);
            return [];
        }
    }
    /**
     * Get earned badges count
     */
    async getEarnedBadgeCount(wallet) {
        try {
            const result = await (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM badges WHERE wallet = $1`, [wallet]);
            return parseInt(result?.count || '0', 10);
        }
        catch (error) {
            console.error('[BadgeGallery] Error counting badges:', error);
            return 0;
        }
    }
    /**
     * Get badges by rarity
     */
    async getBadgesByRarity(wallet, rarity) {
        try {
            const result = await pool_1.pool.query(`SELECT
           bd.badge_name,
           bd.display_name,
           bd.description,
           bd.icon,
           bd.rarity,
           bd.unlock_requirement,
           b.earned_at IS NOT NULL as earned,
           b.earned_at
         FROM badge_definitions bd
         LEFT JOIN badges b ON bd.badge_name = b.badge_name AND b.wallet = $1
         WHERE bd.is_active = true AND bd.rarity = $2
         ORDER BY b.earned_at DESC NULLS LAST`, [wallet, rarity]);
            return result.rows.map(row => ({
                badgeName: row.badge_name,
                displayName: row.display_name,
                description: row.description,
                icon: row.icon,
                rarity: row.rarity,
                unlockRequirement: row.unlock_requirement,
                earned: row.earned,
                earnedAt: row.earned_at ? new Date(row.earned_at) : null,
            }));
        }
        catch (error) {
            console.error('[BadgeGallery] Error fetching badges by rarity:', error);
            return [];
        }
    }
    /**
     * Get rarity breakdown for user
     */
    async getRarityBreakdown(wallet) {
        try {
            const badges = await this.getUserBadges(wallet);
            const breakdown = {
                common: 0,
                rare: 0,
                epic: 0,
                legend: 0,
            };
            badges.forEach(badge => {
                if (badge.earned) {
                    breakdown[badge.rarity]++;
                }
            });
            return breakdown;
        }
        catch (error) {
            console.error('[BadgeGallery] Error getting rarity breakdown:', error);
            return { common: 0, rare: 0, epic: 0, legend: 0 };
        }
    }
}
exports.BadgeGalleryService = BadgeGalleryService;
exports.badgeGalleryService = new BadgeGalleryService();
//# sourceMappingURL=badgeGalleryService.js.map