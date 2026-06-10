// ============================================================
// SNAG Webhook Handler — Inbound events from SNAG Stratus
// Handles social task completions (Follow X, Discord, etc.)
// ============================================================

import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config';
import { execute, queryOne } from '../db/pool';
import { findOrCreateProfile, linkIdentity, recordEvent } from './identityService';
import { IdentityConflictError } from '../types/identity';

export class SnagWebhookHandler {
  /**
   * Verify SNAG Stratus webhook signature (HMAC-SHA256).
   * CRITICAL HARDENING: Strict verification in production.
   * If no secret is configured (dev mode), logs warning and returns true.
   */
  static verifySignature(rawBody: string, signature: string): boolean {
    if (!config.snagWebhookSecret) {
      const isDev = config.nodeEnv !== 'production';
      const msg = '[SnagWebhook] No webhook secret configured — bypassing signature check';
      if (isDev) {
        console.warn(msg + ' (dev mode)');
      } else {
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

    const expected = crypto
      .createHmac('sha256', config.snagWebhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signatureHex, 'hex')
      );
    } catch (err) {
      console.warn('[SnagWebhook] Signature verification failed (buffer conversion error):', err);
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
        console.error('[SnagWebhook] Error processing event:', err, typeof event === 'object' ? JSON.stringify(event).slice(0, 200) : '[non-object event]');
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

    if (effectiveType === 'referral.created' || effectiveType === 'loyalty.referral.created') {
      await this.handleReferralCreated(data || event);
      return;
    }

    if (effectiveType === 'user.metadata.updated' || effectiveType === 'UserMetadata') {
      await this.handleUserMetadata(data || event);
      return;
    }

    // Log unhandled events for debugging
    console.log(`[SnagWebhook] Unhandled event type: ${effectiveType}`);
  }

  private async handleRuleCompleted(data: any): Promise<void> {
    const walletAddress = data?.walletAddress || data?.wallet_address || data?.user?.walletAddress;
    const ruleId = data?.ruleId || data?.rule_id || data?.rule?.id;
    const snagUserId: string | undefined = data?.userId || data?.user_id || data?.user?.id || data?.accountId || data?.account_id;

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

    // Identity wiring — non-fatal
    try {
      const profile = await findOrCreateProfile({ type: 'wallet', value: walletAddress }, 'system');

      // Link snag_user_id if present in the event payload
      if (snagUserId) {
        try {
          await linkIdentity(profile.profileId, 'snag_user_id', snagUserId, 'deterministic', { byActor: 'system' });
        } catch (linkErr) {
          if (!(linkErr instanceof IdentityConflictError)) throw linkErr;
          // Already linked to another profile — log and continue
          console.warn('[snag/handleRuleCompleted] snag_user_id conflict, skipping link', (linkErr as IdentityConflictError).existingProfileId);
        }

        await recordEvent({
          event_name: 'snag_link',
          event_id: `snag-${walletAddress}-${snagUserId}`,
          profile_id: profile.profileId,
          wallet: walletAddress,
          payload: { snag_user_id: snagUserId },
        });
      }

      await recordEvent({
        event_name: 'snag_task_complete',
        event_id: `snag-task-${walletAddress}-${ruleId}`,
        profile_id: profile.profileId,
        wallet: walletAddress,
        payload: { rule_id: ruleId, task_id: taskId },
      });
    } catch (err) {
      console.error('[snag] identity wiring failed', err);
      // Non-fatal — Snag event processing continues
    }
  }

  // ── Social handle extractors ─────────────────────────────────────────────────
  // Snag's UserMetadata event carries social handles as flat string fields on the
  // payload (confirmed from Snag Stratus docs + Get Users API schema, 2026-06-04).
  // Field names: twitterUser, discordUser, telegramUsername (note: different suffix).
  private static readonly SOCIAL_EXTRACTORS: Array<{
    type: 'x_handle' | 'discord_id' | 'telegram_id';
    pluck: (data: any) => string | undefined;
  }> = [
    { type: 'x_handle',   pluck: (d) => d?.twitterUser      ?? undefined },
    { type: 'discord_id', pluck: (d) => d?.discordUser       ?? undefined },
    { type: 'telegram_id', pluck: (d) => d?.telegramUsername ?? undefined },
  ];

  private async handleUserMetadata(data: any): Promise<void> {
    // Resolve wallet from either flat field or nested user object (Snag sends both shapes)
    const walletAddress = data?.walletAddress || data?.wallet_address || data?.user?.walletAddress;
    const snagUserId: string | undefined = data?.userId || data?.user_id || data?.user?.id;

    if (!walletAddress && !snagUserId) {
      console.warn('[snag/handleUserMetadata] No walletAddress or userId in UserMetadata event — skipping');
      return;
    }

    let profile: Awaited<ReturnType<typeof findOrCreateProfile>> | undefined;

    try {
      if (walletAddress) {
        profile = await findOrCreateProfile({ type: 'wallet', value: walletAddress }, 'system');
      } else {
        // Fall back to looking up by snag_user_id when wallet is absent
        profile = await findOrCreateProfile({ type: 'snag_user_id', value: snagUserId! }, 'system');
      }
    } catch (err) {
      console.error('[snag/handleUserMetadata] findOrCreateProfile failed', err);
      return;
    }

    for (const extractor of SnagWebhookHandler.SOCIAL_EXTRACTORS) {
      const handle = extractor.pluck(data);

      // Guard: must be a non-empty string within sane length; reject null/undefined/object
      if (typeof handle !== 'string' || handle.length === 0 || handle.length > 128) {
        continue;
      }

      try {
        await linkIdentity(profile.profileId, extractor.type, handle, 'deterministic', { byActor: 'snag_webhook' });
        console.log(`[snag/handleUserMetadata] linked ${extractor.type}=${handle} → profile ${profile.profileId}`);
      } catch (err: any) {
        if (err instanceof IdentityConflictError) {
          console.warn('[snag/handleUserMetadata] social identity conflict', {
            type: extractor.type,
            handle,
            existingProfileId: err.existingProfileId,
          });
        } else {
          console.error('[snag/handleUserMetadata] linkIdentity failed', { type: extractor.type, handle }, err);
        }
        // Never rethrow — a conflict on one social type must not abort the others
      }
    }
  }

  private async handleReferralCreated(data: any): Promise<void> {
    const referrerWallet = data?.referrerWalletAddress || data?.referrer_wallet_address;
    const referredWallet = data?.referredWalletAddress || data?.referred_wallet_address;
    const customCode = data?.customCode || data?.custom_code;

    if (!referrerWallet || !referredWallet) {
      console.warn('[SnagWebhook] Missing referrer or referred wallet in referral event');
      return;
    }

    try {
      // Ensure both users exist
      await execute(
        `INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
        [referrerWallet]
      );
      await execute(
        `INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
        [referredWallet]
      );

      // Record referral in DB
      await execute(
        `INSERT INTO snag_referral_events (referrer_wallet, referred_wallet, referral_code_used, processed_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (referrer_wallet, referred_wallet) DO NOTHING`,
        [referrerWallet, referredWallet, customCode || 'default']
      );

      // Upsert into referrals table; source = 'snag' (came via Snag loyalty link)
      await execute(
        `INSERT INTO referrals
           (referrer_wallet, referred_wallet, referral_source, code_used, snag_synced_at)
         VALUES ($1, $2, 'snag', $3, NOW())
         ON CONFLICT (referrer_wallet, referred_wallet)
         DO UPDATE SET referral_source = 'snag', snag_synced_at = NOW()`,
        [referrerWallet, referredWallet, customCode || 'default']
      ).catch(() => {});

      console.log(
        `[SnagWebhook] ✅ Referral: ${referrerWallet.slice(0, 8)}... → ${referredWallet.slice(0, 8)}... ` +
        `(code: ${customCode || 'default'})`
      );
    } catch (err) {
      console.error('[SnagWebhook] Error processing referral event:', err);
    }
  }
}

export const snagWebhookHandler = new SnagWebhookHandler();
