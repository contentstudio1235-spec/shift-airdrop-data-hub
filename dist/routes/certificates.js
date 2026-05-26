"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pool_1 = require("../db/pool");
const router = express_1.default.Router();
/**
 * GET /api/certificates/:wallet
 * Get all certificates earned by a user (public endpoint)
 */
router.get('/:wallet', async (req, res) => {
    try {
        const { wallet } = req.params;
        const certs = await pool_1.pool.query(`SELECT uc.id, c.name, c.display_name, c.category, c.multiplier_value, c.multiplier_type, 
              c.is_soulbound, c.icon_url, uc.awarded_at, uc.revoked_at
       FROM user_certificates uc
       JOIN certificates c ON uc.certificate_id = c.id
       WHERE uc.wallet = $1 AND uc.revoked_at IS NULL
       ORDER BY uc.awarded_at DESC`, [wallet]);
        const totalMultiplier = certs.rows.reduce((sum, cert) => {
            if (cert.multiplier_type === 'off_ceiling') {
                return sum; // Off-ceiling counted separately
            }
            return sum + (cert.multiplier_value - 1.0);
        }, 0);
        const offCeilingBonus = certs.rows
            .filter(c => c.multiplier_type === 'off_ceiling')
            .reduce((sum, c) => sum + (c.multiplier_value - 1.0), 0);
        res.json({
            success: true,
            wallet,
            certificates: certs.rows,
            count: certs.rows.length,
            multiplier_boost: totalMultiplier,
            off_ceiling_bonus: offCeilingBonus,
        });
    }
    catch (error) {
        console.error('[Certificates API] Failed to fetch user certificates:', error);
        res.status(500).json({ error: 'Failed to fetch user certificates' });
    }
});
/**
 * GET /api/certificates/category/:category
 * Get all certificates in a specific category (public endpoint)
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const certs = await pool_1.pool.query(`SELECT id, name, display_name, description, icon_url, multiplier_value, 
              multiplier_type, is_soulbound, is_off_ceiling, scarcity_cap
       FROM certificates
       WHERE category = $1 AND is_active = true
       ORDER BY display_name`, [category]);
        res.json({
            success: true,
            category,
            certificates: certs.rows,
            count: certs.rows.length,
        });
    }
    catch (error) {
        console.error('[Certificates API] Failed to fetch category certificates:', error);
        res.status(500).json({ error: 'Failed to fetch category certificates' });
    }
});
exports.default = router;
//# sourceMappingURL=certificates.js.map