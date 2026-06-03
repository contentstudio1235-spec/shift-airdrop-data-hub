// ============================================================
// Helius Webhook Handler — Parse Jupiter swaps from Solana
// ============================================================

import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { HeliusWebhookPayload } from '../types';
import { positionService } from './positionService';
import { jupiterPriceService } from './jupiterPriceService';
import { antiFarmService } from './antiFarmService';
import { publishWhaleEvent } from './streamService';
import { invalidateFunnelCache } from './funnelService';

// Jupiter Program ID
const JUPITER_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

// Stablecoin mints (positions denominated against these)
const STABLECOIN_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

export class HeliusWebhookHandler {
  /**
   * Main webhook handler — receives Helius enhanced transaction data.
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as HeliusWebhookPayload[];

      if (!Array.isArray(payload)) {
        res.status(400).json({ error: 'Expected array payload' });
        return;
      }

      // Process each transaction
      for (const tx of payload) {
        await this.processTransaction(tx);
      }

      res.status(200).json({ status: 'ok', processed: payload.length });
    } catch (error) {
      console.error('[Helius] Webhook processing error:', error);
      res.status(500).json({ error: 'Internal processing error' });
    }
  }

  /**
   * Process a single enhanced transaction from Helius.
   */
  private async processTransaction(tx: HeliusWebhookPayload): Promise<void> {
    // Only process Jupiter swaps
    if (tx.source !== 'JUPITER' && tx.type !== 'SWAP') {
      return;
    }

    const swapEvent = tx.events?.swap;
    if (!swapEvent) {
      // Try to extract from token transfers as fallback
      await this.processFromTokenTransfers(tx);
      return;
    }

    await this.processSwapEvent(tx, swapEvent);
  }

  /**
   * Process a structured swap event from Helius enhanced data.
   */
  private async processSwapEvent(tx: HeliusWebhookPayload, swap: NonNullable<HeliusWebhookPayload['events']>['swap']): Promise<void> {
    if (!swap) return;

    const wallet = tx.feePayer;
    const timestamp = new Date(tx.timestamp * 1000);
    const signature = tx.signature;

    // Determine what was bought and what was sold
    const tokenInputs = swap.tokenInputs || [];
    const tokenOutputs = swap.tokenOutputs || [];

    // Find the non-stablecoin token (the "asset" being traded)
    let assetMint: string | null = null;
    let assetAmount = 0;
    let direction: 'buy' | 'sell' = 'buy';
    // USD value derived from stablecoin side of the swap (more reliable than pricing RWA tokens)
    let stablecoinUsdValue: number | null = null;

    // Check outputs first (what user received = buy)
    for (const output of tokenOutputs) {
      if (!STABLECOIN_MINTS.has(output.mint)) {
        assetMint = output.mint;
        assetAmount = parseFloat(output.rawTokenAmount.tokenAmount) / Math.pow(10, output.rawTokenAmount.decimals);
        direction = 'buy';
        break;
      }
    }

    // On a buy, extract the stablecoin INPUT amount as the USD position size
    // This is far more reliable than trying to price the RWA token via Jupiter
    const assetSymbol = assetMint ? jupiterPriceService.getSymbol(assetMint) : 'UNKNOWN';
    if (direction === 'buy' && assetMint) {
      console.log(`[Helius] Buy detected - asset: ${assetSymbol} | looking for stablecoin inputs...`);
      for (const input of tokenInputs) {
        if (STABLECOIN_MINTS.has(input.mint)) {
          const decimals = input.rawTokenAmount?.decimals ?? 6;
          stablecoinUsdValue = parseFloat(input.rawTokenAmount.tokenAmount) / Math.pow(10, decimals);
          console.log(`[Helius] Found stablecoin input: $${stablecoinUsdValue.toFixed(2)} (${input.mint.slice(0, 10)}...)`);
          break;
        }
      }
      // Fallback: SOL native input → fetch SOL price
      if (stablecoinUsdValue === null && swap.nativeInput) {
        const solAmount = parseFloat(swap.nativeInput.amount) / 1e9;
        const solPrice = await jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
        stablecoinUsdValue = solAmount * (solPrice ?? 0);
        console.log(`[Helius] Using SOL price fallback: ${solAmount} SOL @ $${solPrice} = $${stablecoinUsdValue.toFixed(2)}`);
      }
      if (stablecoinUsdValue === null) {
        console.log(`[Helius] ⚠️ No stablecoin or SOL input found for ${assetSymbol} - will fall back to Jupiter pricing`);
      }
    }

    // If no non-stable output, check inputs (what user sent = sell)
    if (!assetMint) {
      for (const input of tokenInputs) {
        if (!STABLECOIN_MINTS.has(input.mint)) {
          assetMint = input.mint;
          assetAmount = parseFloat(input.rawTokenAmount.tokenAmount) / Math.pow(10, input.rawTokenAmount.decimals);
          direction = 'sell';
          break;
        }
      }
    }

    // SOL native swaps
    if (!assetMint && swap.nativeOutput) {
      assetMint = 'So11111111111111111111111111111111111111112';
      assetAmount = parseFloat(swap.nativeOutput.amount) / 1e9;
      direction = 'buy';
    }
    if (!assetMint && swap.nativeInput) {
      assetMint = 'So11111111111111111111111111111111111111112';
      assetAmount = parseFloat(swap.nativeInput.amount) / 1e9;
      direction = 'sell';
    }

    if (!assetMint) {
      console.log(`[Helius] Could not determine asset for tx: ${signature.slice(0, 16)}...`);
      return;
    }

    if (direction === 'buy') {
      const nativeInput = swap.nativeInput ? parseFloat(swap.nativeInput.amount) / 1e9 : undefined;
      await this.handleBuy(wallet, assetSymbol, assetMint, assetAmount, signature, timestamp, stablecoinUsdValue ?? undefined, nativeInput);
    } else {
      await this.handleSell(wallet, assetSymbol, signature, timestamp);
    }
  }

