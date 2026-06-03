"use strict";
// ============================================================
// Helius Webhook Handler — Parse Jupiter swaps from Solana
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.heliusWebhookHandler = exports.HeliusWebhookHandler = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const positionService_1 = require("./positionService");
const jupiterPriceService_1 = require("./jupiterPriceService");
const antiFarmService_1 = require("./antiFarmService");
const streamService_1 = require("./streamService");
const funnelService_1 = require("./funnelService");
const identityService_1 = require("./identityService");
// Jupiter Program ID
const JUPITER_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
// Stablecoin mints (positions denominated against these)
const STABLECOIN_MINTS = new Set([
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);
class HeliusWebhookHandler {
    /**
     * Main webhook handler — receives Helius enhanced transaction data.
     */
    async handleWebhook(req, res) {
        try {
            const payload = req.body;
            if (!Array.isArray(payload)) {
                res.status(400).json({ error: 'Expected array payload' });
                return;
            }
            // Process each transaction
            for (const tx of payload) {
                await this.processTransaction(tx);
            }
            res.status(200).json({ status: 'ok', processed: payload.length });
        }
        catch (error) {
            console.error('[Helius] Webhook processing error:', error);
            res.status(500).json({ error: 'Internal processing error' });
        }
    }
    /**
     * Process a single enhanced transaction from Helius.
     */
    async processTransaction(tx) {
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
    async processSwapEvent(tx, swap) {
        if (!swap)
            return;
        const wallet = tx.feePayer;
        const timestamp = new Date(tx.timestamp * 1000);
        const signature = tx.signature;
        // Determine what was bought and what was sold
        const tokenInputs = swap.tokenInputs || [];
        const tokenOutputs = swap.tokenOutputs || [];
        // Find the non-stablecoin token (the "asset" being traded)
        let assetMint = null;
        let assetAmount = 0;
        let direction = 'buy';
        // USD value derived from stablecoin side of the swap (more reliable than pricing RWA tokens)
        let stablecoinUsdValue = null;
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
                const solPrice = await jupiterPriceService_1.jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
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
        const assetSymbol = jupiterPriceService_1.jupiterPriceService.getSymbol(assetMint);
        if (direction === 'buy') {
            const nativeInput = swap.nativeInput ? parseFloat(swap.nativeInput.amount) / 1e9 : undefined;
            await this.handleBuy(wallet, assetSymbol, assetMint, assetAmount, signature, timestamp, stablecoinUsdValue ?? undefined, nativeInput);
        }
        else {
            await this.handleSell(wallet, assetSymbol, signature, timestamp);
        }
    }
    /**
     * Fallback: extract position data from raw token transfers when no swap event.
     */
    async processFromTokenTransfers(tx) {
        if (!tx.tokenTransfers || tx.tokenTransfers.length === 0)
            return;
        const wallet = tx.feePayer;
        const timestamp = new Date(tx.timestamp * 1000);
        // Find non-stablecoin tokens received (buy) or sent (sell)
        for (const transfer of tx.tokenTransfers) {
            if (STABLECOIN_MINTS.has(transfer.mint))
                continue;
            const assetSymbol = jupiterPriceService_1.jupiterPriceService.getSymbol(transfer.mint);
            if (transfer.toUserAccount === wallet) {
                // User received tokens = buy
                // Try to find SOL input amount from native transfers
                let nativeInputAmount;
                if (tx.nativeTransfers) {
                    for (const nt of tx.nativeTransfers) {
                        if (nt.fromUserAccount === wallet && nt.toUserAccount !== wallet) {
                            nativeInputAmount = nt.amount / 1e9;
                            break;
                        }
                    }
                }
                await this.handleBuy(wallet, assetSymbol, transfer.mint, transfer.tokenAmount, tx.signature, timestamp, undefined, nativeInputAmount);
            }
            else if (transfer.fromUserAccount === wallet) {
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
    async handleBuy(wallet, asset, assetMint, tokenAmount, txSignature, timestamp, precomputedUsdValue, nativeInputAmount) {
        // Prefer the stablecoin input amount — Jupiter cannot price most RWA tokens
        let positionSizeUSD = precomputedUsdValue ?? 0;
        let priceAtOpen = null;
        if (!positionSizeUSD) {
            // Fallback: try Jupiter pricing (works for SOL, SOL-paired tokens)
            const priceData = await jupiterPriceService_1.jupiterPriceService.calculateUSDValue(assetMint, tokenAmount);
            positionSizeUSD = priceData?.usdValue || 0;
            priceAtOpen = priceData?.price || null;
            // If Jupiter pricing fails and we have SOL input amount, use that as fallback
            if (!positionSizeUSD && nativeInputAmount && nativeInputAmount > 0) {
                const solPrice = await jupiterPriceService_1.jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
                positionSizeUSD = nativeInputAmount * (solPrice ?? 0);
            }
        }
        else {
            priceAtOpen = tokenAmount > 0 ? positionSizeUSD / tokenAmount : null;
        }
        // Anti-farm check
        const farmCheck = await antiFarmService_1.antiFarmService.shouldFilter(wallet, asset, positionSizeUSD, timestamp);
        if (farmCheck.filtered) {
            console.log(`[Helius] Position filtered: ${wallet.slice(0, 8)}... | ${asset} | Reason: ${farmCheck.reason}`);
            return;
        }
        // Open position
        const opened = await positionService_1.positionService.openPosition(wallet, asset, assetMint, positionSizeUSD, tokenAmount, priceAtOpen, txSignature, timestamp);
        // Publish to whale SSE stream (threshold enforced inside publishWhaleEvent)
        if (opened) {
            (0, streamService_1.publishWhaleEvent)({
                type: 'trade',
                wallet,
                asset,
                sizeUSD: positionSizeUSD,
                side: 'long',
                timestamp: timestamp.toISOString(),
            });
            // Invalidate funnels affected by trade activity; retention uses NOW() math so skip it
            (0, funnelService_1.invalidateFunnelCache)('whale_pipeline');
            (0, funnelService_1.invalidateFunnelCache)('conversion');
            (0, funnelService_1.invalidateFunnelCache)('activation');
        }
        // Identity wiring — non-fatal
        try {
            const profile = await (0, identityService_1.findOrCreateProfile)({ type: 'wallet', value: wallet }, 'system');
            await (0, identityService_1.recordEvent)({
                event_name: 'position_open',
                event_id: txSignature,
                profile_id: profile.profileId,
                wallet,
                asset,
                value_usd: positionSizeUSD,
                occurred_at: timestamp.toISOString(),
                payload: { side: 'long' },
            });
        }
        catch (err) {
            console.error('[helius/handleBuy] identity wiring failed', err);
        }
    }
    /**
     * Handle a sell (close position).
     */
    async handleSell(wallet, asset, txSignature, timestamp) {
        const closed = await positionService_1.positionService.closePosition(wallet, asset, txSignature, timestamp);
        // Publish to whale SSE stream (threshold enforced inside publishWhaleEvent)
        if (closed) {
            (0, streamService_1.publishWhaleEvent)({
                type: 'trade',
                wallet,
                asset,
                sizeUSD: Number(closed.position_size_usd),
                side: 'short',
                timestamp: timestamp.toISOString(),
            });
            // Invalidate funnels affected by trade activity; retention uses NOW() math so skip it
            (0, funnelService_1.invalidateFunnelCache)('whale_pipeline');
            (0, funnelService_1.invalidateFunnelCache)('conversion');
            (0, funnelService_1.invalidateFunnelCache)('activation');
        }
        // Identity wiring — non-fatal
        try {
            const profile = await (0, identityService_1.findOrCreateProfile)({ type: 'wallet', value: wallet }, 'system');
            await (0, identityService_1.recordEvent)({
                event_name: 'position_close',
                event_id: txSignature,
                profile_id: profile.profileId,
                wallet,
                asset,
                value_usd: closed?.position_size_usd != null ? Number(closed.position_size_usd) : undefined,
                occurred_at: timestamp.toISOString(),
                payload: { side: 'short' },
            });
        }
        catch (err) {
            console.error('[helius/handleSell] identity wiring failed', err);
        }
    }
    /**
     * Verify Helius webhook signature (HMAC-SHA256).
     */
    static verifySignature(body, signature) {
        if (!config_1.config.heliusWebhookSecret)
            return true; // Skip if not configured
        const expected = crypto_1.default
            .createHmac('sha256', config_1.config.heliusWebhookSecret)
            .update(body)
            .digest('base64');
        const sigBuf = Buffer.from(signature ?? '', 'utf-8');
        const expectedBuf = Buffer.from(expected, 'utf-8');
        if (sigBuf.length !== expectedBuf.length)
            return false;
        return crypto_1.default.timingSafeEqual(sigBuf, expectedBuf);
    }
}
exports.HeliusWebhookHandler = HeliusWebhookHandler;
exports.heliusWebhookHandler = new HeliusWebhookHandler();
//# sourceMappingURL=heliusWebhookHandler.js.map