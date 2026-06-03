#!/usr/bin/env node
"use strict";
// ============================================================
// Backfill Entry Prices — Extract from blockchain via Helius
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = require("../db/pool");
const positionService_1 = require("../services/positionService");
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  SHIFT Airdrop — P&L Entry Price Backfill               ║
║  Extracts swap prices from blockchain via Helius        ║
╚══════════════════════════════════════════════════════════╝
`);
    const startTime = Date.now();
    try {
        // Verify database connection
        console.log('[Setup] Testing database connection...');
        const testConnection = await pool_1.pool.query('SELECT 1');
        if (testConnection.rows[0]['?column?'] === 1) {
            console.log('[Setup] ✅ Database connected\n');
        }
        // Run backfill
        const result = await positionService_1.positionService.backfillEntryPrices();
        // Summary
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`╔══════════════════════════════════════════════════════════╗`);
        console.log(`║  Results                                                 ║`);
        console.log(`╠══════════════════════════════════════════════════════════╣`);
        console.log(`║  Total positions:     ${String(result.total).padEnd(46)}║`);
        console.log(`║  Updated:             ${String(result.updated).padEnd(46)}║`);
        console.log(`║  Failed:              ${String(result.failed).padEnd(46)}║`);
        console.log(`║  Elapsed:             ${String(`${elapsed}s`).padEnd(46)}║`);
        console.log(`╚══════════════════════════════════════════════════════════╝`);
        // Verification query
        console.log('\n[Verification] Checking database state...');
        const checkResult = await pool_1.pool.query(`SELECT
        COUNT(*) as total_positions,
        COUNT(CASE WHEN price_at_open IS NOT NULL THEN 1 END) as with_prices,
        COUNT(CASE WHEN price_at_open IS NULL THEN 1 END) as without_prices
       FROM positions
       WHERE status = 'open'`);
        const stats = checkResult.rows[0];
        console.log(`   Total open positions: ${stats.total_positions}`);
        console.log(`   With entry prices: ${stats.with_prices}`);
        console.log(`   Without entry prices: ${stats.without_prices}`);
        if (result.updated === 0 && result.total === 0) {
            console.log('\n✅ All positions already have entry prices!');
        }
        else if (result.failed === 0) {
            console.log(`\n✅ Backfill successful! ${result.updated}/${result.total} positions updated.`);
        }
        else {
            console.log(`\n⚠️  Backfill complete with ${result.failed} failures. Review Helius API logs.`);
        }
        process.exit(0);
    }
    catch (err) {
        console.error('\n❌ Backfill failed:');
        console.error(err);
        process.exit(1);
    }
    finally {
        await pool_1.pool.end();
    }
}
main();
//# sourceMappingURL=backfill-entry-prices.js.map