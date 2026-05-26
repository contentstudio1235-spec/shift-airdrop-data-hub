"use strict";
// ============================================================
// SNAG Webhook Handler — Inbound events from SNAG Stratus
// Handles social task completions (Follow X, Discord, etc.)
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.snagWebhookHandler = exports.SnagWebhookHandler = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const pool_1 = require("../db/pool");
class SnagWebhookHandler {
    /**
     * Verify SNAG Stratus webhook signature (HMAC-SHA256).
     * CRITICAL HARDENING: Strict verification in production.
     * If no secret is configured (dev mode), logs warning and returns true.
     */
    static verifySignature(rawBody, signature) {
        if (!config_1.config.snagWebhookSecret) {
            const isDev = config_1.config.nodeEnv !== 'production';
            const msg = '[SnagWebhook] No webhook secret configured — bypassing signature check';
            if (isDev) {
                console.warn(msg + ' (dev mode)');
            }
            else {
                console.error(msg + ' ❌ CRITICAL: This is insecure in production!');
            }
            return isDev; // Reject in production if secret is missing
        }
        // Validate signature format first (prevent malformed requests)
        if (!signature || typeof signature !== 'string') {
            console.warn('[SnagWebhook] Missing or invalid signature header');
            return false;
        }
        // Extract hex portion (format: "sha256=<hex>")
        const signatureHex = signature.replace(/^sha256=/, '');
        if (!signatureHex || signatureHex === signature) {
            // Invalid format or missing prefix
            console.warn('[SnagWebhook] Invalid signature format (expected "sha256=<hex>")');
            return false;
        }
        const expected = crypto_1.default
            .createHmac('sha256', config_1.config.snagWebhookSecret)
            .update(rawBody)
            .digest('hex');
        try {
            // Use timing-safe comparison to prevent timing attacks
            return crypto_1.default.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signatureHex, 'hex'));
        }
        catch (err) {
            console.warn('[SnagWebhook] Signature verification failed (buffer conversion error):', err);
            return false;
        }
    }
    async handleWebhook(req, res) {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signature = (req.headers['x-signature'] || req.headers['x-snag-signature'] || '');
        if (!SnagWebhookHandler.verifySignature(rawBody, signature)) {
            console.warn('[SnagWebhook] ❌ Invalid signature from SNAG');
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        // SNAG may batch events — handle arrays
        const events = Array.isArray(req.body) ? req.body : [req.body];
        for (const event of events) {
            try {
                await this.processEvent(event);
            }
            catch (err) {
                console.error('[SnagWebhook] Error processing event:', err, event);
            }
        }
        res.status(200).json({ received: true, count: events.length });
    }
    async processEvent(event) {
        const { type, event: eventType, data } = event;
        const effectiveType = type || eventType;
        if (effectiveType === 'rule.completed' || effectiveType === 'loyalty.rule.completed') {
            await this.handleRuleCompleted(data || event);
            return;
        }
        if (effectiveType === 'referral.created' || effectiveType === 'loyalty.referral.created') {
            await this.handleReferralCreated(data || event);
            return;
        }
        // Log unhandled events for debugging
        console.log(`[SnagWebhook] Unhandled event type: ${effectiveType}`);
    }
    async handleRuleCompleted(data) {
        const walletAddress = data?.walletAddress || data?.wallet_address || data?.user?.walletAddress;
        const ruleId = data?.ruleId || data?.rule_id || data?.rule?.id;
        if (!walletAddress || !ruleId) {
            console.warn('[SnagWebhook] Missing walletAddress or ruleId in rule.completed event');
            return;
        }
        // Map SNAG rule ID → our internal task ID
        const socialRules = config_1.config.snagSocialRuleIds;
        const ruleToTask = {};
        if (socialRules.follow_x)
            ruleToTask[socialRules.follow_x] = 'x_follow';
        if (socialRules.join_discord)
            ruleToTask[socialRules.join_discord] = 'discord';
        if (socialRules.join_telegram)
            ruleToTask[socialRules.join_telegram] = 'telegram';
        if (socialRules.connect_wallet)
            ruleToTask[socialRules.connect_wallet] = 'wallet';
        if (socialRules.first_trade)
            ruleToTask[socialRules.first_trade] = 'first_trade';
        const taskId = ruleToTask[ruleId];
        if (!taskId) {
            // Not a social task rule we track — could be a badge or other rule
            console.log(`[SnagWebhook] Rule ${ruleId} not mapped to a task, skipping`);
            return;
        }
        // Ensure user exists in our DB (they may have connected via SNAG before our webhook ran)
        await (0, pool_1.execute)(`INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`, [walletAddress]);
        // Record the task completion
        await (0, pool_1.execute)(`INSERT INTO snag_completed_tasks (wallet, task_id, completed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (wallet, task_id) DO NOTHING`, [walletAddress, taskId]);
        console.log(`[SnagWebhook] ✅ Task "${taskId}" completed for ${walletAddress.slice(0, 8)}...`);
    }
    async handleReferralCreated(data) {
        const referrerWallet = data?.referrerWalletAddress || data?.referrer_wallet_address;
        const referredWallet = data?.referredWalletAddress || data?.referred_wallet_address;
        const customCode = data?.customCode || data?.custom_code;
        if (!referrerWallet || !referredWallet) {
            console.warn('[SnagWebhook] Missing referrer or referred wallet in referral event');
            return;
        }
        try {
            // Ensure both users exist
            await (0, pool_1.execute)(`INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`, [referrerWallet]);
            await (0, pool_1.execute)(`INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`, [referredWallet]);
            // Record referral in DB
            await (0, pool_1.execute)(`INSERT INTO snag_referral_events (referrer_wallet, referred_wallet, referral_code_used, processed_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (referrer_wallet, referred_wallet) DO NOTHING`, [referrerWallet, referredWallet, customCode || 'default']);
            // Update main referrals table if it exists
            await (0, pool_1.execute)(`INSERT INTO referrals (referrer_wallet, referred_wallet, referral_code, snag_synced_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (referrer_wallet, referred_wallet) DO UPDATE SET snag_synced_at = NOW()`, [referrerWallet, referredWallet, customCode || 'default']).catch(() => {
                // Table may not have all columns, continue anyway
            });
            console.log(`[SnagWebhook] ✅ Referral: ${referrerWallet.slice(0, 8)}... → ${referredWallet.slice(0, 8)}... ` +
                `(code: ${customCode || 'default'})`);
        }
        catch (err) {
            console.error('[SnagWebhook] Error processing referral event:', err);
        }
    }
}
exports.SnagWebhookHandler = SnagWebhookHandler;
exports.snagWebhookHandler = new SnagWebhookHandler();
//# sourceMappingURL=snagWebhookHandler.js.map