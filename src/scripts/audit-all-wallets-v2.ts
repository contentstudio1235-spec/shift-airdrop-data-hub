import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
});

interface WalletAudit {
  wallet: string;
  positionCount: number;
  zeroUsdCount: number;
  totalPositionValue: number;
  calculatedXpPerWeek: number;
  currentXp: number;
  expectedXpMinimum: number;
  xpDeficit: number;
  daysSinceCreated: number;
}

async function auditAllWallets() {
  console.log('[Audit] Starting comprehensive wallet audit...\n');

  try {
    // Get all users who have connected
    const usersResult = await pool.query(
      `SELECT wallet, total_xp, created_at FROM users WHERE created_at IS NOT NULL ORDER BY created_at DESC`
    );

    console.log(`[Audit] Found ${usersResult.rows.length} connected wallets`);
    console.log('[Audit] Analyzing positions for XP discrepancies...\n');

    const auditResults: WalletAudit[] = [];
    let processedCount = 0;

    for (const user of usersResult.rows) {
      const wallet = user.wallet;
      processedCount++;

      if (processedCount % 1000 === 0) {
        console.log(`[Audit] Processed ${processedCount}/${usersResult.rows.length} wallets...`);
      }

      // Get all positions for this wallet
      const posResult = await pool.query(
        `SELECT asset, position_size_usd, opened_at
         FROM positions
         WHERE wallet = $1 AND status = 'open'`,
        [wallet]
      );

      if (posResult.rows.length === 0) continue;

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
        } else {
          // XP = log10(value) * 100 * multiplier (1.25 avg)
          const baseXp = Math.log10(usdValue) * 100 * 1.25;
          calculatedXpPerWeek += Math.max(0, baseXp);
        }
      }

      // Calculate minimum expected XP
      const createdDate = new Date(user.created_at);
      const now = new Date();
      const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksActive = daysSinceCreated / 7;
      const expectedXpMinimum = Math.floor(calculatedXpPerWeek * weeksActive);

      const currentXp = parseFloat(user.total_xp);
      const xpDeficit = Math.max(0, expectedXpMinimum - currentXp);

      // Flag if significant deficit (>10 XP)
      if (xpDeficit > 10 || zeroUsdCount > 0) {
        auditResults.push({
          wallet,
          positionCount: positions.length,
          zeroUsdCount,
          totalPositionValue: totalValue,
          calculatedXpPerWeek,
          currentXp,
          expectedXpMinimum,
          xpDeficit,
          daysSinceCreated,
        });
      }
    }

    // Sort by XP deficit (highest first)
    auditResults.sort((a, b) => b.xpDeficit - a.xpDeficit);

    // Report results
    console.log(`\n[Audit] RESULTS\n`);
    console.log(`Total wallets audited: ${usersResult.rows.length}`);
    console.log(`Wallets with discrepancies: ${auditResults.length}\n`);

    if (auditResults.length > 0) {
      console.log('[Audit] Top 30 wallets with largest XP deficits:\n');
      console.log('Wallet | Pos | Zero | Portfolio | XP/Week | Current | Expected | Deficit | Days');
      console.log('-'.repeat(110));

      auditResults.slice(0, 30).forEach((audit) => {
        console.log(
          `${audit.wallet.slice(0, 16)}... | ${String(audit.positionCount).padStart(3)} | ${String(audit.zeroUsdCount).padStart(4)} | $${String(audit.totalPositionValue.toFixed(2)).padStart(8)} | ${String(Math.floor(audit.calculatedXpPerWeek)).padStart(6)} | ${String(Math.floor(audit.currentXp)).padStart(7)} | ${String(audit.expectedXpMinimum).padStart(8)} | ${String(Math.floor(audit.xpDeficit)).padStart(6)} | ${audit.daysSinceCreated}`
        );
      });

      const totalDeficit = auditResults.reduce((sum, a) => sum + a.xpDeficit, 0);
      console.log(`\n[Audit] Summary:`);
      console.log(`  Total wallets needing backfill: ${auditResults.length}`);
      console.log(`  Total XP deficit: ${Math.floor(totalDeficit)}`);
      console.log(`  Wallets with $0 positions: ${auditResults.filter(a => a.zeroUsdCount > 0).length}`);
      console.log(`  Wallets with only $0 positions: ${auditResults.filter(a => a.zeroUsdCount === a.positionCount).length}`);

    } else {
      console.log('[Audit] All wallets appear to have correct XP values!');
    }

    console.log('\n[Audit] Complete');

  } catch (error) {
    console.error('[Audit] Error:', error);
  } finally {
    await pool.end();
  }
}

// Run audit
auditAllWallets();
