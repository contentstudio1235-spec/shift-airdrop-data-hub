"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/funnels.ts
const express_1 = require("express");
const funnelService_1 = require("../services/funnelService");
const queryParams_1 = require("../lib/queryParams");
const config_1 = require("../config");
const VALID_FUNNELS = [
    'acquisition',
    'activation',
    'conversion',
    'whale_pipeline',
    'loyalty',
    'referral',
    'retention',
];
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    const adminKey = req.header('x-admin-key');
    if (!adminKey || adminKey !== config_1.config.adminKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
});
router.get('/:funnelId', async (req, res) => {
    const { funnelId } = req.params;
    if (!VALID_FUNNELS.includes(funnelId)) {
        return res.status(400).json({ error: `invalid funnel id: ${funnelId}` });
    }
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const result = await (0, funnelService_1.computeFunnel)(funnelId, params);
        res.json(result);
    }
    catch (err) {
        console.error('[funnels]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
exports.default = router;
//# sourceMappingURL=funnels.js.map