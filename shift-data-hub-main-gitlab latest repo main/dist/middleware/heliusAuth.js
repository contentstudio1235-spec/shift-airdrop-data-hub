"use strict";
// ============================================================
// Helius Webhook Auth Middleware — HMAC signature verification
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHeliusSignature = verifyHeliusSignature;
const heliusWebhookHandler_1 = require("../services/heliusWebhookHandler");
/**
 * Middleware to verify Helius webhook signature.
 * Skips verification if HELIUS_WEBHOOK_SECRET is not set (dev mode).
 */
function verifyHeliusSignature(req, res, next) {
    const signature = req.headers['x-helius-signature'];
    if (!signature) {
        // In development, allow unsigned webhooks
        if (process.env.NODE_ENV === 'development') {
            next();
            return;
        }
        res.status(401).json({ error: 'Missing webhook signature' });
        return;
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
        res.status(400).json({ error: 'Missing raw body for verification' });
        return;
    }
    const isValid = heliusWebhookHandler_1.HeliusWebhookHandler.verifySignature(rawBody, signature);
    if (!isValid) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
    }
    next();
}
//# sourceMappingURL=heliusAuth.js.map