import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('=== FULL BADGE SYSTEM AUDIT ===\n');

  // 1. User overview
  const users = await pool.query('SELECT COUNT(*) as total FROM users');
  const usersWithPos = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE status != 'filtered'");
  const totalPos = await pool.query("SELECT COUNT(*) as cnt FROM positions WHERE status != 'filtered'");
  const openPos = await pool.query("SELECT COUNT(*) as cnt FROM positions WHERE status = 'open'");
  console.log('--- USERS ---');
  console.log('Total registered users:  ', users.rows[0].total);
  console.log('Users with positions:    ', usersWithPos.rows[0].cnt);
  console.log('Total active positions:  ', totalPos.rows[0].cnt);
  console.log('Open positions:          ', openPos.rows[0].cnt);

  // 2. Current badge distribution
  const currentBadges = await pool.query("SELECT badge_name, COUNT(*) as cnt FROM badges WHERE status = 'active' GROUP BY badge_name ORDER BY cnt DESC");
  console.log('\n--- CURRENT BADGE DISTRIBUTION ---');
  if (currentBadges.rows.length === 0) {
    console.log('  No badges awarded yet!');
  } else {
    currentBadges.rows.forEach((r: any) => console.log(' ', r.badge_name.padEnd(32), r.cnt, 'wallets'));
  }
  const totalAwarded = currentBadges.rows.reduce((a: number, r: any) => a + parseInt(r.cnt), 0);
  console.log('  TOTAL badges awarded:', totalAwarded);

  // 3. Backlog — first_trade
  const missingFT = await pool.query(`
    SELECT COUNT(DISTINCT p.wallet) as cnt FROM positions p
    WHERE p.status != 'filtered'
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'first_trade')`);
  console.log('\n--- BACKLOG ANALYSIS ---');
  console.log('  first_trade backlog:      ', missingFT.rows[0].cnt, 'wallets');

  const missingDH = await pool.query(`
    SELECT COUNT(DISTINCT p.wallet) as cnt FROM positions p
    WHERE p.status = 'open' AND p.opened_at <= NOW() - INTERVAL '60 days'
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'diamond_hands')`);
  console.log('  diamond_hands backlog:    ', missingDH.rows[0].cnt, 'wallets qualify');

  const missingLH = await pool.query(`
    SELECT COUNT(DISTINCT p.wallet) as cnt FROM positions p
    WHERE p.status = 'open' AND p.opened_at <= NOW() - INTERVAL '90 days'
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'long_hauler')`);
  console.log('  long_hauler backlog:      ', missingLH.rows[0].cnt, 'wallets qualify');

  const missingBel = await pool.query(`
    SELECT COUNT(DISTINCT p.wallet) as cnt FROM positions p
    WHERE p.status = 'open' AND p.opened_at <= NOW() - INTERVAL '180 days'
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'the_believer')`);
  console.log('  the_believer backlog:     ', missingBel.rows[0].cnt, 'wallets qualify');

  // 4. DB-computable additional badges
  console.log('\n--- DB-COMPUTABLE BADGE ELIGIBILITY ---');

  // Volume badges
  const volData = await pool.query(`
    SELECT
      SUM(CASE WHEN tc >= 5 THEN 1 ELSE 0 END) as v1,
      SUM(CASE WHEN tc >= 25 THEN 1 ELSE 0 END) as v2,
      SUM(CASE WHEN tc >= 100 THEN 1 ELSE 0 END) as v3
    FROM (SELECT wallet, COUNT(*) as tc FROM positions WHERE status != 'filtered' GROUP BY wallet) t`);
  console.log('  volume_veteran_i  (5+ trades): ', volData.rows[0].v1, 'wallets');
  console.log('  volume_veteran_ii (25+ trades):', volData.rows[0].v2, 'wallets');
  console.log('  volume_veteran_iii(100+ trades):', volData.rows[0].v3, 'wallets');

  // community_builder (3+ referrals)
  const commBuild = await pool.query(`
    SELECT COUNT(*) as cnt FROM (
      SELECT referred_by FROM users WHERE referred_by IS NOT NULL
      GROUP BY referred_by HAVING COUNT(*) >= 3
    ) t`);
  console.log('  community_builder (3+ referrals):', commBuild.rows[0].cnt, 'wallets');

  // referral_king (10+ referrals)
  const refKing = await pool.query(`
    SELECT COUNT(*) as cnt FROM (
      SELECT referred_by FROM users WHERE referred_by IS NOT NULL
      GROUP BY referred_by HAVING COUNT(*) >= 10
    ) t`);
  console.log('  referral_king (10+ referrals):   ', refKing.rows[0].cnt, 'wallets');

  // Check positions columns for short direction / drawdown data
  const posColsRes = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'positions' AND table_schema = 'public'
    ORDER BY ordinal_position`);
  const posCols = posColsRes.rows.map((r: any) => r.column_name);
  console.log('\n--- POSITIONS TABLE COLUMNS ---');
  console.log(' ', posCols.join(', '));

  // Look for short/direction columns
  const dirCols = posCols.filter((c: string) => ['direction','side','position_type','trade_type','type'].includes(c));
  console.log('  Direction columns found:', dirCols.join(', ') || 'NONE');

  // Check for drawdown columns
  const ddCols = posCols.filter((c: string) => c.toLowerCase().includes('drawdown') || c.toLowerCase().includes('pnl') || c.toLowerCase().includes('return'));
  console.log('  PnL/drawdown columns:  ', ddCols.join(', ') || 'NONE');

  // Check events table
  const eventsCheck = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name='events' AND table_schema='public'`);
  if (eventsCheck.rows.length > 0) {
    const eventTypes = await pool.query('SELECT event_type, COUNT(*) as cnt FROM events GROUP BY event_type ORDER BY cnt DESC');
    console.log('\n--- EVENTS TABLE ---');
    eventTypes.rows.forEach((r: any) => console.log(' ', r.event_type.padEnd(20), r.cnt, 'events'));
  } else {
    console.log('\n--- EVENTS TABLE: does not exist ---');
  }

  // Check streak_7d (7-day streak)
  const streakCheck = await pool.query(`
    SELECT COUNT(DISTINCT wallet) as cnt FROM positions
    WHERE status != 'filtered'
    AND opened_at >= NOW() - INTERVAL '7 days'`);
  console.log('\n--- STREAK (wallets active in last 7d) ---');
  console.log('  Active wallets (7d):  ', streakCheck.rows[0].cnt);

  // Summary of what CAN be evaluated vs not
  console.log('\n--- BADGE COVERAGE SUMMARY ---');
  const allDefs = await pool.query("SELECT badge_name FROM badge_definitions WHERE is_active = true ORDER BY badge_name");
  const evaluable = new Set([
    'first_trade', 'diamond_hands', 'long_hauler', 'the_believer',
    'earnings_reactor', 'fomc_trader', 'shift_holder',
    'fed_day_trade', 'cpi_bet', 'news_reactor', 'earnings_conviction', 'geopolitical_trade',
    'volume_veteran_i', 'volume_veteran_ii', 'volume_veteran_iii',
    'community_builder', 'referral_king'
  ]);
  let canEval = 0, noLogic = 0;
  allDefs.rows.forEach((r: any) => {
    if (evaluable.has(r.badge_name)) { canEval++; }
    else { noLogic++; console.log('  NO EVAL LOGIC:', r.badge_name); }
  });
  console.log(`\n  Can evaluate: ${canEval}/41   No logic yet: ${noLogic}/41`);

  await pool.end();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
