// ============================================================
// XP Engine — Core XP calculation with position multipliers
// ============================================================

import { query, execute } from '../db/pool';
import { Position } from '../types';
import { positionService } from './positionService';
import { antiFarmService } from './antiFarmService';

export class XPEngine {
  // ── Core Formulas ──

  /**
   * Position multiplier: grows 0.1x per week held, capped at 3.0x.
   * position_multiplier(t) = min(1.0 + 0.10 × weeks_open, 3.0)
   */
  calculatePositionMultiplier(weeksOpen: number): number {
    return Math.min(1.0 + 0.10 * weeksOpen, 3.0);
  }

  /**
   * Weekly XP for a single position.
   * weekly_position_XP = log₁₀(max(position_size_USD, 10)) × 100 × position_multiplier
   */
  calculateWeeklyXP(positionSizeUSD: number, multiplier: number): number {
    return Math.log10(Math.max(positionSizeUSD, 10)) * 100 * multiplier;
  }

  /**
   * Calculate XP earned since last calculation for a position.
   * Prorates the weekly XP based on hours elapsed.
   */
  calculateXPSinceLastCalc(
    positionSizeUSD: number,
    multiplier: number,
    hoursSinceLastCalc: number
  ): number {
    const weeklyXP = this.calculateWeeklyXP(positionSizeUSD, multiplier);
    const hoursInWeek = 7 * 24;
    return (weeklyXP / hoursInWeek) * hoursSinceLastCalc;
  }

  // ── Cron Job: Recalculate All XP ──

  /**
   * Main recalculation job — runs every hour.
   * 1. Get all open positions
   * 2. Skip positions under 24h hold (anti-farm)
   * 3. Calculate position multiplier based on age
   * 4. Calculate XP earned since last calc
   * 5. Update position records
   * 6. Aggregate XP per wallet → update users.total_xp
   */
  async recalculateAllXP(): Promise<{ usersUpdated: number; positionsProcessed: number }> {
    console.log('[XPEngine] Starting recalculation...');
    const now = new Date();

    // 1. Get all open positions
    const openPositions = await positionService.getAllOpenPositions();
    let positionsProcessed = 0;

    // 2. Process each position
    const walletXPDeltas: Map<string, number> = new Map();

    for (const position of openPositions) {
      // Skip positions under minimum hold
      if (antiFarmService.isUnderMinHold(position.opened_at, now)) {
        continue;
      }

      // Calculate age
      const { weeks } = positionService.getPositionAge(position.opened_at, now);

      // Calculate multiplier
      const multiplier = this.calculatePositionMultiplier(weeks);

      // Calculate hours since last XP calc (or since opened)
      const lastCalc = position.last_xp_calc ? new Date(position.last_xp_calc) : new Date(position.opened_at);
      const hoursSinceLastCalc = (now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60);

      // Skip if less than 1 hour since last calc
      if (hoursSinceLastCalc < 0.9) continue;

      // Calculate new XP earned
      const xpDelta = this.calculateXPSinceLastCalc(
        Number(position.position_size_usd),
        multiplier,
        hoursSinceLastCalc
      );

      const newTotalXP = Number(position.xp_generated) + xpDelta;

      // Update position
      await positionService.updatePositionXP(position.id, newTotalXP, multiplier);

      // Track wallet XP delta
      const currentDelta = walletXPDeltas.get(position.wallet) || 0;
      walletXPDeltas.set(position.wallet, currentDelta + xpDelta);

      positionsProcessed++;
    }

    // 3. Update user total_xp
    let usersUpdated = 0;
    for (const [wallet, xpDelta] of walletXPDeltas) {
      if (xpDelta > 0) {
        await execute(
          `UPDATE users SET total_xp = total_xp + $1, updated_at = NOW() WHERE wallet = $2`,
          [xpDelta, wallet]
        );
        usersUpdated++;
      }
    }

    console.log(`[XPEngine] ✅ Recalc complete: ${positionsProcessed} positions, ${usersUpdated} users`);
    return { usersUpdated, positionsProcessed };
  }

  /**
   * Get total XP for a wallet (from DB).
   */
  async getWalletXP(wallet: string): Promise<number> {
    const user = await query<{ total_xp: string }>(
      'SELECT total_xp FROM users WHERE wallet = $1',
      [wallet]
    );
    return user[0] ? parseFloat(user[0].total_xp) : 0;
  }

  /**
   * Get XP breakdown per position for a wallet.
   */
  async getXPBreakdown(wallet: string): Promise<Array<{
    asset: string;
    positionSizeUSD: number;
    weeksHeld: number;
    multiplier: number;
    xpPerWeek: number;
    totalXP: number;
  }>> {
    const positions = await positionService.getActivePositions(wallet);
    const now = new Date();

    return positions.map((p) => {
      const { weeks } = positionService.getPositionAge(p.opened_at, now);
      const multiplier = this.calculatePositionMultiplier(weeks);
      const xpPerWeek = this.calculateWeeklyXP(Number(p.position_size_usd), multiplier);

      return {
        asset: p.asset,
        positionSizeUSD: Number(p.position_size_usd),
        weeksHeld: weeks,
        multiplier,
        xpPerWeek,
        totalXP: Number(p.xp_generated),
      };
    });
  }
}

export const xpEngine = new XPEngine();
