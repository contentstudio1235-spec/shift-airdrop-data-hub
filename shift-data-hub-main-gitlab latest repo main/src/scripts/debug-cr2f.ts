import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  try {
    // First check schema
    const schemaRes = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'positions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== POSITIONS TABLE SCHEMA ===\n');
    schemaRes.rows.forEach((row: any) => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    // Now get position data
    const res = await pool.query(`
      SELECT 
        id, 
        asset, 
        position_size_usd,
        xp_generated,
        opened_at,
        last_xp_calc,
        status
      FROM positions
      WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
      ORDER BY opened_at DESC
    `);
    
    console.log('\n=== POSITION BREAKDOWN ===\n');
    let totalXP = 0;
    res.rows.forEach((row: any, i: number) => {
      const xp = parseFloat(row.xp_generated) || 0;
      totalXP += xp;
      console.log(`${i+1}. ${row.asset.padEnd(10)} | Size: $${parseFloat(row.position_size_usd).toFixed(2).padEnd(8)} | XP: ${xp.toFixed(2).padEnd(10)} | Status: ${row.status}`);
    });
    
    console.log('\n=== TOTALS ===');
    console.log(`Total XP from positions: ${totalXP.toFixed(2)}`);
    
    // Get user total_xp
    const userRes = await pool.query(
      'SELECT total_xp, claim_multiplier FROM users WHERE wallet = $1',
      ['CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q']
    );
    
    if (userRes.rows.length > 0) {
      const dbTotal = parseFloat(userRes.rows[0].total_xp);
      const multiplier = parseFloat(userRes.rows[0].claim_multiplier);
      console.log(`DB Total XP (from users table): ${dbTotal.toFixed(2)}`);
      console.log(`Claim Multiplier: ${multiplier.toFixed(2)}x`);
      console.log(`Expected Points (XP * 3.0x launch): ${(dbTotal * 3.0).toFixed(2)}`);
      console.log(`\nDifference: ${(totalXP - dbTotal).toFixed(2)} XP`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debug();
