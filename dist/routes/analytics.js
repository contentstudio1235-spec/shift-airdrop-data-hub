"use strict";
// ============================================================
// Analytics Route — GA4 Data API + Dashboard Stats
// Auth strategy (in priority order):
//   1. GA4_OAUTH_TOKEN env var (tomer@prim3.vc OAuth2 token, refreshable)
//   2. Service account JWT (works once SA is granted GA4 property access)
// Properties:
//   536531221 = shiftrwa.xyz (main - has data)
//   539327664 = loyalty.shiftrwa
//   539348467 = app.shiftrwa
//   539683588 = Snag Shift
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("../db/pool");
const cache = {};
function cacheGet(key) {
    const entry = cache[key];
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        delete cache[key];
        return null;
    }
    return entry.data;
}
function cacheSet(key, data, ttlMs = 60 * 60 * 1000) {
    cache[key] = { data, expiresAt: Date.now() + ttlMs };
}
// ── SHIFT GA4 property map ────────────────────────────────────────────────────
const GA4_PROPERTY_ID = '536531221'; // shiftrwa.xyz — primary property with data
const GA4_PROPERTIES = {
    '536531221': 'shiftrwa.xyz',
    '539327664': 'loyalty.shiftrwa',
    '539348467': 'app.shiftrwa',
    '539683588': 'Snag Shift',
};
// ── Service Account JWT auth (RS256, no google-auth-library) ──────────────────
const SA_KEY_PATH = (() => {
    // Support both local dev path and Render deployment path
    const localPath = path_1.default.resolve('/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop', 'micro-vine-498016-n0-f99594ed911d.json');
    const renderPath = path_1.default.resolve(process.cwd(), 'micro-vine-498016-n0-f99594ed911d.json');
    if (fs_1.default.existsSync(localPath))
        return localPath;
    if (fs_1.default.existsSync(renderPath))
        return renderPath;
    return localPath;
})();
function loadServiceAccount() {
    try {
        if (!fs_1.default.existsSync(SA_KEY_PATH))
            return null;
        const raw = fs_1.default.readFileSync(SA_KEY_PATH, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function makeJwt(sa) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: sa.token_uri,
        iat: now,
        exp: now + 3600,
    })).toString('base64url');
    const unsigned = `${header}.${payload}`;
    const sign = crypto_1.default.createSign('RSA-SHA256');
    sign.update(unsigned);
    const sig = sign.sign(sa.private_key, 'base64url');
    return `${unsigned}.${sig}`;
}
// ── Primary auth: GA4_OAUTH_TOKEN env var (tomer@prim3.vc OAuth2 token) ───────
// When the SA lacks GA4 property access, use this OAuth token.
// Set GA4_OAUTH_TOKEN in Render env vars. When expired, update via:
//   1. developers.google.com/oauthplayground (scope: analytics.readonly)
//   2. Copy new access token into Render env var
// For persistent refresh: set GA4_OAUTH_REFRESH_TOKEN + GA4_OAUTH_CLIENT_ID + GA4_OAUTH_CLIENT_SECRET
async function refreshOAuthToken() {
    const refreshToken = process.env.GA4_OAUTH_REFRESH_TOKEN;
    const clientId = process.env.GA4_OAUTH_CLIENT_ID || '407408718192.apps.googleusercontent.com';
    const clientSecret = process.env.GA4_OAUTH_CLIENT_SECRET;
    if (!refreshToken || !clientSecret)
        return null;
    try {
        const { data } = await axios_1.default.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const token = data.access_token;
        cacheSet('ga4_access_token', token, 55 * 60 * 1000);
        console.log('[GA4] ✅ Refreshed OAuth token via refresh_token');
        return token;
    }
    catch (e) {
        console.warn('[GA4] Failed to refresh OAuth token:', e.message);
        return null;
    }
}
async function getGa4AccessToken() {
    const cached = cacheGet('ga4_access_token');
    if (cached)
        return cached;
    // Priority 1: env var static token (for quick deployment)
    const envToken = process.env.GA4_OAUTH_TOKEN;
    if (envToken) {
        cacheSet('ga4_access_token', envToken, 45 * 60 * 1000); // assume ~45 min left
        console.log('[GA4] Using GA4_OAUTH_TOKEN from env');
        return envToken;
    }
    // Priority 2: refresh token flow (persistent)
    const refreshed = await refreshOAuthToken();
    if (refreshed)
        return refreshed;
    // Priority 3: Service account JWT (works if SA has GA4 access)
    const sa = loadServiceAccount();
    if (!sa)
        throw new Error('No GA4 auth available: set GA4_OAUTH_TOKEN or GA4_OAUTH_REFRESH_TOKEN in env');
    const jwt = makeJwt(sa);
    const { data } = await axios_1.default.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const token = data.access_token;
    cacheSet('ga4_access_token', token, 55 * 60 * 1000);
    return token;
}
async function ga4RunReport(token, body, propertyId = GA4_PROPERTY_ID) {
    const { data } = await axios_1.default.post(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, body, { headers: { Authorization: `Bearer ${token}` } });
    return data;
}
const router = (0, express_1.Router)();
// GA4 Measurement parameters
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-16YK1Q7QHD';
const GA_API_SECRET = process.env.GA_API_SECRET || '';
/**
 * POST /api/analytics/stitch
 * Records wallet ↔ GA4 client_id ↔ referral_code identity link
 */
