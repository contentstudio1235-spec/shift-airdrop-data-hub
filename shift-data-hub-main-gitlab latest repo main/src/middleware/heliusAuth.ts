// ============================================================
// Helius Webhook Auth Middleware — HMAC signature verification
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { HeliusWebhookHandler } from '../services/heliusWebhookHandler';

/**
 * Middleware to verify Helius webhook signature.
 * Skips verification if HELIUS_WEBHOOK_SECRET is not set (dev mode).
 */
export function verifyHeliusSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-helius-signature'] as string;

  if (!signature) {
    // In development, allow unsigned webhooks
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: 'Missing raw body for verification' });
    return;
  }

  const isValid = HeliusWebhookHandler.verifySignature(rawBody, signature);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  next();
}
