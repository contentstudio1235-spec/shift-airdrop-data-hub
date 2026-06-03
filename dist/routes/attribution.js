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