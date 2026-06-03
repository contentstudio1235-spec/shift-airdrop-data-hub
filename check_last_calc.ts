import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
async function check() {
  const now = new Date();
  const r = await pool.query(`
    SELECT asset, xp_generated, last_xp_calc,
           ROUND(EXTRACT(EPOCH FROM (NOW() - last_xp_calc))/60) as mins_since_last_calc
    FROM positions
    WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
      AND position_size_usd >= 1
    ORDER BY asset
  `);
  console.log('Current time:', now.toISOString());
  console.log('\nLast XP calc per position:');
  r.rows.forEach((p: any) => {
    console.log(`${p.asset.padEnd(8)} | XP: ${parseFloat(p.xp_generated).toFixed(2).padStart(8)} | Last calc: ${p.last_xp_calc?.toISOString() ?? 'NEVER'} | ${p.mins_since_last_calc} mins ago`);
  });
  await pool.end();
}
check().catch(console.error);
