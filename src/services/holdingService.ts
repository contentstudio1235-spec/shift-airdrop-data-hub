// ============================================================
// Holding Service — Check wallet balances via Solana RPC
// Cache: 10-minute in-memory TTL eliminates repeated Helius RPC calls
// from cron-driven badge checks (was the primary credit drain).
// ============================================================

import axios from 'axios';
import { config } from '../config';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  balance: number;
  expiresAt: number;
}

export class HoldingService {
  private rpcUrl: string;
  private cache = new Map<string, CacheEntry>();

  constructor() {
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;
  }

  private cacheKey(wallet: string, mint: string): string {
    return `${wallet}:${mint}`;
  }

  private getFromCache(wallet: string, mint: string): number | null {
    const entry = this.cache.get(this.cacheKey(wallet, mint));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(this.cacheKey(wallet, mint));
      return null;
    }
    return entry.balance;
  }

  private setCache(wallet: string, mint: string, balance: number): void {
    this.cache.set(this.cacheKey(wallet, mint), {
      balance,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  /** Invalidate cache for a wallet+mint — call after a known buy/sell. */
  invalidate(wallet: string, mint: string): void {
    this.cache.delete(this.cacheKey(wallet, mint));
  }

  /**
   * Get balance of a specific token for a wallet.
   * Returns cached value for 10 minutes before hitting Helius RPC again.
   */
  async getTokenBalance(wallet: string, mint: string): Promise<number> {
    const cached = this.getFromCache(wallet, mint);
    if (cached !== null) return cached;

    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 'get-token-balance',
        method: 'getTokenAccountsByOwner',
        params: [
          wallet,
          { mint },
          { encoding: 'jsonParsed' }
        ]
      });

      const accounts = response.data?.result?.value || [];
      let total = 0;
      for (const account of accounts) {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        total += amount || 0;
      }

      this.setCache(wallet, mint, total);
      return total;
    } catch (error) {
      console.error(`[HoldingService] Failed to fetch balance for ${wallet.slice(0, 8)} / ${mint.slice(0, 8)}:`, error);
      return 0;
    }
  }

  /**
   * Check if wallet holds at least a certain amount of a token.
   */
  async holdsMinimum(wallet: string, mint: string, minAmount: number): Promise<boolean> {
    const balance = await this.getTokenBalance(wallet, mint);
    return balance >= minAmount;
  }

  /** How many entries are currently cached (for diagnostics). */
  get cacheSize(): number {
    return this.cache.size;
  }
}

export const holdingService = new HoldingService();
