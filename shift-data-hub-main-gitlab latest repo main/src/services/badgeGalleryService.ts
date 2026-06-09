/**
 * Badge Gallery Service
 * Manages badge definitions and user badge progress
 */

import { pool, queryOne } from '../db/pool';

export interface BadgeDefinition {
  badgeName: string;
  displayName: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legend';
  unlockRequirement: string;
}

export interface UserBadge extends BadgeDefinition {
  earned: boolean;
  earnedAt: Date | null;
}

export class BadgeGalleryService {
  /**
   * Get all badge definitions
   */
  async getAllBadges(): Promise<BadgeDefinition[]> {
    try {
      const result = await pool.query(
        `SELECT
           badge_name,
           COALESCE(display_name, badge_name)       AS display_name,
           COALESCE(description, '')                AS description,
           COALESCE(icon, icon_url, '🏅')           AS icon,
           COALESCE(rarity, 'common')               AS rarity,
           COALESCE(unlock_requirement, '')         AS unlock_requirement
         FROM badge_definitions
         WHERE is_active = true
         ORDER BY
           CASE COALESCE(rarity,'common')
             WHEN 'legend' THEN 1
             WHEN 'epic'   THEN 2
             WHEN 'rare'   THEN 3
             ELSE 4
           END,
           display_name NULLS LAST`
      );

      return result.rows.map(row => ({
        badgeName: row.badge_name,
        displayName: row.display_name,
        description: row.description,
        icon: row.icon,
        rarity: row.rarity as 'common' | 'rare' | 'epic' | 'legend',
        unlockRequirement: row.unlock_requirement,
      }));
    } catch (error) {
      console.error('[BadgeGallery] Error fetching all badges:', error);
      return [];
    }
  }

  /**
   * Get user's badge progress (earned + locked)
   */
  async getUserBadges(wallet: string): Promise<UserBadge[]> {
    try {
      const result = await pool.query(
        `SELECT
           bd.badge_name,
           COALESCE(bd.display_name, bd.badge_name)  AS display_name,
           COALESCE(bd.description, '')               AS description,
           COALESCE(bd.icon, bd.icon_url, '🏅')       AS icon,
           COALESCE(bd.rarity, 'common')              AS rarity,
           COALESCE(bd.unlock_requirement, '')        AS unlock_requirement,
           (b.earned_at IS NOT NULL)                  AS earned,
           b.earned_at
         FROM badge_definitions bd
         LEFT JOIN badges b
           ON bd.badge_name = b.badge_name
          AND b.wallet = $1
          AND b.status  = 'active'
         WHERE bd.is_active = true
         ORDER BY
           b.earned_at DESC NULLS LAST,
           CASE COALESCE(bd.rarity,'common')
             WHEN 'legend' THEN 1
             WHEN 'epic'   THEN 2
             WHEN 'rare'   THEN 3
             ELSE 4
           END,
           bd.display_name NULLS LAST`,
        [wallet]
      );

      return result.rows.map(row => ({
        badgeName: row.badge_name,
        displayName: row.display_name,
        description: row.description,
        icon: row.icon,
        rarity: row.rarity as 'common' | 'rare' | 'epic' | 'legend',
        unlockRequirement: row.unlock_requirement,
        earned: row.earned === true,
        earnedAt: row.earned_at ? new Date(row.earned_at) : null,
      }));
    } catch (error) {
      console.error('[BadgeGallery] Error fetching user badges:', error);
      return [];
    }
  }

  /**
   * Get earned badges count
   */
  async getEarnedBadgeCount(wallet: string): Promise<number> {
    try {
      const result = await queryOne(
        `SELECT COUNT(*) as count FROM badges WHERE wallet = $1`,
        [wallet]
      );
      return parseInt(result?.count || '0', 10);
    } catch (error) {
      console.error('[BadgeGallery] Error counting badges:', error);
      return 0;
    }
  }

  /**
   * Get badges by rarity
   */
  async getBadgesByRarity(wallet: string, rarity: string): Promise<UserBadge[]> {
    try {
      const result = await pool.query(
        `SELECT
           bd.badge_name,
           COALESCE(bd.display_name, bd.badge_name)  AS display_name,
           COALESCE(bd.description, '')               AS description,
           COALESCE(bd.icon, bd.icon_url, '🏅')       AS icon,
           COALESCE(bd.rarity, 'common')              AS rarity,
           COALESCE(bd.unlock_requirement, '')        AS unlock_requirement,
           (b.earned_at IS NOT NULL)                  AS earned,
           b.earned_at
         FROM badge_definitions bd
         LEFT JOIN badges b
           ON bd.badge_name = b.badge_name
          AND b.wallet = $1
          AND b.status  = 'active'
         WHERE bd.is_active = true AND bd.rarity = $2
         ORDER BY b.earned_at DESC NULLS LAST`,
        [wallet, rarity]
      );

      return result.rows.map(row => ({
        badgeName: row.badge_name,
        displayName: row.display_name,
        description: row.description,
        icon: row.icon,
        rarity: row.rarity as 'common' | 'rare' | 'epic' | 'legend',
        unlockRequirement: row.unlock_requirement,
        earned: row.earned === true,
        earnedAt: row.earned_at ? new Date(row.earned_at) : null,
      }));
    } catch (error) {
      console.error('[BadgeGallery] Error fetching badges by rarity:', error);
      return [];
    }
  }

  /**
   * Get rarity breakdown for user
   */
  async getRarityBreakdown(wallet: string): Promise<Record<string, number>> {
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
          breakdown[badge.rarity as keyof typeof breakdown]++;
        }
      });

      return breakdown;
    } catch (error) {
      console.error('[BadgeGallery] Error getting rarity breakdown:', error);
      return { common: 0, rare: 0, epic: 0, legend: 0 };
    }
  }
}

export const badgeGalleryService = new BadgeGalleryService();
