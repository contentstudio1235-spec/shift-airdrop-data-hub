// ============================================================
// Holding Service — Check wallet balances via Solana RPC
// ============================================================

import axios from 'axios';
import { config } from '../config';

export class HoldingService {
  private rpcUrl: string;

  constructor() {
    // We can use Helius RPC URL if available, otherwise a public one
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;
  }

  /**
   * Get balance of a specific token for a wallet.
   * Returns human-readable amount (adjusted for decimals).
   */
  async getTokenBalance(wallet: string, mint: string): Promise<number> {
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
      if (accounts.length === 0) return 0;

      // Sum up balances if they have multiple accounts for some reason
      let total = 0;
      for (const account of accounts) {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        total += amount || 0;
      }

      return total;
    } catch (error) {
      console.error(`[HoldingService] Failed to fetch balance for ${wallet} / ${mint}:`, error);
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
}

export const holdingService = new HoldingService();
