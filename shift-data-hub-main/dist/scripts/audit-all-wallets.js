"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false },
});
async function auditAllWallets() {
    console.log('[Audit] Starting comprehensive wallet audit...\n');
    try {
        // Get all users who have connected
        const usersResult = await pool.query(`SELECT wallet, total_xp, created_at FROM users WHERE created_at IS NOT NULL ORDER BY created_at DESC`);
        console.log(`[Audit] Found ${usersResult.rows.length} connected wallets\n`);
        console.log('[Audit] Analyzing positions for XP discrepancies...\n');
        const auditResults = [];
        let needsBackfillCount = 0;
        for (const user of usersResult.rows) {
            const wallet = user.wallet;
            // Get all positions for this wallet
            const posResult = await pool.query(`SELECT asset, position_size_usd, opened_at, daysHeld
         FROM positions
         WHERE wallet = $1 AND status = 'open'`, [wallet]);
            if (posResult.rows.length === 0)
                continue;
            const positions = posResult.rows;
            let totalValue = 0;
            let zeroUsdCount = 0;
            let calculatedXpPerWeek = 0;
            // Calculate expected XP based on positions
            for (const pos of positions) {
                const usdValue = parseFloat(pos.position_size_usd);
                totalValue += usdValue;
                if (usdValue <= 0) {
                    zeroUsdCount++;
                }
                else {
                    // XP = log10(value) * 100 * multiplier
                    const baseXp = Math.log10(usdValue) * 100 * 1.25; // 1.25 is average multiplier
                    calculatedXpPerWeek += Math.max(0, baseXp);
                }
            }
            // Calculate minimum expected XP (4 days is minimum threshold)
            const createdDate = new Date(user.created_at);
            const now = new Date();
            const daysActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            const weeksActive = daysActive / 7;
            const expectedXpMinimum = Math.floor(calculatedXpPerWeek * Math.min(weeksActive, 0.57)); // 4 days minimum
            const currentXp = parseFloat(user.total_xp);
            const xpDeficit = Math.max(0, expectedXpMinimum - currentXp);
            const needsBackfill = xpDeficit > 10; // Only flag if deficit > 10 XP
            if (needsBackfill) {
                needsBackfillCount++;
                auditResults.push({
                    wallet,
                    positionCount: positions.length,
                    zeroUsdCount,
                    totalPositionValue: totalValue,
                    calculatedXpPerWeek,
                    currentXp,
                    expectedXpMinimum,
                    xpDeficit,
                    needsBackfill: true,
                });
            }
        }
        // Sort by XP deficit (highest first)
        auditResults.sort((a, b) => b.xpDeficit - a.xpDeficit);
        // Report results
        console.log(`[Audit] RESULTS\n`);
        console.log(`Total wallets: ${usersResult.rows.length}`);
        console.log(`Wallets needing backfill: ${needsBackfillCount}\n`);
        if (needsBackfillCount > 0) {
            console.log('[Audit] Top 20 wallets with largest XP deficits:\n');
            console.log('Wallet | Positions | Zero USD | Portfolio Value | Expected XP | Current XP | Deficit');
            console.log('-'.repeat(100));
            auditResults.slice(0, 20).forEach((audit) => {
                console.log(`${audit.wallet.slice(0, 20)}... | ${audit.positionCount} | ${audit.zeroUsdCount} | $${audit.totalPositionValue.toFixed(2).padStart(7)} | ${audit.expectedXpMinimum.toFixed(0).padStart(4)} | ${audit.currentXp.toFixed(0).padStart(4)} | ${audit.xpDeficit.toFixed(0)}`);
            });
            console.log('\n[Audit] Generating backfill report...');
            console.log(`\nTotal wallets needing backfill: ${auditResults.length}`);
            console.log(`Total XP deficit across all wallets: ${auditResults.reduce((sum, a) => sum + a.xpDeficit, 0).toFixed(0)}`);
        }
        else {
            console.log('[Audit] All wallets have correct XP values!');
        }
        // Save detailed report
        console.log('\n[Audit] Creating detailed report CSV...');
        let csv = 'Wallet,Positions,ZeroUSD,PortfolioValue,XpPerWeek,CurrentXP,ExpectedXP,Deficit\n';
        auditResults.forEach((audit) => {
            csv += `${audit.wallet},${audit.positionCount},${audit.zeroUsdCount},$${audit.totalPositionValue.toFixed(2)},${audit.calculatedXpPerWeek.toFixed(0)},${audit.currentXp.toFixed(0)},${audit.expectedXpMinimum.toFixed(0)},${audit.xpDeficit.toFixed(0)}\n`;
        });
        // Write report to file (in memory for now)
        console.log(`\n[Audit] COMPLETE`);
        // Return audit results for backfill processing
        return auditResults;
    }
    catch (error) {
        console.error('[Audit] Error:', error);
        return [];
    }
    finally {
        await pool.end();
    }
}
// Run audit
auditAllWallets().then((results) => {
    console.log(`\n[Audit] Audit returned ${results.length} wallets needing backfill`);
});
//# sourceMappingURL=audit-all-wallets.js.map