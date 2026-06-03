"use strict";
/**
 * Fix sub-dollar and $1.00 floor positions
 *
 * Strategy: Estimate realistic RWA token prices from existing good positions
 * Then backfill positions that are stuck at $1.00 or underpriced
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false },
});
async function estimateTokenPrices() {
    console.log('[Fix] Estimating realistic RWA token prices from existing positions...\n');
    const estimates = new Map();
    // For each tracked RWA token, find positions with good USD values and calculate implied price per token
    const assets = ['TSL2L', 'TSL1S', 'SOX3L', 'SOX3S', 'SPX3L', 'SPX3S'];
    for (const asset of assets) {
        // Get positions with USD >= $5 (assuming these are correctly priced by Jupiter)
        const result = await pool.query(`SELECT 
        ROUND(AVG(CASE WHEN token_amount > 0 THEN position_size_usd / token_amount END)::numeric, 4) as implied_price,
        COUNT(*) as sample_size,
        MIN(position_size_usd) as min_usd,
        MAX(position_size_usd) as max_usd
       FROM positions
       WHERE asset = $1 AND status = 'open' AND position_size_usd >= 5
         AND token_amount > 0
       LIMIT 1`, [asset]);
        if (result.rows.length > 0 && result.rows[0].implied_price) {
            const price = parseFloat(result.rows[0].implied_price);
            estimates.set(asset, {
                symbol: asset,
                mint: '', // Will be filled separately
                estimatedPrice: price,
                source: `${result.rows[0].sample_size} positions with USD >= $5`,
            });
            console.log(`✓ ${asset}: $${price}/token (sample: ${result.rows[0].sample_size} positions)`);
        }
        else {
            console.log(`⚠️  ${asset}: No suitable reference positions found (need USD >= $5)`);
        }
    }
    return estimates;
}
async function backfillSubdollarPositions(estimates) {
    console.log('\n[Fix] Backfilling sub-dollar positions...\n');
    let backfilled = 0;
    const affectedWallets = new Set();
    for (const [asset, estimate] of estimates) {
        // Find all positions < $1 or exactly $1.00 for this asset
        const result = await pool.query(`SELECT id, wallet, token_amount, position_size_usd
       FROM positions
       WHERE asset = $1 AND status = 'open'
         AND (position_size_usd < 1 OR position_size_usd = 1)
         AND token_amount > 0
       ORDER BY opened_at DESC`, [asset]);
        if (result.rows.length === 0)
            continue;
        console.log(`  ${asset}: fixing ${result.rows.length} positions...`);
        for (const pos of result.rows) {
            // Recalculate USD value from token amount
            const newUSDValue = Math.max(1.00, parseFloat(pos.token_amount) * estimate.estimatedPrice);
            if (newUSDValue === parseFloat(pos.position_size_usd)) {
                continue; // No change needed
            }
            // Update position
            await pool.query(`UPDATE positions SET position_size_usd = $1 WHERE id = $2`, [newUSDValue, pos.id]);
            affectedWallets.add(pos.wallet);
            backfilled++;
            console.log(`    ✓ ${pos.wallet.slice(0, 8)}... | ${asset} | $${pos.position_size_usd} → $${newUSDValue.toFixed(2)}`);
        }
    }
    return backfilled;
}
async function recalculateAffectedWalletXP(wallets) {
    console.log(`\n[Fix] Recalculating XP for ${wallets.size} affected wallets...\n`);
    let usersUpdated = 0;
    for (const wallet of wallets) {
        // Reset last_xp_calc to force full retroactive recalculation
        await pool.query(`UPDATE positions 
       SET last_xp_calc = NULL, xp_generated = 0
       WHERE wallet = $1 AND status = 'open'
         AND asset IN ('TSL2L','TSL1S','SOX3L','SOX3S','SPX3L','SPX3S')`, [wallet]);
        // Zero out user XP so it recalculates from scratch
        await pool.query(`UPDATE users SET total_xp = 0 WHERE wallet = $1`, [wallet]);
        usersUpdated++;
        if (usersUpdated % 50 === 0) {
            console.log(`  ${usersUpdated}/${wallets.size} wallets reset for XP recalculation...`);
        }
    }
    console.log(`  ✓ Reset ${usersUpdated} wallets - XP will recalculate on next cron cycle`);
    return usersUpdated;
}
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    FIX SUB-DOLLAR & $1.00 FLOOR POSITIONS                  ║');
    console.log('║    Estimate RWA prices → Backfill → Recalc XP             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    try {
        // Step 1: Estimate prices
        const estimates = await estimateTokenPrices();
        if (estimates.size === 0) {
            console.log('\n❌ No reference positions found - cannot estimate prices');
            process.exit(1);
        }
        // Step 2: Backfill
        const backfilled = await backfillSubdollarPositions(estimates);
        console.log(`\n✅ Backfilled ${backfilled} positions`);
        // Step 3: Collect affected wallets and reset XP
        const affectedWallets = new Set();
        for (const asset of ['TSL2L', 'TSL1S', 'SOX3L', 'SOX3S', 'SPX3L', 'SPX3S']) {
            const result = await pool.query(`SELECT DISTINCT wallet FROM positions 
         WHERE asset = $1 AND status = 'open' 
         AND position_size_usd < 5`, [asset]);
            for (const row of result.rows) {
                affectedWallets.add(row.wallet);
            }
        }
        const usersReset = await recalculateAffectedWalletXP(affectedWallets);
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║ DONE! Next steps:                                          ║');
        console.log('║ 1. Wait 60 seconds for next cron cycle                    ║');
        console.log('║ 2. XP engine will recalculate all positions               ║');
        console.log('║ 3. Frontend will display updated USD values and XP        ║');
        console.log(`║                                                            ║`);
        console.log(`║ Backfilled: ${String(backfilled).padEnd(54)}║`);
        console.log(`║ Wallets reset for XP recalc: ${String(usersReset).padEnd(34)}║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
    }
    catch (error) {
        console.error('[Fix] Error:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
main();
//# sourceMappingURL=fix-subdollar-positions.js.map