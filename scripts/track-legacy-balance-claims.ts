/**
 * Legacy Balance Claims Tracker
 * Monitors legacy balance activation and claim status for early referrers
 *
 * Usage: npx ts-node scripts/track-legacy-balance-claims.ts
 */

import { pool } from '../src/db/pool';

interface LegacyBalanceStats {
  totalReferrersWithLegacy: number;
  referralsUnlocked: number;
  referralsPending: number;
  totalLegacySPPending: number;
  totalLegacySPUnlocked: number;
  topPendingClaims: Array<{
    referrer: string;
    referred: string;
    pendingSp: number;
    referredHolding: number;
    activationStatus: string;
  }>;
  recentActivations: Array<{
    referrer: string;
    referred: string;
    unlockedSp: number;
    claimedAt: Date;
  }>;
}

export async function trackLegacyBalanceClaims(): Promise<LegacyBalanceStats> {
  console.log('\n🎁 LEGACY BALANCE CLAIMS TRACKER\n');

  // 1. Get referrers with legacy balance
  console.log('1️⃣  Referrers with Pending Legacy Balance');
  const legacyStats = await getLegacyReferrerStats();

  // 2. Get pending claims waiting for activation
  console.log('\n2️⃣  Pending Claims (Waiting for $5 Activation)');
  const pendingClaims = await getPendingClaims();

  // 3. Get recently unlocked claims (activated in last 7 days)
  console.log('\n3️⃣  Recently Unlocked Claims (Last 7 Days)');
  const recentActivations = await getRecentActivations();

  // 4. Calculate total impact
  console.log('\n4️⃣  Legacy Balance Summary');
  const summary = await calculateLegacyImpact(legacyStats, pendingClaims, recentActivations);

  await pool.end();

  return {
    totalReferrersWithLegacy: legacyStats.count,
    referralsUnlocked: legacyStats.unlocked,
    referralsPending: legacyStats.pending,
    totalLegacySPPending: summary.totalPending,
    totalLegacySPUnlocked: summary.totalUnlocked,
    topPendingClaims: pendingClaims.slice(0, 10),
    recentActivations: recentActivations,
  };
}

