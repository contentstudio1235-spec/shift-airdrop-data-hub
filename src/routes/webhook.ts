// ============================================================
// Webhook Routes — Helius incoming transactions
// ============================================================

import { Router } from 'express';
import { heliusWebhookHandler } from '../services/heliusWebhookHandler';
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
 * GET /api/webhooks/health
 * Health check for webhook endpoint (Helius verifies this).
 */
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'shift-webhook' });
});

export default router;
