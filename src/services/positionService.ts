// ============================================================
// Position Service — Track open/close positions in PostgreSQL
// ============================================================

import { query, queryOne, execute } from '../db/pool';
import { Position, User } from '../types';
import { extractSwapPriceFromTx, batchExtractSwapPrices } from './heliusTransactionService';
import { positionPriceService } from './positionPriceService';

export class PositionService {
  /**
   * Ensure a user record exists (upsert on first seen wallet).
   */
  async ensureUserExists(wallet: string): Promise<void> {
    await execute(
      `INSERT INTO users (wallet, last_active)
       VALUES ($1, NOW())
       ON CONFLICT (wallet) DO UPDATE SET last_active = NOW(), updated_at = NOW()`,
      [wallet]
    );
  }

  /**
   * Open a new position. Returns false if tx already processed (dedup).
   */
  async openPosition(
    wallet: string,
    asset: string,
    assetMint: string | null,
    positionSizeUSD: number,
    tokenAmount: number | null,
    priceAtOpen: number | null,
    txSignature: string,
    timestamp: Date
  ): Promise<boolean> {
    // Check dedup
    const existing = await queryOne(
      'SELECT tx_signature FROM processed_transactions WHERE tx_signature = $1',
      [txSignature]
    );
    if (existing) {
      console.log(`[Position] Duplicate tx skipped: ${txSignature.slice(0, 16)}...`);
      return false;
    }

    // Ensure user exists
    await this.ensureUserExists(wallet);

    // Insert position
    await queryOne(
      `INSERT INTO positions 
        (wallet, asset, asset_mint, position_size_usd, token_amount, price_at_open, 
         opened_at, status, tx_signature_open)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)`,
      [wallet, asset, assetMint, positionSizeUSD, tokenAmount, priceAtOpen, timestamp, txSignature]
    );

    // Mark tx as processed
    await execute(
      'INSERT INTO processed_transactions (tx_signature) VALUES ($1) ON CONFLICT DO NOTHING',
      [txSignature]
    );

    console.log(`[Position] Opened: ${wallet.slice(0, 8)}... | ${asset} | $${positionSizeUSD.toFixed(2)}`);

    // Record live entry price immediately (non-blocking)
    if (assetMint && tokenAmount) {
      const newPos = await queryOne<{ id: string }>(
        `SELECT id FROM positions WHERE tx_signature_open = $1`, [txSignature]
      );
      if (newPos) {
        positionPriceService.recordEntryPrice(newPos.id, assetMint, tokenAmount).catch(err =>
          console.error('[Position] Entry price record failed:', err)
        );
      }
    }

    return true;
  }

