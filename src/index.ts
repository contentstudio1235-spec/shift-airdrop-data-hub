// ============================================================
// SHIFT Airdrop MVP — Main Entry Point
// ============================================================

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateSnagConfig } from './config';
import { initCronJobs } from './cron/jobs';
import { pool } from './db/pool';
import { runMigrations } from './db/migrationRunner';

// Routes
import webhookRoutes from './routes/webhook';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import airdropRoutes from './routes/airdrop';
import positionsRoutes from './routes/positions';
import leaderboardRoutes from './routes/leaderboard';
import badgesRoutes from './routes/badges';
import eventsRoutes from './routes/events';
import snagRoutes from './routes/snag';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import funnelsRoutes from './routes/funnels';
import attributionRoutes from './routes/attribution';
import cohortsRoutes from './routes/cohorts';
import streamRoutes from './routes/stream';
import usersRoutes from './routes/users';
import trackRoutes from './routes/track';
import pulseRoutes from './routes/pulse';
import utmRoutes from './routes/utm';
import hubTrustRouter from './routes/hubTrust';

// Middleware
import { utmCapture } from './middleware/utmCapture';

const app = express();

// ── Middleware ──

// Security headers
app.use(helmet());

// CORS — allow frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://airdrop.shift.xyz',
    'https://app.shiftrwa.xyz',         // official SHIFT app
    'https://airdrop.shiftrwa.xyz',     // airdrop subdomain
    'https://www.shiftrwa.xyz',
    'https://shiftrwa.xyz',
    'https://shift-airdrop-backend.onrender.com', // Render backend
    'https://frontend-axelblaze-projects.vercel.app',
    /\.vercel\.app$/,  // allow all Vercel preview URLs
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-admin-key'],
}));

// Logging
app.use(morgan('short'));

// Body parsing — capture raw body for webhook signature verification
app.use('/api/webhooks', express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// Standard JSON parsing for other routes
app.use(express.json());

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
app.use('/api/airdrop', utmCapture());
app.use('/api/track', utmCapture());

// ── Routes ──

app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/airdrop', airdropRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/snag', snagRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/funnels', funnelsRoutes);
app.use('/api/attribution', attributionRoutes);
app.use('/api/cohorts', cohortsRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/pulse', pulseRoutes);
app.use('/api/utm', utmRoutes);
app.use('/api/hub-trust', hubTrustRouter);

// ── Data Hub Static Dashboard ──
// Serves the SHIFT RWA Cross-Channel Data Hub frontend at /hub
app.use('/hub', express.static(path.join(__dirname, '../public'), {
  index: 'index.html',
  maxAge: '5m',
}));
app.get('/hub/*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ── Health Check ──

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'shift-airdrop-backend',
    version: '1.0.0',
    env: config.nodeEnv,
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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ──

async function startServer() {
  // CRITICAL FIX: Validate SNAG configuration on startup
  const snagValidation = validateSnagConfig();
  if (!snagValidation.valid) {
    console.warn('[SNAG] ⚠️  Configuration issues detected:');
    snagValidation.errors.forEach(err => console.warn(`  - ${err}`));
  }

  // Test database connection before starting (with 5 second timeout)
  try {
    const connectionPromise = pool.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout (5s)')), 5000)
    );

    const client = await Promise.race([connectionPromise, timeoutPromise]) as any;
    console.log('[Database] ✅ Connected successfully');
    client.release();

    // Run pending migrations automatically on every deploy
    try {
      await runMigrations();
      console.log('[Database] ✅ Migrations applied');
    } catch (migErr) {
      console.warn('[Database] ⚠️  Migration warning:', migErr);
    }
  } catch (err) {
    console.warn('[Database] ⚠️  Connection test failed, but continuing:', err);
    // Don't exit - let the app start and retry connections on demand
  }

  app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     SHIFT AIRDROP MVP — Backend Server       ║
╠══════════════════════════════════════════════╣
║  Port:     ${String(config.port).padEnd(33)}║
║  Env:      ${config.nodeEnv.padEnd(33)}║
║  Helius:   ${config.heliusApiKey ? '✅ configured'.padEnd(33) : '⚠️  not configured'.padEnd(33)}║
║  SNAG:     ${config.snagApiKey ? '✅ configured'.padEnd(33) : '⚠️  not configured'.padEnd(33)}║
║  Jupiter:  ${config.jupiterPriceApi ? '✅ configured'.padEnd(33) : '⚠️  not configured'.padEnd(33)}║
╚══════════════════════════════════════════════╝
  `);

    // Initialize cron jobs
    initCronJobs();

  });
}

startServer().catch((err) => {
  console.error('[Startup] Failed to start server:', err);
  process.exit(1);
});

export default app;
