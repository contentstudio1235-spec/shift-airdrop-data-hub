"use strict";
// ============================================================
// Webhook Routes — Helius + SNAG incoming events
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const heliusWebhookHandler_1 = require("../services/heliusWebhookHandler");
const snagWebhookHandler_1 = require("../services/snagWebhookHandler");
const heliusAuth_1 = require("../middleware/heliusAuth");
const router = (0, express_1.Router)();
/**
 * POST /api/webhooks/helius
 * Receives enhanced transaction data from Helius webhooks.
 */
router.post('/helius', heliusAuth_1.verifyHeliusSignature, async (req, res) => {
    await heliusWebhookHandler_1.heliusWebhookHandler.handleWebhook(req, res);
});
/**
 * POST /api/webhooks/snag
 * Receives SNAG Stratus events (social task completions, etc.).
 * HMAC-SHA256 verified via x-signature header.
 */
router.post('/snag', async (req, res) => {
    await snagWebhookHandler_1.snagWebhookHandler.handleWebhook(req, res);
});
/**
 * GET /api/webhooks/health
 * Health check for webhook endpoints.
 */
router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'shift-webhook' });
});
exports.default = router;
//# sourceMappingURL=webhook.js.map