  /**
   * Close a position matching wallet + asset (FIFO — closes oldest open).
   */
  async closePosition(
    wallet: string,
    asset: string,
    txSignature: string,
    timestamp: Date
  ): Promise<Position | null> {
    // Check dedup
    const existing = await queryOne(
      'SELECT tx_signature FROM processed_transactions WHERE tx_signature = $1',
      [txSignature]
    );
    if (existing) return null;

    // Find oldest open position for this wallet + asset
    const position = await queryOne<Position>(
      `SELECT * FROM positions 
       WHERE wallet = $1 AND asset = $2 AND status = 'open' 
       ORDER BY opened_at ASC LIMIT 1`,
      [wallet, asset]
    );

    if (!position) {
      console.log(`[Position] No open position found to close: ${wallet.slice(0, 8)}... | ${asset}`);
      return null;
    }

    // Record live close price (non-blocking) before zeroing position_size_usd
    if (position.asset_mint && position.token_amount) {
      positionPriceService.recordClosePrice(position.id, position.asset_mint, Number(position.token_amount)).catch(err =>
        console.error('[Position] Close price record failed:', err)
      );
    }

    // Close it
    await execute(
      `UPDATE positions
       SET closed_at = $1, status = 'closed', tx_signature_close = $2,
           position_size_usd = 0
       WHERE id = $3`,
      [timestamp, txSignature, position.id]
    );

    // Mark tx processed
    await execute(
      'INSERT INTO processed_transactions (tx_signature) VALUES ($1) ON CONFLICT DO NOTHING',
      [txSignature]
    );

    // ── 24h early-sell claw-back ──
    // If sold within 24h of the on-chain buy, zero out all XP earned on this position.
    const holdMs = timestamp.getTime() - new Date(position.opened_at).getTime();
    const holdHours = holdMs / (1000 * 60 * 60);

    if (holdHours < 24) {
      const xpEarned = Number(position.xp_generated);
      if (xpEarned > 0) {
        // Subtract from users.total_xp (floor at 0)
        await execute(
          `UPDATE users SET total_xp = GREATEST(0, total_xp - $1), updated_at = NOW()
           WHERE wallet = $2`,
          [xpEarned, wallet]
        );
        console.log(`[Position] ⚠️  Early sell claw-back: ${wallet.slice(0, 8)}... | ${asset} | -${xpEarned.toFixed(2)} XP (held ${holdHours.toFixed(1)}h < 24h)`);
      }
      // Zero out xp_generated on the position record
      await execute(
        `UPDATE positions SET xp_generated = 0 WHERE id = $1`,
        [position.id]
      );
    }

    console.log(`[Position] Closed: ${wallet.slice(0, 8)}... | ${asset} | held ${this.formatDuration(position.opened_at, timestamp)}${holdHours < 24 ? ' ⚠️ early sell — XP clawed back' : ''}`);
    return position;
  }

  /**
   * Get all active (open) positions for a wallet.
   */
  async getActivePositions(wallet: string): Promise<Position[]> {
    return query<Position>(
      `SELECT * FROM positions WHERE wallet = $1 AND status = 'open' ORDER BY opened_at ASC`,
      [wallet]
    );
  }

  /**
   * Get all positions for a wallet (any status).
   */
  async getAllPositions(wallet: string): Promise<Position[]> {
    return query<Position>(
      `SELECT * FROM positions WHERE wallet = $1 ORDER BY opened_at DESC LIMIT 50`,
      [wallet]
    );
  }

  /**
   * Get all open positions across all users (for cron recalc).
   */
  async getAllOpenPositions(): Promise<Position[]> {
    return query<Position>(
      `SELECT * FROM positions WHERE status = 'open' ORDER BY wallet, opened_at`
    );
  }

  /**
   * Get position age in weeks and days.
   */
  getPositionAge(openedAt: Date, referenceDate?: Date): { weeks: number; days: number; hours: number } {
    const now = referenceDate || new Date();
    const diffMs = now.getTime() - new Date(openedAt).getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    const totalDays = totalHours / 24;
    const weeks = Math.floor(totalDays / 7);
    const days = Math.floor(totalDays % 7);
    return { weeks, days, hours: Math.floor(totalHours) };
  }

  /**
   * Update position XP and multiplier after recalculation.
   */
  async updatePositionXP(positionId: string, xpGenerated: number, multiplier: number): Promise<void> {
    await execute(
      `UPDATE positions 
       SET xp_generated = $1, current_multiplier = $2, last_xp_calc = NOW() 
       WHERE id = $3`,
      [xpGenerated, multiplier, positionId]
    );
  }

  /**
   * Mark a position as filtered (anti-farm).
   */
  async filterPosition(positionId: string): Promise<void> {
    await execute(
      `UPDATE positions SET status = 'filtered' WHERE id = $1`,
      [positionId]
    );
  }

  private formatDuration(from: Date, to: Date): string {
    const { weeks, days } = this.getPositionAge(from, to);
    if (weeks > 0) return `${weeks}w ${days}d`;
    return `${days}d`;
  }

