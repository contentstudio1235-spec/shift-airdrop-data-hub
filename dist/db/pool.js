"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
const pg_1 = require("pg");
const config_1 = require("../config");
// Render Postgres internal URL: no SSL needed (same private network).
// Neon/external URLs: require SSL with rejectUnauthorized: false.
// Keep pool at 5 — enough for cron + webhooks + API requests without exhausting DB limits.
const isExternalDb = config_1.config.databaseUrl.includes('neon.tech') ||
    config_1.config.databaseUrl.includes('neon.db') ||
    config_1.config.databaseUrl.includes('ohio-postgres.render.com') || // Render external
    config_1.config.databaseUrl.includes('rlwy.net'); // Railway
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.databaseUrl,
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    ssl: isExternalDb ? { rejectUnauthorized: false } : false,
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[DB] Closing pool...');
    await exports.pool.end();
});
process.on('SIGINT', async () => {
    console.log('[DB] Closing pool...');
    await exports.pool.end();
});
async function query(text, params) {
    const result = await exports.pool.query(text, params);
    return result.rows;
}
async function queryOne(text, params) {
    const result = await exports.pool.query(text, params);
    return result.rows[0] || null;
}
async function execute(text, params) {
    const result = await exports.pool.query(text, params);
    return result.rowCount || 0;
}
//# sourceMappingURL=pool.js.map