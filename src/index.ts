// ============================================================
// SHIFT Airdrop MVP — Main Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { initCronJobs } from './cron/jobs';

// Routes
import webhookRoutes from './routes/webhook';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import positionsRoutes from './routes/positions';
import leaderboardRoutes from './routes/leaderboard';
import badgesRoutes from './routes/badges';
import eventsRoutes from './routes/events';

const app = express();

// ── Middleware ──

// Security headers
app.use(helmet());

// CORS — allow frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://airdrop.shift.xyz',
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
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
app.use('/api/positions', positionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/events', eventsRoutes);

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

export default app;