  /**
   * Capture entry price from blockchain transaction (when position opens).
   * Extracts swap price via Helius API and stores in price_at_open.
   */
  async capturePositionOpen(position: Position): Promise<boolean> {
    if (position.price_at_open) {
      return true; // Already captured
    }

    if (!position.tx_signature_open) {
      console.warn(`[Position] No tx signature for position ${position.id}`);
      return false;
    }

    try {
      const swapData = await extractSwapPriceFromTx(
        position.tx_signature_open,
        position.wallet,
        position.asset_mint || position.asset
      );

      if (!swapData) {
        console.warn(`[Position] Could not extract price for position ${position.id}`);
        return false;
      }

      // Update position with extracted price
      await execute(
        `UPDATE positions
         SET price_at_open = $1, extracted_at = NOW()
         WHERE id = $2`,
        [swapData.pricePerToken, position.id]
      );

      console.log(
        `[Position] ✅ Captured entry price: ${position.asset} @ $${swapData.pricePerToken.toFixed(4)}`
      );
      return true;
    } catch (err) {
      console.error(`[Position] Error capturing price for ${position.id}:`, err);
      return false;
    }
  }

  /**
   * Capture exit price when position closes.
   * Extracts swap price and stores close_value_usd.
   */
  async capturePositionClose(
    positionId: string,
    txSignatureClose: string,
    wallet: string,
    assetMint: string
  ): Promise<boolean> {
    try {
      const position = await queryOne<Position>(
        'SELECT * FROM positions WHERE id = $1',
        [positionId]
      );

      if (!position) {
        console.warn(`[Position] Position not found: ${positionId}`);
        return false;
      }

      const swapData = await extractSwapPriceFromTx(
        txSignatureClose,
        wallet,
        assetMint || position.asset
      );

      if (!swapData) {
        console.warn(`[Position] Could not extract close price for ${positionId}`);
        return false;
      }

      // Calculate close value
      const tokenAmount = position.token_amount || 0;
      const closeValueUsd = tokenAmount * swapData.pricePerToken;

      // Update position
      await execute(
        `UPDATE positions
         SET price_at_close = $1, close_value_usd = $2, extracted_at = NOW()
         WHERE id = $3`,
        [swapData.pricePerToken, closeValueUsd, positionId]
      );

      console.log(
        `[Position] ✅ Captured exit price: ${position.asset} @ $${swapData.pricePerToken.toFixed(4)} | Close value: $${closeValueUsd.toFixed(2)}`
      );
      return true;
    } catch (err) {
      console.error(`[Position] Error capturing close price for ${positionId}:`, err);
      return false;
    }
  }

  /**
   * Backfill entry prices for all positions without price_at_open.
   * Uses Helius to extract swap prices from blockchain transactions.
   * Returns { total, updated, failed } for audit.
   */
  async backfillEntryPrices(): Promise<{ total: number; updated: number; failed: number }> {
    console.log('[Position] Starting entry price backfill...\n');

    const positions = await query<Position>(
      `SELECT id, wallet, asset, asset_mint, tx_signature_open, token_amount
       FROM positions
       WHERE status = 'open' AND price_at_open IS NULL
       ORDER BY opened_at DESC`
    );

    console.log(
      `[Position] Found ${positions.length} positions without entry prices\n`
    );

    if (positions.length === 0) {
      return { total: 0, updated: 0, failed: 0 };
    }

    // Batch extract prices from Helius
    const priceMap = await batchExtractSwapPrices(
      positions.map((p) => ({
        id: p.id,
        wallet: p.wallet,
        asset_mint: p.asset_mint || p.asset,
        tx_signature_open: p.tx_signature_open,
      }))
    );

    // Update positions with extracted prices
    let updated = 0;
    let failed = 0;

    for (const position of positions) {
      const swapData = priceMap.get(position.id);

      if (swapData) {
        try {
          await execute(
            `UPDATE positions
             SET price_at_open = $1, extracted_at = NOW()
             WHERE id = $2`,
            [swapData.pricePerToken, position.id]
          );
          updated++;
        } catch (err) {
          console.error(`[Position] Failed to update ${position.id}:`, err);
          failed++;
        }
      } else {
        failed++;
      }
    }

    console.log(`\n[Position] ✅ Backfill complete:`);
    console.log(`   Total: ${positions.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success rate: ${((updated / positions.length) * 100).toFixed(1)}%\n`);

    return { total: positions.length, updated, failed };
  }
}

export const positionService = new PositionService();
