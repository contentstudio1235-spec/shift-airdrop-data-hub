"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false },
});
async function quickAudit() {
    console.log('[Audit] Quick audit of all positions...\n');
    try {
        // Get stats on zero-value positions
        console.log('1. Positions with $0 USD value:');
        console.log('-'.repeat(60));
        const zeroResult = await pool.query(`SELECT COUNT(*) as count, COUNT(DISTINCT wallet) as unique_wallets 
       FROM positions WHERE position_size_usd = 0 AND status = 'open'`);
        console.log(`   Total $0 positions: ${zeroResult.rows[0].count}`);
        console.log(`   Unique wallets affected: ${zeroResult.rows[0].unique_wallets}\n`);
        // Get wallets with ONLY zero-value positions
        console.log('2. Wallets with ONLY $0 positions:');
        console.log('-'.repeat(60));
        const onlyZeroResult = await pool.query(`SELECT wallet, COUNT(*) as pos_count
       FROM positions 
       WHERE status = 'open' 
       GROUP BY wallet
       HAVING MAX(position_size_usd) = 0 AND MIN(position_size_usd) = 0
       ORDER BY COUNT(*) DESC
       LIMIT 20`);
        console.log(`   Wallets: ${onlyZeroResult.rows.length}`);
        onlyZeroResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.wallet.slice(0, 20)}... (${row.pos_count} positions)`);
        });
        // Get summary statistics
        console.log('\n3. Position value distribution:');
        console.log('-'.repeat(60));
        const statsResult = await pool.query(`SELECT 
        COUNT(*) as total_positions,
        COUNT(DISTINCT wallet) as wallets_with_positions,
        SUM(CASE WHEN position_size_usd > 0 THEN 1 ELSE 0 END) as valued_positions,
        SUM(CASE WHEN position_size_usd = 0 THEN 1 ELSE 0 END) as zero_positions,
        ROUND(AVG(CASE WHEN position_size_usd > 0 THEN position_size_usd END)::numeric, 2) as avg_value,
        SUM(CASE WHEN position_size_usd > 0 THEN position_size_usd ELSE 0 END)::numeric as total_value
       FROM positions WHERE status = 'open'`);
        const stats = statsResult.rows[0];
        console.log(`   Total open positions: ${stats.total_positions}`);
        console.log(`   Valued positions: ${stats.valued_positions}`);
        console.log(`   Zero-value positions: ${stats.zero_positions} (${((stats.zero_positions / stats.total_positions) * 100).toFixed(1)}%)`);
        console.log(`   Average position value: $${stats.avg_value}`);
        console.log(`   Total portfolio value: $${parseFloat(stats.total_value).toFixed(2)}\n`);
        // Get sample of wallets with mixed positions
        console.log('4. Wallets with MIXED (some $0, some valued) positions:');
        console.log('-'.repeat(60));
        const mixedResult = await pool.query(`SELECT wallet, 
              COUNT(*) as total_pos,
              SUM(CASE WHEN position_size_usd > 0 THEN 1 ELSE 0 END) as valued,
              SUM(CASE WHEN position_size_usd = 0 THEN 1 ELSE 0 END) as zero,
              ROUND(SUM(CASE WHEN position_size_usd > 0 THEN position_size_usd ELSE 0 END)::numeric, 2) as total_value
       FROM positions 
       WHERE status = 'open'
       GROUP BY wallet
       HAVING MAX(position_size_usd) > 0 AND MIN(position_size_usd) = 0
       ORDER BY total_pos DESC
       LIMIT 15`);
        console.log(`   Wallets with mixed positions: ${mixedResult.rows.length} (showing first 15)\n`);
        mixedResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.wallet.slice(0, 20)}... | Total: ${row.total_pos} | Valued: ${row.valued} | Zero: ${row.zero} | Value: $${row.total_value}`);
        });
        console.log('\n[Audit] Complete');
    }
    catch (error) {
        console.error('[Audit] Error:', error);
    }
    finally {
        await pool.end();
    }
}
quickAudit();
//# sourceMappingURL=quick-audit.js.map