  /**
   * Fallback: extract position data from raw token transfers when no swap event.
   * CRITICAL: Check for stablecoin inputs to set positionSizeUSD correctly
   */
  private async processFromTokenTransfers(tx: HeliusWebhookPayload): Promise<void> {
    if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) return;

    const wallet = tx.feePayer;
    const timestamp = new Date(tx.timestamp * 1000);
    const signature = tx.signature;

    // Find non-stablecoin tokens received (buy) or sent (sell)
    for (const transfer of tx.tokenTransfers) {
      if (STABLECOIN_MINTS.has(transfer.mint)) continue;

      const assetSymbol = jupiterPriceService.getSymbol(transfer.mint);

      if (transfer.toUserAccount === wallet) {
        // User received tokens = buy
        let stablecoinUsdValue: number | undefined = undefined;
        let nativeInputAmount: number | undefined = undefined;

        // CRITICAL: Look for USDC/USDT input in the same transaction
        if (tx.tokenTransfers) {
          for (const tf of tx.tokenTransfers) {
            if (STABLECOIN_MINTS.has(tf.mint) && tf.fromUserAccount === wallet) {
              // Found stablecoin input from this wallet
              const decimals = tf.decimals ?? 6;
              stablecoinUsdValue = tf.tokenAmount / Math.pow(10, decimals);
              console.log(`[Helius] Detected stablecoin input: $${stablecoinUsdValue.toFixed(2)} (${tf.mint.slice(0, 10)}...)`);
              break;
            }
          }
        }

        // Fallback: Try to find SOL input amount from native transfers
        if (!stablecoinUsdValue && tx.nativeTransfers) {
          for (const nt of tx.nativeTransfers) {
            if (nt.fromUserAccount === wallet && nt.toUserAccount !== wallet) {
              nativeInputAmount = nt.amount / 1e9;
              break;
            }
          }
        }

        console.log(`[Helius] Buy detected: ${wallet.slice(0, 8)}... | ${assetSymbol} | USDC: $${stablecoinUsdValue?.toFixed(2) ?? 'N/A'} | TX: ${signature.slice(0, 16)}...`);
        await this.handleBuy(wallet, assetSymbol, transfer.mint, transfer.tokenAmount, signature, timestamp, stablecoinUsdValue, nativeInputAmount);
      } else if (transfer.fromUserAccount === wallet) {
        // User sent tokens = sell
        console.log(`[Helius] Sell detected: ${wallet.slice(0, 8)}... | ${assetSymbol} | TX: ${signature.slice(0, 16)}...`);
        await this.handleSell(wallet, assetSymbol, signature, timestamp);
      }
    }
  }

  /**
   * Handle a buy (open position).
   * precomputedUsdValue: stablecoin amount paid (preferred over Jupiter pricing for RWA tokens)
   * nativeInputAmount: SOL amount spent (fallback for tokens without Jup pricing)
   */
  private async handleBuy(
    wallet: string,
    asset: string,
    assetMint: string,
    tokenAmount: number,
    txSignature: string,
    timestamp: Date,
    precomputedUsdValue?: number,
    nativeInputAmount?: number
  ): Promise<void> {
    // Prefer the stablecoin input amount — Jupiter cannot price most RWA tokens
    let positionSizeUSD = precomputedUsdValue ?? 0;
    let priceAtOpen: number | null = null;

    if (!positionSizeUSD) {
      console.log(`[Helius] No precomputed USD value - attempting Jupiter pricing for ${asset}...`);
      // Fallback: try Jupiter pricing (works for SOL, SOL-paired tokens)
      const priceData = await jupiterPriceService.calculateUSDValue(assetMint, tokenAmount);
      positionSizeUSD = priceData?.usdValue || 0;
      priceAtOpen = priceData?.price || null;

      if (priceData?.usdValue) {
        console.log(`[Helius] Jupiter pricing succeeded: $${positionSizeUSD.toFixed(2)}`);
      } else {
        console.log(`[Helius] ⚠️ Jupiter pricing failed for ${assetMint.slice(0, 10)}...`);
      }

      // If Jupiter pricing fails and we have SOL input amount, use that as fallback
      if (!positionSizeUSD && nativeInputAmount && nativeInputAmount > 0) {
        const solPrice = await jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
        positionSizeUSD = nativeInputAmount * (solPrice ?? 0);
        console.log(`[Helius] Using SOL fallback: ${nativeInputAmount} SOL @ $${solPrice} = $${positionSizeUSD.toFixed(2)}`);
      }
    } else {
      priceAtOpen = tokenAmount > 0 ? positionSizeUSD / tokenAmount : null;
    }

    // CRITICAL WARNING: Log if position size is still 0
    if (!positionSizeUSD || positionSizeUSD <= 0) {
      console.error(`[Helius] ⚠️ CRITICAL: Position size is $0 for ${wallet.slice(0, 8)}... | ${asset} | TX: ${txSignature.slice(0, 16)}... | precomputed: $${precomputedUsdValue ?? 'N/A'} | nativeInput: ${nativeInputAmount ?? 'N/A'} SOL`);
    }

    // Anti-farm check
    const farmCheck = await antiFarmService.shouldFilter(wallet, asset, positionSizeUSD, timestamp);
    if (farmCheck.filtered) {
      console.log(`[Helius] Position filtered: ${wallet.slice(0, 8)}... | ${asset} | Reason: ${farmCheck.reason}`);
      return;
    }

    // Open position
    const opened = await positionService.openPosition(
      wallet, asset, assetMint, positionSizeUSD,
      tokenAmount, priceAtOpen, txSignature, timestamp
    );

    // Publish to whale SSE stream (threshold enforced inside publishWhaleEvent)
    if (opened) {
      publishWhaleEvent({
        type: 'trade',
        wallet,
        asset,
        sizeUSD: positionSizeUSD,
        side: 'long',
        timestamp: timestamp.toISOString(),
      });
      // Invalidate funnels affected by trade activity; retention uses NOW() math so skip it
      invalidateFunnelCache('whale_pipeline');
      invalidateFunnelCache('conversion');
      invalidateFunnelCache('activation');
    }
  }

  /**
   * Handle a sell (close position).
   */
  private async handleSell(
    wallet: string,
    asset: string,
    txSignature: string,
    timestamp: Date
  ): Promise<void> {
    const closed = await positionService.closePosition(wallet, asset, txSignature, timestamp);

    // Publish to whale SSE stream (threshold enforced inside publishWhaleEvent)
    if (closed) {
      publishWhaleEvent({
        type: 'trade',
        wallet,
        asset,
        sizeUSD: Number(closed.position_size_usd),
        side: 'short',
        timestamp: timestamp.toISOString(),
      });
      // Invalidate funnels affected by trade activity; retention uses NOW() math so skip it
      invalidateFunnelCache('whale_pipeline');
      invalidateFunnelCache('conversion');
      invalidateFunnelCache('activation');
    }
  }

  /**
   * Verify Helius webhook signature (HMAC-SHA256).
   */
  static verifySignature(body: string, signature: string): boolean {
    if (!config.heliusWebhookSecret) return true; // Skip if not configured

    const expected = crypto
      .createHmac('sha256', config.heliusWebhookSecret)
      .update(body)
      .digest('base64');

    const sigBuf = Buffer.from(signature ?? '', 'utf-8');
    const expectedBuf = Buffer.from(expected, 'utf-8');
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  }
}

export const heliusWebhookHandler = new HeliusWebhookHandler();
