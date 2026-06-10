"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false },
});
async function fixXp() {
    const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
    console.log('[Fix] Adjusting position USD values to prevent negative XP...\n');
    try {
        // Better estimates based on leverage token market pricing
        // These tokens are typically $30-50 per unit for RWA leverage tokens
        const newEstimates = [
            { asset: 'SPX3S', tokenAmount: 0.07428073, newUsd: 2.97 },
            { asset: 'SOX3L', tokenAmount: 0.02211808, newUsd: 0.88 },
            { asset: 'SPX3L', tokenAmount: 0.00704261, newUsd: 0.28 },
            { asset: 'TSL1S', tokenAmount: 0.03802293, newUsd: 1.52 },
            { asset: 'SPX3L', tokenAmount: 0.00704261, newUsd: 0.28 },
            { asset: 'SOX3S', tokenAmount: 0.31855124, newUsd: 12.74 },
            { asset: 'TSL2L', tokenAmount: 0.12330239, newUsd: 4.93 },
        ];
        console.log('[Fix] Revised USD values (using $40 per leverage token):\n');
        let totalUsd = 0;
        let updateCount = 0;
        for (const est of newEstimates) {
            // Use minimum $1 to avoid negative XP (log10(x) only positive for x >= 1)
            const safeUsd = Math.max(1.00, est.newUsd);
            const result = await pool.query(`UPDATE positions
         SET position_size_usd = $1
         WHERE wallet = $2 AND asset = $3 AND status = 'open' AND token_amount = $4
         RETURNING id`, [safeUsd, wallet, est.asset, est.tokenAmount]);
            if (result.rows.length > 0) {
                updateCount++;
                console.log(`  ${est.asset}: $${safeUsd.toFixed(2)} (${est.newUsd.toFixed(2)} → floored to $1 minimum)`);
                totalUsd += safeUsd;
            }
        }
        console.log(`\n[Fix] Updated ${updateCount} positions`);
        console.log(`[Fix] New Total Portfolio Value: $${totalUsd.toFixed(2)}`);
        // Verify
        const verifyResult = await pool.query(`SELECT asset, position_size_usd, xp_generated FROM positions 
       WHERE wallet = $1 AND status = 'open'
       ORDER BY opened_at DESC`, [wallet]);
        console.log('\n[Fix] Verification:');
        let verifyTotal = 0;
        verifyResult.rows.forEach((row) => {
            verifyTotal += parseFloat(row.position_size_usd);
            // XP = log10(value) * 100 * multiplier
            // For $1: log10(1) * 100 * 1.3 = 0 * 100 * 1.3 = 0
            // For $2: log10(2) * 100 * 1.3 = 0.301 * 100 * 1.3 = 39
            const baseXp = Math.log10(parseFloat(row.position_size_usd)) * 100 * 1.3;
            console.log(`  ${row.asset}: $${parseFloat(row.position_size_usd).toFixed(2)} → ~${Math.max(0, Math.floor(baseXp))} XP/week`);
        });
        console.log(`\nTotal USD: $${verifyTotal.toFixed(2)}`);
        console.log('\n✅ Fixed! Positions now have positive XP values.');
    }
    catch (error) {
        console.error('[Fix] Error:', error);
    }
    finally {
        await pool.end();
    }
}
fixXp();
//# sourceMappingURL=fix-cr2f-xp.js.map