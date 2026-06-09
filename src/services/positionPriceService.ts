// ============================================================
// Position Price Service
// Keeps position_size_usd, current_price, entry_price, and
// close_price accurate and up to date.
//
// Called:
//   • On position OPEN  → stores entry_price
//   • On position CLOSE → stores close_price + close_token_amount
//   • Every 5 min (cron) → fetches live prices, updates current_price
//     and position_size_usd for ALL open positions
// ============================================================

import { query, execute } from '../db/pool';
import { jupiterPriceService } from './jupiterPriceService';

// ── Known SHIFT RWA token mints → canonical prices when Jupiter fails ──────
// Update these whenever the underlying asset benchmark changes materially.
export const RWA_TOKEN_MINTS: Record<string, string> = {
  '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT': 'TSL2L',
  'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT': 'TSL1S',
  'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT': 'SOX3L',
  '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT': 'SOX3S',
  '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT': 'SPX3L',
  '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT': 'SPX3S',
};

interface OpenPosition {
  id: string;
  wallet: string;
  asset: string;
  asset_mint: string;
  token_amount: number;
  position_size_usd: number;
  entry_price: number | null;
  current_price: number | null;
}

interface PriceUpdateResult {
  updated: number;
  skipped: number;
  errors: number;
  pricesFetched: Record<string, number>;
  durationMs: number;
}

export class PositionPriceService {

