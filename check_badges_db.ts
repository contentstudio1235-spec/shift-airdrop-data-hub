import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });

async function check() {
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%badge%' ORDER BY table_name`);
  console.log('\n=== Badge Tables ===');
  tables.rows.forEach((r:any) => console.log(' ✅', r.table_name));

  const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='badge_definitions' ORDER BY ordinal_position`);
  console.log('\n=== badge_definitions columns ===');
  cols.rows.forEach((r:any) => console.log(' -', r.column_name));

  const bcols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='badges' ORDER BY ordinal_position`);
  console.log('\n=== badges columns ===');
  bcols.rows.forEach((r:any) => console.log(' -', r.column_name));

  const count = await pool.query(`SELECT COUNT(*) as cnt FROM badge_definitions`);
  console.log('\n=== badge_definitions count:', count.rows[0].cnt);

  const sample = await pool.query(`SELECT badge_name, category, rarity FROM badge_definitions LIMIT 8`);
  console.log('\n=== Sample definitions ===');
  sample.rows.forEach((r:any) => console.log(' -', r.badge_name, '|', r.category, '|', r.rarity));

  await pool.end();
}
check().catch(console.error);
// additional: check all 38 defs + find any schema mismatches
