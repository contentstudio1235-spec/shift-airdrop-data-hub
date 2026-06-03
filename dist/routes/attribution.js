"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/attribution.ts
const express_1 = require("express");
const attributionService_1 = require("../services/attributionService");
const queryParams_1 = require("../lib/queryParams");
const config_1 = require("../config");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    const adminKey = req.header('x-admin-key');
    if (!adminKey || adminKey !== config_1.config.adminKey) {
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
            dataQuality: 'sprint_0_placeholder',
            note: 'Source attribution uses referred_by_code only. Full UTM stitching lands per Tracking Specialist spec in later sprint.',
        });
    }
    catch (err) {
        console.error('[attribution/channel-roi]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
router.get('/whale-origins', async (req, res) => {
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const result = await (0, attributionService_1.computeWhaleOrigins)(params);
        res.json({
            edges: result,
            computedAt: new Date().toISOString(),
            dataQuality: 'sprint_0_placeholder',
            note: 'Source attribution uses referred_by_code only. Full UTM stitching lands per Tracking Specialist spec in later sprint.',
        });
    }
    catch (err) {
        console.error('[attribution/whale-origins]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
exports.default = router;
//# sourceMappingURL=attribution.js.map