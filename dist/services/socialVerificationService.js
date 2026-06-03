"use strict";
// ============================================================
// Social Verification Service
// Verifies Discord, Twitter, Telegram membership/follows
// via their own OAuth — completely invisible to the user.
// After verification, records in our DB + notifies SNAG.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialVerificationService = exports.SocialVerificationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const pool_1 = require("../db/pool");
const snagSyncService_1 = require("./snagSyncService");
// Badges awarded for social task completion
const SOCIAL_BADGES = {
    discord: 'Discord Member',
    x_follow: 'X Follower',
    telegram: 'Telegram Member',
};
// Points awarded per social task
const SOCIAL_POINTS = {
    discord: 150,
    x_follow: 100,
    telegram: 100,
    wallet: 200,
    first_trade: 300,
};
class SocialVerificationService {
    // ── State token (stateless PKCE + wallet binding) ──────────────────────────
    /**
     * Create a signed state token for OAuth flows.
     * Encodes wallet, task, timestamp, optional PKCE code_verifier.
     * Token is validated on callback — protects against CSRF and forgery.
     */
    createStateToken(wallet, task, codeVerifier) {
        const secret = config_1.config.snagWebhookSecret || config_1.config.snagApiKey || 'shift-dev-secret';
        const ts = Date.now().toString();
        const cv = codeVerifier || '';
        const payload = `${wallet}|${task}|${ts}|${cv}`;
        const sig = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
        return Buffer.from(JSON.stringify({ wallet, task, ts, cv, sig })).toString('base64url');
    }
    /**
     * Parse and verify a state token.
     * Returns null if invalid, expired (>15min), or tampered.
     */
    parseStateToken(state) {
        try {
            const { wallet, task, ts, cv, sig } = JSON.parse(Buffer.from(state, 'base64url').toString());
            const secret = config_1.config.snagWebhookSecret || config_1.config.snagApiKey || 'shift-dev-secret';
            const payload = `${wallet}|${task}|${ts}|${cv || ''}`;
            const expected = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
            if (sig !== expected)
                return null;
            if (Date.now() - parseInt(ts) > 15 * 60 * 1000)
                return null; // 15min expiry
            return { wallet, task, codeVerifier: cv || undefined };
        }
        catch {
            return null;
        }
    }
    // ── Discord ─────────────────────────────────────────────────────────────────
    /**
     * Build the Discord OAuth2 authorization URL.
     * Scopes: identify + guilds (to check guild membership without bot permissions)
     */
    getDiscordAuthUrl(wallet) {
        const state = this.createStateToken(wallet, 'discord');
        const callbackUrl = `${config_1.config.backendUrl}/api/auth/discord/callback`;
        const params = new URLSearchParams({
            client_id: config_1.config.discordClientId,
            redirect_uri: callbackUrl,
            response_type: 'code',
            scope: 'identify guilds',
            state,
            prompt: 'consent',
        });
        return `https://discord.com/api/oauth2/authorize?${params}`;
    }
    /**
     * Exchange Discord OAuth code for a token, then verify guild membership.
     * Returns the wallet address + whether they're in the SHIFT guild.
     */
    async handleDiscordCallback(code, state) {
        const parsed = this.parseStateToken(state);
        if (!parsed)
            throw new Error('Invalid or expired state token');
        const { wallet } = parsed;
        const callbackUrl = `${config_1.config.backendUrl}/api/auth/discord/callback`;
        // Exchange code → access token
        const tokenRes = await axios_1.default.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: config_1.config.discordClientId,
            client_secret: config_1.config.discordClientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: callbackUrl,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenRes.data.access_token;
        // Get user identity
        const [meRes, guildsRes] = await Promise.all([
            axios_1.default.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } }),
            axios_1.default.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);
        const discordUsername = meRes.data.discriminator === '0'
            ? meRes.data.username
            : `${meRes.data.username}#${meRes.data.discriminator}`;
        const inGuild = config_1.config.discordGuildId
            ? guildsRes.data.some(g => g.id === config_1.config.discordGuildId)
            : true; // If no guild ID configured, accept any Discord auth
        return { wallet, inGuild, discordUsername };
    }
    // ── Twitter / X ─────────────────────────────────────────────────────────────
    /**
     * Build the Twitter OAuth2 (PKCE) authorization URL.
     * Scopes: tweet.read users.read follows.read
     * PKCE code_verifier is embedded in the state token (stateless).
     */
    getTwitterAuthUrl(wallet) {
        const codeVerifier = crypto_1.default.randomBytes(48).toString('base64url');
        const codeChallenge = crypto_1.default.createHash('sha256').update(codeVerifier).digest('base64url');
        const state = this.createStateToken(wallet, 'x_follow', codeVerifier);
        const callbackUrl = `${config_1.config.backendUrl}/api/auth/twitter/callback`;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config_1.config.twitterClientId,
            redirect_uri: callbackUrl,
            scope: 'tweet.read users.read follows.read offline.access',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        return { url: `https://twitter.com/i/oauth2/authorize?${params}` };
    }
    /**
     * Exchange Twitter code for token, then verify follow status.
     */
    async handleTwitterCallback(code, state) {
        const parsed = this.parseStateToken(state);
        if (!parsed)
            throw new Error('Invalid or expired state token');
        const { wallet, codeVerifier } = parsed;
        if (!codeVerifier)
            throw new Error('Missing PKCE code_verifier in state');
        const callbackUrl = `${config_1.config.backendUrl}/api/auth/twitter/callback`;
        // Exchange code → access token (PKCE)
        const tokenRes = await axios_1.default.post('https://api.twitter.com/2/oauth2/token', new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: config_1.config.twitterClientId,
            redirect_uri: callbackUrl,
            code_verifier: codeVerifier,
        }), {
            auth: { username: config_1.config.twitterClientId, password: config_1.config.twitterClientSecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const accessToken = tokenRes.data.access_token;
        // Get authenticated user's ID
        const meRes = await axios_1.default.get('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
        const userId = meRes.data.data.id;
        const twitterUsername = meRes.data.data.username;
        let isFollowing = false;
        if (config_1.config.twitterAccountId) {
            // Check if this user follows @ShiftRWA
            // Paginate up to 1000 following to find @ShiftRWA
            let paginationToken;
            outer: for (let page = 0; page < 10; page++) {
                const params = { max_results: '1000' };
                if (paginationToken)
                    params.pagination_token = paginationToken;
                const followRes = await axios_1.default.get(`https://api.twitter.com/2/users/${userId}/following`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params,
                });
                if (followRes.data.data?.some(u => u.id === config_1.config.twitterAccountId)) {
                    isFollowing = true;
                    break outer;
                }
                if (!followRes.data.meta?.next_token)
                    break;
                paginationToken = followRes.data.meta.next_token;
            }
        }
        else {
            // If no account ID configured, accept any Twitter auth as "followed"
            isFollowing = true;
        }
        return { wallet, isFollowing, twitterUsername };
    }
    // ── Telegram ─────────────────────────────────────────────────────────────────
    /**
     * Verify Telegram Login Widget data.
     * The widget sends user data + HMAC signed with our bot token.
     * We verify the signature and then check group membership via Bot API.
     */
    async handleTelegramLogin(data, wallet) {
        if (!config_1.config.telegramBotToken) {
            // No bot configured — accept any Telegram login
            return { isValid: true, isMember: true, telegramUsername: data.username };
        }
        // Verify HMAC-SHA256 signature from Telegram
        const { hash, ...fields } = data;
        const dataCheckString = Object.keys(fields)
            .sort()
            .map(k => `${k}=${fields[k]}`)
            .join('\n');
        const secretKey = crypto_1.default.createHash('sha256').update(config_1.config.telegramBotToken).digest();
        const expectedHash = crypto_1.default.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        const isValid = hash === expectedHash;
        if (!isValid)
            return { isValid: false, isMember: false };
        // Check auth_date is not too old (5 minutes)
        const authAge = Date.now() / 1000 - parseInt(fields.auth_date || '0');
        if (authAge > 300)
            return { isValid: false, isMember: false };
        let isMember = false;
        if (config_1.config.telegramChannelId && fields.id) {
            try {
                const res = await axios_1.default.get(`https://api.telegram.org/bot${config_1.config.telegramBotToken}/getChatMember`, { params: { chat_id: config_1.config.telegramChannelId, user_id: fields.id } });
                const status = res.data.result?.status;
                isMember = ['member', 'administrator', 'creator', 'restricted'].includes(status);
            }
            catch {
                // Bot may not be in the channel yet — accept login as completion
                isMember = true;
            }
        }
        else {
            isMember = true;
        }
        return { isValid, isMember, telegramUsername: fields.username };
    }
    // ── Core: Record + Award ─────────────────────────────────────────────────────
    /**
     * Record a verified social task completion:
     * 1. Write to snag_completed_tasks (our DB)
     * 2. Call SNAG's loyalty rule completion API (SNAG as backend)
     * 3. Award social badge in our DB
     */
    async awardVerifiedTask(wallet, taskId) {
        // 1. Record in our DB
        await (0, pool_1.execute)(`INSERT INTO snag_completed_tasks (wallet, task_id, completed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (wallet, task_id) DO NOTHING`, [wallet, taskId]);
        // 2. Push to SNAG as external rule completion
        const ruleId = config_1.config.snagSocialRuleIds[taskId];
        if (ruleId) {
            await snagSyncService_1.snagSyncService.awardSocialRule(wallet, ruleId, SOCIAL_POINTS[taskId] ?? 100);
        }
        // 3. Award social badge
        const badgeName = SOCIAL_BADGES[taskId];
        if (badgeName) {
            await (0, pool_1.execute)(`INSERT INTO badges (wallet, badge_name, earned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (wallet, badge_name) DO NOTHING`, [wallet, badgeName]);
            console.log(`[SocialVerify] 🏆 Badge "${badgeName}" awarded to ${wallet.slice(0, 8)}...`);
        }
        console.log(`[SocialVerify] ✅ Task "${taskId}" verified & recorded for ${wallet.slice(0, 8)}...`);
    }
}
exports.SocialVerificationService = SocialVerificationService;
exports.socialVerificationService = new SocialVerificationService();
//# sourceMappingURL=socialVerificationService.js.map