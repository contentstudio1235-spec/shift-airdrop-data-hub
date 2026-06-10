/**
 * Missions Service
 * Manages weekly quests and mission progress
 */

import { pool, execute, queryOne } from '../db/pool';

export interface Mission {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
  requirementType: string;
  requirementValue: number;
}

export interface UserMissionProgress {
  missionId: string;
  missionName: string;
  progressValue: number;
  requirementValue: number;
  completed: boolean;
  completedAt: Date | null;
  claimedReward: boolean;
  icon: string;
  xpReward: number;
}

export class MissionsService {
  /**
   * Get this week's missions
   */
  async getWeeklyMissions(): Promise<Mission[]> {
    try {
      const now = new Date();
      const week = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      const result = await pool.query(
        `SELECT id, name, description, xp_reward, icon, requirement_type, requirement_value
         FROM missions
         WHERE season = 'S1' AND week = $1 AND is_active = true
         ORDER BY xp_reward DESC`,
        [week]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        xpReward: row.xp_reward,
        icon: row.icon,
        requirementType: row.requirement_type,
        requirementValue: parseFloat(row.requirement_value),
      }));
    } catch (error) {
      console.error('[Missions] Error fetching weekly missions:', error);
      return [];
    }
  }

  /**
   * Get user's mission progress
   */
  async getUserMissionProgress(wallet: string): Promise<UserMissionProgress[]> {
    try {
      const now = new Date();
      const week = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      const result = await pool.query(
        `SELECT
           ump.mission_id,
           m.name,
           ump.progress_value,
           m.requirement_value,
           ump.completed,
           ump.completed_at,
           ump.claimed_reward,
           m.icon,
           m.xp_reward
         FROM user_mission_progress ump
         JOIN missions m ON ump.mission_id = m.id
         WHERE ump.wallet = $1 AND ump.season = 'S1' AND ump.week = $2
         ORDER BY ump.completed DESC, m.xp_reward DESC`,
        [wallet, week]
      );

      return result.rows.map(row => ({
        missionId: row.mission_id,
        missionName: row.name,
        progressValue: parseFloat(row.progress_value),
        requirementValue: parseFloat(row.requirement_value),
        completed: row.completed,
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        claimedReward: row.claimed_reward,
        icon: row.icon,
        xpReward: row.xp_reward,
      }));
    } catch (error) {
      console.error('[Missions] Error fetching user progress:', error);
      return [];
    }
  }

  /**
   * Update mission progress for a user
   */
  async updateMissionProgress(
    wallet: string,
    missionId: string,
    progressValue: number
  ): Promise<void> {
    try {
      const now = new Date();
      const week = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      // Get requirement value
      const mission = await queryOne(
        `SELECT requirement_value FROM missions WHERE id = $1`,
        [missionId]
      );

      if (!mission) return;

      const requirementValue = parseFloat(mission.requirement_value);
      const completed = progressValue >= requirementValue;

      await execute(
        `INSERT INTO user_mission_progress (wallet, mission_id, progress_value, completed, completed_at, season, week)
         VALUES ($1, $2, $3, $4, $5, 'S1', $6)
         ON CONFLICT (wallet, mission_id, season, week)
         DO UPDATE SET
           progress_value = GREATEST(EXCLUDED.progress_value, $3),
           completed = EXCLUDED.completed OR $4,
           completed_at = CASE WHEN $4 THEN NOW() ELSE completed_at END`,
        [wallet, missionId, progressValue, completed, completed ? new Date() : null, week]
      );
    } catch (error) {
      console.error('[Missions] Error updating progress:', error);
    }
  }

  /**
   * Claim reward for completed mission
   */
  async claimMissionReward(wallet: string, missionId: string): Promise<number> {
    try {
      // Get mission XP reward
      const mission = await queryOne(
        `SELECT xp_reward FROM missions WHERE id = $1`,
        [missionId]
      );

      if (!mission) return 0;

      const xpReward = mission.xp_reward;

      // Update mission as claimed
      await execute(
        `UPDATE user_mission_progress
         SET claimed_reward = true
         WHERE wallet = $1 AND mission_id = $2`,
        [wallet, missionId]
      );

      // Award XP to user
      await execute(
        `UPDATE users
         SET total_xp = total_xp + $1,
             updated_at = NOW()
         WHERE wallet = $2`,
        [xpReward, wallet]
      );

      return xpReward;
    } catch (error) {
      console.error('[Missions] Error claiming reward:', error);
      return 0;
    }
  }

  /**
   * Get total XP earned from missions this week
   */
  async getWeeklyMissionXp(wallet: string): Promise<number> {
    try {
      const now = new Date();
      const week = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      const result = await queryOne(
        `SELECT COALESCE(SUM(m.xp_reward), 0) as total_xp
         FROM user_mission_progress ump
         JOIN missions m ON ump.mission_id = m.id
         WHERE ump.wallet = $1 AND ump.season = 'S1' AND ump.week = $2 AND ump.claimed_reward = true`,
        [wallet, week]
      );

      return parseInt(result?.total_xp || '0', 10);
    } catch (error) {
      console.error('[Missions] Error fetching weekly mission XP:', error);
      return 0;
    }
  }
}

export const missionsService = new MissionsService();
