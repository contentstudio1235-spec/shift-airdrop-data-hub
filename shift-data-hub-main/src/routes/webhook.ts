// ============================================================
// Webhook Routes — Helius + SNAG incoming events
// ============================================================

import { Router } from 'express';
import { heliusWebhookHandler } from '../services/heliusWebhookHandler';
import { snagWebhookHandler } from '../services/snagWebhookHandler';
import { verifyHeliusSignature } from '../middleware/heliusAuth';

const router = Router();

/**
 * POST /api/webhooks/helius
 * Receives enhanced transaction data from Helius webhooks.
 */
router.post('/helius', verifyHeliusSignature, async (req, res) => {
  await heliusWebhookHandler.handleWebhook(req, res);
});

/**
 * POST /api/webhooks/snag
 * Receives SNAG Stratus events (social task completions, etc.).
 * HMAC-SHA256 verified via x-signature header.
 */
router.post('/snag', async (req, res) => {
  await snagWebhookHandler.handleWebhook(req, res);
});

/**
 * GET /api/webhooks/health
 * Health check for webhook endpoints.
 */
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'shift-webhook' });
});

export default router;
