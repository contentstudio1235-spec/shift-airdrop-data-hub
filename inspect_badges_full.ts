import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  // Full dump of all badge_definitions
  const all = await pool.query(`SELECT badge_name, display_name, rarity, is_active FROM badge_definitions ORDER BY badge_name`);
  console.log(`\nTotal rows: ${all.rows.length}`);
  console.log('\n--- ALL BADGE DEFINITIONS ---');
  all.rows.forEach((r: any) => {
    const hasSpace = r.badge_name.includes(' ');
    const missing = !r.display_name ? '❌ NO DISPLAY_NAME' : '';
    const badRarity = r.rarity === 'legendary' ? '❌ LEGENDARY' : '';
    console.log(`${hasSpace ? '⚠️ SPACE' : '  OK   '} | ${r.badge_name.padEnd(35)} | dn: ${(r.display_name || 'NULL').padEnd(25)} | ${r.rarity} ${missing} ${badRarity}`);
  });

  // Count earned badges per badge_name
  const earned = await pool.query(`
    SELECT b.badge_name, COUNT(*) as cnt
    FROM badges b
    JOIN badge_definitions bd ON b.badge_name = bd.badge_name
    GROUP BY b.badge_name
    ORDER BY cnt DESC
    LIMIT 15`);
  console.log('\n--- TOP EARNED BADGES (properly joined) ---');
  earned.rows.forEach((r: any) => console.log(` ${r.badge_name}: ${r.cnt} wallets`));

  // Check if space-named rows are is_active
  const activeSpace = await pool.query(`SELECT COUNT(*) FROM badge_definitions WHERE badge_name LIKE '% %' AND is_active = true`);
  console.log(`\nSpace-named rows that are is_active=true: ${activeSpace.rows[0].count}`);
  
  // Can we just disable the space-named rows?
  const snakeCount = await pool.query(`SELECT COUNT(*) FROM badge_definitions WHERE badge_name NOT LIKE '% %'`);
  console.log(`Snake_case rows: ${snakeCount.rows[0].count}`);

  await pool.end();
}
run().catch(console.error);
