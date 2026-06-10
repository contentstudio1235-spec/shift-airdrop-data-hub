"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const child_process_1 = require("child_process");
const util_1 = require("util");
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false },
});
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function backfillWallet() {
    const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
    console.log('[Backfill] Starting backfill for wallet: ' + wallet + '\n');
    try {
        // Estimate USD values based on token amounts
        // Using leverage token pricing model: ~$10-15 per unit for these RWA tokens
        const estimates = [
            { asset: 'SPX3S', tokenAmount: 0.07428073, estimatedUsd: 0.74 },
            { asset: 'SOX3L', tokenAmount: 0.02211808, estimatedUsd: 0.22 },
            { asset: 'SPX3L', tokenAmount: 0.00704261, estimatedUsd: 0.07 },
            { asset: 'TSL1S', tokenAmount: 0.03802293, estimatedUsd: 0.38 },
            { asset: 'SPX3L', tokenAmount: 0.00704261, estimatedUsd: 0.07 },
            { asset: 'SOX3S', tokenAmount: 0.31855124, estimatedUsd: 3.19 },
            { asset: 'TSL2L', tokenAmount: 0.12330239, estimatedUsd: 1.23 },
        ];
        console.log('[Backfill] Estimated USD values based on token amounts:\n');
        let totalEstimatedUsd = 0;
        for (const est of estimates) {
            console.log(`  ${est.asset}: ${est.tokenAmount.toFixed(8)} tokens -> $${est.estimatedUsd.toFixed(2)}`);
            totalEstimatedUsd += est.estimatedUsd;
        }
        console.log(`\nTotal Estimated Value: $${totalEstimatedUsd.toFixed(2)}\n`);
        // Update positions with estimated USD values
        console.log('[Backfill] Updating positions...\n');
        let updateCount = 0;
        for (const est of estimates) {
            const result = await pool.query(`UPDATE positions
         SET position_size_usd = $1
         WHERE wallet = $2 AND asset = $3 AND status = 'open' AND position_size_usd = 0 AND token_amount = $4
         RETURNING id`, [est.estimatedUsd, wallet, est.asset, est.tokenAmount]);
            if (result.rows.length > 0) {
                updateCount++;
                console.log(`  Updated ${est.asset}: $${est.estimatedUsd.toFixed(2)}`);
            }
        }
        console.log(`\n[Backfill] Updated ${updateCount} positions`);
        // Recalculate user XP
        console.log('\n[Backfill] Recalculating user XP...');
        const xpResult = await pool.query(`SELECT SUM(
         CASE WHEN position_size_usd > 0 
              THEN FLOOR(LOG(position_size_usd) * 100 * 1.25 * 2) 
              ELSE 0 
         END
       ) as total_xp
       FROM positions 
       WHERE wallet = $1 AND status = 'open'`, [wallet]);
        const estimatedXp = Math.max(0, Math.floor((xpResult.rows[0]?.total_xp || 0) * 4 / 7)); // 4 days held
        console.log(`  Estimated XP earned: ${estimatedXp}`);
        // Update user total XP
        await pool.query(`UPDATE users SET total_xp = total_xp + $1 WHERE wallet = $2`, [estimatedXp, wallet]);
        // Verify
        console.log('\n[Backfill] Verification:');
        const verifyResult = await pool.query(`SELECT SUM(position_size_usd) as total_usd FROM positions WHERE wallet = $1 AND status = 'open'`, [wallet]);
        const userResult = await pool.query(`SELECT total_xp, claim_multiplier FROM users WHERE wallet = $1`, [wallet]);
        console.log(`  Total USD in open positions: $${(verifyResult.rows[0]?.total_usd || 0).toFixed(2)}`);
        console.log(`  User Total XP: ${userResult.rows[0]?.total_xp || 0}`);
        console.log(`  Claim Multiplier: ${userResult.rows[0]?.claim_multiplier || 'N/A'}x`);
        console.log('\n[Backfill] SUCCESS! User wallet backfilled.');
    }
    catch (error) {
        console.error('[Backfill] Error:', error);
    }
    finally {
        await pool.end();
    }
}
backfillWallet();
//# sourceMappingURL=backfill-wallet-cr2f.js.map