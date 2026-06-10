import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'src/db/migrations/021_cleanup_duplicate_badge_definitions.sql'),
    'utf-8'
  );

  console.log('Applying migration 021...');
  await pool.query(sql);
  console.log('✅ Migration 021 applied!');

  // Verify final state
  const total = await pool.query(`SELECT COUNT(*) FROM badge_definitions`);
  const snake = await pool.query(`SELECT COUNT(*) FROM badge_definitions WHERE badge_name NOT LIKE '% %'`);
  const spaces = await pool.query(`SELECT COUNT(*) FROM badge_definitions WHERE badge_name LIKE '% %'`);
  const nullDn = await pool.query(`SELECT COUNT(*) FROM badge_definitions WHERE display_name IS NULL`);
  const badRarity = await pool.query(`SELECT COUNT(*) FROM badge_definitions WHERE rarity NOT IN ('common','rare','epic','legend')`);

  console.log(`\nFinal state:`);
  console.log(`  Total rows: ${total.rows[0].count}`);
  console.log(`  Snake_case: ${snake.rows[0].count}`);
  console.log(`  With spaces: ${spaces.rows[0].count}`);
  console.log(`  NULL display_name: ${nullDn.rows[0].count}`);
  console.log(`  Bad rarity: ${badRarity.rows[0].count}`);

  // Check earned badges are still intact
  const earned = await pool.query(`
    SELECT b.badge_name, COUNT(*) as cnt
    FROM badges b
    GROUP BY b.badge_name
    ORDER BY cnt DESC LIMIT 5`);
  console.log(`\nTop earned badges (unchanged):`);
  earned.rows.forEach((r: any) => console.log(`  ${r.badge_name}: ${r.cnt}`));

  await pool.end();
}
run().catch(e => { console.error('❌ ERROR:', e.message); process.exit(1); });
