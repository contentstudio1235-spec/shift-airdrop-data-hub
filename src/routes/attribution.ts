// src/routes/attribution.ts
import { Router, type Request, type Response } from 'express';
import {
  computeChannelROI,
  computeWhaleOrigins,
  computeTopCampaigns,
  computeAttributionCoverage,
  computeKOLLeaderboard,
} from '../services/attributionService';
import { fetchInitialWhales, pollNewWhales } from '../services/whaleStreamService';
import { parseQueryParams } from '../lib/queryParams';
import { config } from '../config';

const router = Router();

router.use((req: Request, res: Response, next) => {
  const headerKey = req.header('x-admin-key');
  const queryKey = typeof req.query.adminKey === 'string' ? req.query.adminKey : undefined;
  const key = headerKey ?? queryKey;
  if (!key || key !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/channel-roi', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeChannelROI(params);
    res.json({
      rows: result,
      computedAt: new Date().toISOString(),
      dataQuality: 'sprint_2_3_live',
      note: 'UTM-first with referred_by_code fallback. UTM data accrues post Sprint 2.3 (deployed 2026-06-03).',
    });
  } catch (err) {
    console.error('[attribution/channel-roi]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const [channels, campaigns, coverage] = await Promise.all([
      computeChannelROI(params),
      computeTopCampaigns(params, 10),
      computeAttributionCoverage(params),
    ]);
    res.json({
      channels,
      campaigns,
      coverage,
      computedAt: new Date().toISOString(),
      dataQuality: 'sprint_2_3_live',
      note: 'UTM-first attribution. Stitching activated Sprint 2.3 (2026-06-03) — UTM coverage grows daily as new traffic lands.',
    });
  } catch (err) {
    console.error('[attribution/overview]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/kol-leaderboard', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? Math.floor(limitRaw) : 50;
    const result = await computeKOLLeaderboard(params, limit);
    res.json(result);
  } catch (err) {
    console.error('[attribution/kol-leaderboard]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/whale-origins', async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req.query as Record<string, string>);
    const result = await computeWhaleOrigins(params);
    res.json(result);
  } catch (err) {
    console.error('[attribution/whale-origins]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

const MAX_STREAM_CONNECTIONS = 10;
let activeStreams = 0;

router.get('/whale-stream', async (req: Request, res: Response) => {
  if (activeStreams >= MAX_STREAM_CONNECTIONS) {
    return res.status(503).json({ error: 'stream_capacity_reached' });
  }
  activeStreams++;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  let closed = false;
  req.on('close', () => { closed = true; activeStreams--; });

  try {
    const initial = await fetchInitialWhales(20);
    for (const event of initial) {
      res.write(`event: whale\ndata: ${JSON.stringify(event)}\n\n`);
    }

    let cursor = initial.length > 0 ? new Date(initial[0].openedAt) : new Date();
    const pollInterval = 5000;
    const heartbeatInterval = 30000;
    let lastHeartbeat = Date.now();

    while (!closed) {
      await new Promise(r => setTimeout(r, pollInterval));
      if (closed) break;
      const events = await pollNewWhales(cursor);
      for (const event of events) {
        res.write(`event: whale\ndata: ${JSON.stringify(event)}\n\n`);
        const t = new Date(event.openedAt);
        if (t > cursor) cursor = t;
      }
      if (Date.now() - lastHeartbeat >= heartbeatInterval) {
        res.write(`event: ping\ndata: {}\n\n`);
        lastHeartbeat = Date.now();
      }
    }
  } catch (err) {
    console.error('[attribution/whale-stream]', err);
  } finally {
    res.end();
  }
});

export default router;
