"use strict";
// ============================================================
// SHIFT Airdrop MVP — Main Entry Point
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const jobs_1 = require("./cron/jobs");
const pool_1 = require("./db/pool");
const migrationRunner_1 = require("./db/migrationRunner");
// Routes
const webhook_1 = __importDefault(require("./routes/webhook"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const admin_1 = __importDefault(require("./routes/admin"));
const airdrop_1 = __importDefault(require("./routes/airdrop"));
const positions_1 = __importDefault(require("./routes/positions"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const badges_1 = __importDefault(require("./routes/badges"));
const events_1 = __importDefault(require("./routes/events"));
const snag_1 = __importDefault(require("./routes/snag"));
const auth_1 = __importDefault(require("./routes/auth"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const funnels_1 = __importDefault(require("./routes/funnels"));
const attribution_1 = __importDefault(require("./routes/attribution"));
const cohorts_1 = __importDefault(require("./routes/cohorts"));
const stream_1 = __importDefault(require("./routes/stream"));
const users_1 = __importDefault(require("./routes/users"));
const track_1 = __importDefault(require("./routes/track"));
const pulse_1 = __importDefault(require("./routes/pulse"));
const utm_1 = __importDefault(require("./routes/utm"));
// Middleware
const utmCapture_1 = require("./middleware/utmCapture");
const app = (0, express_1.default)();
// ── Middleware ──
// Security headers
app.use((0, helmet_1.default)());
// CORS — allow frontend
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'https://airdrop.shift.xyz',
        'https://app.shiftrwa.xyz', // official SHIFT app
        'https://airdrop.shiftrwa.xyz', // airdrop subdomain
        'https://www.shiftrwa.xyz',
        'https://shiftrwa.xyz',
        'https://shift-airdrop-backend.onrender.com', // Render backend
        'https://frontend-axelblaze-projects.vercel.app',
        /\.vercel\.app$/, // allow all Vercel preview URLs
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-admin-key'],
}));
// Logging
app.use((0, morgan_1.default)('short'));
// Body parsing — capture raw body for webhook signature verification
app.use('/api/webhooks', express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString();
    },
}));
// Standard JSON parsing for other routes
app.use(express_1.default.json());
// ── UTM Capture (Phase A) ──
// Mounted BEFORE user-landing routes so utm_* params on incoming requests
// are normalized + validated and stashed on req.utmNormalized. No-op when
// no utm_* params present. Failures never break the user flow.
//
// IMPORTANT: only user-facing endpoints get this. /api/dashboard is an admin
// endpoint and has no user-attribution semantics — mounting the capture there
// would just waste cycles and pollute utm_violations with noise from internal
// dashboard polls. /api/airdrop covers POST /register, /api/track covers the
// landing + wallet_connect beacons.
app.use('/api/airdrop', (0, utmCapture_1.utmCapture)());
app.use('/api/track', (0, utmCapture_1.utmCapture)());
// ── Routes ──
app.use('/api/webhooks', webhook_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/airdrop', airdrop_1.default);
app.use('/api/positions', positions_1.default);
app.use('/api/leaderboard', leaderboard_1.default);
app.use('/api/badges', badges_1.default);
app.use('/api/events', events_1.default);
app.use('/api/snag', snag_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/funnels', funnels_1.default);
app.use('/api/attribution', attribution_1.default);
app.use('/api/cohorts', cohorts_1.default);
app.use('/api/stream', stream_1.default);
app.use('/api/users', users_1.default);
app.use('/api/track', track_1.default);
app.use('/api/pulse', pulse_1.default);
app.use('/api/utm', utm_1.default);
// ── Data Hub Static Dashboard ──
// Serves the SHIFT RWA Cross-Channel Data Hub frontend at /hub
app.use('/hub', express_1.default.static(path_1.default.join(__dirname, '../public'), {
    index: 'index.html',
    maxAge: '5m',
}));
app.get('/hub/*', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public', 'index.html'));
});
// ── Health Check ──
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'shift-airdrop-backend',
        version: '1.0.0',
        env: config_1.config.nodeEnv,
        uptime: Math.floor(process.uptime()),
    });
});
// ── Root ──
app.get('/', (_req, res) => {
    res.json({
        name: 'SHIFT Airdrop MVP',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            webhook: 'POST /api/webhooks/helius',
            dashboard: 'GET /api/dashboard/:wallet',
            positions: 'GET /api/positions/:wallet',
            leaderboard: 'GET /api/leaderboard',
            events: 'GET /api/events',
            stats: 'GET /api/stats',
            admin: {
                createEvent: 'POST /api/admin/events',
                listEvents: 'GET /api/admin/events',
                deactivateEvent: 'PATCH /api/admin/events/:id/deactivate',
                manualSync: 'POST /api/admin/sync',
            },
        },
    });
});
// ── Error Handler ──
app.use((err, _req, res, _next) => {
    console.error('[Error]', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});
// ── Start Server ──
async function startServer() {
    // CRITICAL FIX: Validate SNAG configuration on startup
    const snagValidation = (0, config_1.validateSnagConfig)();
    if (!snagValidation.valid) {
        console.warn('[SNAG] ⚠️  Configuration issues detected:');
        snagValidation.errors.forEach(err => console.warn(`  - ${err}`));
    }
    // Test database connection before starting (with 5 second timeout)
    try {
        const connectionPromise = pool_1.pool.connect();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout (5s)')), 5000));
        const client = await Promise.race([connectionPromise, timeoutPromise]);
        console.log('[Database] ✅ Connected successfully');
        client.release();
        // Run pending migrations automatically on every deploy
        try {
            await (0, migrationRunner_1.runMigrations)();
            console.log('[Database] ✅ Migrations applied');
        }
        catch (migErr) {
            console.warn('[Database] ⚠️  Migration warning:', migErr);
        }
    }
    catch (err) {
        console.warn('[Database] ⚠️  Connection test failed, but continuing:', err);
        // Don't exit - let the app start and retry connections on demand
    }
    app.listen(config_1.config.port, () => {
        console.log(`
╔══════════════════════════════════════════════╗
║     SHIFT AIRDROP MVP — Backend Server       ║
╠══════════════════════════════════════════════╣
║  Port:     ${String(config_1.config.port).padEnd(33)}║
║  Env:      ${config_1.config.nodeEnv.padEnd(33)}║
║  Helius:   ${config_1.config.heliusApiKey ? '✅ configured'.padEnd(33) : '⚠️  not configured'.padEnd(33)}║
║  SNAG:     ${config_1.config.snagApiKey ? '✅ configured'.padEnd(33) : '⚠️  not configured'.padEnd(33)}║
║  Jupiter:  ${config_1.config.jupiterPriceApi ? '✅ configured'.padEnd(33) : '⚠️  not configured'.padEnd(33)}║
╚══════════════════════════════════════════════╝
  `);
        // Initialize cron jobs
        (0, jobs_1.initCronJobs)();
    });
}
startServer().catch((err) => {
    console.error('[Startup] Failed to start server:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map