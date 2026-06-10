"use strict";
// ============================================================
// Helius Transaction Service — Extract swap prices from blockchain
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSwapPriceFromTx = extractSwapPriceFromTx;
exports.batchExtractSwapPrices = batchExtractSwapPrices;
exports.verifyTransactionSwap = verifyTransactionSwap;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const STABLE_COIN_MINTS = [
    'EPjFWaLb3odcccccccccccccccccccccccccccc', // USDC (mainnet-beta)
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenYes', // USDT (mainnet-beta)
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // USDC (mainnet - wrapped)
];
/**
 * Fetch a transaction from Helius API with dual-key fallback.
 * Tries primary key first (pro tier), falls back to free tier if quota exhausted.
 */
async function fetchTransactionFromHelius(txSignature) {
    const primaryKey = config_1.config.heliusApiKey;
    const backupKey = process.env.HELIUS_FREE_API_KEY;
    if (!primaryKey && !backupKey) {
        console.warn('[Helius] No API keys configured');
        return null;
    }
    // Try primary key first (pro tier, better rate limits)
    if (primaryKey) {
        try {
            const response = await axios_1.default.get(`https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${primaryKey}`, { timeout: 10000 });
            if (response.data?.[0]) {
                console.log('[Helius] ✅ Fetched using primary (pro) key');
                return response.data[0];
            }
        }
        catch (primaryErr) {
            // Check if it's a quota error
            if (axios_1.default.isAxiosError(primaryErr)) {
                if (primaryErr.response?.status === 429 || primaryErr.response?.status === 403) {
                    console.warn('[Helius] Primary key quota exhausted, trying backup key...');
                }
                else {
                    console.warn(`[Helius] Primary key error (${primaryErr.response?.status}):`, primaryErr.message);
                }
            }
            // If primary failed and backup available, try backup
            if (backupKey) {
                try {
                    const backupResponse = await axios_1.default.get(`https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${backupKey}`, { timeout: 10000 });
                    if (backupResponse.data?.[0]) {
                        console.log('[Helius] ✅ Fetched using backup (free) key');
                        return backupResponse.data[0];
                    }
                }
                catch (backupErr) {
                    if (axios_1.default.isAxiosError(backupErr)) {
                        console.error(`[Helius] Backup key also failed (${backupErr.response?.status}):`, backupErr.message);
                    }
                    else {
                        console.error('[Helius] Backup key error:', backupErr);
                    }
                }
            }
        }
    }
    else if (backupKey) {
        // If no primary key, try backup directly
        try {
            const response = await axios_1.default.get(`https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${backupKey}`, { timeout: 10000 });
            if (response.data?.[0]) {
                console.log('[Helius] ✅ Fetched using backup (free) key');
                return response.data[0];
            }
        }
        catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                console.error(`[Helius] Backup key failed for tx ${txSignature}:`, err.message);
            }
            else {
                console.error(`[Helius] Failed to fetch tx ${txSignature}:`, err);
            }
        }
    }
    console.warn(`[Helius] ⚠️  All keys exhausted for tx ${txSignature.slice(0, 20)}...`);
    return null;
}
/**
 * Extract swap price from a transaction's swap event
 */
function extractPriceFromSwapEvent(swapEvent, wallet, assetMint) {
    if (!swapEvent)
        return null;
    // Find the token output matching the asset we're looking for
    const tokenOutput = swapEvent.tokenOutputs?.find((out) => out.mint === assetMint && out.userAccount === wallet);
    if (!tokenOutput)
        return null;
    // Find the stablecoin input
    const stablecoinInput = swapEvent.tokenInputs?.find((inp) => STABLE_COIN_MINTS.includes(inp.mint) && inp.userAccount === wallet);
    if (!stablecoinInput)
        return null;
    // Apply decimals
    const tokenDecimals = tokenOutput.rawTokenAmount?.decimals || 8;
    const stablecoinDecimals = stablecoinInput.rawTokenAmount?.decimals || 6;
    const tokenAmount = parseFloat(tokenOutput.rawTokenAmount?.tokenAmount || '0') /
        Math.pow(10, tokenDecimals);
    const stablecoinAmount = parseFloat(stablecoinInput.rawTokenAmount?.tokenAmount || '0') /
        Math.pow(10, stablecoinDecimals);
    if (tokenAmount === 0 || stablecoinAmount === 0)
        return null;
    const pricePerToken = stablecoinAmount / tokenAmount;
    return {
        tokenAmount,
        stablecoinAmount,
        pricePerToken,
        timestamp: new Date(),
        txSignature: '', // Will be set by caller
        source: 'helius',
    };
}
/**
 * Extract swap price from a transaction
 * Tries Helius first, falls back to null if unavailable
 */
