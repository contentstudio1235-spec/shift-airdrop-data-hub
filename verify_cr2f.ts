import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
  
  console.log(`Checking CR2F wallet: ${wallet}\n`);

  // Get all positions for CR2F in the time window
  const positions = await pool.query(`
    SELECT 
      id,
      asset,
      position_size_usd,
      xp_generated,
      opened_at,
      status
    FROM positions
    WHERE wallet = $1
      AND opened_at >= '2026-05-25T00:00:00Z'
      AND opened_at < '2026-06-02T09:31:00Z'
    ORDER BY opened_at
  `, [wallet]);

  console.log(`Positions opened during bug window: ${positions.rows.length}\n`);

  let totalXP = 0;
  positions.rows.forEach((pos: any, i: number) => {
    const rawXP = Math.log10(parseFloat(pos.position_size_usd)) * 100;
    const mult = parseFloat(pos.xp_generated) / rawXP;
    totalXP += parseFloat(pos.xp_generated);
    console.log(`${i+1}. ${pos.asset.padEnd(8)} | $${parseFloat(pos.position_size_usd).toFixed(2).padStart(8)} | Raw: ${rawXP.toFixed(2).padStart(7)} | XP: ${parseFloat(pos.xp_generated).toFixed(2).padStart(8)} | Mult: ${mult.toFixed(2)}x`);
  });

  console.log(`\nTotal XP from these positions: ${totalXP.toFixed(2)}`);

  // Get user's current total_xp
  const user = await pool.query(`
    SELECT total_xp, claim_multiplier FROM users WHERE wallet = $1
  `, [wallet]);

  if (user.rows.length > 0) {
    console.log(`User's current total_xp: ${user.rows[0].total_xp}`);
    console.log(`Claim multiplier: ${user.rows[0].claim_multiplier}`);
  }

  await pool.end();
}

verify().catch(console.error);
