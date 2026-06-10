import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });

async function check() {
  // Full list of badge_definitions with key fields
  const defs = await pool.query(`SELECT badge_name, display_name, category, rarity, is_active, badge_type, duration_type FROM badge_definitions ORDER BY category NULLS LAST, display_name`);
  console.log('\n=== All badge_definitions (' + defs.rows.length + ') ===');
  defs.rows.forEach((r:any) => {
    const active = r.is_active ? '✅' : '❌';
    console.log(` ${active} [${(r.category||'null').padEnd(20)}] ${(r.badge_name||'').padEnd(35)} | ${r.rarity} | ${r.badge_type||'?'}`);
  });

  // Badges currently earned
  const earned = await pool.query(`SELECT COUNT(*) as cnt FROM badges WHERE status='active'`);
  console.log('\n=== Active earned badges:', earned.rows[0].cnt);

  // Check gallery endpoint would work - does badge_definitions have display_name and unlock_requirement?
  const missing = await pool.query(`SELECT badge_name FROM badge_definitions WHERE display_name IS NULL OR unlock_requirement IS NULL LIMIT 10`);
  console.log('\n=== Badges missing display_name or unlock_requirement:', missing.rows.length);
  missing.rows.forEach((r:any) => console.log(' ⚠️', r.badge_name));

  // Active badges check
  const inactive = await pool.query(`SELECT COUNT(*) as cnt FROM badge_definitions WHERE is_active = false OR is_active IS NULL`);
  console.log('\n=== Inactive/NULL is_active badges:', inactive.rows[0].cnt);

  await pool.end();
}
check().catch(console.error);