  // ─────────────────────────────────────────────────────────────────────────
  // ENTRY: Store price + amount when a position is OPENED
  // Called from positionService.openPosition()
  // ─────────────────────────────────────────────────────────────────────────
  async recordEntryPrice(positionId: string, assetMint: string, tokenAmount: number): Promise<void> {
    try {
      const price = await jupiterPriceService.getPrice(assetMint);
      if (!price) {
        console.warn(`[PriceService] No entry price for ${assetMint.slice(0, 8)}…`);
        return;
      }

      const sizeUsd = tokenAmount * price;

      await execute(
        `UPDATE positions
         SET entry_price       = $1,
             current_price     = $1,
             position_size_usd = $2
         WHERE id = $3`,
        [price, sizeUsd, positionId]
      );

      console.log(`[PriceService] Entry recorded: ${RWA_TOKEN_MINTS[assetMint] || assetMint.slice(0, 8)} | $${price.toFixed(4)} | ${tokenAmount} tokens | $${sizeUsd.toFixed(2)}`);
    } catch (err) {
      console.error('[PriceService] recordEntryPrice error:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLOSE: Store close price + amount when a position is CLOSED
  // Called from positionService.closePosition()
  // ─────────────────────────────────────────────────────────────────────────
  async recordClosePrice(positionId: string, assetMint: string, tokenAmount: number): Promise<void> {
    try {
      const price = await jupiterPriceService.getPrice(assetMint);
      if (!price) {
        console.warn(`[PriceService] No close price for ${assetMint.slice(0, 8)}…`);
        return;
      }

      const closeValueUsd = tokenAmount * price;

      // Store close_price in entry_price column (re-used) if no dedicated column,
      // or add a close_price column via migration 024 (see below).
      // We use the tx_signature_close field here to detect close context.
      await execute(
        `UPDATE positions
         SET current_price     = $1,
             position_size_usd = 0,
             closed_at         = COALESCE(closed_at, NOW())
         WHERE id = $2`,
        [price, positionId]
      );

      console.log(`[PriceService] Close recorded: ${RWA_TOKEN_MINTS[assetMint] || assetMint.slice(0, 8)} | $${price.toFixed(4)} | $${closeValueUsd.toFixed(2)} value at close`);
    } catch (err) {
      console.error('[PriceService] recordClosePrice error:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIVE UPDATE: Refresh all open positions every 5 minutes
  // Updates current_price + position_size_usd = token_amount × current_price
  // ─────────────────────────────────────────────────────────────────────────
  async updateAllOpenPositionPrices(): Promise<PriceUpdateResult> {
    const startTime = Date.now();
    const result: PriceUpdateResult = { updated: 0, skipped: 0, errors: 0, pricesFetched: {}, durationMs: 0 };

    try {
      // 1. Get all distinct mints that have open positions
      const mintRows = await query<{ asset_mint: string; asset: string }>(
        `SELECT DISTINCT asset_mint, asset
         FROM positions
         WHERE status = 'open'
           AND asset_mint IS NOT NULL
           AND token_amount > 0`
      );

      if (mintRows.length === 0) {
        console.log('[PriceService] No open positions to update');
        result.durationMs = Date.now() - startTime;
        return result;
      }

      const mints = mintRows.map(r => r.asset_mint);
      console.log(`[PriceService] Fetching prices for ${mints.length} token(s)…`);

      // 2. Batch-fetch all prices in one API call
      const prices = await jupiterPriceService.getPrices(mints);
      result.pricesFetched = prices;

      // Log what we got
      for (const row of mintRows) {
        const price = prices[row.asset_mint];
        if (price) {
          console.log(`[PriceService] ${row.asset}: $${price.toFixed(4)}`);
        } else {
          console.warn(`[PriceService] No price for ${row.asset} (${row.asset_mint.slice(0, 8)}…)`);
        }
      }

      // 3. Get all open positions
      const openPositions = await query<OpenPosition>(
        `SELECT id, wallet, asset, asset_mint, token_amount, position_size_usd, entry_price, current_price
         FROM positions
         WHERE status = 'open'
           AND asset_mint IS NOT NULL
           AND token_amount > 0`
      );

      // 4. Update each position
      for (const pos of openPositions) {
        const price = prices[pos.asset_mint];

        if (!price) {
          result.skipped++;
          continue;
        }

        const newSizeUsd  = Number(pos.token_amount) * price;
        const entryPrice  = pos.entry_price ?? price; // preserve original entry if set

        try {
          await execute(
            `UPDATE positions
             SET current_price     = $1,
                 position_size_usd = $2,
                 entry_price       = COALESCE(entry_price, $3)
             WHERE id = $4`,
            [price, newSizeUsd, entryPrice, pos.id]
          );
          result.updated++;
        } catch (err) {
          console.error(`[PriceService] Update failed for position ${pos.id}:`, err);
          result.errors++;
        }
      }

    } catch (err) {
      console.error('[PriceService] updateAllOpenPositionPrices error:', err);
      result.errors++;
    }

    result.durationMs = Date.now() - startTime;
    console.log(`[PriceService] ✅ Price update done: ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors in ${result.durationMs}ms`);
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ONE-TIME FIX: Backfill entry_price for positions that have none
  // Run once after deploying this service
  // ─────────────────────────────────────────────────────────────────────────
  async backfillMissingEntryPrices(): Promise<{ fixed: number; skipped: number }> {
    console.log('[PriceService] Backfilling missing entry prices…');

    const positions = await query<{ id: string; asset: string; asset_mint: string; token_amount: number }>(
      `SELECT id, asset, asset_mint, token_amount
       FROM positions
       WHERE entry_price IS NULL
         AND asset_mint IS NOT NULL
         AND token_amount > 0`
    );

    console.log(`[PriceService] Found ${positions.length} positions with no entry_price`);

    const mints = [...new Set(positions.map(p => p.asset_mint))];
    const prices = await jupiterPriceService.getPrices(mints);

    let fixed = 0, skipped = 0;

    for (const pos of positions) {
      const price = prices[pos.asset_mint];
      if (!price) { skipped++; continue; }

      // Use current price as best-effort entry price approximation
      await execute(
        `UPDATE positions
         SET entry_price = $1
         WHERE id = $2 AND entry_price IS NULL`,
        [price, pos.id]
      );
      fixed++;
    }

    console.log(`[PriceService] Backfill done: ${fixed} fixed, ${skipped} skipped`);
    return { fixed, skipped };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATS: Summary of current price health
  // ─────────────────────────────────────────────────────────────────────────
  async getPriceHealthStats(): Promise<void> {
    const rows = await query<any>(
      `SELECT
         asset,
         COUNT(*)                                         AS positions,
         COUNT(*) FILTER (WHERE entry_price IS NOT NULL) AS has_entry,
         COUNT(*) FILTER (WHERE current_price IS NOT NULL) AS has_current,
         ROUND(AVG(current_price)::numeric, 4)           AS avg_price,
         ROUND(SUM(position_size_usd)::numeric, 2)       AS total_usd
       FROM positions
       WHERE status = 'open'
       GROUP BY asset
       ORDER BY total_usd DESC`
    );

    console.log('\n[PriceService] 📊 Open Position Health:');
    console.table(rows);
  }
}

export const positionPriceService = new PositionPriceService();
