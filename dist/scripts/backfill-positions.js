"use strict";
/**
 * Backfill positions with correct USD values
 * Fixes positions created with $0 USD due to Helius webhook handler issue
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
// Use external database URL directly (not config which may have internal hostname)
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
});
async function backfillPositions() {
    console.log('[Backfill] Starting position USD value corrections...\n');
    try {
        const updates = [
            {
                name: 'deeweb3grul',
                wallet: '5hv5DaEnKCZgxbKX55YS8ez16V2P5LwZjYwrKBZHNppt',
                asset: 'SOX3S',
                usdValue: 1.79,
                timeMin: '2026-05-29 11:30:00',
                timeMax: '2026-05-29 11:40:00',
            },
            {
                name: 'promisecase',
                wallet: '2ADhLm8mvjVwuMozVkPr8b3GwWuob636AnWsGcSCFAxy',
                asset: 'TSL1S',
                usdValue: 1.56,
                timeMin: '2026-05-29 12:15:00',
                timeMax: '2026-05-29 12:20:00',
            },
            {
                name: 'unknown-wallet',
                wallet: 'CNQEVQsUbCkkJGENSuE5GxNmyvwBYDS4Py8TSALuEyZo',
                asset: 'SOX3S',
                usdValue: 1.68,
                timeMin: '2026-05-29 11:55:00',
                timeMax: '2026-05-29 12:00:00',
            },
        ];
        for (const update of updates) {
            const result = await pool.query(`UPDATE positions
         SET position_size_usd = $1
         WHERE wallet = $2
           AND asset = $3
           AND status = 'open'
           AND position_size_usd = 0
           AND opened_at BETWEEN $4::timestamp AND $5::timestamp`, [update.usdValue, update.wallet, update.asset, update.timeMin, update.timeMax]);
            console.log(`[Backfill] ${update.name} (${update.asset}): Updated ${result.rowCount} position(s) to $${update.usdValue}`);
        }
        // Verify
        console.log('\n[Backfill] Verification:');
        const result = await pool.query(`SELECT wallet, asset, position_size_usd, opened_at, status
       FROM positions
       WHERE wallet IN ($1, $2, $3)
       ORDER BY opened_at DESC`, [
            '5hv5DaEnKCZgxbKX55YS8ez16V2P5LwZjYwrKBZHNppt',
            '2ADhLm8mvjVwuMozVkPr8b3GwWuob636AnWsGcSCFAxy',
            'CNQEVQsUbCkkJGENSuE5GxNmyvwBYDS4Py8TSALuEyZo',
        ]);
        result.rows.forEach(row => {
            console.log(`  ${row.wallet.slice(0, 20)}... | ${row.asset} | $${row.position_size_usd} | ${row.opened_at} | ${row.status}`);
        });
        console.log(`\n[Backfill] Success! Updated ${result.rows.filter(r => r.position_size_usd > 0).length} positions`);
    }
    catch (error) {
        console.error('[Backfill] Error:', error);
    }
    finally {
        await pool.end();
    }
}
// Run the backfill
backfillPositions();
//# sourceMappingURL=backfill-positions.js.map