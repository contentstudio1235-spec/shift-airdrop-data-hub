// ============================================================
// Wallet Sync Service
// Called whenever a wallet connects to the frontend.
// 1. Ensures the user is registered in the DB
// 2. Fetches the last N enhanced transactions from Helius and
//    replays any SHIFT token swaps that aren't yet in positions
// 3. Cross-checks live on-chain balances — if a token is held
//    but no open position exists, creates one from current price
// ============================================================

import axios from 'axios';
import { config } from '../config';
import { positionService } from './positionService';
import { jupiterPriceService } from './jupiterPriceService';
import { holdingService } from './holdingService';
import { TRACKED_TOKENS, getTokenInfo } from '../config/tokens';
import { pool } from '../db/pool';

// Stablecoin mints (same set as the webhook handler)
const STABLECOIN_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'So11111111111111111111111111111111111111112',    // SOL (treat as stablecoin for pair detection)
]);

// Only care about these mints for position tracking
const SHIFT_MINTS = new Set(Object.values(TRACKED_TOKENS).map(t => t.mint));

export interface WalletSyncResult {
  wallet: string;
  registered: boolean;
  txsScanned: number;
  positionsCreated: number;
  positionsClosed: number;
  holdingsBackfilled: number;
  skipped: number;
  details: string[];
}

export class WalletSyncService {
  private heliusBase = `https://api.helius.xyz/v0`;

  /**
   * Full sync for a wallet:
   *   1. Register user (upsert)
   *   2. Replay transaction history for SHIFT token swaps
   *   3. Backfill any live holdings with no open position
   */
  async syncWallet(wallet: string): Promise<WalletSyncResult> {
    const result: WalletSyncResult = {
      wallet,
      registered: false,
      txsScanned: 0,
      positionsCreated: 0,
      positionsClosed: 0,
      holdingsBackfilled: 0,
      skipped: 0,
      details: [],
    };

    // 1. Register / upsert user
    await positionService.ensureUserExists(wallet);
    result.registered = true;

    // 2. Replay transaction history
    await this.replayTransactionHistory(wallet, result);

    // 3. Backfill live holdings not yet tracked
    await this.backfillLiveHoldings(wallet, result);

    console.log(
      `[WalletSync] ${wallet.slice(0, 8)}... | txs=${result.txsScanned} ` +
      `created=${result.positionsCreated} closed=${result.positionsClosed} ` +
      `backfilled=${result.holdingsBackfilled} skipped=${result.skipped}`
    );

    return result;
  }

  // ── Step 2: Replay tx history ──────────────────────────────────────────────

