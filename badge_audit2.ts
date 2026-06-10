import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });

async function run() {
  // Check users table columns
  const userCols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='users' AND table_schema='public' ORDER BY ordinal_position`);
  const uCols = userCols.rows.map((r: any) => r.column_name);
  console.log('users columns:', uCols.join(', '));

  // Find referral column
  const refCol = uCols.find((c: string) => c.toLowerCase().includes('referr') || c.toLowerCase().includes('ref_'));
  console.log('referral column:', refCol || 'NONE');

  // Check positions schema
  const posCols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='positions' AND table_schema='public' ORDER BY ordinal_position`);
  const pCols = posCols.rows.map((r: any) => r.column_name);
  console.log('\npositions columns:', pCols.join(', '));

  // Check direction/short column
  const dirCol = pCols.find((c: string) => ['direction','side','position_type','type'].includes(c));
  console.log('direction column:', dirCol || 'NONE');

  // Sample positions to understand the data
  const samplePos = await pool.query(`SELECT * FROM positions WHERE status != 'filtered' LIMIT 2`);
  console.log('\nSample position row keys:', Object.keys(samplePos.rows[0] || {}));
  if (samplePos.rows[0]) {
    const r = samplePos.rows[0];
    console.log('Sample:', JSON.stringify({
      asset: r.asset, direction: r.direction || r.side || r.type,
      opened_at: r.opened_at, pnl: r.pnl || r.return_pct || r.profit_loss
    }));
  }

  // 5. Check events table structure if exists
  const eventsExists = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name='events' AND table_schema='public'`);
  if (eventsExists.rows.length > 0) {
    const evCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='events' AND table_schema='public' ORDER BY ordinal_position`);
    console.log('\nevents columns:', evCols.rows.map((r: any) => r.column_name).join(', '));
    const evCount = await pool.query('SELECT event_type, COUNT(*) FROM events GROUP BY event_type');
    console.log('events by type:', evCount.rows.map((r: any) => `${r.event_type}:${r.count}`).join(', '));
  }

  // Volume_veteran missing badges
  const vv1Missing = await pool.query(`
    SELECT COUNT(DISTINCT p.wallet) as cnt FROM (
      SELECT wallet FROM positions WHERE status != 'filtered' GROUP BY wallet HAVING COUNT(*) >= 5
    ) p WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'volume_veteran_i')`);
  console.log('\nvolume_veteran_i backlog:', vv1Missing.rows[0].cnt, 'wallets');

  const vv2Missing = await pool.query(`
    SELECT COUNT(DISTINCT p.wallet) as cnt FROM (
      SELECT wallet FROM positions WHERE status != 'filtered' GROUP BY wallet HAVING COUNT(*) >= 25
    ) p WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'volume_veteran_ii')`);
  console.log('volume_veteran_ii backlog:', vv2Missing.rows[0].cnt, 'wallets');

  // Check streak — users active in any 7 consecutive days
  const streakUsers = await pool.query(`
    SELECT COUNT(DISTINCT wallet) as cnt FROM positions
    WHERE status != 'filtered' AND opened_at >= NOW() - INTERVAL '30 days'`);
  console.log('\nActive users (last 30d):', streakUsers.rows[0].cnt);

  // first_short — check if direction column exists
  if (dirCol) {
    const shortSample = await pool.query(`SELECT DISTINCT ${dirCol} as dir FROM positions WHERE status != 'filtered' LIMIT 10`);
    console.log('\ndirection values:', shortSample.rows.map((r: any) => r.dir).join(', '));

    const firstShortMissing = await pool.query(`
      SELECT COUNT(DISTINCT p.wallet) as cnt FROM positions p
      WHERE p.status != 'filtered' AND LOWER(p.${dirCol}::text) IN ('short','sell')
      AND NOT EXISTS (SELECT 1 FROM badges b WHERE b.wallet = p.wallet AND b.badge_name = 'first_short')`);
    console.log('first_short backlog:', firstShortMissing.rows[0].cnt, 'wallets qualify');
  }

  // Check referral-based badges
  if (refCol) {
    const commBuild = await pool.query(`
      SELECT COUNT(*) as cnt FROM (
        SELECT ${refCol} FROM users WHERE ${refCol} IS NOT NULL
        GROUP BY ${refCol} HAVING COUNT(*) >= 3
      ) t`);
    const refKing = await pool.query(`
      SELECT COUNT(*) as cnt FROM (
        SELECT ${refCol} FROM users WHERE ${refCol} IS NOT NULL
        GROUP BY ${refCol} HAVING COUNT(*) >= 10
      ) t`);
    console.log('\ncommunity_builder (3+ refs):', commBuild.rows[0].cnt, 'wallets');
    console.log('referral_king (10+ refs):    ', refKing.rows[0].cnt, 'wallets');
  }

  await pool.end();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
