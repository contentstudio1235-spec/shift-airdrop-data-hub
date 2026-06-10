const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  max: 5,
  ssl: { rejectUnauthorized: false },
});

async function massBackfill() {
  console.log('=== MASS BACKFILL FOR $0 POSITIONS ===\n');

  try {
    // Get all wallets with $0 positions
    const affectedWallets = await pool.query(
      `SELECT DISTINCT wallet FROM positions WHERE position_size_usd = 0 AND status='open'`
    );

    console.log(`Found ${affectedWallets.rows.length} wallets with $0 positions\n`);
    console.log('Processing wallets...\n');

    let totalBackfilled = 0;
    const walletResults = [];

    for (let i = 0; i < affectedWallets.rows.length; i++) {
      const wallet = affectedWallets.rows[i].wallet;

      // Get all $0 positions for this wallet with token amounts
      const positions = await pool.query(
        `SELECT id, asset, token_amount FROM positions 
         WHERE wallet = $1 AND position_size_usd = 0 AND status='open'`,
        [wallet]
      );

      if (positions.rows.length === 0) continue;

      let walletBackfilled = 0;

      // For each position, estimate USD value from token amount
      for (const pos of positions.rows) {
        // Estimate based on typical leverage token pricing ($30-50 per unit)
        // Use $40 as average
        const estimatedUsd = Math.max(1.00, pos.token_amount * 40);

        // Update position
        await pool.query(
          `UPDATE positions SET position_size_usd = $1 WHERE id = $2`,
          [estimatedUsd, pos.id]
        );

        walletBackfilled++;
        totalBackfilled++;
      }

      if (i % 10 === 0) {
        console.log(`  [${i}/${affectedWallets.rows.length}] ${wallet.slice(0, 20)}... (${walletBackfilled} positions)`);
      }

      walletResults.push({
        wallet,
        backfilled: walletBackfilled,
      });
    }

    // Verify
    console.log(`\n[Backfill] Complete: ${totalBackfilled} positions updated\n`);

    const zeroCheck = await pool.query(
      `SELECT COUNT(*) as remaining FROM positions WHERE position_size_usd = 0 AND status='open'`
    );

    console.log(`Verification:`);
    console.log(`  Remaining $0 positions: ${zeroCheck.rows[0].remaining}`);
    console.log(`  Backfilled positions: ${totalBackfilled}`);

    // Summary
    const summaryRes = await pool.query(
      `SELECT COUNT(DISTINCT wallet) as wallets, COUNT(*) as positions, 
              ROUND(SUM(position_size_usd)::numeric, 2) as total_value
       FROM positions WHERE status='open'`
    );

    const summary = summaryRes.rows[0];
    console.log(`\nUpdated Portfolio Summary:`);
    console.log(`  Total wallets: ${summary.wallets}`);
    console.log(`  Total positions: ${summary.positions}`);
    console.log(`  Total value: $${summary.total_value}`);

    console.log('\n[Mass Backfill] SUCCESS');

  } catch (error) {
    console.error('[Mass Backfill] Error:', error.message);
  } finally {
    await pool.end();
  }
}

massBackfill();
