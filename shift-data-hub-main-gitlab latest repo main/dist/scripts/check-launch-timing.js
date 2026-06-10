"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
    ssl: { rejectUnauthorized: false }
});
async function check() {
    try {
        // Get launch config from database
        const configRes = await pool.query(`SELECT config_value FROM config_storage WHERE config_key = 'launch_config' LIMIT 1`);
        console.log('\n=== LAUNCH CONFIG ===\n');
        if (configRes.rows.length > 0) {
            const config = JSON.parse(configRes.rows[0].config_value);
            console.log(`Launch Start Date: ${config.startDate || config.launchStartDate}`);
            console.log(`Week 1 Multiplier: ${config.week1Multiplier}x`);
            console.log(`Active: ${config.isActive}`);
        }
        // Get positions with timing
        const posRes = await pool.query(`
      SELECT 
        asset, 
        position_size_usd,
        xp_generated,
        opened_at
      FROM positions
      WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
      ORDER BY opened_at DESC
    `);
        console.log('\n=== POSITION TIMING ===\n');
        const now = new Date();
        console.log(`Current time: ${now.toISOString()}`);
        console.log('');
        posRes.rows.forEach((row) => {
            const opened = new Date(row.opened_at);
            const daysAgo = (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
            console.log(`${row.asset} opened: ${opened.toISOString()} (${daysAgo.toFixed(1)} days ago)`);
        });
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await pool.end();
    }
}
check();
//# sourceMappingURL=check-launch-timing.js.map