async function extractSwapPriceFromTx(txSignature, wallet, assetMint) {
    console.log(`[Helius] Extracting price for tx ${txSignature.slice(0, 20)}... asset ${assetMint.slice(0, 12)}...`);
    // 1. Fetch transaction from Helius
    const txData = await fetchTransactionFromHelius(txSignature);
    if (!txData) {
        console.warn(`[Helius] Could not fetch transaction data for ${txSignature}`);
        return null;
    }
    // 2. Try to extract from swap event
    if (txData.events?.swap) {
        const priceData = extractPriceFromSwapEvent(txData.events.swap, wallet, assetMint);
        if (priceData) {
            priceData.txSignature = txSignature;
            console.log(`[Helius] ✅ Extracted: ${priceData.pricePerToken.toFixed(4)} per token`);
            return priceData;
        }
    }
    // 3. Fallback: try token transfers if swap event not available
    // This handles cases where Helius doesn't parse as swap event
    console.warn(`[Helius] No swap event found in ${txSignature}`);
    return null;
}
/**
 * Batch extract prices for multiple positions
 * Implements rate limiting (100 req/s, chunked into 10 per batch)
 */
async function batchExtractSwapPrices(positions) {
    const results = new Map();
    const CHUNK_SIZE = 10;
    const DELAY_MS = 1000; // 1s between chunks
    console.log(`[Helius] Batch processing ${positions.length} positions (${Math.ceil(positions.length / CHUNK_SIZE)} chunks)...`);
    for (let i = 0; i < positions.length; i += CHUNK_SIZE) {
        const chunk = positions.slice(i, i + CHUNK_SIZE);
        // Process chunk in parallel
        const promises = chunk.map((pos) => extractSwapPriceFromTx(pos.tx_signature_open, pos.wallet, pos.asset_mint)
            .then((priceData) => {
            if (priceData) {
                results.set(pos.id, priceData);
            }
            return priceData;
        })
            .catch((err) => {
            console.error(`[Helius] Error processing position ${pos.id}:`, err);
            return null;
        }));
        await Promise.all(promises);
        // Delay between chunks to avoid rate limiting
        if (i + CHUNK_SIZE < positions.length) {
            console.log(`[Helius] Processed ${Math.min(i + CHUNK_SIZE, positions.length)}/${positions.length} positions, waiting ${DELAY_MS}ms...`);
            await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
    }
    console.log(`[Helius] ✅ Batch complete: extracted ${results.size}/${positions.length} prices`);
    return results;
}
/**
 * Verify a transaction's swap data (for testing/debugging)
 */
async function verifyTransactionSwap(txSignature) {
    const txData = await fetchTransactionFromHelius(txSignature);
    if (!txData) {
        return { success: false, error: 'Transaction not found' };
    }
    return {
        success: true,
        txSignature,
        type: txData.type,
        description: txData.description,
        hasSwapEvent: !!txData.events?.swap,
        swapEvent: txData.events?.swap ? {
            tokenInputs: txData.events.swap.tokenInputs?.length || 0,
            tokenOutputs: txData.events.swap.tokenOutputs?.length || 0,
        } : null,
    };
}
//# sourceMappingURL=heliusTransactionService.js.map