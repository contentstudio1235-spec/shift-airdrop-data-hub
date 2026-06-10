import { Pool } from 'pg';
import * as fs from 'fs';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

interface FixRecord {
  wallet: string;
  position_id: string;
  asset: string;
  raw_xp: number;
  old_xp: number;
  new_xp: number;
  delta: number;
}

async function fix() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            LAUNCH MULTIPLIER BUG - APPLY FIXES                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const fixLog: FixRecord[] = [];
  let totalXpRestored = 0;
  let positionsFixed = 0;

  try {
    // Phase 1: Identify positions with wrong multiplier (< 2.9x)
    console.log('Step 1: Finding positions with incorrect multipliers...\n');

    const result = await pool.query(`
      SELECT 
        id,
        wallet,
        asset,
        position_size_usd,
        xp_generated,
        opened_at,
        status
      FROM positions
      WHERE opened_at >= '2026-05-25T00:00:00Z'
        AND opened_at < '2026-06-02T09:31:00Z'
        AND status IN ('open', 'closed')
        AND position_size_usd > 0
      ORDER BY wallet, opened_at
    `);

    // Calculate raw XP and detect multiplier errors
    const toFix: Array<{
      id: string;
      wallet: string;
      asset: string;
      raw_xp: number;
      old_xp: number;
      new_xp: number;
    }> = [];

    for (const pos of result.rows) {
      const rawXP = Math.log10(parseFloat(pos.position_size_usd)) * 100;
      const storedXP = parseFloat(pos.xp_generated);
      const detectedMult = storedXP / rawXP;

      // If multiplier < 2.9, it's wrong (should be ~3.0 for phase 1)
      if (detectedMult < 2.9 && rawXP > 0) {
        const correctXP = rawXP * 3.0;
        const delta = correctXP - storedXP;

        toFix.push({
          id: pos.id,
          wallet: pos.wallet,
          asset: pos.asset,
          raw_xp: rawXP,
          old_xp: storedXP,
          new_xp: correctXP,
        });

        totalXpRestored += delta;
        positionsFixed++;
      }
    }

    console.log(`Found ${toFix.length} positions with incorrect multipliers\n`);
    console.log('Step 2: Applying XP corrections...\n');

    // Phase 3: Identify affected wallets (before transaction for later logging)
    const affectedWallets = [...new Set(toFix.map(f => f.wallet))];

    // Phase 2: Apply fixes in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const fix of toFix) {
        await client.query(
          `UPDATE positions SET xp_generated = $1 WHERE id = $2`,
          [fix.new_xp, fix.id]
        );

        fixLog.push({
          wallet: fix.wallet,
          position_id: fix.id,
          asset: fix.asset,
          raw_xp: fix.raw_xp,
          old_xp: fix.old_xp,
          new_xp: fix.new_xp,
          delta: fix.new_xp - fix.old_xp,
        });
      }

      // Phase 4: Update user total_xp for affected wallets
      console.log(`Updating total_xp for ${affectedWallets.length} wallets...\n`);

      for (const wallet of affectedWallets) {
        const sumResult = await client.query(
          `SELECT COALESCE(SUM(xp_generated), 0) as total FROM positions WHERE wallet = $1`,
          [wallet]
        );
        const newTotal = parseFloat(sumResult.rows[0].total);

        await client.query(
          `UPDATE users SET total_xp = $1, updated_at = NOW() WHERE wallet = $2`,
          [newTotal, wallet]
        );
      }

      await client.query('COMMIT');
      console.log('✅ All fixes applied successfully!\n');

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Phase 4: Report
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      FIX SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`Positions Fixed:     ${positionsFixed}`);
    console.log(`Total XP Restored:   ${totalXpRestored.toFixed(2)}`);
    console.log(`Wallets Updated:     ${affectedWallets.length}\n`);

    // Save detailed log
    const logPath = `/tmp/multiplier-fix-log-${Date.now()}.json`;
    fs.writeFileSync(logPath, JSON.stringify(fixLog, null, 2));
    console.log(`Detailed log saved to: ${logPath}\n`);

    // Show sample of fixed positions
    console.log('Sample of Fixed Positions:\n');
    fixLog.slice(0, 10).forEach((record, i) => {
      console.log(`${i + 1}. ${record.wallet.slice(0, 12)}... | ${record.asset.padEnd(10)} | ${record.old_xp.toFixed(2)} → ${record.new_xp.toFixed(2)} (+${record.delta.toFixed(2)})`);
    });

    if (fixLog.length > 10) {
      console.log(`... and ${fixLog.length - 10} more positions fixed\n`);
    }

  } catch (err) {
    console.error('\n❌ Error during fix:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fix();
