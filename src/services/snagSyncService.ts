// ============================================================
// SNAG Sync Service — Batched transactions, circuit breaker,
// multiplier sync, and exponential backoff retry queue
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { query, queryOne, execute } from '../db/pool';
import { xpEngine } from './xpEngine';
import { badgeService } from './badgeService';
import { multiplierService } from './multiplierService';
import { BadgeName, LeaderboardEntry, User } from '../types';

const BATCH_SIZE = 100;  // SNAG accepts up to 100 entries per transaction
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_PAUSE_MS = 5 * 60 * 1000;  // 5 minutes

export class SnagSyncService {
  private client: AxiosInstance;

  // ── Circuit Breaker State ──
  private circuitFailures = 0;
  private circuitOpen = false;
  private circuitOpenUntil: number | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.snagBaseUrl,
      headers: {
        'x-api-key': config.snagApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  // ── Circuit Breaker Helpers ──

  private checkCircuit(): boolean {
    if (!this.circuitOpen) return true;
    if (this.circuitOpenUntil && Date.now() > this.circuitOpenUntil) {
      this.circuitOpen = false;
      this.circuitFailures = 0;
      this.circuitOpenUntil = null;
      console.log('[SnagSync] 🟢 Circuit breaker CLOSED — resuming SNAG calls');
      return true;
    }
    return false;
  }

  private recordFailure(): void {
    this.circuitFailures++;
    if (this.circuitFailures >= CIRCUIT_THRESHOLD && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenUntil = Date.now() + CIRCUIT_PAUSE_MS;
      console.error(
        `[SnagSync] 🔴 CIRCUIT BREAKER OPEN — SNAG failed ${this.circuitFailures}× ` +
        `in a row. Pausing all SNAG calls for 5 minutes.`
      );
    }
  }

  private recordSuccess(): void {
    if (this.circuitFailures > 0) {
      this.circuitFailures = 0;
    }
  }

  // ── Queue Helpers ──

  private backoffMs(attempts: number): number {
    const base = Math.min(1000 * Math.pow(2, attempts), 30 * 60 * 1000); // max 30 min
    const jitter = Math.random() * 1000;
    return base + jitter;
  }

  private async queueFailedEntries(
    entries: Array<{ wallet: string; [key: string]: any }>,
    syncType: string,
    errorMessage: string,
    batchId: string
  ): Promise<void> {
    const backoffUntil = new Date(Date.now() + this.backoffMs(this.circuitFailures));
    for (const entry of entries) {
      try {
        await execute(
          `INSERT INTO snag_sync_queue
             (wallet, sync_type, payload, status, last_attempt_at, attempts, batch_id, backoff_until, error_message)
           VALUES ($1, $2, $3, 'failed', NOW(), 1, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [entry.wallet, syncType, JSON.stringify(entry), batchId, backoffUntil, errorMessage.slice(0, 512)]
        );
      } catch (dbErr) {
        console.error('[SnagSync] Failed to write to retry queue:', dbErr);
      }
    }
  }

  // ── Master Sync (called by cron) ──

  async fullSync(): Promise<void> {
    if (!config.snagApiKey) {
      console.log('[SnagSync] ⏭️  No SNAG API key configured, skipping sync');
      return;
    }

    console.log('[SnagSync] Starting full sync...');

    try {
      // 1. Recalculate XP
      await xpEngine.recalculateAllXP();

      // 2. Recalculate claim multipliers
      await multiplierService.recalculateAllMultipliers();

      // 3. Evaluate badges for all users
      const newBadges = await badgeService.evaluateAllUsers();

      // 4. Sync XP deltas to SNAG (batched)
      await this.syncAllXP();

      // 5. Push new badges to SNAG
      for (const award of newBadges) {
        await this.awardBadgeInSnag(award.wallet, award.badge_name);
      }

      // 6. Sync multiplier changes to SNAG
      await this.syncMultipliers();

      // 7. Refresh is_active status for all referrals (pure DB, no SNAG call)
      await this.refreshReferralActiveStatus();
      // NOTE: syncReferralsFromSnag() runs on its own hourly cron — not every fullSync

      console.log('[SnagSync] ✅ Full sync complete');
    } catch (error) {
      console.error('[SnagSync] ❌ Full sync failed:', error);
    }
  }

  // ── XP Sync (Batched) ──

  async syncAllXP(): Promise<void> {
    const users = await query<User & { last_synced_xp?: number }>(
      `SELECT u.wallet, u.total_xp, u.snag_user_id,
              COALESCE(s.last_synced_xp, 0) as last_synced_xp
       FROM users u
       LEFT JOIN xp_sync_log s ON u.wallet = s.wallet`
    );

    // Handle both credits (positive delta) and debits (claw-backs from early sell)
    const entriesToSync = users
      .map(u => ({
        wallet: u.wallet,
        xpDelta: Number(u.total_xp) - Number(u.last_synced_xp || 0),
        currentXP: Number(u.total_xp),
      }))
      .filter(e => e.xpDelta !== 0);

    if (entriesToSync.length === 0) {
      console.log('[SnagSync] No XP deltas to sync');
      return;
    }

    // Split into credits and debits
    const credits = entriesToSync.filter(e => e.xpDelta > 0);
    const debits  = entriesToSync.filter(e => e.xpDelta < 0);

    console.log(`[SnagSync] Syncing XP: ${credits.length} credits, ${debits.length} debits`);

    const { succeeded: creditSucceeded } = credits.length > 0
      ? await this.batchPushXP(credits)
      : { succeeded: [] as string[] };

    const { succeeded: debitSucceeded } = debits.length > 0
      ? await this.batchDebitXP(debits)
      : { succeeded: [] as string[] };

    const allSucceeded = [...creditSucceeded, ...debitSucceeded];

    // Update sync log for succeeded wallets
    for (const wallet of allSucceeded) {
      const entry = entriesToSync.find(e => e.wallet === wallet)!;
      try {
        await execute(
          `INSERT INTO xp_sync_log (wallet, last_synced_xp, last_synced_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (wallet) DO UPDATE SET last_synced_xp = $2, last_synced_at = NOW()`,
          [wallet, entry.currentXP]
        );
      } catch (err) {
        console.error('[SnagSync] Failed to update xp_sync_log:', err);
      }
    }

    console.log(`[SnagSync] XP sync: ${allSucceeded.length}/${entriesToSync.length} succeeded`);
  }

  /**
   * Debit XP from SNAG accounts (for early-sell claw-backs).
   * Mirror of batchPushXP but uses direction: 'debit'.
   */
  async batchDebitXP(
    entries: Array<{ wallet: string; xpDelta: number }>
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    if (!this.checkCircuit() || !config.snagLoyaltyCurrencyId) {
      return { succeeded: [], failed: entries.map(e => e.wallet) };
    }

    const batchId = `debit-${Date.now()}`;
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);
      try {
        await this.client.post('/api/loyalty/transactions', {
          websiteId: config.snagWebsiteId,
          organizationId: config.snagOrganizationId,
          description: `SHIFT early-sell XP claw-back — ${batchId}`,
          entries: chunk.map((e, idx) => ({
            walletAddress: e.wallet,
            loyaltyCurrencyId: config.snagLoyaltyCurrencyId,
            direction: 'debit',
            amount: Math.ceil(Math.abs(e.xpDelta)),
            idempotencyKey: `${batchId}-${i + idx}`.slice(0, 32),
          })),
        });
        this.recordSuccess();
        succeeded.push(...chunk.map(e => e.wallet));
        console.log(`[SnagSync] 📉 Debit batch pushed ${chunk.length} claw-backs`);
      } catch (error: any) {
        this.recordFailure();
        const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`[SnagSync] ❌ Debit batch failed:`, errMsg);
        failed.push(...chunk.map(e => e.wallet));
      }
    }

    return { succeeded, failed };
  }

  /**
   * Push XP entries to SNAG in batches via POST /api/loyalty/transactions.
   * Uses idempotency keys to prevent double-crediting on retry.
   */
  async batchPushXP(
    entries: Array<{ wallet: string; xpDelta: number }>
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    if (!this.checkCircuit()) {
      const minutesLeft = this.circuitOpenUntil
        ? Math.ceil((this.circuitOpenUntil - Date.now()) / 60000)
        : 5;
      console.warn(`[SnagSync] Circuit open — skipping batch (${minutesLeft}min remaining)`);
      return { succeeded: [], failed: entries.map(e => e.wallet) };
    }

    if (!config.snagLoyaltyCurrencyId) {
      // No loyalty currency configured — skip XP sync
      if (!config.snagXpRuleId) {
        console.log('[SnagSync] ⚠️  No loyalty currency ID or XP rule ID configured — skipping XP sync');
        return { succeeded: [], failed: entries.map(e => e.wallet) };
      }
      // Fall back to rule-based if currency ID not set
      console.log('[SnagSync] No loyalty currency ID, using rule-based XP push');
      const succeeded: string[] = [];
      const failed: string[] = [];
      for (const entry of entries) {
        try {
          await this.pushXPViaRule(entry.wallet, entry.xpDelta);
          succeeded.push(entry.wallet);
        } catch {
          failed.push(entry.wallet);
        }
      }
      return { succeeded, failed };
    }

    const batchId = `xp-${Date.now()}`;
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);

      // Filter out zero/negative XP amounts — SNAG requires amount > 0
      const validEntries = chunk.filter(e => e.xpDelta > 0);

      if (validEntries.length === 0) {
        console.log(`[SnagSync] ⏭️  Skipping chunk ${i / BATCH_SIZE + 1} — no entries with XP > 0`);
        continue;
      }

      try {
        await this.client.post('/api/loyalty/transactions', {
          websiteId: config.snagWebsiteId,
          organizationId: config.snagOrganizationId, // Some SNAG versions require this
          description: `SHIFT Airdrop XP sync — batch ${batchId}`,
          entries: validEntries.map((e, idx) => ({
            walletAddress: e.wallet,
            loyaltyCurrencyId: config.snagLoyaltyCurrencyId,
            direction: 'credit',
            amount: Math.ceil(e.xpDelta), // Use ceil to avoid rounding down to 0
            idempotencyKey: `${batchId}-${i + idx}`.slice(0, 32),
          })),
        });

        this.recordSuccess();
        succeeded.push(...validEntries.map(e => e.wallet));
        console.log(`[SnagSync] 📊 Batch pushed ${validEntries.length}/${chunk.length} XP entries (chunk ${i / BATCH_SIZE + 1})`);
      } catch (error: any) {
        const errData = error?.response?.data;
        const errMsg = errData ? JSON.stringify(errData) : error.message;
        const isConfigError = errMsg?.includes('Loyalty currency not configured') ||
                              errMsg?.includes('not configured') ||
                              errMsg?.includes('not found');

        if (isConfigError) {
          // Config-level error — do NOT trigger circuit breaker or queue retry
          console.warn(`[SnagSync] ⚠️  SNAG config issue (chunk ${i / BATCH_SIZE + 1}): ${errMsg}`);
          console.warn(`[SnagSync] ⚠️  Check SNAG_LOYALTY_CURRENCY_ID is correct in SNAG admin dashboard`);
          failed.push(...validEntries.map(e => e.wallet));
          // Do NOT call recordFailure() — this is not a transient failure
        } else {
          // Transient error — count against circuit breaker and queue retry
          this.recordFailure();
          console.error(`[SnagSync] ❌ XP batch failed (chunk ${i / BATCH_SIZE + 1}):`, errMsg);
          failed.push(...validEntries.map(e => e.wallet));
          await this.queueFailedEntries(validEntries, 'xp', errMsg, batchId);
        }
      }
    }

    return { succeeded, failed };
  }

  /**
   * Fallback: push XP via External Rule (used when SNAG_LOYALTY_CURRENCY_ID is not set).
   */
  private async pushXPViaRule(wallet: string, xpAmount: number): Promise<void> {
    if (!config.snagXpRuleId) return;
    await this.client.post(`/api/loyalty/rules/${config.snagXpRuleId}/complete`, {
      walletAddress: wallet,
      amount: Math.floor(xpAmount),
      idempotencyKey: `xp-${wallet}-${Date.now()}`.slice(0, 32),
    });
  }

  // ── Multiplier Sync ──

  /**
   * Push claim_multiplier changes to SNAG.
   * Called as step 6 of fullSync. Tracks snag_multiplier_id per user.
   */
  async syncMultipliers(): Promise<void> {
    if (!this.checkCircuit() || !config.snagWebsiteId || !config.snagLoyaltyCurrencyId) {
      if (!config.snagLoyaltyCurrencyId) {
        console.log('[SnagSync] Multiplier sync skipped: SNAG_LOYALTY_CURRENCY_ID not configured');
      }
      return;
    }

    const users = await query<{ wallet: string; claim_multiplier: number; snag_multiplier_id: string | null }>(
      `SELECT wallet, claim_multiplier, snag_multiplier_id
       FROM users
       WHERE updated_at > NOW() - INTERVAL '15 minutes'
         AND claim_multiplier > 1.0`
    );

    if (users.length === 0) return;

    console.log(`[SnagSync] Syncing multipliers for ${users.length} users...`);
    let synced = 0;

    for (const user of users) {
      try {
        const multiplierValue = Number(user.claim_multiplier);

        if (!multiplierValue || isNaN(multiplierValue)) {
          console.warn(`[SnagSync] Skipping multiplier sync for ${user.wallet.slice(0, 8)}: invalid value (${user.claim_multiplier})`);
          continue;
        }

        if (user.snag_multiplier_id) {
          // Update existing multiplier
          await this.client.patch(`/api/loyalty/multipliers/${user.snag_multiplier_id}`, {
            multiplier: multiplierValue,
          });
        } else {
          // Create new multiplier
          const result = await this.client.post('/api/loyalty/multipliers', {
            websiteId: config.snagWebsiteId,
            organizationId: config.snagOrganizationId,
            loyaltyCurrencyId: config.snagLoyaltyCurrencyId,
            multiplier: multiplierValue,
            title: 'SHIFT Airdrop Claim Multiplier',
            description: `Earned through holding and trading SHIFT RWA tokens`,
            externalIdentifier: `shift-mult-${user.wallet.slice(0, 8)}`,
            walletAddress: user.wallet,
          });

          const multiplierIdCreated = result.data?.id;
          if (multiplierIdCreated) {
            await execute(
              'UPDATE users SET snag_multiplier_id = $1 WHERE wallet = $2',
              [multiplierIdCreated, user.wallet]
            );
          }
        }

        this.recordSuccess();
        synced++;
      } catch (error: any) {
        this.recordFailure();
        const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`[SnagSync] Multiplier sync failed for ${user.wallet.slice(0, 8)}:`, errMsg);
      }
    }

    if (synced > 0) {
      console.log(`[SnagSync] 🎯 Multiplier sync: ${synced}/${users.length} succeeded`);
    }
  }

  // ── Badge Sync ──

  async awardBadgeInSnag(wallet: string, badgeName: BadgeName): Promise<void> {
    const snagBadgeId = config.snagBadgeIds[badgeName];
    if (!snagBadgeId || !this.checkCircuit()) {
      if (!snagBadgeId) {
        console.log(`[SnagSync] No SNAG badge ID for "${badgeName}", skipping`);
      }
      return;
    }

    try {
      // Try transaction endpoint first if currency ID is set
      if (config.snagLoyaltyCurrencyId) {
        await this.client.post('/api/loyalty/transactions', {
          websiteId: config.snagWebsiteId,
          description: `SHIFT badge earned: ${badgeName}`,
          entries: [{
            walletAddress: wallet,
            loyaltyCurrencyId: config.snagLoyaltyCurrencyId,
            direction: 'credit',
            amount: 1,
            idempotencyKey: `badge-${badgeName}-${wallet}`.slice(0, 32),
            metadata: { badge_name: badgeName, rule_id: snagBadgeId },
          }],
        });
      } else {
        // Fallback: rule completion
        await this.client.post(`/api/loyalty/rules/${snagBadgeId}/complete`, {
          walletAddress: wallet,
          amount: 1,
          idempotencyKey: `badge-${badgeName}-${wallet}`.slice(0, 32),
        });
      }

      await execute(
        'UPDATE badges SET snag_badge_id = $1 WHERE wallet = $2 AND badge_name = $3',
        [snagBadgeId, wallet, badgeName]
      );

      this.recordSuccess();
      console.log(`[SnagSync] 🏆 Badge "${badgeName}" synced for ${wallet.slice(0, 8)}...`);
    } catch (error: any) {
      this.recordFailure();
      const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[SnagSync] Badge push failed, queueing:`, errMsg);
      await this.queueFailedEntries([{ wallet, badge_name: badgeName }], 'badge', errMsg, `badge-${badgeName}`);
    }
  }

  // ── Social Rule Completion ──

  /**
   * Mark a social task rule as complete in SNAG.
   * Called after we've independently verified the action
   * (Discord guild join, Twitter follow, Telegram membership).
   * Uses the rule completion endpoint so SNAG records the activity.
   */
  async awardSocialRule(wallet: string, ruleId: string, points: number): Promise<void> {
    if (!ruleId || !this.checkCircuit()) {
      if (!ruleId) console.log('[SnagSync] No rule ID supplied, skipping social rule award');
      return;
    }

    try {
      await this.client.post(`/api/loyalty/rules/${ruleId}/complete`, {
        walletAddress: wallet,
        amount: points,
        idempotencyKey: `social-${ruleId}-${wallet}`.slice(0, 64),
      });

      this.recordSuccess();
      console.log(`[SnagSync] ✅ Social rule ${ruleId} completed for ${wallet.slice(0, 8)}... (+${points} pts)`);
    } catch (error: any) {
      this.recordFailure();
      const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[SnagSync] Social rule completion failed, queueing:`, errMsg);
      await this.queueFailedEntries(
        [{ wallet, rule_id: ruleId, points }],
        'social_rule',
        errMsg,
        `social-${ruleId}`
      );
    }
  }

  // ── Queue Retry ──

  /**
   * Process pending items in the retry queue.
   * Called by the 2-minute cron worker.
   */
  async processRetryQueue(): Promise<void> {
    if (!this.checkCircuit()) return;

    const items = await query<{
      id: string;
      wallet: string;
      sync_type: string;
      payload: string;
      attempts: number;
    }>(
      `SELECT id, wallet, sync_type, payload, attempts
       FROM snag_sync_queue
       WHERE status = 'failed'
         AND attempts < 10
         AND (backoff_until IS NULL OR backoff_until <= NOW())
       ORDER BY created_at ASC
       LIMIT 50`
    );

    // Clear out items stuck with config errors — these will never succeed without SNAG admin fix
    await execute(
      `UPDATE snag_sync_queue SET status = 'abandoned', attempts = 10
       WHERE status = 'failed'
         AND (error_message ILIKE '%loyalty currency not configured%'
           OR error_message ILIKE '%not configured%')`
    );

    if (items.length === 0) return;

    console.log(`[SnagSync] Processing ${items.length} queued retry items...`);

    const xpItems = items.filter(i => i.sync_type === 'xp');
    const badgeItems = items.filter(i => i.sync_type === 'badge');

    // Batch-retry XP items
    if (xpItems.length > 0) {
      const entries = xpItems.map(i => {
        const p = typeof i.payload === 'string' ? JSON.parse(i.payload) : i.payload;
        return { wallet: i.wallet, xpDelta: p.xpDelta || p.amount || 0, queueId: i.id, attempts: i.attempts };
      });

      const { succeeded } = await this.batchPushXP(entries);
      const succeededSet = new Set(succeeded);

      for (const entry of entries) {
        if (succeededSet.has(entry.wallet)) {
          await execute(
            `UPDATE snag_sync_queue SET status = 'completed', last_attempt_at = NOW() WHERE id = $1`,
            [entry.queueId]
          );
        } else {
          const nextBackoff = new Date(Date.now() + this.backoffMs(entry.attempts));
          await execute(
            `UPDATE snag_sync_queue
             SET attempts = attempts + 1, last_attempt_at = NOW(), backoff_until = $1
             WHERE id = $2`,
            [nextBackoff, entry.queueId]
          );
        }
      }
    }

    // Retry badge items individually
    for (const item of badgeItems) {
      try {
        const p = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        await this.awardBadgeInSnag(item.wallet, p.badge_name as BadgeName);
        await execute(
          `UPDATE snag_sync_queue SET status = 'completed', last_attempt_at = NOW() WHERE id = $1`,
          [item.id]
        );
      } catch {
        const nextBackoff = new Date(Date.now() + this.backoffMs(item.attempts));
        await execute(
          `UPDATE snag_sync_queue
           SET attempts = attempts + 1, last_attempt_at = NOW(), backoff_until = $1
           WHERE id = $2`,
          [nextBackoff, item.id]
        );
      }
    }
  }

  // ── Leaderboard ──

  async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
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

    return this.getLocalLeaderboard(limit);
  }

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

  async getUserRank(wallet: string): Promise<number | null> {
    if (config.snagApiKey && config.snagWebsiteId) {
      try {
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

    const result = await queryOne<{ rank: string }>(
      `SELECT COUNT(*) + 1 as rank FROM users WHERE total_xp > (SELECT total_xp FROM users WHERE wallet = $1)`,
      [wallet]
    );
    return result ? parseInt(result.rank, 10) : null;
  }

  async getUserPoints(wallet: string): Promise<number> {
    if (!config.snagApiKey || !config.snagWebsiteId) return 0;

    try {
      // Always search by walletAddress — SNAG account search returns the balance in `amount`
      const searchResponse = await this.client.get('/api/loyalty/accounts', {
        params: {
          websiteId: config.snagWebsiteId,
          walletAddress: wallet,
          limit: 1,
        },
      });

      const foundAccount = searchResponse.data?.data?.[0];
      if (foundAccount) {
        // Cache snag_user_id for other calls
        if (foundAccount.id) {
          await execute(
            `UPDATE users SET snag_user_id = $1 WHERE wallet = $2 AND (snag_user_id IS NULL OR snag_user_id != $1)`,
            [foundAccount.id, wallet]
          ).catch(() => {}); // non-fatal
        }
        // SNAG returns balance as `amount` in the account search result
        const points = Number(foundAccount.amount ?? foundAccount.points ?? foundAccount.balance ?? 0);
        return isNaN(points) ? 0 : points;
      }
    } catch (error) {
      console.error('[SnagSync] Failed to fetch user points from SNAG:', error);
    }

    return 0;
  }

  // ── Snag Referral Sync ──

  /**
   * Pull referred-user events from Snag and upsert them into the referrals table
   * with referral_source = 'snag'. These are users who registered via a Snag
   * loyalty referral link rather than a SHIFT website referral code.
   *
   * Snag referral events live in /api/loyalty/referrals (pagination via cursor).
   * We upsert by (referrer_wallet, referred_wallet) so the method is idempotent.
   */
  async syncReferralsFromSnag(since?: Date): Promise<{ inserted: number; updated: number }> {
    if (!config.snagApiKey || !config.snagWebsiteId) {
      console.log('[SnagSync] Referral sync skipped: SNAG not configured');
      return { inserted: 0, updated: 0 };
    }

    let inserted = 0;
    let updated  = 0;
    let cursor: string | undefined;

    try {
      do {
        const params: Record<string, any> = {
          websiteId: config.snagWebsiteId,
          limit: 100,
        };
        if (cursor) params.cursor = cursor;
        // Only fetch referrals newer than last sync — avoids paginating entire history every hour
        if (since) params.createdAfter = since.toISOString();

        const response = await this.client.get('/api/loyalty/referrals', { params });
        const items: any[] = response.data?.data ?? [];
        cursor = response.data?.nextCursor ?? undefined;

        for (const item of items) {
          const referrerWallet  = item.referrerWalletAddress || item.referrer?.walletAddress;
          const referredWallet  = item.referredWalletAddress || item.referred?.walletAddress;
          if (!referrerWallet || !referredWallet) continue;

          // Ensure both wallets exist in users table (Snag users may not be in our DB yet)
          await execute(
            `INSERT INTO users (wallet, created_at) VALUES ($1, NOW())
             ON CONFLICT (wallet) DO NOTHING`,
            [referredWallet]
          );

          const result = await execute(
            `INSERT INTO referrals
               (referrer_wallet, referred_wallet, referral_source, referred_at, code_used)
             VALUES ($1, $2, 'snag', $3, $4)
             ON CONFLICT (referrer_wallet, referred_wallet)
             DO UPDATE SET
               referral_source = EXCLUDED.referral_source,
               updated_at = NOW()
             RETURNING (xmax = 0) AS was_inserted`,
            [
              referrerWallet,
              referredWallet,
              item.createdAt ? new Date(item.createdAt) : new Date(),
              item.referralCode ?? item.code ?? null,
            ]
          );

          const wasInserted = (result as any)?.rows?.[0]?.was_inserted;
          if (wasInserted) inserted++;
          else updated++;

          // Mirror referred_by_wallet on the users table for commission lookups
          await execute(
            `UPDATE users SET referred_by_wallet = $1
             WHERE wallet = $2 AND referred_by_wallet IS NULL`,
            [referrerWallet, referredWallet]
          );
        }

        this.recordSuccess();
      } while (cursor);
    } catch (error: any) {
      const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.warn(`[SnagSync] Referral sync partial/failed: ${errMsg}`);
      // Not a hard failure — don't open circuit for this
    }

    if (inserted + updated > 0) {
      console.log(`[SnagSync] Referral sync: +${inserted} new, ${updated} updated`);
    }
    return { inserted, updated };
  }

  /**
   * Refresh is_active on ALL referrals based on current $5 SHIFT asset holding.
   * Run after XP sync so position_size_usd values are fresh.
   */
  async refreshReferralActiveStatus(): Promise<void> {
    const SHIFT_ASSET_MINTS = [
      '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
      'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
      'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
      '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
      '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
      '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
    ];

    // Activate referrals that now meet the $5 threshold
    await execute(
      `UPDATE referrals r
       SET is_active = true,
           activated_at = COALESCE(r.activated_at, NOW())
       WHERE r.is_active = false
         AND EXISTS (
           SELECT 1 FROM positions p
           WHERE p.wallet = r.referred_wallet
             AND p.status = 'open'
             AND p.asset_mint = ANY($1::text[])
           GROUP BY p.wallet
           HAVING SUM(p.position_size_usd) >= 5
         )`,
      [SHIFT_ASSET_MINTS]
    );

    // Deactivate referrals where wallet no longer holds $5+
    await execute(
      `UPDATE referrals r
       SET is_active = false
       WHERE r.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM positions p
           WHERE p.wallet = r.referred_wallet
             AND p.status = 'open'
             AND p.asset_mint = ANY($1::text[])
           GROUP BY p.wallet
           HAVING SUM(p.position_size_usd) >= 5
         )`,
      [SHIFT_ASSET_MINTS]
    );

    console.log('[SnagSync] Referral active status refreshed');
  }

  // ── Referral Links ──

  /**
   * Fetch user's referral links from SNAG (default + custom).
   */
  async getUserReferralLinks(wallet: string): Promise<{
    defaultLink: string;
    customLink: string | null;
  }> {
    if (!config.snagApiKey || !config.snagWebsiteId) {
      return { defaultLink: '', customLink: null };
    }

    try {
      let user = await queryOne<{ snag_user_id: string }>(
        'SELECT snag_user_id FROM users WHERE wallet = $1',
        [wallet]
      );

      let snagUserId = user?.snag_user_id;

      // If no snag_user_id, search SNAG for the user
      if (!snagUserId) {
        const searchResponse = await this.client.get('/api/loyalty/accounts', {
          params: {
            websiteId: config.snagWebsiteId,
            walletAddress: wallet,
            limit: 1,
          },
        });

        const foundAccount = searchResponse.data?.data?.[0];
        if (foundAccount) {
          snagUserId = foundAccount.id;
          await execute(
            'UPDATE users SET snag_user_id = $1 WHERE wallet = $2',
            [snagUserId, wallet]
          );
        }
      }

      if (!snagUserId) {
        console.log(`[SnagSync] User ${wallet.slice(0, 8)} not found in SNAG`);
        return { defaultLink: '', customLink: null };
      }

      // Fetch referral links from SNAG
      const response = await this.client.get(
        `/api/loyalty/accounts/${snagUserId}/referral-links`,
        { params: { websiteId: config.snagWebsiteId } }
      );

      const defaultLink = response.data?.defaultLink || '';
      const customLink = response.data?.customLink || null;

      // Cache in local DB
      await execute(
        `UPDATE users
         SET snag_default_referral_link = $1,
             snag_custom_referral_code = $2,
             referral_link_synced_at = NOW()
         WHERE wallet = $3`,
        [defaultLink, customLink, wallet]
      );

      this.recordSuccess();
      console.log(`[SnagSync] 🔗 Fetched referral links for ${wallet.slice(0, 8)}...`);

      return { defaultLink, customLink };
    } catch (error: any) {
      this.recordFailure();
      console.error('[SnagSync] Failed to fetch referral links:', error?.message);
      return { defaultLink: '', customLink: null };
    }
  }

  /**
   * Set a custom referral code for the user in SNAG.
   */
  async setCustomReferralLink(wallet: string, customCode: string): Promise<void> {
    if (!config.snagApiKey || !config.snagWebsiteId) {
      throw new Error('SNAG not configured');
    }

    if (!customCode || customCode.length < 4 || customCode.length > 64) {
      throw new Error('Custom code must be 4-64 characters');
    }

    try {
      const user = await queryOne<{ snag_user_id: string }>(
        'SELECT snag_user_id FROM users WHERE wallet = $1',
        [wallet]
      );

      if (!user?.snag_user_id) {
        throw new Error('User not found in SNAG');
      }

      // Update custom code in SNAG
      await this.client.patch(
        `/api/loyalty/accounts/${user.snag_user_id}/referral-links`,
        { customCode },
        { params: { websiteId: config.snagWebsiteId } }
      );

      // Cache in local DB
      await execute(
        `UPDATE users
         SET snag_custom_referral_code = $1
         WHERE wallet = $2`,
        [customCode, wallet]
      );

      this.recordSuccess();
      console.log(`[SnagSync] ✅ Custom referral code "${customCode}" set for ${wallet.slice(0, 8)}...`);
    } catch (error: any) {
      this.recordFailure();
      const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('[SnagSync] Failed to set custom referral code:', errMsg);
      throw new Error(`Failed to set custom referral code: ${errMsg}`);
    }
  }
}

export const snagSyncService = new SnagSyncService();
