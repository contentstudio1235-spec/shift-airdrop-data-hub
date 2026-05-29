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
    if (direction === 'buy' && assetMint) {
      for (const input of tokenInputs) {
        if (STABLECOIN_MINTS.has(input.mint)) {
          const decimals = input.rawTokenAmount?.decimals ?? 6;
          stablecoinUsdValue = parseFloat(input.rawTokenAmount.tokenAmount) / Math.pow(10, decimals);
          break;
        }
      }
      // Fallback: SOL native input → fetch SOL price
      if (stablecoinUsdValue === null && swap.nativeInput) {
        const solAmount = parseFloat(swap.nativeInput.amount) / 1e9;
        const solPrice = await jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
        stablecoinUsdValue = solAmount * (solPrice ?? 0);
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

    const assetSymbol = jupiterPriceService.getSymbol(assetMint);

    if (direction === 'buy') {
      const nativeInput = swap.nativeInput ? parseFloat(swap.nativeInput.amount) / 1e9 : undefined;
      await this.handleBuy(wallet, assetSymbol, assetMint, assetAmount, signature, timestamp, stablecoinUsdValue ?? undefined, nativeInput);
    } else {
      await this.handleSell(wallet, assetSymbol, signature, timestamp);
    }
  }

  /**
   * Fallback: extract position data from raw token transfers when no swap event.
   */
  private async processFromTokenTransfers(tx: HeliusWebhookPayload): Promise<void> {
    if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) return;

    const wallet = tx.feePayer;
    const timestamp = new Date(tx.timestamp * 1000);

    // Find non-stablecoin tokens received (buy) or sent (sell)
    for (const transfer of tx.tokenTransfers) {
      if (STABLECOIN_MINTS.has(transfer.mint)) continue;

      const assetSymbol = jupiterPriceService.getSymbol(transfer.mint);

      if (transfer.toUserAccount === wallet) {
        // User received tokens = buy
        // Try to find SOL input amount from native transfers
        let nativeInputAmount: number | undefined;
        if (tx.nativeTransfers) {
          for (const nt of tx.nativeTransfers) {
            if (nt.fromUserAccount === wallet && nt.toUserAccount !== wallet) {
              nativeInputAmount = nt.amount / 1e9;
              break;
            }
          }
        }
        await this.handleBuy(wallet, assetSymbol, transfer.mint, transfer.tokenAmount, tx.signature, timestamp, undefined, nativeInputAmount);
      } else if (transfer.fromUserAccount === wallet) {
        // User sent tokens = sell
        await this.handleSell(wallet, assetSymbol, tx.signature, timestamp);
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
      // Fallback: try Jupiter pricing (works for SOL, SOL-paired tokens)
      const priceData = await jupiterPriceService.calculateUSDValue(assetMint, tokenAmount);
      positionSizeUSD = priceData?.usdValue || 0;
      priceAtOpen = priceData?.price || null;

      // If Jupiter pricing fails and we have SOL input amount, use that as fallback
      if (!positionSizeUSD && nativeInputAmount && nativeInputAmount > 0) {
        const solPrice = await jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
        positionSizeUSD = nativeInputAmount * (solPrice ?? 0);
      }
    } else {
      priceAtOpen = tokenAmount > 0 ? positionSizeUSD / tokenAmount : null;
    }

    // Anti-farm check
    const farmCheck = await antiFarmService.shouldFilter(wallet, asset, positionSizeUSD, timestamp);
    if (farmCheck.filtered) {
      console.log(`[Helius] Position filtered: ${wallet.slice(0, 8)}... | ${asset} | Reason: ${farmCheck.reason}`);
      return;
    }

    // Open position
    await positionService.openPosition(
      wallet, asset, assetMint, positionSizeUSD,
      tokenAmount, priceAtOpen, txSignature, timestamp
    );
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
    await positionService.closePosition(wallet, asset, txSignature, timestamp);
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

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
}

export const heliusWebhookHandler = new HeliusWebhookHandler();
