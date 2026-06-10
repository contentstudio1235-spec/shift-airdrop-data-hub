import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
});

async function verify() {
  const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';

  try {
    console.log('[Verify] Checking backfilled positions:\n');

    const posResult = await pool.query(
      `SELECT asset, position_size_usd, token_amount, xp_generated FROM positions 
       WHERE wallet = $1 AND status = 'open' 
       ORDER BY opened_at DESC`,
      [wallet]
    );

    let totalUsd = 0;
    posResult.rows.forEach((row) => {
      totalUsd += parseFloat(row.position_size_usd);
      console.log(`  ${row.asset}: $${parseFloat(row.position_size_usd).toFixed(2)} (${row.token_amount} tokens)`);
    });

    console.log(`\nTotal Portfolio Value: $${totalUsd.toFixed(2)}`);

    const userResult = await pool.query(
      `SELECT total_xp, claim_multiplier FROM users WHERE wallet = $1`,
      [wallet]
    );

    console.log(`\nUser Status:`);
    console.log(`  Total XP: ${userResult.rows[0]?.total_xp || 0}`);
    console.log(`  Multiplier: ${userResult.rows[0]?.claim_multiplier}x`);

    console.log('\n✅ Backfill Complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verify();
