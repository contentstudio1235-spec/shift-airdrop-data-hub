import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
});

async function investigateWallet() {
  const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';

  console.log(`[Investigate] Wallet: ${wallet}\n`);

  try {
    // Get all positions
    const result = await pool.query(
      `SELECT id, asset, position_size_usd, opened_at, closed_at, status, tx_signature_open
       FROM positions
       WHERE wallet = $1
       ORDER BY opened_at DESC`,
      [wallet]
    );

    console.log(`[Investigate] Found ${result.rows.length} positions:\n`);

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.asset} | $${row.position_size_usd} | Status: ${row.status} | Opened: ${row.opened_at}`);
      console.log(`   TX: ${row.tx_signature_open?.slice(0, 20)}...`);
    });

    // Get user status
    console.log('\n[Investigate] User Status:');
    const userResult = await pool.query(
      `SELECT total_xp, claim_multiplier, created_at FROM users WHERE wallet = $1`,
      [wallet]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`  Total XP: ${user.total_xp}`);
      console.log(`  Multiplier: ${user.claim_multiplier}x`);
      console.log(`  Created: ${user.created_at}`);
    }

  } catch (error) {
    console.error('[Investigate] Error:', error);
  } finally {
    await pool.end();
  }
}

investigateWallet();
