import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  // How many wallets have positions BEFORE May 26 (pre-launch/beta)?
  const preLaunch = await pool.query(`
    SELECT COUNT(DISTINCT wallet) as cnt FROM positions 
    WHERE opened_at < '2026-05-26' AND status != 'filtered'`);
  const postLaunch = await pool.query(`
    SELECT COUNT(DISTINCT wallet) as cnt FROM positions 
    WHERE opened_at >= '2026-05-26' AND status != 'filtered'`);
  console.log('Wallets with positions BEFORE May 26 (pre-launch):', preLaunch.rows[0].cnt);
  console.log('Wallets with positions FROM May 26 onward (launch):', postLaunch.rows[0].cnt);

  // Date distribution of first positions
  const firstPos = await pool.query(`
    SELECT DATE(opened_at) as day, COUNT(DISTINCT wallet) as wallets
    FROM positions WHERE status != 'filtered'
    GROUP BY DATE(opened_at) ORDER BY day LIMIT 15`);
  console.log('\nFirst positions by day:');
  firstPos.rows.forEach((r: any) => console.log(`  ${r.day}: ${r.wallets} wallets`));

  // Badge XP check - is there a badge_xp or xp column in badge_definitions?
  const bdCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='badge_definitions' AND table_schema='public' ORDER BY ordinal_position`);
  console.log('\nbadge_definitions columns:', bdCols.rows.map((r: any) => r.column_name).join(', '));
  
  // Is there an xp field in the badges table?
  const bCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='badges' AND table_schema='public' ORDER BY ordinal_position`);
  console.log('badges columns:', bCols.rows.map((r: any) => r.column_name).join(', '));

  // Check if any badge awards have been synced with XP
  const xpFromBadges = await pool.query(`SELECT COUNT(*) as cnt FROM badges WHERE xp_awarded IS NOT NULL`).catch(() => ({ rows: [{ cnt: 'column not found' }] }));
  console.log('Badges with XP awarded:', xpFromBadges.rows[0].cnt);

  await pool.end();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
