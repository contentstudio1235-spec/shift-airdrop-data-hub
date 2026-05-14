// ============================================================
// SNAG Sync Service — Bridge between backend calculations & SNAG
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { query, queryOne, execute } from '../db/pool';
import { xpEngine } from './xpEngine';
import { badgeService } from './badgeService';
import { multiplierService } from './multiplierService';
import { BadgeName, LeaderboardEntry, User } from '../types';

export class SnagSyncService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.snagBaseUrl,
      headers: {
        'x-api-key': config.snagApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  // ── Master Sync (called by cron) ──

  /**
   * Full sync: recalculate everything, then push to SNAG.
   */
  async fullSync(): Promise<void> {
    if (!config.snagApiKey) {
      console.log('[SnagSync] ⏭️  No SNAG API key configured, skipping sync');
      return;
    }

    console.log('[SnagSync] Starting full sync...');

    try {
      // 1. Recalculate XP
      const xpResult = await xpEngine.recalculateAllXP();

      // 2. Recalculate claim multipliers
      await multiplierService.recalculateAllMultipliers();

      // 3. Evaluate badges for all users
      const newBadges = await badgeService.evaluateAllUsers();

      // 4. Sync XP deltas to SNAG
      await this.syncAllXP();

      // 5. Push new badges to SNAG
      for (const award of newBadges) {
        await this.awardBadgeInSnag(award.wallet, award.badge_name);
      }

      console.log(`[SnagSync] ✅ Full sync complete`);
    } catch (error) {
      console.error('[SnagSync] ❌ Full sync failed:', error);
    }
  }

  // ── XP Sync ──

  /**
   * Sync XP for all users that have accumulated new XP since last sync.
   */
  async syncAllXP(): Promise<void> {
    const users = await query<User & { last_synced_xp?: number }>(
      `SELECT u.wallet, u.total_xp, u.snag_user_id, 
              COALESCE(s.last_synced_xp, 0) as last_synced_xp
       FROM users u 
       LEFT JOIN xp_sync_log s ON u.wallet = s.wallet`
    );

    for (const user of users) {
      const currentXP = Number(user.total_xp);
      const lastSynced = Number(user.last_synced_xp || 0);
      const xpDelta = currentXP - lastSynced;

      if (xpDelta <= 0) continue;

      try {
        await this.pushXPToSnag(user.wallet, xpDelta);

        // Update sync log
        await execute(
          `INSERT INTO xp_sync_log (wallet, last_synced_xp, last_synced_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (wallet) DO UPDATE SET last_synced_xp = $2, last_synced_at = NOW()`,
          [user.wallet, currentXP]
        );
      } catch (error) {
        console.error(`[SnagSync] Failed to sync XP for ${user.wallet.slice(0, 8)}...:`, error);
      }
    }
  }

  /**
   * Push XP to SNAG via External Rule completion.
   */
  private async pushXPToSnag(wallet: string, xpAmount: number): Promise<void> {
    if (!config.snagXpRuleId) {
      console.log(`[SnagSync] No XP rule ID configured, skipping XP push`);
      return;
    }

    try {
      await this.client.post(`/api/loyalty/rules/${config.snagXpRuleId}/complete`, {
        walletAddress: wallet,
        amount: Math.floor(xpAmount), // SNAG uses integers
        idempotencyKey: `xp-${wallet}-${Date.now()}`,
      });

      console.log(`[SnagSync] 📊 Pushed ${Math.floor(xpAmount)} XP for ${wallet.slice(0, 8)}...`);
    } catch (error: any) {
      const errorMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[SnagSync] XP push failed, queueing locally:`, errorMsg);
      
      try {
        const payload = JSON.stringify({
          walletAddress: wallet,
          amount: Math.floor(xpAmount),
          idempotencyKey: `xp-${wallet}-${Date.now()}`
        });
        
        await execute(
          `INSERT INTO snag_sync_queue (wallet, sync_type, payload, status, last_attempt_at, attempts)
           VALUES ($1, $2, $3, 'failed', NOW(), 1)`,
          [wallet, 'xp', payload]
        );
      } catch (dbError) {
        console.error(`[SnagSync] Failed to insert to queue:`, dbError);
      }
    }
  }

  // ── Badge Sync ──

  /**
   * Award a badge in SNAG.
   */
  async awardBadgeInSnag(wallet: string, badgeName: BadgeName): Promise<void> {
    const snagBadgeId = config.snagBadgeIds[badgeName];
    if (!snagBadgeId) {
      console.log(`[SnagSync] No SNAG badge ID for "${badgeName}", skipping`);
      return;
    }

    try {
      // Since these are configured as External Rules in the dashboard
      await this.client.post(`/api/loyalty/rules/${snagBadgeId}/complete`, {
        walletAddress: wallet,
        amount: 1, // Trigger the rule once
        idempotencyKey: `badge-${badgeName}-${wallet}`,
      });

      // Update local badge record with SNAG ID
      await execute(
        'UPDATE badges SET snag_badge_id = $1 WHERE wallet = $2 AND badge_name = $3',
        [snagBadgeId, wallet, badgeName]
      );

      console.log(`[SnagSync] 🏆 Badge "${badgeName}" synced to SNAG Rule for ${wallet.slice(0, 8)}...`);
    } catch (error: any) {
      const errorMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[SnagSync] Badge/Rule push failed, queueing locally:`, errorMsg);
      
      try {
        const payload = JSON.stringify({
          walletAddress: wallet,
          amount: 1,
          idempotencyKey: `badge-${badgeName}-${wallet}`
        });
        
        await execute(
          `INSERT INTO snag_sync_queue (wallet, sync_type, payload, status, last_attempt_at, attempts)
           VALUES ($1, $2, $3, 'failed', NOW(), 1)`,
          [wallet, 'badge', payload]
        );
      } catch (dbError) {
        console.error(`[SnagSync] Failed to insert to queue:`, dbError);
      }
    }
  }

  // ── Leaderboard ──

  /**
   * Get leaderboard from SNAG.
   * Falls back to local DB if SNAG is not configured.
   */
  async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    // Try SNAG first
    if (config.snagApiKey) {
      try {
        const response = await this.client.get('/api/loyalty/accounts', {
          params: {
            organizationId: config.snagOrganizationId,
            websiteId: config.snagWebsiteId,
            limit,
            sort: 'points',
            order: 'desc',
          },
        });

        if (response.data?.data) {
          return response.data.data.map((entry: any, index: number) => ({
            rank: index + 1,
            wallet: entry.walletAddress || entry.wallet || 'unknown',
            totalXP: entry.points || 0,
            multiplier: 1.0,
            badgeCount: 0,
          }));
        }
      } catch (error) {
        console.error('[SnagSync] Leaderboard fetch from SNAG failed, using local:', error);
      }
    }

    // Fallback: local leaderboard
    return this.getLocalLeaderboard(limit);
  }

  /**
   * Local leaderboard from PostgreSQL.
   */
  private async getLocalLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const rows = await query<any>(
      `SELECT u.wallet, u.total_xp, u.claim_multiplier,
              COUNT(b.id) as badge_count
       FROM users u
       LEFT JOIN badges b ON u.wallet = b.wallet
       GROUP BY u.wallet, u.total_xp, u.claim_multiplier
       ORDER BY u.total_xp DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row, index) => ({
      rank: index + 1,
      wallet: row.wallet,
      totalXP: Number(row.total_xp),
      multiplier: Number(row.claim_multiplier),
      badgeCount: Number(row.badge_count),
    }));
  }

  /**
   * Get a user's rank (from SNAG or local).
   */
  async getUserRank(wallet: string): Promise<number | null> {
    if (config.snagApiKey && config.snagWebsiteId) {
      try {
        // Get SNAG user ID first
        const user = await queryOne<{ snag_user_id: string }>(
          'SELECT snag_user_id FROM users WHERE wallet = $1',
          [wallet]
        );

        if (user?.snag_user_id) {
          const response = await this.client.get(`/api/loyalty/accounts/${user.snag_user_id}/rank`, {
            params: { websiteId: config.snagWebsiteId },
          });
          return response.data?.rank || null;
        }
      } catch (error) {
        console.error('[SnagSync] Rank fetch failed:', error);
      }
    }

    // Fallback: local rank
    const result = await queryOne<{ rank: string }>(
      `SELECT COUNT(*) + 1 as rank FROM users WHERE total_xp > (SELECT total_xp FROM users WHERE wallet = $1)`,
      [wallet]
    );
    return result ? parseInt(result.rank, 10) : null;
  }
}

export const snagSyncService = new SnagSyncService();
