"use strict";
// ============================================================
// Pulse Route — GET /api/pulse/snapshot
// ============================================================
// Single read-only endpoint that returns the full Pulse-tab
// payload. Auth: same `x-admin-key` header as the rest of the
// admin/data-hub surface.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("../config");
const pulseService_1 = require("../services/pulseService");
const router = (0, express_1.Router)();
// Admin-key gate — mirror users.ts / admin.ts pattern.
router.use((req, res, next) => {
    const adminKey = req.header('x-admin-key');
    if (!adminKey || adminKey !== config_1.config.adminKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
});
/**
 * GET /api/pulse/snapshot
 * Returns the entire Pulse snapshot (see src/types/pulse.ts).
 */
router.get('/snapshot', async (_req, res) => {
    try {
        const snapshot = await (0, pulseService_1.getPulseSnapshot)();
        res.json(snapshot);
    }
    catch (err) {
        console.error('[pulse/snapshot]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
exports.default = router;
//# sourceMappingURL=pulse.js.map