import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  // Simulate what GET /api/badges/definitions/all returns (getAllBadges)
  const all = await pool.query(`
    SELECT badge_name,
           COALESCE(display_name, badge_name) AS display_name,
           COALESCE(description, '')          AS description,
           COALESCE(icon, icon_url, '🏅')     AS icon,
           COALESCE(rarity, 'common')         AS rarity,
           COALESCE(unlock_requirement, '')   AS unlock_requirement
    FROM badge_definitions
    WHERE is_active = true
    ORDER BY CASE COALESCE(rarity,'common') WHEN 'legend' THEN 1 WHEN 'epic' THEN 2 WHEN 'rare' THEN 3 ELSE 4 END, display_name NULLS LAST`);

  console.log(`\n✅ GET /api/badges/definitions/all → ${all.rows.length} badges`);
  
  const byRarity: Record<string,number> = {legend:0,epic:0,rare:0,common:0};
  all.rows.forEach((r: any) => { byRarity[r.rarity] = (byRarity[r.rarity]||0)+1; });
  console.log('Breakdown:', byRarity);
  
  // Show first 5 legend badges
  console.log('\nLegend badges:');
  all.rows.filter((r: any)=>r.rarity==='legend').forEach((r: any)=>
    console.log(`  ${r.badge_name} → display: "${r.display_name}", icon: "${r.icon.substring(0,30)}"`));

  // Simulate GET /api/badges/:wallet for the wallet with earned badges
  const testWallet = await pool.query(`SELECT wallet FROM badges WHERE badge_name='first_trade' LIMIT 1`);
  if (testWallet.rows.length > 0) {
    const wallet = testWallet.rows[0].wallet;
    const userBadges = await pool.query(`
      SELECT bd.badge_name,
             COALESCE(bd.display_name, bd.badge_name) AS display_name,
             COALESCE(bd.rarity, 'common')            AS rarity,
             (b.earned_at IS NOT NULL)                AS earned,
             b.earned_at
      FROM badge_definitions bd
      LEFT JOIN badges b ON bd.badge_name = b.badge_name AND b.wallet = $1 AND b.status = 'active'
      WHERE bd.is_active = true
      ORDER BY b.earned_at DESC NULLS LAST, bd.display_name NULLS LAST`, [wallet]);
    
    const earnedCount = userBadges.rows.filter((r: any) => r.earned).length;
    console.log(`\n✅ GET /api/badges/${wallet.substring(0,8)}... → ${userBadges.rows.length} total, ${earnedCount} earned`);
    userBadges.rows.filter((r: any) => r.earned).forEach((r: any) =>
      console.log(`  ✅ ${r.display_name} (${r.rarity})`));
  }
  
  await pool.end();
}
run().catch(console.error);
