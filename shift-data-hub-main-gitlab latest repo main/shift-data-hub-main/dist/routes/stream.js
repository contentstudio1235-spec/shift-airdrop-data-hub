"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/stream.ts
const express_1 = require("express");
const streamService_1 = require("../services/streamService");
const config_1 = require("../config");
const HEARTBEAT_MS = 15_000;
const router = (0, express_1.Router)();
router.get('/whales', (req, res) => {
    const adminKey = req.header('x-admin-key') ?? req.query.adminKey;
    if (!adminKey || adminKey !== config_1.config.adminKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const send = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    send({ type: 'hello', timestamp: new Date().toISOString() });
    const unsub = streamService_1.whalePubsub.subscribe((event) => send(event));
    const heartbeat = setInterval(() => {
        res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
    }, HEARTBEAT_MS);
    req.on('close', () => {
        unsub();
        clearInterval(heartbeat);
        res.end();
    });
});
exports.default = router;
//# sourceMappingURL=stream.js.map