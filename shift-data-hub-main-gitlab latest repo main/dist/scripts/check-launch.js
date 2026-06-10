"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
    ssl: { rejectUnauthorized: false }
});
async function check() {
    try {
        // Check launch config table
        const configRes = await pool.query(`
      SELECT * FROM launch_config LIMIT 5
    `);
        console.log('\n=== LAUNCH CONFIG TABLE ===\n');
        if (configRes.rows.length > 0) {
            configRes.rows.forEach((row) => {
                console.log(JSON.stringify(row, null, 2));
            });
        }
        else {
            console.log('(no rows in launch_config)');
        }
        // Get current time vs launch start
        const positions = await pool.query(`
      SELECT MIN(opened_at) as earliest FROM positions
      WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
    `);
        console.log('\n=== TIMING ANALYSIS ===\n');
        const launchStart = new Date('2026-05-25T00:00:00Z');
        const now = new Date();
        const daysSinceLaunch = (now.getTime() - launchStart.getTime()) / (1000 * 60 * 60 * 24);
        console.log(`Launch started: ${launchStart.toISOString()}`);
        console.log(`Now: ${now.toISOString()}`);
        console.log(`Days since launch: ${daysSinceLaunch.toFixed(1)}`);
        console.log(`Expected phase: ${daysSinceLaunch < 7 ? 'WEEK 1 (3.0x)' : daysSinceLaunch < 14 ? 'WEEK 2 (2.0x)' : 'WEEK 3+ (1.0x)'}`);
        if (positions.rows[0]?.earliest) {
            const earliest = new Date(positions.rows[0].earliest);
            const daysFromLaunch = (earliest.getTime() - launchStart.getTime()) / (1000 * 60 * 60 * 24);
            console.log(`\nEarliest position opened: ${earliest.toISOString()}`);
            console.log(`Days from launch start: ${daysFromLaunch.toFixed(1)}`);
        }
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await pool.end();
    }
}
check();
//# sourceMappingURL=check-launch.js.map