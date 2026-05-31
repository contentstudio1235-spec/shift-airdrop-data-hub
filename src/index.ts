// ============================================================
// SHIFT Airdrop MVP — Main Entry Point
// ============================================================

import express from 'express';
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

    // ── Render free-tier keepalive ──
    // Render spins down free services after 15min of inactivity.
    // Self-ping every 10 minutes prevents spindown so cron keeps running.
    if (config.nodeEnv === 'production') {
      const backendUrl = config.backendUrl || `http://localhost:${config.port}`;
      setInterval(async () => {
        try {
          const http = await import('http');
          const url = new URL(`${backendUrl}/health`);
          const options = { hostname: url.hostname, port: url.port || 443, path: '/health', method: 'GET' };
          const proto = url.protocol === 'https:' ? await import('https') : http;
          (proto as any).get(`${backendUrl}/health`, (res: any) => {
            console.log(`[Keepalive] Self-ping /health → ${res.statusCode}`);
          }).on('error', (e: any) => {
            console.warn(`[Keepalive] Self-ping failed: ${e.message}`);
          });
        } catch (e) {
          // Non-fatal — cron will still run
        }
      }, 10 * 60 * 1000); // every 10 minutes
      console.log('[Keepalive] Self-ping enabled (every 10min) to prevent Render spindown');
    }
  });
}

startServer().catch((err) => {
  console.error('[Startup] Failed to start server:', err);
  process.exit(1);
});

export default app;
