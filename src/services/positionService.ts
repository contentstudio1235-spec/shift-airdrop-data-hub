// ============================================================
// Position Service — Track open/close positions in PostgreSQL
// ============================================================

import { query, queryOne, execute } from '../db/pool';
import { Position, User } from '../types';

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

    // Close it
    await execute(
      `UPDATE positions 
       SET closed_at = $1, status = 'closed', tx_signature_close = $2 
       WHERE id = $3`,
      [timestamp, txSignature, position.id]
    );

    // Mark tx processed
    await execute(
      'INSERT INTO processed_transactions (tx_signature) VALUES ($1) ON CONFLICT DO NOTHING',
      [txSignature]
    );

    console.log(`[Position] Closed: ${wallet.slice(0, 8)}... | ${asset} | held ${this.formatDuration(position.opened_at, timestamp)}`);
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
}

export const positionService = new PositionService();
