/**
 * Full Badge Backfill — awards all DB-computable badges to qualifying wallets.
 * Run once to eliminate the historical backlog.
 * Safe to re-run (ON CONFLICT DO NOTHING everywhere).
 */
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

interface BadgeResult { badge: string; awarded: number; skipped: number; }

async function awardBadge(client: PoolClient, wallet: string, badge: string): Promise<boolean> {
  const res = await client.query(
    "INSERT INTO badges (wallet, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [wallet, badge]
  );
  return (res.rowCount ?? 0) > 0;
}

async function backfillBadge(
  badge: string,
  querySql: string,
  queryParams: any[] = []
): Promise<BadgeResult> {
  const client = await pool.connect();
  let awarded = 0;
  let skipped = 0;
  try {
    const wallets = await client.query<{ wallet: string }>(querySql, queryParams);
    for (const { wallet } of wallets.rows) {
      const wasNew = await awardBadge(client, wallet, badge);
      if (wasNew) awarded++;
      else skipped++;
    }
    return { badge, awarded, skipped };
  } finally {
    client.release();
  }
}

async function run() {
  console.log('=================================================');
  console.log('       FULL BADGE BACKFILL — ' + new Date().toISOString());
  console.log('=================================================\n');

  const results: BadgeResult[] = [];

  // ── 1. the_og — traded in first 30 days of launch (May 19 - June 18, 2026) ──
  // All 500 current traders qualify since we're still in that window
  console.log('[1/11] the_og ...');
  results.push(await backfillBadge(
    'the_og',
    `SELECT DISTINCT wallet FROM positions WHERE status != 'filtered'
     AND opened_at >= '2026-05-19'::date AND opened_at <= '2026-06-18'::date`
  ));

  // ── 2. diamond_hands_7d — any open position open 7+ days ──
  console.log('[2/11] diamond_hands_7d ...');
  results.push(await backfillBadge(
    'diamond_hands_7d',
    `SELECT DISTINCT wallet FROM positions WHERE status = 'open' AND opened_at <= NOW() - INTERVAL '7 days'`
  ));

  // ── 3. community_builder — referred 3+ users ──
  console.log('[3/11] community_builder ...');
  results.push(await backfillBadge(
    'community_builder',
    `SELECT referred_by_wallet as wallet FROM users
     WHERE referred_by_wallet IS NOT NULL
     GROUP BY referred_by_wallet
     HAVING COUNT(*) >= 3`
  ));

  // ── 4. doubled_down — 2+ positions on same asset ──
  console.log('[4/11] doubled_down ...');
  results.push(await backfillBadge(
    'doubled_down',
    `SELECT DISTINCT wallet FROM positions WHERE status != 'filtered'
     GROUP BY wallet, asset HAVING COUNT(*) >= 2`
  ));

  // ── 5. triple_down — 3+ positions on same asset ──
  console.log('[5/11] triple_down ...');
  results.push(await backfillBadge(
    'triple_down',
    `SELECT DISTINCT wallet FROM (
       SELECT wallet FROM positions WHERE status != 'filtered'
       GROUP BY wallet, asset HAVING COUNT(*) >= 3
     ) t`
  ));

  // ── 6. volume_veteran_i — 5+ total trades (testnet-scale: use count not USD) ──
  console.log('[6/11] volume_veteran_i ...');
  results.push(await backfillBadge(
    'volume_veteran_i',
    `SELECT wallet FROM positions WHERE status != 'filtered'
     GROUP BY wallet HAVING COUNT(*) >= 5`
  ));

  // ── 7. referral_king — referred 10+ users ──
  console.log('[7/11] referral_king ...');
  results.push(await backfillBadge(
    'referral_king',
    `SELECT referred_by_wallet as wallet FROM users
     WHERE referred_by_wallet IS NOT NULL
     GROUP BY referred_by_wallet
     HAVING COUNT(*) >= 10`
  ));

  // ── 8. conviction_stack — 4+ positions on same asset (4+ adds) ──
  console.log('[8/11] conviction_stack ...');
  results.push(await backfillBadge(
    'conviction_stack',
    `SELECT DISTINCT wallet FROM (
       SELECT wallet FROM positions WHERE status != 'filtered'
       GROUP BY wallet, asset HAVING COUNT(*) >= 4
     ) t`
  ));

  // ── 9. legend — 50,000+ total XP ──
  console.log('[9/11] legend ...');
  results.push(await backfillBadge(
    'legend',
    `SELECT wallet FROM users WHERE total_xp >= 50000`
  ));

  // ── 10. volume_veteran_ii — 25+ total trades ──
  console.log('[10/11] volume_veteran_ii ...');
  results.push(await backfillBadge(
    'volume_veteran_ii',
    `SELECT wallet FROM positions WHERE status != 'filtered'
     GROUP BY wallet HAVING COUNT(*) >= 25`
  ));

  // ── 11. pyramid_up — 5+ positions on same asset ──
  console.log('[11/11] pyramid_up ...');
  results.push(await backfillBadge(
    'pyramid_up',
    `SELECT DISTINCT wallet FROM (
       SELECT wallet FROM positions WHERE status != 'filtered'
       GROUP BY wallet, asset HAVING COUNT(*) >= 5
     ) t`
  ));

  // ── Summary ──
  console.log('\n=================================================');
  console.log('                   RESULTS');
  console.log('=================================================');
  let totalAwarded = 0;
  for (const r of results) {
    console.log(`  ${r.badge.padEnd(30)} +${r.awarded} new  (${r.skipped} already had it)`);
    totalAwarded += r.awarded;
  }
  console.log(`\n  TOTAL NEW BADGES AWARDED: ${totalAwarded}`);

  // Final distribution
  const dist = await pool.query(`
    SELECT badge_name, COUNT(*) as cnt FROM badges
    WHERE status = 'active' GROUP BY badge_name ORDER BY cnt DESC`);
  console.log('\n=== FINAL BADGE DISTRIBUTION ===');
  dist.rows.forEach((r: any) => console.log(`  ${r.badge_name.padEnd(30)} ${r.cnt}`));
  console.log(`  TOTAL: ${dist.rows.reduce((a: number, r: any) => a + parseInt(r.cnt), 0)}`);

  await pool.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
