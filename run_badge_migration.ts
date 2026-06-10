import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'src/db/migrations/020_normalize_badge_system.sql'),
    'utf8'
  );

  console.log('Running migration 020_normalize_badge_system.sql ...\n');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration complete!\n');

    // Verify results
    const defs = await pool.query(`
      SELECT badge_name, display_name, rarity, is_active,
             (icon IS NOT NULL) as has_icon,
             (unlock_requirement IS NOT NULL) as has_req
      FROM badge_definitions ORDER BY category NULLS LAST, badge_name
    `);
    console.log(`Total definitions: ${defs.rows.length}`);
    let issues = 0;
    defs.rows.forEach((r: any) => {
      const ok = r.has_icon && r.has_req && r.display_name;
      if (!ok) {
        console.log(`  ⚠️  ${r.badge_name}: icon=${r.has_icon} req=${r.has_req} display=${!!r.display_name}`);
        issues++;
      }
    });
    if (issues === 0) console.log('✅ All badges have display_name, icon, unlock_requirement');

    // Rarity check
    const rarities = await pool.query(`SELECT rarity, COUNT(*) FROM badge_definitions GROUP BY rarity ORDER BY rarity`);
    console.log('\nRarity breakdown:');
    rarities.rows.forEach((r: any) => console.log(`  ${r.rarity}: ${r.count}`));

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
