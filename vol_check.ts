import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  // Volume veteran criteria is USD volume, not count
  const vol = await pool.query(`
    SELECT 
      COUNT(DISTINCT CASE WHEN total_vol >= 10000 THEN wallet END) as v1_10k,
      COUNT(DISTINCT CASE WHEN total_vol >= 100000 THEN wallet END) as v2_100k,
      COUNT(DISTINCT CASE WHEN total_vol >= 1000000 THEN wallet END) as v3_1m,
      MAX(total_vol) as max_vol,
      AVG(total_vol) as avg_vol
    FROM (SELECT wallet, SUM(COALESCE(position_size_usd, 0)) as total_vol FROM positions WHERE status != 'filtered' GROUP BY wallet) t`);
  console.log('Volume veteran (USD):');
  console.log('  v1 $10k+ wallets:', vol.rows[0].v1_10k);
  console.log('  v2 $100k+ wallets:', vol.rows[0].v2_100k);
  console.log('  v3 $1m+ wallets:', vol.rows[0].v3_1m);
  console.log('  Max volume:', parseFloat(vol.rows[0].max_vol || 0).toFixed(2));
  console.log('  Avg volume:', parseFloat(vol.rows[0].avg_vol || 0).toFixed(2));

  // whale_mode - $10k+ position (single position)
  const whale = await pool.query(`
    SELECT COUNT(DISTINCT wallet) as cnt FROM positions 
    WHERE status != 'filtered' AND position_size_usd >= 10000
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'whale_mode')`);
  console.log('\n  whale_mode ($10k+ single position):', whale.rows[0].cnt, 'wallets backlog');

  // Sample position sizes
  const sizes = await pool.query(`SELECT position_size_usd FROM positions WHERE status != 'filtered' ORDER BY position_size_usd DESC LIMIT 5`);
  console.log('  Top 5 position sizes:', sizes.rows.map((r: any) => '$' + parseFloat(r.position_size_usd || 0).toFixed(2)).join(', '));

  // the_og - active in first 30 days of SHIFT launch
  // Need to know launch date — check earliest position
  const earliest = await pool.query(`SELECT MIN(opened_at) as first_open FROM positions WHERE status != 'filtered'`);
  console.log('\n  Earliest position:', earliest.rows[0].first_open);
  const launchDate = new Date(earliest.rows[0].first_open);
  const thirtyDaysAfterLaunch = new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  console.log('  Launch date (approx):', launchDate.toISOString().split('T')[0]);
  console.log('  First 30 days ends:', thirtyDaysAfterLaunch.toISOString().split('T')[0]);
  const og = await pool.query(`
    SELECT COUNT(DISTINCT wallet) as cnt FROM positions
    WHERE status != 'filtered' AND opened_at >= $1 AND opened_at <= $2
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = positions.wallet AND b.badge_name = 'the_og')`,
    [launchDate, thirtyDaysAfterLaunch]);
  console.log('  the_og backlog:', og.rows[0].cnt, 'wallets traded in first 30 days');

  // legend badge - 50k+ XP
  const legendBadge = await pool.query(`
    SELECT COUNT(*) as cnt FROM users WHERE total_xp >= 50000
    AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = users.wallet AND b.badge_name = 'legend')`);
  const xpStats = await pool.query(`SELECT MAX(total_xp) as mx, AVG(total_xp) as avg FROM users WHERE total_xp > 0`);
  console.log('\n  legend (50k XP) backlog:', legendBadge.rows[0].cnt, 'wallets');
  console.log('  Max XP:', xpStats.rows[0].mx, '  Avg XP:', Math.round(xpStats.rows[0].avg || 0));

  // momentum_rider - bought when asset closed +3% or higher - no price data granularity for this
  // dip_buyer - bought when asset closed -3% - no single-day close data
  // breakout_buyer, crash_buyer, top_caller, black_swan_buyer - need market data
  console.log('\n  NOTE: momentum_rider, dip_buyer, crash_buyer, black_swan_buyer, breakout_buyer,');
  console.log('        top_caller, iron_hands, squeeze_survivor, macro_bear need market price data');
  console.log('        new_high_holder, earnings_short, new_high_holder - need price feed');

  await pool.end();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
