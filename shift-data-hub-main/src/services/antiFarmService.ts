// ============================================================
// Anti-Farm Service — Filter dust, wash trades, cooldowns
// ============================================================

import { query, queryOne, execute } from '../db/pool';
import { config } from '../config';
import { AntiFarmResult, AntiFarmReason } from '../types';

export class AntiFarmService {
  /**
   * Master filter — returns true if the position should be REJECTED.
   */
  async shouldFilter(
    wallet: string,
    asset: string,
    positionSizeUSD: number,
    timestamp: Date
  ): Promise<AntiFarmResult> {
    // Rule 1: Dust filter — reject positions below minimum size
    // BYPASS for SHIFT Test Token (so it can be tested even with low value)
    const isShiftToken = asset === config.shiftTokenMint;
    if (!isShiftToken && this.isDust(positionSizeUSD)) {
      await this.logFlag(wallet, 'dust', null, { size: positionSizeUSD, min: config.antiFarm.minPositionSizeUSD });
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
      await this.logFlag(wallet, 'cooldown', null, { asset, cooldownMinutes: config.antiFarm.cooldownMinutes });
      return { filtered: true, reason: 'cooldown', details: { asset } };
    }

    return { filtered: false };
  }

  /**
   * Check if a position has been held long enough to earn XP.
   * Called during XP recalculation, NOT during position open.
   */
  isUnderMinHold(openedAt: Date, referenceDate?: Date): boolean {
    const now = referenceDate || new Date();
    const hoursHeld = (now.getTime() - new Date(openedAt).getTime()) / (1000 * 60 * 60);
    return hoursHeld < config.antiFarm.minHoldHours;
  }

  /**
   * Rule 1: Position size below minimum threshold.
   */
  isDust(positionSizeUSD: number): boolean {
    return positionSizeUSD < config.antiFarm.minPositionSizeUSD;
  }

  /**
   * Rule 2: Detect wash trading — opposite direction, same asset, rapid close/open.
   * Checks if there was a close event on same asset within the wash trade window.
   */
  async isWashTrade(wallet: string, asset: string, timestamp: Date): Promise<boolean> {
    const windowMs = config.antiFarm.washTradeWindowMinutes * 60 * 1000;
    const windowStart = new Date(timestamp.getTime() - windowMs);

    const recentClose = await queryOne(
      `SELECT id FROM positions 
       WHERE wallet = $1 AND asset = $2 AND status = 'closed' 
       AND closed_at >= $3 AND closed_at <= $4
       LIMIT 1`,
      [wallet, asset, windowStart, timestamp]
    );

    return !!recentClose;
  }

  /**
   * Rule 3: Prevent reopening same asset too quickly after closing.
   */
  async isOnCooldown(wallet: string, asset: string): Promise<boolean> {
    const cooldownMs = config.antiFarm.cooldownMinutes * 60 * 1000;
    const cooldownStart = new Date(Date.now() - cooldownMs);

    const recentClose = await queryOne(
      `SELECT id FROM positions 
       WHERE wallet = $1 AND asset = $2 AND status = 'closed' 
       AND closed_at >= $3
       LIMIT 1`,
      [wallet, asset, cooldownStart]
    );

    return !!recentClose;
  }

  /**
   * Log anti-farm flag for audit.
   */
  private async logFlag(
    wallet: string,
    reason: AntiFarmReason,
    positionId: string | null,
    details: Record<string, unknown>
  ): Promise<void> {
    await execute(
      `INSERT INTO anti_farm_log (wallet, reason, position_id, details) 
       VALUES ($1, $2, $3, $4)`,
      [wallet, reason, positionId, JSON.stringify(details)]
    );
  }
}

export const antiFarmService = new AntiFarmService();