async function getLegacyReferrerStats(): Promise<{
  count: number;
  unlocked: number;
  pending: number;
}> {
  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT rc.referrer_wallet) as total_referrers,
      COUNT(CASE WHEN u.shift_holding >= 5 THEN 1 END) as unlocked_count,
      COUNT(CASE WHEN u.shift_holding < 5 THEN 1 END) as pending_count
    FROM referral_commissions rc
    LEFT JOIN users u ON rc.referred_wallet = u.wallet
    WHERE rc.created_at < NOW() - INTERVAL '30 days'
  `);

  const { total_referrers, unlocked_count, pending_count } = result.rows[0];

  console.log(`  👥 Referrers with Old Referrals: ${total_referrers}`);
  console.log(`  ✅ Unlocked (referred ≥$5): ${unlocked_count}`);
  console.log(`  ⏳ Pending (referred <$5): ${pending_count}`);

  return {
    count: total_referrers,
    unlocked: unlocked_count,
    pending: pending_count,
  };
}

async function getPendingClaims(): Promise<
  Array<{
    referrer: string;
    referred: string;
    pendingSp: number;
    referredHolding: number;
    activationStatus: string;
  }>
> {
  const result = await pool.query(`
    SELECT
      rc.referrer_wallet,
      rc.referred_wallet,
      COALESCE(SUM(rc.commission_sp), 0) as pending_sp,
      COALESCE(u.shift_holding, 0) as referred_holding,
      CASE
        WHEN u.shift_holding >= 5 THEN 'Ready to Claim'
        ELSE CONCAT('$', ROUND(5 - COALESCE(u.shift_holding, 0), 2), ' needed')
      END as activation_status
    FROM referral_commissions rc
    LEFT JOIN users u ON rc.referred_wallet = u.wallet
    WHERE rc.created_at < NOW() - INTERVAL '30 days'
      AND u.shift_holding < 5
    GROUP BY rc.referrer_wallet, rc.referred_wallet, u.shift_holding
    ORDER BY pending_sp DESC
    LIMIT 20
  `);

  console.log(`  Found ${result.rows.length} claims pending activation\n`);

  result.rows.slice(0, 5).forEach((row, idx) => {
    console.log(
      `  ${idx + 1}. ${row.referrer_wallet.substring(0, 10)}... → ${row.referred_wallet.substring(0, 10)}...`
    );
    console.log(`     Pending SP: ${row.pending_sp.toFixed(0)} | Holding: $${row.referred_holding.toFixed(2)} | ${row.activation_status}`);
  });

  return result.rows.map((row) => ({
    referrer: row.referrer_wallet,
    referred: row.referred_wallet,
    pendingSp: row.pending_sp,
    referredHolding: row.referred_holding,
    activationStatus: row.activation_status,
  }));
}

async function getRecentActivations(): Promise<
  Array<{
    referrer: string;
    referred: string;
    unlockedSp: number;
    claimedAt: Date;
  }>
> {
  const result = await pool.query(`
    SELECT
      rc.referrer_wallet,
      rc.referred_wallet,
      COALESCE(SUM(rc.commission_sp), 0) as unlocked_sp,
      MAX(rc.created_at) as first_commission_date,
      NOW() as claim_reference
    FROM referral_commissions rc
    LEFT JOIN users u ON rc.referred_wallet = u.wallet
    WHERE rc.created_at < NOW() - INTERVAL '30 days'
      AND u.shift_holding >= 5
      AND u.updated_at > NOW() - INTERVAL '7 days'
    GROUP BY rc.referrer_wallet, rc.referred_wallet
    ORDER BY u.updated_at DESC
    LIMIT 10
  `);

  console.log(`  Found ${result.rows.length} recently activated referrals\n`);

  result.rows.slice(0, 5).forEach((row, idx) => {
    console.log(
      `  ${idx + 1}. ${row.referrer_wallet.substring(0, 10)}... ← ${row.referred_wallet.substring(0, 10)}...`
    );
    console.log(`     Unlocked SP: ${row.unlocked_sp.toFixed(0)} | Activated: ${new Date(row.claim_reference).toLocaleDateString()}`);
  });

  return result.rows.map((row) => ({
    referrer: row.referrer_wallet,
    referred: row.referred_wallet,
    unlockedSp: row.unlocked_sp,
    claimedAt: new Date(row.claim_reference),
  }));
}

async function calculateLegacyImpact(
  legacyStats: { count: number; unlocked: number; pending: number },
  pendingClaims: Array<{
    referrer: string;
    referred: string;
    pendingSp: number;
    referredHolding: number;
    activationStatus: string;
  }>,
  recentActivations: Array<{
    referrer: string;
    referred: string;
    unlockedSp: number;
    claimedAt: Date;
  }>
): Promise<{ totalPending: number; totalUnlocked: number }> {
  const totalPending = pendingClaims.reduce((sum, claim) => sum + claim.pendingSp, 0);
  const totalUnlocked = recentActivations.reduce((sum, activation) => sum + activation.unlockedSp, 0);

  console.log(`  💰 Total Legacy SP Pending: ${totalPending.toFixed(0)} SP`);
  console.log(`  ✅ Total Legacy SP Unlocked (7d): ${totalUnlocked.toFixed(0)} SP`);
  console.log(`  📊 Average per Referrer: ${(totalPending / (legacyStats.pending || 1)).toFixed(0)} SP pending`);

  // Calculate activation rate
  const activationRate = (legacyStats.unlocked / (legacyStats.unlocked + legacyStats.pending) * 100).toFixed(1);
  console.log(`  🎯 Activation Rate: ${activationRate}%`);

  return { totalPending, totalUnlocked };
}

async function printHealthMetrics(): Promise<void> {
  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT rc.referrer_wallet) as total_legacy_referrers,
      COUNT(DISTINCT CASE WHEN u.shift_holding >= 5 THEN rc.referred_wallet END) as activated_referrals,
      COUNT(DISTINCT CASE WHEN u.shift_holding < 5 THEN rc.referred_wallet END) as pending_referrals,
      COALESCE(SUM(CASE WHEN u.shift_holding >= 5 THEN rc.commission_sp END), 0) as unlocked_sp,
      COALESCE(SUM(CASE WHEN u.shift_holding < 5 THEN rc.commission_sp END), 0) as pending_sp
    FROM referral_commissions rc
    LEFT JOIN users u ON rc.referred_wallet = u.wallet
    WHERE rc.created_at < NOW() - INTERVAL '30 days'
  `);

  const {
    total_legacy_referrers,
    activated_referrals,
    pending_referrals,
    unlocked_sp,
    pending_sp,
  } = result.rows[0];

  console.log('\n' + '='.repeat(60));
  console.log('📊 LEGACY BALANCE HEALTH METRICS');
  console.log('='.repeat(60));
  console.log(`Total Legacy Referrers: ${total_legacy_referrers}`);
  console.log(`Activated Referrals: ${activated_referrals}`);
  console.log(`Pending Referrals: ${pending_referrals}`);
  console.log(`Unlocked SP Available: ${unlocked_sp.toFixed(0)}`);
  console.log(`Pending SP (awaiting activation): ${pending_sp.toFixed(0)}`);
  console.log(`Total Legacy SP in System: ${(unlocked_sp + pending_sp).toFixed(0)}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const stats = await trackLegacyBalanceClaims();
  await printHealthMetrics();

  return stats;
}

main().catch(console.error);