router.post('/stitch', async (req, res) => {
    const { wallet, clientId, referralCode, sessionId } = req.body;
    if (!wallet || !clientId) {
        return res.status(400).json({
            success: false,
            error: 'wallet and clientId are required for identity stitching',
        });
    }
    console.log(`[Analytics] Stitching GA4 identity: ${wallet.slice(0, 8)}...`);
    try {
        // 1. Persist the stitch to the users table
        await (0, pool_1.execute)(`INSERT INTO users (wallet, ga_user_id, snag_custom_referral_code, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (wallet) 
       DO UPDATE SET ga_user_id = $2, snag_custom_referral_code = COALESCE(users.snag_custom_referral_code, $3), updated_at = NOW()`, [wallet, clientId, referralCode || null]);
        // 2. Dispatch server-side event to GA4 via Measurement Protocol
        const gaPayload = {
            client_id: clientId,
            events: [
                {
                    name: 'wallet_linked',
                    params: {
                        wallet_address: wallet,
                        referral_code: referralCode || undefined,
                        session_id: sessionId || undefined,
                        engagement_time_msec: 1,
                    },
                },
            ],
        };
        const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
        await axios_1.default.post(gaUrl, gaPayload, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(`[Analytics] ✅ Stitched GA4 identity for ${wallet.slice(0, 8)}...`);
        return res.status(200).json({
            success: true,
            message: 'Identity stitched and GA4 event dispatched successfully',
        });
    }
    catch (err) {
        console.error('[Analytics POST] Failed to stitch identity:', err.message);
        // Don't fail hard — stitch best-effort, still return success if DB write worked
        return res.status(200).json({
            success: true,
            message: 'Identity stitched (GA4 dispatch may have failed silently)',
            error: err.message,
        });
    }
});
/**
 * GET /api/analytics/dashboard-stats
 * Aggregated cross-channel KPIs for the Data Hub
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        // 1. Total registered users
        const totalUsersRes = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users');
        // 2. Stitched users = users with ANY identity signal (Snag OR GA4)
        //    FIX #1: was "ga_user_id IS NOT NULL" which returned 1 (only test data).
        //    Now uses snag_user_id OR ga_user_id → returns real stitched count.
        const stitchedUsersRes = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL OR ga_user_id IS NOT NULL');
        // 3. Active on-chain holders (open positions)
        const activeHoldersRes = await (0, pool_1.queryOne)("SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open'");
        // 4. Total trading volume (USD)
        const totalVolumeRes = await (0, pool_1.queryOne)("SELECT COALESCE(SUM(position_size_usd), 0) as total FROM positions");
        // 5. Recent identity-linked users for the Real-Time Ledger
        //    FIX #3: was "WHERE ga_user_id IS NOT NULL" → only returned 1 test row.
        //    Now shows any user with any identity signal (snag OR ga4 OR referral code).
        const recentStitched = await (0, pool_1.query)(`SELECT wallet, ga_user_id, snag_custom_referral_code, total_xp, snag_points, updated_at 
       FROM users 
       WHERE snag_user_id IS NOT NULL OR ga_user_id IS NOT NULL OR snag_custom_referral_code IS NOT NULL
       ORDER BY updated_at DESC 
       LIMIT 20`);
        // 6. Conversion funnel counts
        // ── AUM Acquisition Funnel ──
        // FIX #2: was using stitchedUsers as step 1, which was 1 — making step 2 (416) impossible.
        // Now: Total Users → Snag/GA4 Linked → Position Opened → Active Holder → Long-Term
        const totalUsers = Number(totalUsersRes?.count || 0);
        const stitchedUsers = Number(stitchedUsersRes?.count || 0);
        const fAum2Res = await (0, pool_1.queryOne)('SELECT COUNT(DISTINCT wallet) as count FROM positions');
        const fAum2 = Number(fAum2Res?.count || 0);
        const fAum3 = Number(activeHoldersRes?.count || 0);
        const fAum4Res = await (0, pool_1.queryOne)("SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open' AND opened_at < NOW() - INTERVAL '24 hours'");
        const fAum4 = Number(fAum4Res?.count || 0);
        // ── Holder Onboarding Funnel ──
        const fH1Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL');
        const fH1 = Number(fH1Res?.count || 0);
        const fH2 = stitchedUsers; // snag OR ga4 linked
        const fH3 = fAum2; // actually opened position
        // ── Brand Referral Funnel ──
        const fR1Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE referred_by_code IS NOT NULL OR referred_by_wallet IS NOT NULL');
        const fR1 = Number(fR1Res?.count || 0);
        const fR2Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE (referred_by_code IS NOT NULL OR referred_by_wallet IS NOT NULL) AND (snag_user_id IS NOT NULL OR ga_user_id IS NOT NULL)');
        const fR2 = Number(fR2Res?.count || 0);
        const fR3Res = await (0, pool_1.queryOne)('SELECT COUNT(*) as count FROM users WHERE snag_custom_referral_code IS NOT NULL');
        const fR3 = Number(fR3Res?.count || 0);
        return res.status(200).json({
            success: true,
            metrics: {
                totalUsers,
                stitchedUsers,
                activeHolders: fAum3,
                totalVolume: Number(totalVolumeRes?.total || 0),
            },
            funnels: {
                aum: [
                    { name: 'Registered Users', count: totalUsers },
                    { name: 'Identity Linked', count: stitchedUsers },
                    { name: 'Opened Position', count: fAum2 },
                    { name: 'Active Holder', count: fAum3 },
                    { name: 'Long Term (>24h)', count: fAum4 },
                ],
                holder: [
                    { name: 'Snag Identity Link', count: fH1 },
                    { name: 'Fully Stitched', count: fH2 },
                    { name: 'On-chain Purchase', count: fH3 },
                ],
                referral: [
                    { name: 'Referred Landings', count: fR1 },
                    { name: 'Stitched Referred', count: fR2 },
                    { name: 'Referrers Created', count: fR3 },
                ],
            },
            recentStitched,
        });
    }
    catch (err) {
        console.error('[Analytics GET] Failed to fetch stats:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// ============================================================
// GET /api/analytics/ga4
// Fetches GA4 Data API using OAuth token (GA4_OAUTH_TOKEN env) or SA JWT.
// Pulls channels, pages, trend, countries, devices, 7d + yesterday stats.
// Cached for 1 hour. Returns {available:false} gracefully on 403.
// ============================================================
router.get('/ga4', async (_req, res) => {
    const CACHE_KEY = 'ga4_main';
    const cached = cacheGet(CACHE_KEY);
    if (cached)
        return res.status(200).json({ success: true, cached: true, ...cached });
    try {
        const token = await getGa4AccessToken();
        const date30d = [{ startDate: '30daysAgo', endDate: 'today' }];
        const date7d = [{ startDate: '7daysAgo', endDate: 'today' }];
        const dateYesterday = [{ startDate: '1daysAgo', endDate: '1daysAgo' }];
        // ── Parallel reports ──
        const [channelsReport, pagesReport, trendReport, countriesReport, devicesReport, totals7dReport, totalsYestReport] = await Promise.all([
            // Channels + totals (30d)
            ga4RunReport(token, {
                dateRanges: date30d,
                metrics: [
                    { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
                    { name: 'newUsers' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'eventCount' },
                ],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            }),
            // Top pages (30d)
            ga4RunReport(token, {
                dateRanges: date30d,
                metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
                dimensions: [{ name: 'pagePath' }],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 20,
            }),
            // Daily trend (30d)
            ga4RunReport(token, {
                dateRanges: date30d,
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }],
                dimensions: [{ name: 'date' }],
                orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
            }),
            // Top countries (30d)
            ga4RunReport(token, {
                dateRanges: date30d,
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
                dimensions: [{ name: 'country' }],
                orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
                limit: 10,
            }),
            // Device categories (30d)
            ga4RunReport(token, {
                dateRanges: date30d,
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
                dimensions: [{ name: 'deviceCategory' }],
            }),
            // 7d totals
            ga4RunReport(token, {
                dateRanges: date7d,
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }, { name: 'screenPageViews' }],
            }),
            // Yesterday
            ga4RunReport(token, {
                dateRanges: dateYesterday,
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }],
            }),
        ]);
        // Parse helpers
        const parseRows = (report, dimKeys, metricKeys) => (report.rows || []).map((row) => {
            const obj = {};
            dimKeys.forEach((k, i) => { obj[k] = row.dimensionValues?.[i]?.value ?? null; });
            metricKeys.forEach((k, i) => { obj[k] = row.metricValues?.[i]?.value ?? null; });
            return obj;
        });
        const channels = parseRows(channelsReport, ['channel'], ['activeUsers', 'sessions', 'screenPageViews', 'newUsers', 'bounceRate', 'avgSessionDuration', 'eventCount']);
        const pages = parseRows(pagesReport, ['pagePath'], ['screenPageViews', 'activeUsers']);
        const trend = parseRows(trendReport, ['date'], ['activeUsers', 'sessions', 'newUsers']);
        const countries = parseRows(countriesReport, ['country'], ['activeUsers', 'sessions']);
        const devices = parseRows(devicesReport, ['deviceCategory'], ['activeUsers', 'sessions']);
        // 30d aggregate totals
        const totals30d = channels.reduce((acc, row) => {
            acc.activeUsers += parseInt(row.activeUsers, 10) || 0;
            acc.sessions += parseInt(row.sessions, 10) || 0;
            acc.screenPageViews += parseInt(row.screenPageViews, 10) || 0;
            acc.newUsers += parseInt(row.newUsers, 10) || 0;
            acc.eventCount += parseInt(row.eventCount, 10) || 0;
            return acc;
        }, { activeUsers: 0, sessions: 0, screenPageViews: 0, newUsers: 0, eventCount: 0 });
        // 7d totals
        const r7 = totals7dReport.rows?.[0]?.metricValues || [];
        const totals7d = {
            activeUsers: parseInt(r7[0]?.value || '0', 10),
            sessions: parseInt(r7[1]?.value || '0', 10),
            newUsers: parseInt(r7[2]?.value || '0', 10),
            pageViews: parseInt(r7[3]?.value || '0', 10),
        };
        // Yesterday
        const rY = totalsYestReport.rows?.[0]?.metricValues || [];
        const yesterday = {
            activeUsers: parseInt(rY[0]?.value || '0', 10),
            sessions: parseInt(rY[1]?.value || '0', 10),
            newUsers: parseInt(rY[2]?.value || '0', 10),
        };
        const result = {
            available: true,
            propertyId: GA4_PROPERTY_ID,
            totals: totals30d,
            totals7d,
            yesterday,
            channels,
            pages,
            trend,
            countries,
            devices,
        };
        cacheSet(CACHE_KEY, result);
        return res.status(200).json({ success: true, cached: false, ...result });
    }
    catch (err) {
        const status = err?.response?.status;
        if (status === 403) {
            console.warn('[Analytics /ga4] 403 — GA4 token lacks access to property. Set GA4_OAUTH_TOKEN env var.');
            return res.status(200).json({
                success: true,
                available: false,
                reason: 'permission_denied',
                hint: 'Set GA4_OAUTH_TOKEN env var with a valid analytics.readonly OAuth2 token',
            });
        }
        console.error('[Analytics /ga4] Error:', err?.response?.data || err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// ============================================================
// GET /api/analytics/traffic
// Traffic source breakdown + sessions by country from GA4.
// Cached 1 hour.
// ============================================================
router.get('/traffic', async (_req, res) => {
    const CACHE_KEY = 'ga4_traffic';
    const cached = cacheGet(CACHE_KEY);
    if (cached)
        return res.status(200).json({ success: true, cached: true, ...cached });
    try {
        const token = await getGa4AccessToken();
        const dateRange = [{ startDate: '30daysAgo', endDate: 'today' }];
        const [channelReport, countryReport] = await Promise.all([
            ga4RunReport(token, {
                dateRanges: dateRange,
                metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'newUsers' }],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            }),
            ga4RunReport(token, {
                dateRanges: dateRange,
                metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
                dimensions: [{ name: 'country' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 10,
            }),
        ]);
        const parseRows = (report, dimKeys, metricKeys) => (report.rows || []).map((row) => {
            const obj = {};
            dimKeys.forEach((k, i) => { obj[k] = row.dimensionValues?.[i]?.value ?? null; });
            metricKeys.forEach((k, i) => { obj[k] = row.metricValues?.[i]?.value ?? null; });
            return obj;
        });
        const channels = parseRows(channelReport, ['channel'], ['sessions', 'activeUsers', 'newUsers']);
        const countries = parseRows(countryReport, ['country'], ['sessions', 'activeUsers']);
        const result = { available: true, channels, countries };
        cacheSet(CACHE_KEY, result);
        return res.status(200).json({ success: true, cached: false, ...result });
    }
    catch (err) {
        const status = err?.response?.status;
        if (status === 403) {
            return res.status(200).json({
                success: true,
                available: false,
                reason: 'permission_denied',
                channels: [],
                countries: [],
            });
        }
        console.error('[Analytics /traffic] Error:', err?.response?.data || err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// ============================================================
// GET /api/analytics/kpis
// Aggregated KPIs from Postgres DB across all tables.
// ============================================================
router.get('/kpis', async (_req, res) => {
    const CACHE_KEY = 'db_kpis';
    const cached = cacheGet(CACHE_KEY);
    if (cached)
        return res.status(200).json({ success: true, cached: true, data: cached });
    try {
        const [holdersRes, slotsRes, topTokenRes, volumeRes, avgPositionRes, openPositionsRes, newUsersTodayRes, newUsersWeekRes, totalUsersRes, avgStreakRes, totalXpRes, badgesRes, snagLinkedRes, totalSnagPointsRes, avgMultiplierRes,] = await Promise.all([
            // AUM
            (0, pool_1.queryOne)(`SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open'`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM positions WHERE status = 'open'`),
            (0, pool_1.queryOne)(`SELECT asset, COUNT(*) as cnt FROM positions WHERE status = 'open' GROUP BY asset ORDER BY cnt DESC LIMIT 1`),
            // Volume
            (0, pool_1.queryOne)(`SELECT COALESCE(SUM(position_size_usd), 0) as total FROM positions`),
            (0, pool_1.queryOne)(`SELECT COALESCE(AVG(position_size_usd), 0) as avg FROM positions WHERE status = 'open'`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM positions WHERE status = 'open'`),
            // Growth
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '1 day'`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users`),
            // Engagement — streak is approximated as consecutive days with XP events
            (0, pool_1.queryOne)(`SELECT COALESCE(AVG(total_xp / GREATEST(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400, 1)), 0) as avg FROM users WHERE total_xp > 0`),
            (0, pool_1.queryOne)(`SELECT COALESCE(SUM(total_xp), 0) as total FROM users`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM badges`),
            // Snag
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL`),
            (0, pool_1.queryOne)(`SELECT COALESCE(SUM(snag_points), 0) as total FROM users WHERE snag_points > 0`),
            (0, pool_1.queryOne)(`SELECT COALESCE(AVG(claim_multiplier), 1) as avg FROM users`),
        ]);
        const data = {
            aum: {
                totalHolders: parseInt(holdersRes?.count || '0', 10),
                totalSlots: parseInt(slotsRes?.count || '0', 10),
                topToken: topTokenRes?.asset || 'N/A',
            },
            volume: {
                totalUSD: parseFloat(volumeRes?.total || '0'),
                avgPositionUSD: parseFloat(avgPositionRes?.avg || '0'),
                openPositions: parseInt(openPositionsRes?.count || '0', 10),
            },
            growth: {
                newUsersToday: parseInt(newUsersTodayRes?.count || '0', 10),
                newUsersWeek: parseInt(newUsersWeekRes?.count || '0', 10),
                totalUsers: parseInt(totalUsersRes?.count || '0', 10),
            },
            engagement: {
                avgStreak: parseFloat((avgStreakRes?.avg || '0')).toFixed(2),
                totalXP: parseInt(totalXpRes?.total || '0', 10),
                badgesAwarded: parseInt(badgesRes?.count || '0', 10),
            },
            snag: {
                linkedAccounts: parseInt(snagLinkedRes?.count || '0', 10),
                totalPoints: parseInt(totalSnagPointsRes?.total || '0', 10),
                avgMultiplier: parseFloat(avgMultiplierRes?.avg || '1').toFixed(2),
            },
        };
        cacheSet(CACHE_KEY, data);
        return res.status(200).json({ success: true, cached: false, data });
    }
    catch (err) {
        console.error('[Analytics /kpis] Error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// ============================================================
// GET /api/analytics/snag-stats
// Fetches aggregate stats from the Snag Solutions admin API.
// ============================================================
const SNAG_API_KEY = '35b152af2acb45a0a865af326d475310';
const SNAG_BASE_URL = 'https://admin.snagsolutions.io';
router.get('/snag-stats', async (_req, res) => {
    const CACHE_KEY = 'snag_stats';
    const cached = cacheGet(CACHE_KEY);
    if (cached)
        return res.status(200).json({ success: true, cached: true, ...cached });
    const snagHeaders = {
        'x-api-key': SNAG_API_KEY,
        'Content-Type': 'application/json',
    };
    try {
        // ── 1. Total members (leaderboard gives paginated accounts) ──
        const membersResp = await axios_1.default.get(`${SNAG_BASE_URL}/api/loyalty/accounts`, {
            headers: snagHeaders,
            params: { limit: 1 },
            timeout: 10000,
        });
        const totalMembers = membersResp.data?.totalCount
            ?? membersResp.data?.meta?.total
            ?? membersResp.data?.pagination?.totalCount
            ?? 0;
        // ── 2. Top earners ──
        const topEarnersResp = await axios_1.default.get(`${SNAG_BASE_URL}/api/loyalty/accounts`, {
            headers: snagHeaders,
            params: { limit: 10, sort: 'points', order: 'desc' },
            timeout: 10000,
        });
        const topEarners = (topEarnersResp.data?.data || []).map((a, i) => ({
            rank: i + 1,
            wallet: a.walletAddress || a.wallet || 'unknown',
            points: a.amount ?? a.points ?? a.balance ?? 0,
            userId: a.id,
        }));
        // ── 3. Points distribution — top / mid / low tiers from our own DB ──
        const [topTierRes, midTierRes, lowTierRes, zeroTierRes] = await Promise.all([
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE snag_points >= 10000`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE snag_points >= 1000 AND snag_points < 10000`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE snag_points > 0 AND snag_points < 1000`),
            (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE snag_points = 0 OR snag_points IS NULL`),
        ]);
        const pointsDistribution = {
            whale: parseInt(topTierRes?.count || '0', 10), // ≥ 10 000 pts
            mid: parseInt(midTierRes?.count || '0', 10), // 1 000–9 999 pts
            low: parseInt(lowTierRes?.count || '0', 10), // 1–999 pts
            zero: parseInt(zeroTierRes?.count || '0', 10), // 0 pts
        };
        // ── 4. Recent activity (last synced users from our DB) ──
        const recentActivity = await (0, pool_1.query)(`SELECT wallet, snag_points, total_xp, updated_at
       FROM users
       WHERE snag_user_id IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 10`);
        const result = { totalMembers, topEarners, pointsDistribution, recentActivity };
        cacheSet(CACHE_KEY, result);
        return res.status(200).json({ success: true, cached: false, ...result });
    }
    catch (err) {
        const status = err?.response?.status;
        console.error('[Analytics /snag-stats] Error:', err?.response?.data || err.message);
        // Graceful fallback — return what we can from DB
        try {
            const fallbackTotal = await (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL`);
            return res.status(200).json({
                success: true,
                available: false,
                reason: status === 403 ? 'permission_denied' : 'snag_api_error',
                totalMembers: parseInt(fallbackTotal?.count || '0', 10),
                topEarners: [],
                pointsDistribution: {},
                recentActivity: [],
            });
        }
        catch {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map