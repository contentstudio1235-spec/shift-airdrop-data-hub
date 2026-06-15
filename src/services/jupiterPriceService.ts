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

// RWA Fallback Prices — used when Jupiter API cannot price proprietary SHIFT tokens.
// These are snapshot prices; update via POST /api/admin/rwa-prices or redeploy when stale.
// Last updated: 2026-06-15
const RWA_FALLBACK_PRICES: Record<string, number> = {
  '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT': 22.07,  // TSL2L  — needs update
  'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT': 50.03,  // TSL1S  — needs update
  'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT': 216.39, // SOX3L  — needs update
  '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT': 10.26,  // SOX3S  — needs update
  '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT': 420.18, // SPX3L  — needs update
  '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT': 25.29,  // SPX3S  — updated 2026-06-15
};

// Runtime override — updated via POST /api/admin/rwa-prices without a redeploy.
// Keys are mint addresses; values override RWA_FALLBACK_PRICES until server restarts.
export const rwaRuntimePrices: Record<string, number> = {};

interface CachedPrice {
  price: number;
  cachedAt: Date;
}

export class JupiterPriceService {
  private baseUrl: string;
  private priceCache: Map<string, CachedPrice> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = config.jupiterPriceApi;
  }

  /**
   * Check if a cached price is still valid
   */
  private isCacheValid(cachedAt: Date): boolean {
    return Date.now() - cachedAt.getTime() < this.CACHE_TTL_MS;
  }

  /**
   * Clear expired cache entries periodically
   */
  private pruneCache(): void {
    const now = new Date();
    for (const [mint, cached] of this.priceCache.entries()) {
      if (!this.isCacheValid(cached.cachedAt)) {
        this.priceCache.delete(mint);
      }
    }
  }

  /**
   * Get USD price for a token mint (with caching and RWA fallback).
   * Returns null if price unavailable.
   */
  async getPrice(mint: string): Promise<number | null> {
    // 1. Check cache first
    const cached = this.priceCache.get(mint);
    if (cached && this.isCacheValid(cached.cachedAt)) {
      return cached.price;
    }

    // 2. Try Jupiter API
    try {
      const response = await axios.get<JupiterPriceResponse>(this.baseUrl, {
        params: { ids: mint },
        timeout: 5000,
      });

      const priceData = response.data?.data?.[mint];
      if (priceData?.price) {
        const price = parseFloat(priceData.price);
        // Cache the result
        this.priceCache.set(mint, { price, cachedAt: new Date() });
        return price;
      }
    } catch (error) {
      console.warn(`[JupiterPrice] API error for ${mint.slice(0, 12)}...:`, (error as any).message);
    }

    // 3. Try runtime override first, then hardcoded RWA fallback
    const runtimePrice = rwaRuntimePrices[mint];
    const fallbackPrice = runtimePrice ?? RWA_FALLBACK_PRICES[mint];
    if (fallbackPrice) {
      this.priceCache.set(mint, { price: fallbackPrice, cachedAt: new Date() });
      console.log(`[JupiterPrice] Using ${runtimePrice ? 'runtime' : 'fallback'} price: ${TOKEN_SYMBOLS[mint]} = $${fallbackPrice}`);
      return fallbackPrice;
    }

    // 4. SHIFT_TEST token fallback
    if (mint === config.shiftTokenMint) {
      const price = 0.5;
      this.priceCache.set(mint, { price, cachedAt: new Date() });
      return price;
    }

    return null;
  }

  /**
   * Get USD prices for multiple mints (with caching and batch optimization).
   * Reduces API calls by checking cache first.
   */
  async getPrices(mints: string[]): Promise<Record<string, number>> {
    if (mints.length === 0) return {};

    // Prune expired entries periodically
    this.pruneCache();

    const prices: Record<string, number> = {};
    const toFetch: string[] = [];

    // 1. Collect cached prices and identify what needs fetching
    for (const mint of mints) {
      const cached = this.priceCache.get(mint);
      if (cached && this.isCacheValid(cached.cachedAt)) {
        prices[mint] = cached.price;
      } else {
        toFetch.push(mint);
      }
    }

    // 2. If nothing to fetch, return cached results
    if (toFetch.length === 0) {
      return prices;
    }

    // 3. Batch fetch missing prices from Jupiter
    if (toFetch.length > 0) {
      try {
        const response = await axios.get<JupiterPriceResponse>(this.baseUrl, {
          params: { ids: toFetch.join(',') },
          timeout: 10000,
        });

        for (const [mint, data] of Object.entries(response.data?.data || {})) {
          if (data?.price) {
            const price = parseFloat(data.price);
            prices[mint] = price;
            this.priceCache.set(mint, { price, cachedAt: new Date() });
          }
        }
      } catch (error) {
        console.warn('[JupiterPrice] Batch fetch failed:', (error as any).message);
      }
    }

    // 4. Apply runtime override or hardcoded RWA fallback for anything still missing
    for (const mint of toFetch) {
      if (!prices[mint]) {
        const runtimePrice = rwaRuntimePrices[mint];
        const fallbackPrice = runtimePrice ?? RWA_FALLBACK_PRICES[mint];
        if (fallbackPrice) {
          prices[mint] = fallbackPrice;
          this.priceCache.set(mint, { price: fallbackPrice, cachedAt: new Date() });
        } else if (mint === config.shiftTokenMint) {
          prices[mint] = 0.5;
          this.priceCache.set(mint, { price: 0.5, cachedAt: new Date() });
        }
      }
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
