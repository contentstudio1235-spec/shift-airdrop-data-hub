import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  // Check multiplier_value and badge_type in badge_definitions
  const vals = await pool.query(`
    SELECT badge_name, rarity, multiplier_value, badge_type, duration_days, duration_type
    FROM badge_definitions WHERE is_active=true ORDER BY rarity, badge_name`);
  console.log('Badge definitions with multiplier/type:');
  vals.rows.forEach((r: any) => console.log(`  ${r.badge_name.padEnd(30)} rarity:${(r.rarity||'').padEnd(7)} mv:${r.multiplier_value} type:${r.badge_type} dur:${r.duration_days}d`));

  // Check if XP is awarded when badges are earned — look at users.total_xp vs badge counts
  const xpCheck = await pool.query(`
    SELECT u.wallet, u.total_xp, COUNT(b.badge_name) as badge_count
    FROM users u LEFT JOIN badges b ON u.wallet = b.wallet
    WHERE u.total_xp > 0
    GROUP BY u.wallet, u.total_xp
    ORDER BY u.total_xp DESC LIMIT 5`);
  console.log('\nTop earners (XP vs badge count):');
  xpCheck.rows.forEach((r: any) => console.log(`  ${r.wallet.slice(0,8)}... XP:${r.total_xp} badges:${r.badge_count}`));

  // Check if there's any XP award logic in the DB (triggers/functions)
  const triggers = await pool.query(`SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_schema='public' LIMIT 10`);
  console.log('\nDB Triggers:', triggers.rows.length > 0 ? triggers.rows.map((r: any) => r.trigger_name).join(', ') : 'none');

  // Check referral structure
  const refStats = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(referred_by_wallet) as has_referrer,
      COUNT(referred_by_code) as has_ref_code
    FROM users`);
  console.log('\nReferral stats:', refStats.rows[0]);

  // Check if there's a referral_xp or referral_sp column
  const userColsRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND table_schema='public' ORDER BY ordinal_position`);
  console.log('\nUsers table columns:');
  userColsRes.rows.forEach((r: any) => console.log(`  ${r.column_name}: ${r.data_type}`));

  await pool.end();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