  private async replayTransactionHistory(wallet: string, result: WalletSyncResult): Promise<void> {
    if (!config.heliusApiKey) {
      result.details.push('Helius API key not configured — skipping tx history scan');
      return;
    }

    try {
      // Fetch up to 100 enhanced transactions of type SWAP
      const url = `${this.heliusBase}/addresses/${wallet}/transactions`;
      const response = await axios.get(url, {
        params: {
          'api-key': config.heliusApiKey,
          type: 'SWAP',
          limit: 100,
        },
        timeout: 15000,
      });

      const txs: any[] = response.data || [];
      result.txsScanned = txs.length;

      if (txs.length === 0) {
        result.details.push('No SWAP transactions found in history');
        return;
      }

      // Sort oldest → newest so positions open before they close
      txs.sort((a, b) => a.timestamp - b.timestamp);

      for (const tx of txs) {
        await this.processTx(wallet, tx, result);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || String(err);
      result.details.push(`Helius tx history error: ${msg}`);
      console.warn(`[WalletSync] Helius API error for ${wallet.slice(0, 8)}...: ${msg}`);
    }
  }

  private async processTx(wallet: string, tx: any, result: WalletSyncResult): Promise<void> {
    const signature: string = tx.signature;
    const timestamp = new Date((tx.timestamp || 0) * 1000);

    // Already processed?
    const already = await pool.query(
      'SELECT 1 FROM processed_transactions WHERE tx_signature = $1',
      [signature]
    );
    if (already.rows.length > 0) {
      result.skipped++;
      return;
    }

    // Find the SHIFT token in this swap
    const shiftToken = this.extractShiftToken(tx);
    if (!shiftToken) {
      result.skipped++;
      return;
    }

    const tokenInfo = getTokenInfo(shiftToken.mint);
    if (!tokenInfo) {
      result.skipped++;
      return;
    }

    if (shiftToken.direction === 'buy') {
      // Use stablecoin USD value extracted from the swap (reliable for RWA tokens)
      // Fall back to Jupiter pricing only if stablecoin amount is unavailable
      let usdValue = shiftToken.usdValue;
      let price: number | null = null;

      if (!usdValue) {
        const priceData = await jupiterPriceService.calculateUSDValue(shiftToken.mint, shiftToken.amount);
        usdValue = priceData?.usdValue ?? 0;
        price = priceData?.price ?? null;
      } else {
        price = shiftToken.amount > 0 ? usdValue / shiftToken.amount : null;
      }

      await positionService.openPosition(
        wallet, tokenInfo.symbol, shiftToken.mint,
        usdValue, shiftToken.amount, price, signature, timestamp
      );
      result.positionsCreated++;
      result.details.push(`Opened ${tokenInfo.symbol} | ${shiftToken.amount.toFixed(4)} tokens | $${usdValue.toFixed(2)} | tx ${signature.slice(0, 12)}…`);
    } else {
      // sell → close oldest open position
      const closed = await positionService.closePosition(wallet, tokenInfo.symbol, signature, timestamp);
      if (closed) {
        result.positionsClosed++;
        result.details.push(`Closed ${tokenInfo.symbol} | tx ${signature.slice(0, 12)}…`);
      } else {
        result.skipped++;
      }
    }
  }

  /**
   * Extract the SHIFT token being bought or sold from an enhanced tx,
   * plus the USD value derived from the stablecoin side of the swap.
   * Using stablecoin input is more reliable than pricing RWA tokens via Jupiter.
   */
  private extractShiftToken(tx: any): { mint: string; amount: number; direction: 'buy' | 'sell'; usdValue: number } | null {
    // ── Structured swap event ──
    const swap = tx.events?.swap;
    if (swap) {
      // Check outputs (user received SHIFT = buy)
      for (const out of swap.tokenOutputs || []) {
        if (SHIFT_MINTS.has(out.mint)) {
          const decimals = out.rawTokenAmount?.decimals ?? 0;
          const amount = parseFloat(out.rawTokenAmount?.tokenAmount || '0') / Math.pow(10, decimals);

          // Extract USD value from stablecoin inputs.
          // Jupiter multi-hop swaps may emit multiple inputs from the same stablecoin
          // mint (routing legs). Sum them ALL to get the true USD value paid.
          let usdValue = 0;
          for (const inp of swap.tokenInputs || []) {
            if (STABLECOIN_MINTS.has(inp.mint)) {
              const inDecimals = inp.rawTokenAmount?.decimals ?? 6;
              usdValue += parseFloat(inp.rawTokenAmount?.tokenAmount || '0') / Math.pow(10, inDecimals);
            }
          }
          // SOL native input fallback (approximate at $150 SOL if no price available)
          if (!usdValue && swap.nativeInput) {
            const solAmount = parseFloat(swap.nativeInput.amount || '0') / 1e9;
            usdValue = solAmount * 150; // rough fallback; will be corrected on next sync
          }

          return { mint: out.mint, amount, direction: 'buy', usdValue };
        }
      }
      // Check inputs (user sent SHIFT = sell)
      for (const inp of swap.tokenInputs || []) {
        if (SHIFT_MINTS.has(inp.mint)) {
          const decimals = inp.rawTokenAmount?.decimals ?? 0;
          const amount = parseFloat(inp.rawTokenAmount?.tokenAmount || '0') / Math.pow(10, decimals);
          return { mint: inp.mint, amount, direction: 'sell', usdValue: 0 };
        }
      }
    }

    // ── Fallback: token transfers ──
    const transfers: any[] = tx.tokenTransfers || [];
    for (const t of transfers) {
      if (!SHIFT_MINTS.has(t.mint)) continue;
      if (t.toUserAccount === tx.feePayer) {
        return { mint: t.mint, amount: t.tokenAmount || 0, direction: 'buy', usdValue: 0 };
      }
      if (t.fromUserAccount === tx.feePayer) {
        return { mint: t.mint, amount: t.tokenAmount || 0, direction: 'sell', usdValue: 0 };
      }
    }

    return null;
  }

  // ── Step 3: Backfill live holdings ────────────────────────────────────────

  private async backfillLiveHoldings(wallet: string, result: WalletSyncResult): Promise<void> {
    for (const token of Object.values(TRACKED_TOKENS)) {
      const balance = await holdingService.getTokenBalance(wallet, token.mint);
      if (balance <= 0) continue;

      // Is there already an open position?
      const existing = await pool.query(
        `SELECT id FROM positions WHERE wallet = $1 AND asset = $2 AND status = 'open' LIMIT 1`,
        [wallet, token.symbol]
      );
      if (existing.rows.length > 0) continue;

      // No open position → create one from live balance
      const priceData = await jupiterPriceService.calculateUSDValue(token.mint, balance);
      const usdValue = priceData?.usdValue ?? 0;
      const price = priceData?.price ?? null;

      const syntheticSig = `holdings_sync_${wallet.slice(0, 8)}_${token.symbol}_${Date.now()}`;
      await positionService.openPosition(
        wallet, token.symbol, token.mint,
        usdValue, balance, price, syntheticSig, new Date()
      );

      result.holdingsBackfilled++;
      result.details.push(
        `Holdings backfill: ${token.symbol} | ${balance.toFixed(4)} tokens | $${usdValue.toFixed(2)}`
      );
    }
  }
}

export const walletSyncService = new WalletSyncService();
