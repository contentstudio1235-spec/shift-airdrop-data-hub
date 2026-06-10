"use strict";
// Configuration Service — System-wide settings management
// Allows non-coders to adjust anti-farm, multipliers, launch config, etc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.configService = exports.ConfigService = void 0;
const pool_1 = require("../db/pool");
const adminAuditService_1 = require("./adminAuditService");
class ConfigService {
    cache = new Map();
    cacheTTLMs = 60000;
    async getConfig(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTLMs) {
            return cached.value;
        }
        const result = await (0, pool_1.queryOne)(`SELECT setting_value FROM airdrop_config WHERE setting_key = $1`, [key]);
        if (!result) {
            console.warn(`[ConfigService] Key not found: ${key}`);
            return null;
        }
        const value = typeof result.setting_value === 'string'
            ? JSON.parse(result.setting_value)
            : result.setting_value;
        this.cache.set(key, { value, timestamp: Date.now() });
        return value;
    }
    async getAllConfig() {
        const results = await (0, pool_1.query)(`SELECT setting_key, setting_value FROM airdrop_config ORDER BY setting_key`);
        const config = {};
        for (const row of results) {
            const value = typeof row.setting_value === 'string'
                ? JSON.parse(row.setting_value)
                : row.setting_value;
            config[row.setting_key] = value;
        }
        return config;
    }
    async setConfig(key, newValue, adminWallet, reason) {
        this.validateConfig(key, newValue);
        const oldValue = await this.getConfig(key);
        await (0, pool_1.execute)(`UPDATE airdrop_config SET setting_value = $1, updated_by = $2, updated_at = NOW() WHERE setting_key = $3`, [JSON.stringify(newValue), adminWallet, key]);
        this.cache.delete(key);
        await adminAuditService_1.adminAuditService.log('config_updated', 'config', key, oldValue, newValue, reason, adminWallet);
        console.log(`[ConfigService] Updated ${key}`);
    }
    validateConfig(key, value) {
        switch (key) {
            case 'anti_farm':
                if (value.minPositionSizeUSD < 0)
                    throw new Error('minPositionSizeUSD >= 0');
                if (value.minHoldHours < 0)
                    throw new Error('minHoldHours >= 0');
                break;
            case 'multiplier_progression':
                if (value.maxMultiplier < 1)
                    throw new Error('maxMultiplier >= 1.0');
                break;
            case 'launch_config':
                if (value.week1Multiplier < 1)
                    throw new Error('week1Multiplier >= 1.0');
                break;
            case 'referral_bonuses':
                if (value.kolDynamicMultiplier < 1)
                    throw new Error('kolDynamicMultiplier >= 1.0');
                break;
            case 'tracked_tokens':
                if (!Array.isArray(value))
                    throw new Error('tracked_tokens must be array');
                break;
            default:
                break;
        }
    }
    clearCache(key) {
        if (key)
            this.cache.delete(key);
        else
            this.cache.clear();
    }
    async getConfigHistory(key, limit = 50) {
        return (0, pool_1.query)(`SELECT admin_wallet, old_value, new_value, reason, created_at FROM admin_logs
       WHERE resource_type = 'config' AND resource_id = $1 ORDER BY created_at DESC LIMIT $2`, [key, limit]);
    }
}
exports.ConfigService = ConfigService;
exports.configService = new ConfigService();
//# sourceMappingURL=configService.js.map