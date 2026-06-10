import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  const r = await pool.query("SELECT COUNT(*) as total FROM badge_definitions");
  console.log('Total:', r.rows[0].total);
  const s = await pool.query("SELECT COUNT(*) as spaces FROM badge_definitions WHERE badge_name LIKE '% %'");
  console.log('With spaces:', s.rows[0].spaces);
  await pool.end();
}
run().catch(e => console.error(e.message));
