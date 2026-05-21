// ============================================================
// SNAG Webhook Handler — Inbound events from SNAG Stratus
// Handles social task completions (Follow X, Discord, etc.)
// ============================================================

import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config';
import { execute, queryOne } from '../db/pool';

export class SnagWebhookHandler {
  /**
   * Verify SNAG Stratus webhook signature (HMAC-SHA256).
   * If no secret is configured (dev mode), returns true.
   */
  static verifySignature(rawBody: string, signature: string): boolean {
    if (!config.snagWebhookSecret) {
      console.warn('[SnagWebhook] No webhook secret configured — bypassing signature check (dev mode)');
      return true;
    }

    const expected = crypto
      .createHmac('sha256', config.snagWebhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
      );
    } catch {
      return false;
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-signature'] || req.headers['x-snag-signature'] || '') as string;

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
      } catch (err) {
        console.error('[SnagWebhook] Error processing event:', err, event);
      }
    }

    res.status(200).json({ received: true, count: events.length });
  }

  private async processEvent(event: any): Promise<void> {
    const { type, event: eventType, data } = event;
    const effectiveType = type || eventType;

    if (effectiveType === 'rule.completed' || effectiveType === 'loyalty.rule.completed') {
      await this.handleRuleCompleted(data || event);
      return;
    }

    // Log unhandled events for debugging
    console.log(`[SnagWebhook] Unhandled event type: ${effectiveType}`);
  }

  private async handleRuleCompleted(data: any): Promise<void> {
    const walletAddress = data?.walletAddress || data?.wallet_address || data?.user?.walletAddress;
    const ruleId = data?.ruleId || data?.rule_id || data?.rule?.id;

    if (!walletAddress || !ruleId) {
      console.warn('[SnagWebhook] Missing walletAddress or ruleId in rule.completed event');
      return;
    }

    // Map SNAG rule ID → our internal task ID
    const socialRules = config.snagSocialRuleIds;
    const ruleToTask: Record<string, string> = {};

    if (socialRules.follow_x)       ruleToTask[socialRules.follow_x]       = 'x_follow';
    if (socialRules.join_discord)    ruleToTask[socialRules.join_discord]    = 'discord';
    if (socialRules.join_telegram)   ruleToTask[socialRules.join_telegram]   = 'telegram';
    if (socialRules.connect_wallet)  ruleToTask[socialRules.connect_wallet]  = 'wallet';
    if (socialRules.first_trade)     ruleToTask[socialRules.first_trade]     = 'first_trade';

    const taskId = ruleToTask[ruleId];

    if (!taskId) {
      // Not a social task rule we track — could be a badge or other rule
      console.log(`[SnagWebhook] Rule ${ruleId} not mapped to a task, skipping`);
      return;
    }

    // Ensure user exists in our DB (they may have connected via SNAG before our webhook ran)
    await execute(
      `INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
      [walletAddress]
    );

    // Record the task completion
    await execute(
      `INSERT INTO snag_completed_tasks (wallet, task_id, completed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (wallet, task_id) DO NOTHING`,
      [walletAddress, taskId]
    );

    console.log(`[SnagWebhook] ✅ Task "${taskId}" completed for ${walletAddress.slice(0, 8)}...`);
  }
}

export const snagWebhookHandler = new SnagWebhookHandler();
