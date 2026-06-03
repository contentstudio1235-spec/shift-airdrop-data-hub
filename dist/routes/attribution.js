"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/attribution.ts
const express_1 = require("express");
const attributionService_1 = require("../services/attributionService");
const whaleStreamService_1 = require("../services/whaleStreamService");
const queryParams_1 = require("../lib/queryParams");
const config_1 = require("../config");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    const headerKey = req.header('x-admin-key');
    const queryKey = typeof req.query.adminKey === 'string' ? req.query.adminKey : undefined;
    const key = headerKey ?? queryKey;
    if (!key || key !== config_1.config.adminKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
});
router.get('/channel-roi', async (req, res) => {
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const result = await (0, attributionService_1.computeChannelROI)(params);
        res.json({
            rows: result,
            computedAt: new Date().toISOString(),
            dataQuality: 'sprint_2_3_live',
            note: 'UTM-first with referred_by_code fallback. UTM data accrues post Sprint 2.3 (deployed 2026-06-03).',
        });
    }
    catch (err) {
        console.error('[attribution/channel-roi]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
router.get('/overview', async (req, res) => {
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const [channels, campaigns, coverage] = await Promise.all([
            (0, attributionService_1.computeChannelROI)(params),
            (0, attributionService_1.computeTopCampaigns)(params, 10),
            (0, attributionService_1.computeAttributionCoverage)(params),
        ]);
        res.json({
            channels,
            campaigns,
            coverage,
            computedAt: new Date().toISOString(),
            dataQuality: 'sprint_2_3_live',
            note: 'UTM-first attribution. Stitching activated Sprint 2.3 (2026-06-03) — UTM coverage grows daily as new traffic lands.',
        });
    }
    catch (err) {
        console.error('[attribution/overview]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
router.get('/kol-leaderboard', async (req, res) => {
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? Math.floor(limitRaw) : 50;
        const result = await (0, attributionService_1.computeKOLLeaderboard)(params, limit);
        res.json(result);
    }
    catch (err) {
        console.error('[attribution/kol-leaderboard]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
router.get('/whale-origins', async (req, res) => {
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const result = await (0, attributionService_1.computeWhaleOrigins)(params);
        res.json(result);
    }
    catch (err) {
        console.error('[attribution/whale-origins]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
const MAX_STREAM_CONNECTIONS = 10;
let activeStreams = 0;
router.get('/whale-stream', async (req, res) => {
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
    // Per Database Optimizer review (docs/db/sprint-3-query-review.md): keep the
    // close handler for cooperative shutdown but make `finally` the authoritative
    // decrement so a torn-down TCP connection (no clean FIN) or a poll-loop throw
    // cannot leak the slot. activeStreams-- runs exactly once in the finally block.
    req.on('close', () => { closed = true; });
    try {
        const initial = await (0, whaleStreamService_1.fetchInitialWhales)(20);
        for (const event of initial) {
            res.write(`event: whale\ndata: ${JSON.stringify(event)}\n\n`);
        }
        let cursor = initial.length > 0 ? new Date(initial[0].openedAt) : new Date();
        const pollInterval = 5000;
        const heartbeatInterval = 30000;
        let lastHeartbeat = Date.now();
        while (!closed) {
            await new Promise(r => setTimeout(r, pollInterval));
            if (closed)
                break;
            const events = await (0, whaleStreamService_1.pollNewWhales)(cursor);
            for (const event of events) {
                res.write(`event: whale\ndata: ${JSON.stringify(event)}\n\n`);
                const t = new Date(event.openedAt);
                if (t > cursor)
                    cursor = t;
            }
            if (Date.now() - lastHeartbeat >= heartbeatInterval) {
                res.write(`event: ping\ndata: {}\n\n`);
                lastHeartbeat = Date.now();
            }
        }
    }
    catch (err) {
        console.error('[attribution/whale-stream]', err);
    }
    finally {
        activeStreams--;
        res.end();
    }
});
exports.default = router;
//# sourceMappingURL=attribution.js.map