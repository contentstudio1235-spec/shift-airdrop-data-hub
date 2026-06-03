"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
    ssl: { rejectUnauthorized: false }
});
async function check() {
    try {
        const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
        console.log('\n=== TABLES IN DATABASE ===\n');
        tablesRes.rows.forEach((row) => {
            console.log(`- ${row.table_name}`);
        });
        // Check for environment variable showing launch date
        console.log(`\n=== LAUNCH CONFIG FROM CODE ===\n`);
        console.log(`LAUNCH_START_DATE env: ${process.env.LAUNCH_START_DATE || 'NOT SET (default: 2026-05-25T00:00:00Z)'}`);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await pool.end();
    }
}
check();
//# sourceMappingURL=check-tables.js.map