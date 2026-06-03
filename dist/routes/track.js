"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/track.ts
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const identityService_1 = require("../services/identityService");
const walletSignature_1 = require("../lib/walletSignature");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// 100 req/min per IP for /landing — every page hit lands
const landingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited' },
});
// 20 req/min per IP for /wallet_connect — tighter since signature verification is expensive
const walletConnectLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited' },
});
router.post('/landing', landingLimiter, async (req, res) => {
    try {
        const { client_id, session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_path } = req.body ?? {};
        if (typeof client_id !== 'string' || client_id.length === 0) {
            return res.status(400).json({ error: 'client_id required' });
        }
        await (0, identityService_1.recordEvent)({
            event_name: 'landing',
            ga_client_id: client_id,
            session_id: typeof session_id === 'string' ? session_id : undefined,
            source: typeof utm_source === 'string' ? utm_source.toLowerCase() : undefined,
            medium: typeof utm_medium === 'string' ? utm_medium.toLowerCase() : undefined,
            campaign: typeof utm_campaign === 'string' ? utm_campaign : undefined,
            content: typeof utm_content === 'string' ? utm_content : undefined,
            term: typeof utm_term === 'string' ? utm_term : undefined,
            referrer: typeof referrer === 'string' ? referrer : undefined,
            landing_path: typeof landing_path === 'string' ? landing_path : undefined,
        });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('[track/landing]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
router.post('/wallet_connect', walletConnectLimiter, async (req, res) => {
    try {
        const { wallet, signature, message, client_id, session_id } = req.body ?? {};
        if (!wallet || !client_id) {
            return res.status(400).json({ error: 'missing required fields' });
        }
        // Hybrid: signature is OPTIONAL. With signature → deterministic. Without → probabilistic.
        // The attribution-only use case (admin analytics) doesn't need auth-grade verification.
        // A future user/admin "verify wallet" CTA can call this same endpoint WITH a signature
        // to upgrade the confidence level on a previously-created probabilistic link.
        let confidence = 'probabilistic';
        if (signature && message) {
            if (!(0, walletSignature_1.isSignatureFresh)(message, 300)) {
                return res.status(401).json({ error: 'stale_signature' });
            }
            if (!(0, walletSignature_1.verifyWalletSignature)({ wallet, signature, message })) {
                return res.status(401).json({ error: 'invalid_signature' });
            }
            confidence = 'deterministic';
        }
        // 1. Find or create profile keyed by wallet
        const profile = await (0, identityService_1.findOrCreateProfile)({ type: 'wallet', value: wallet }, 'system');
        // 2. Link the ga_client_id — handle IdentityConflictError gracefully (log, skip, continue)
        try {
            await (0, identityService_1.linkIdentity)(profile.profileId, 'ga_client_id', client_id, confidence, { byActor: 'system' });
        }
        catch (linkErr) {
            if (linkErr?.name === 'IdentityConflictError') {
                console.warn('[track/wallet_connect] ga_client_id conflict', { wallet, client_id, existingProfile: linkErr.existingProfileId });
            }
            else {
                throw linkErr;
            }
        }
        // 3. Backfill: re-assign pre-connect attribution_events to this profile
        await (0, pool_1.execute)(`
      UPDATE attribution_events
      SET profile_id = $1, wallet = $2
      WHERE ga_client_id = $3 AND profile_id IS NULL
      `, [profile.profileId, wallet, client_id]);
        // 4. Pull the earliest attribution_events row for this client_id to set first_utm_* if not locked
        await (0, pool_1.execute)(`
      UPDATE user_profiles p
      SET first_utm_source   = COALESCE(p.first_utm_source, e.source),
          first_utm_medium   = COALESCE(p.first_utm_medium, e.medium),
          first_utm_campaign = COALESCE(p.first_utm_campaign, e.campaign),
          first_utm_content  = COALESCE(p.first_utm_content, e.content),
          first_utm_term     = COALESCE(p.first_utm_term, e.term),
          first_referrer     = COALESCE(p.first_referrer, e.referrer),
          first_landing_path = COALESCE(p.first_landing_path, e.landing_path),
          last_utm_source    = COALESCE(e.source, p.last_utm_source),
          last_utm_medium    = COALESCE(e.medium, p.last_utm_medium),
          last_utm_campaign  = COALESCE(e.campaign, p.last_utm_campaign),
          last_seen_at       = NOW(),
          updated_at         = NOW()
      FROM (
        SELECT source, medium, campaign, content, term, referrer, landing_path
        FROM attribution_events
        WHERE ga_client_id = $2
        ORDER BY occurred_at ASC
        LIMIT 1
      ) e
      WHERE p.profile_id = $1 AND p.attribution_locked_at IS NULL
      `, [profile.profileId, client_id]);
        // 5. Record the wallet_connect event itself
        await (0, identityService_1.recordEvent)({
            event_name: 'wallet_connect',
            profile_id: profile.profileId,
            wallet,
            ga_client_id: client_id,
            session_id: typeof session_id === 'string' ? session_id : undefined,
        });
        res.json({ profileId: profile.profileId, stitched: true, confidence });
    }
    catch (err) {
        console.error('[track/wallet_connect]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
exports.default = router;
//# sourceMappingURL=track.js.map