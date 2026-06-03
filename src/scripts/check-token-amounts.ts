import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
});

async function checkTokenAmounts() {
  try {
    const result = await pool.query(
      `SELECT id, asset, token_amount, position_size_usd, price_at_open, opened_at 
       FROM positions 
       WHERE wallet = $1 AND status = 'open'
       ORDER BY opened_at DESC`,
      ['CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q']
    );

    console.log(`[Positions] Found ${result.rows.length} open positions:\n`);

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.asset}`);
      console.log(`   Token Amount: ${row.token_amount}`);
      console.log(`   USD Value: $${row.position_size_usd}`);
      console.log(`   Price at Open: ${row.price_at_open}`);
      console.log(`   Opened: ${row.opened_at}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTokenAmounts();
