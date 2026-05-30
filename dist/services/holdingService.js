"use strict";
// ============================================================
// Holding Service — Check wallet balances via Solana RPC
// Cache: 10-minute in-memory TTL eliminates repeated Helius RPC calls
// from cron-driven badge checks (was the primary credit drain).
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdingService = exports.HoldingService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
class HoldingService {
    rpcUrl;
    cache = new Map();
    constructor() {
        this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${config_1.config.heliusApiKey}`;
    }
    cacheKey(wallet, mint) {
        return `${wallet}:${mint}`;
    }
    getFromCache(wallet, mint) {
        const entry = this.cache.get(this.cacheKey(wallet, mint));
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(this.cacheKey(wallet, mint));
            return null;
        }
        return entry.balance;
    }
    setCache(wallet, mint, balance) {
        this.cache.set(this.cacheKey(wallet, mint), {
            balance,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
    }
    /** Invalidate cache for a wallet+mint — call after a known buy/sell. */
    invalidate(wallet, mint) {
        this.cache.delete(this.cacheKey(wallet, mint));
    }
    /**
     * Get balance of a specific token for a wallet.
     * Returns cached value for 10 minutes before hitting Helius RPC again.
     */
    async getTokenBalance(wallet, mint) {
        const cached = this.getFromCache(wallet, mint);
        if (cached !== null)
            return cached;
        try {
            const response = await axios_1.default.post(this.rpcUrl, {
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
        }
        catch (error) {
            console.error(`[HoldingService] Failed to fetch balance for ${wallet.slice(0, 8)} / ${mint.slice(0, 8)}:`, error);
            return 0;
        }
    }
    /**
     * Check if wallet holds at least a certain amount of a token.
     */
    async holdsMinimum(wallet, mint, minAmount) {
        const balance = await this.getTokenBalance(wallet, mint);
        return balance >= minAmount;
    }
    /** How many entries are currently cached (for diagnostics). */
    get cacheSize() {
        return this.cache.size;
    }
}
exports.HoldingService = HoldingService;
exports.holdingService = new HoldingService();
//# sourceMappingURL=holdingService.js.map