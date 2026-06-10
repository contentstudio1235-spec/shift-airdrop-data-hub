import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  const r = await pool.query(`SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='badge_definitions' ORDER BY ordinal_position`);
  r.rows.forEach((x:any) => console.log(x.column_name.padEnd(30), x.data_type.padEnd(20), x.character_maximum_length||''));
  await pool.end();
}
run().catch(console.error);
