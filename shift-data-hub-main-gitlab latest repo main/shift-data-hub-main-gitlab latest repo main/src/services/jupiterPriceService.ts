// ============================================================
// Jupiter Price Service — Snapshot USD prices at position open
// ============================================================

import axios from 'axios';
import { config } from '../config';
import { JupiterPriceResponse } from '../types';

// Well-known Solana token mints
const TOKEN_SYMBOLS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'jitoSOL',
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': 'RNDR',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
  '5dVc9YuDZ3wRbohosa8bwXoj1v6zMvipwr38LFEA7MLJ': 'SHIFT_TEST',
  // ── SHIFT RWA Tokens ──────────────────────────────────────────────────────
  '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT': 'TSL2L',
  'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT': 'TSL1S',
  'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT': 'SOX3L',
  '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT': 'SOX3S',
  '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT': 'SPX3L',
  '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT': 'SPX3S',
};

export class JupiterPriceService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.jupiterPriceApi;
  }

  /**
   * Get USD price for a token mint.
   * Returns null if price unavailable.
   */
  async getPrice(mint: string): Promise<number | null> {
    try {
      const response = await axios.get<JupiterPriceResponse>(this.baseUrl, {
        params: { ids: mint },
        timeout: 5000,
      });

      const priceData = response.data?.data?.[mint];
      if (priceData?.price) {
        return parseFloat(priceData.price);
      }

      // NOMINAL PRICE for SHIFT_TEST token if not found on Jupiter
      if (mint === config.shiftTokenMint) {
        return 0.5; // $0.50 for testing
      }

      return null;
    } catch (error) {
      console.error(`[JupiterPrice] Failed to fetch price for ${mint}:`, error);
      
      // Fallback for SHIFT_TEST token even on network error
      if (mint === config.shiftTokenMint) {
        return 0.5;
      }

      return null;
    }
  }

  /**
   * Get USD prices for multiple mints in a single call.
   */
  async getPrices(mints: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    if (mints.length === 0) return prices;

    try {
      const response = await axios.get<JupiterPriceResponse>(this.baseUrl, {
        params: { ids: mints.join(',') },
        timeout: 10000,
      });

      for (const [mint, data] of Object.entries(response.data?.data || {})) {
        if (data?.price) {
          prices[mint] = parseFloat(data.price);
        }
      }
    } catch (error) {
      console.error('[JupiterPrice] Batch price fetch failed:', error);
    }

    return prices;
  }

  /**
   * Calculate USD value of a token position.
   */
  async calculateUSDValue(mint: string, tokenAmount: number): Promise<{ usdValue: number; price: number } | null> {
    const price = await this.getPrice(mint);
    if (price === null) return null;

    return {
      usdValue: tokenAmount * price,
      price,
    };
  }

  /**
   * Get human-readable symbol for a mint address.
   */
  getSymbol(mint: string): string {
    return TOKEN_SYMBOLS[mint] || mint.slice(0, 8) + '...';
  }
}

export const jupiterPriceService = new JupiterPriceService();
