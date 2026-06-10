"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/cohorts.ts
const express_1 = require("express");
const cohortService_1 = require("../services/cohortService");
const queryParams_1 = require("../lib/queryParams");
const config_1 = require("../config");
const VALID_DIMS = ['day', 'week', 'month'];
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    const adminKey = req.header('x-admin-key');
    if (!adminKey || adminKey !== config_1.config.adminKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
});
router.get('/:dim', async (req, res) => {
    const { dim } = req.params;
    if (!VALID_DIMS.includes(dim)) {
        return res.status(400).json({ error: `invalid cohort dim: ${dim}` });
    }
    try {
        const params = (0, queryParams_1.parseQueryParams)(req.query);
        const result = await (0, cohortService_1.computeCohortMatrix)(dim, params);
        res.json(result);
    }
    catch (err) {
        console.error('[cohorts]', err);
        res.status(500).json({ error: 'internal_error' });
    }
});
exports.default = router;
//# sourceMappingURL=cohorts.js.map