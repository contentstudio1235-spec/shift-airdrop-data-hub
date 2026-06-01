"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
const pg_1 = require("pg");
const config_1 = require("../config");
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
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