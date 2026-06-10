// Wallet verification script
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/shift_airdrop',
});

async function verifyWallet(wallet: string, label: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Verifying: ${label}`);
  console.log(`Wallet: ${wallet}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // 1. Get user stats
    const userResult = await pool.query(
      'SELECT wallet, total_xp, snag_points, claim_multiplier FROM users WHERE wallet = $1',
      [wallet]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }

    const user = userResult.rows[0];
    console.log('📊 User Stats:');
    console.log(`  total_xp (position SP): ${user.total_xp}`);
    console.log(`  snag_points (cached): ${user.snag_points}`);
    console.log(`  claim_multiplier: ${user.claim_multiplier}`);

    // 2. Get XP sync log
    const syncResult = await pool.query(
      'SELECT last_synced_xp FROM xp_sync_log WHERE wallet = $1',
      [wallet]
    );

    const lastSyncedXp = syncResult.rows[0]?.last_synced_xp || 0;
    const socialSp = Math.max(0, user.snag_points - lastSyncedXp);
    const totalSp = parseFloat(user.total_xp) + socialSp;

    console.log(`\n💰 Loyalty Breakdown:`);
    console.log(`  last_synced_xp: ${lastSyncedXp}`);
    console.log(`  position SP: ${user.total_xp}`);
    console.log(`  social SP (SNAG - synced): ${socialSp}`);
    console.log(`  TOTAL SP: ${totalSp}`);

    // 3. Get positions (open and closed)
    const openPosResult = await pool.query(
      `SELECT COUNT(*) as count FROM positions WHERE wallet = $1 AND status IN ('open', 'active')`,
      [wallet]
    );
    const activeCount = openPosResult.rows[0].count;
    console.log(`\n📍 Positions: ${activeCount} active`);

    // 4. Get all positions with details
    const allPosResult = await pool.query(
      `SELECT id, asset, position_size_usd, opened_at, closed_at, xp_generated,
              last_xp_calc, status, current_multiplier
       FROM positions WHERE wallet = $1
       ORDER BY opened_at DESC LIMIT 10`,
      [wallet]
    );

    console.log(`\n📈 Position History (last 10):`);
    for (const pos of allPosResult.rows) {
      const status = pos.status === 'open' || pos.status === 'active' ? '🟢 OPEN' : '🔴 CLOSED';
      const holdDays = pos.closed_at
        ? ((new Date(pos.closed_at).getTime() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24)).toFixed(2)
        : ((new Date().getTime() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24)).toFixed(2);

      console.log(`\n  ${status} ${pos.asset} | $${pos.position_size_usd}`);
      console.log(`    Opened: ${new Date(pos.opened_at).toLocaleString()}`);
      console.log(`    Hold time: ${holdDays} days`);
      console.log(`    XP earned: ${pos.xp_generated} | Current multiplier: ${pos.current_multiplier}x`);
      if (pos.closed_at) {
        console.log(`    Closed: ${new Date(pos.closed_at).toLocaleString()}`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

async function main() {
  const wallet1 = '3LymonH2cx6iYaHo2zdXdPTp8vtDFE6hkhB2PnnU8iaX';
  const wallet2 = 'E8HvuaTt5YQMbeVde1Gxchto351Z3fYwVEMPwphPiz8m';

  await verifyWallet(wallet1, 'Top Leaderboard Wallet');
  await verifyWallet(wallet2, 'Launch Bonus Test Wallet');

  await pool.end();
}

main().catch(console.error);
