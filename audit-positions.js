const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  max: 5,
  ssl: { rejectUnauthorized: false },
});

async function runAudit() {
  console.log('=== COMPREHENSIVE POSITION AUDIT ===\n');

  try {
    // 1. Overall stats
    console.log('1. Overall Statistics:');
    console.log('-'.repeat(70));
    const statsRes = await pool.query(
      `SELECT COUNT(*) as total_positions, COUNT(DISTINCT wallet) as total_wallets 
       FROM positions WHERE status='open'`
    );
    console.log(`   Total open positions: ${statsRes.rows[0].total_positions}`);
    console.log(`   Total wallets with positions: ${statsRes.rows[0].total_wallets}\n`);

    // 2. Zero USD positions
    console.log('2. Zero-Value Positions:');
    console.log('-'.repeat(70));
    const zeroRes = await pool.query(
      `SELECT COUNT(*) as zero_positions, COUNT(DISTINCT wallet) as affected_wallets 
       FROM positions WHERE position_size_usd = 0 AND status='open'`
    );
    const zeroCount = parseInt(zeroRes.rows[0].zero_positions);
    const totalCount = parseInt(statsRes.rows[0].total_positions);
    const zeroPercent = ((zeroCount / totalCount) * 100).toFixed(1);
    console.log(`   Positions with $0 USD: ${zeroCount} (${zeroPercent}%)`);
    console.log(`   Unique wallets affected: ${zeroRes.rows[0].affected_wallets}\n`);

    // 3. Wallets with ONLY zero positions
    console.log('3. Wallets with ONLY $0 Positions:');
    console.log('-'.repeat(70));
    const onlyZeroRes = await pool.query(
      `SELECT wallet, COUNT(*) as pos_count
       FROM positions WHERE status='open'
       GROUP BY wallet
       HAVING MAX(position_size_usd) = 0 AND MIN(position_size_usd) = 0
       ORDER BY COUNT(*) DESC`
    );
    console.log(`   Total wallets: ${onlyZeroRes.rows.length}`);
    console.log(`   Top 10 (by position count):`);
    onlyZeroRes.rows.slice(0, 10).forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.wallet.slice(0, 20)}... (${row.pos_count} positions)`);
    });
    console.log();

    // 4. Wallets with MIXED positions
    console.log('4. Wallets with MIXED Positions (some $0, some valued):');
    console.log('-'.repeat(70));
    const mixedRes = await pool.query(
      `SELECT wallet, COUNT(*) as total_pos,
              SUM(CASE WHEN position_size_usd > 0 THEN 1 ELSE 0 END) as valued,
              SUM(CASE WHEN position_size_usd = 0 THEN 1 ELSE 0 END) as zero,
              ROUND(SUM(CASE WHEN position_size_usd > 0 THEN position_size_usd ELSE 0 END)::numeric, 2) as total_value
       FROM positions WHERE status='open'
       GROUP BY wallet
       HAVING MAX(position_size_usd) > 0 AND MIN(position_size_usd) = 0
       ORDER BY total_pos DESC`
    );
    console.log(`   Total wallets: ${mixedRes.rows.length}`);
    console.log(`   Top 15 (by total positions):\n`);
    console.log('   Wallet | Total | Valued | Zero | USD Value');
    console.log('   ' + '-'.repeat(55));
    mixedRes.rows.slice(0, 15).forEach((row, i) => {
      console.log(`   ${row.wallet.slice(0, 14)}... | ${String(row.total_pos).padStart(5)} | ${String(row.valued).padStart(6)} | ${String(row.zero).padStart(4)} | $${row.total_value}`);
    });
    console.log();

    // 5. Portfolio statistics
    console.log('5. Portfolio Value Distribution:');
    console.log('-'.repeat(70));
    const portfolioRes = await pool.query(
      `SELECT SUM(CASE WHEN position_size_usd > 0 THEN 1 ELSE 0 END) as valued_pos,
              SUM(CASE WHEN position_size_usd = 0 THEN 1 ELSE 0 END) as zero_pos,
              ROUND(AVG(CASE WHEN position_size_usd > 0 THEN position_size_usd END)::numeric, 2) as avg_value,
              ROUND(SUM(position_size_usd)::numeric, 2) as total_value
       FROM positions WHERE status='open'`
    );
    const p = portfolioRes.rows[0];
    console.log(`   Valued positions: ${p.valued_pos}`);
    console.log(`   Zero positions: ${p.zero_pos}`);
    console.log(`   Average position value: $${p.avg_value}`);
    console.log(`   Total portfolio value: $${p.total_value}\n`);

    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Wallets needing backfill: ${onlyZeroRes.rows.length + mixedRes.rows.length}`);
    console.log(`Positions affected by $0 bug: ${zeroCount}`);
    console.log(`Total potential XP impact: Needs calculation based on token amounts`);

    console.log('\n[Audit] Complete');

  } catch (error) {
    console.error('[Audit] Error:', error.message);
  } finally {
    await pool.end();
  }
}

runAudit();
