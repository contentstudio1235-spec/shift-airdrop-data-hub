import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  // Check schema_migrations table
  const migTable = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name IN ('schema_migrations','migrations','_migrations') AND table_schema='public'`);
  console.log('Migration tracking tables:', migTable.rows.map((r:any)=>r.table_name));

  if (migTable.rows.length > 0) {
    const migRows = await pool.query(`SELECT * FROM ${migTable.rows[0].table_name} ORDER BY 1 DESC LIMIT 10`);
    console.log('Recent migrations:', migRows.rows);
  }

  // Exact duplicate analysis
  const dupes = await pool.query(`
    SELECT badge_name, COUNT(*) as cnt FROM badge_definitions GROUP BY badge_name HAVING COUNT(*) > 1`);
  console.log('\nDuplicate badge_names:', dupes.rows.length, dupes.rows.map((r:any)=>r.badge_name));

  // Count rows with spaces (un-renamed)
  const spaced = await pool.query(`SELECT badge_name FROM badge_definitions WHERE badge_name LIKE '% %' ORDER BY badge_name`);
  console.log('\nBadge names still with spaces (' + spaced.rows.length + '):');
  spaced.rows.forEach((r:any) => console.log(' -', r.badge_name));

  // FK check — does badges.badge_name reference badge_definitions?
  const fk = await pool.query(`
    SELECT constraint_name, table_name, column_name FROM information_schema.key_column_usage
    WHERE table_name='badges' AND column_name='badge_name'`);
  console.log('\nFK on badges.badge_name:', fk.rows);

  await pool.end();
}
run().catch(console.error);
