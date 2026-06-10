import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });

async function run() {
  const defs = await pool.query('SELECT badge_name, unlock_requirement, rarity FROM badge_definitions WHERE is_active=true ORDER BY badge_name');
  console.log('=== BADGE UNLOCK REQUIREMENTS ===');
  defs.rows.forEach((r: any) => console.log(`  ${r.badge_name.padEnd(30)} [${r.rarity.padEnd(6)}] ${r.unlock_requirement}`));

  console.log('\n=== DRAWDOWN DISTRIBUTION ===');
  const dd = await pool.query("SELECT COUNT(*) as total_pos, COUNT(CASE WHEN max_drawdown_pct <= -10 THEN 1 END) as hit_10pct, COUNT(CASE WHEN max_drawdown_pct <= -20 THEN 1 END) as hit_20pct, MIN(max_drawdown_pct) as worst_drawdown FROM positions WHERE status != 'filtered'");
  console.log('  Total positions:', dd.rows[0].total_pos, '  Hit -10%:', dd.rows[0].hit_10pct, '  Hit -20%:', dd.rows[0].hit_20pct, '  Worst:', dd.rows[0].worst_drawdown, '%');

  const neg10 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE status != 'filtered' AND max_drawdown_pct <= -10 AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'negative_10_survivor')");
  const neg20 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE status != 'filtered' AND max_drawdown_pct <= -20 AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'negative_20_survivor')");
  console.log('  negative_10_survivor backlog:', neg10.rows[0].cnt, 'wallets');
  console.log('  negative_20_survivor backlog:', neg20.rows[0].cnt, 'wallets');

  console.log('\n=== EARNINGS DATA ===');
  const earnData = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN held_through_earnings = true THEN 1 END) as held_earnings, COUNT(CASE WHEN earnings_count > 0 THEN 1 END) as with_earnings_count, MAX(earnings_count) as max_earnings_count FROM positions WHERE status != 'filtered'");
  console.log('  held_through_earnings=true:', earnData.rows[0].held_earnings, '  earnings_count>0:', earnData.rows[0].with_earnings_count, '  max earnings_count:', earnData.rows[0].max_earnings_count);

  const earningsReactor = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE held_through_earnings = true AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'earnings_reactor')");
  const multiEarnings = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE earnings_count >= 3 AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'multi_earnings_holder')");
  console.log('  earnings_reactor backlog:', earningsReactor.rows[0].cnt);
  console.log('  multi_earnings_holder backlog (3+):', multiEarnings.rows[0].cnt);

  console.log('\n=== HOLDING DURATION ===');
  const h7 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE status = 'open' AND opened_at <= NOW() - INTERVAL '7 days' AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'diamond_hands_7d')");
  const h60 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE status = 'open' AND opened_at <= NOW() - INTERVAL '60 days' AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'diamond_hands')");
  console.log('  diamond_hands_7d backlog (7+ days):', h7.rows[0].cnt, 'wallets');
  console.log('  diamond_hands backlog (60+ days):', h60.rows[0].cnt, 'wallets');

  console.log('\n=== POSITION STACKING ===');
  const doubled = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet, asset FROM positions WHERE status != 'filtered' GROUP BY wallet, asset HAVING COUNT(*) >= 2) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'doubled_down')");
  const tripled = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet, asset FROM positions WHERE status != 'filtered' GROUP BY wallet, asset HAVING COUNT(*) >= 3) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'triple_down')");
  const conviction = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet, asset FROM positions WHERE status != 'filtered' GROUP BY wallet, asset HAVING COUNT(*) >= 4) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'conviction_stack')");
  const pyramid = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet, asset FROM positions WHERE status != 'filtered' GROUP BY wallet, asset HAVING COUNT(*) >= 5) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'pyramid_up')");
  console.log('  doubled_down (2+ same asset):', doubled.rows[0].cnt, 'wallets');
  console.log('  triple_down (3+ same asset):', tripled.rows[0].cnt, 'wallets');
  console.log('  conviction_stack (4+ same asset):', conviction.rows[0].cnt, 'wallets');
  console.log('  pyramid_up (5+ same asset):', pyramid.rows[0].cnt, 'wallets');

  console.log('\n=== VOLUME VETERAN ===');
  const vv1 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet FROM positions WHERE status != 'filtered' GROUP BY wallet HAVING COUNT(*) >= 5) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'volume_veteran_i')");
  const vv2 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet FROM positions WHERE status != 'filtered' GROUP BY wallet HAVING COUNT(*) >= 25) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'volume_veteran_ii')");
  const vv3 = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM (SELECT wallet FROM positions WHERE status != 'filtered' GROUP BY wallet HAVING COUNT(*) >= 100) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.wallet AND b.badge_name = 'volume_veteran_iii')");
  console.log('  volume_veteran_i (5+ trades):', vv1.rows[0].cnt);
  console.log('  volume_veteran_ii (25+ trades):', vv2.rows[0].cnt);
  console.log('  volume_veteran_iii (100+ trades):', vv3.rows[0].cnt);

  console.log('\n=== STREAK_7D ===');
  const streak7 = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE current_streak >= 7 AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = users.wallet AND b.badge_name = 'streak_7d')");
  const maxStreak = await pool.query('SELECT MAX(current_streak) as mx FROM users WHERE current_streak > 0');
  console.log('  streak_7d backlog:', streak7.rows[0].cnt, 'wallets   Max streak:', maxStreak.rows[0].mx);

  console.log('\n=== REFERRALS ===');
  const commBacklog = await pool.query("SELECT COUNT(*) as cnt FROM (SELECT referred_by_wallet FROM users WHERE referred_by_wallet IS NOT NULL GROUP BY referred_by_wallet HAVING COUNT(*) >= 3) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.referred_by_wallet AND b.badge_name = 'community_builder')");
  const refKing = await pool.query("SELECT COUNT(*) as cnt FROM (SELECT referred_by_wallet FROM users WHERE referred_by_wallet IS NOT NULL GROUP BY referred_by_wallet HAVING COUNT(*) >= 10) t WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = t.referred_by_wallet AND b.badge_name = 'referral_king')");
  console.log('  community_builder backlog (3+ refs):', commBacklog.rows[0].cnt);
  console.log('  referral_king backlog (10+ refs):', refKing.rows[0].cnt);

  console.log('\n=== SHORT POSITIONS ===');
  const directions = await pool.query("SELECT DISTINCT direction, COUNT(*) as cnt FROM positions WHERE status != 'filtered' GROUP BY direction");
  directions.rows.forEach((r: any) => console.log('  direction:', r.direction, '->', r.cnt, 'positions'));
  const firstShort = await pool.query("SELECT COUNT(DISTINCT wallet) as cnt FROM positions WHERE status != 'filtered' AND direction = 'short' AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'first_short')");
  console.log('  first_short backlog:', firstShort.rows[0].cnt, 'wallets');

  console.log('\n=== EVENTS TABLE ===');
  const evCheck = await pool.query("SELECT COUNT(*) as cnt FROM events");
  console.log('  Total events:', evCheck.rows[0].cnt);

  await pool.end();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
