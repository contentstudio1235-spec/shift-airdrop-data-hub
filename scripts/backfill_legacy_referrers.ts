/**
 * Legacy Referrer Backfill Script
 * ================================
 *
 * Calculates and seeds pending Position SP for all referrers
 * who had active referrals before the commission system launched.
 *
 * Usage:
 *   npx ts-node scripts/backfill_legacy_referrers.ts --dry-run  (test only)
 *   npx ts-node scripts/backfill_legacy_referrers.ts --execute  (commit to DB)
 *
 * Safety:
 *   - Dry-run calculates amounts WITHOUT modifying DB
 *   - Execute with --execute flag ONLY on staging first
 *   - Always verify results before production deployment
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

interface ReferrerBackfill {
  referrerWallet: string;
  referredCount: number;
  totalPendingSp: number;
  breakdown: {
    referredWallet: string;
    totalXp: number;
    tier: number; // 10, 12, or 15
    commissionSp: number;
  }[];
}

// Tier thresholds
const getTierRate = (totalXp: number): number => {
  if (totalXp < 1000) return 10;
  if (totalXp < 10000) return 12;
  return 15;
};

async function backfillLegacyReferrers(dryRun: boolean = true): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Legacy Referrer Backfill Script (${dryRun ? 'DRY RUN' : 'EXECUTE'})`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // Step 1: Find all legacy referrers (have at least 1 referred wallet)
    console.log('[Step 1] Identifying legacy referrers...');
    const referrers = await pool.query(
      `SELECT DISTINCT referred_by_wallet FROM users WHERE referred_by_wallet IS NOT NULL`
    );
    console.log(`Found ${referrers.rows.length} legacy referrers\n`);

    // Step 2: Calculate pending SP for each referrer
    console.log('[Step 2] Calculating pending commissions...');
    const backfills: ReferrerBackfill[] = [];
    let totalBackfillSp = 0;

    for (const row of referrers.rows) {
      const referrerWallet = row.referred_by_wallet;

      // Get all referred wallets for this referrer
      const referred = await pool.query(
        `SELECT wallet, total_xp FROM users WHERE referred_by_wallet = $1`,
        [referrerWallet]
      );

      let referrerTotalSp = 0;
      const breakdown = referred.rows.map((r: any) => {
        const tier = getTierRate(r.total_xp);
        const commissionSp = Math.floor((r.total_xp * tier) / 100);
        referrerTotalSp += commissionSp;

        return {
          referredWallet: r.wallet,
          totalXp: r.total_xp,
          tier,
          commissionSp,
        };
      });

      if (referrerTotalSp > 0) {
        backfills.push({
          referrerWallet,
          referredCount: referred.rows.length,
          totalPendingSp: referrerTotalSp,
          breakdown,
        });
        totalBackfillSp += referrerTotalSp;
      }
    }

    console.log(`Calculated backfill for ${backfills.length} referrers`);
    console.log(`Total Position SP to backfill: ${totalBackfillSp}\n`);

    // Step 3: Show top 10 referrers
    console.log('[Step 3] Top 10 referrers by pending SP:');
    backfills
      .sort((a, b) => b.totalPendingSp - a.totalPendingSp)
      .slice(0, 10)
      .forEach((b, i) => {
        console.log(`  ${i + 1}. ${b.referrerWallet.substring(0, 10)}... → ${b.totalPendingSp} SP (${b.referredCount} referred)`);
      });

    // Step 4: Verify no existing legacy balances
    console.log('\n[Step 4] Checking for existing legacy balances...');
    const existing = await pool.query(
      `SELECT COUNT(*) as cnt FROM referral_legacy_balance WHERE pending_sp > 0`
    );
    const existingCount = existing.rows[0].cnt;
    if (existingCount > 0) {
      console.warn(`⚠️  WARNING: ${existingCount} existing legacy balance records found!`);
      console.log('   Ensure you want to backfill before running with --execute\n');
    } else {
      console.log('No existing legacy balances. Safe to proceed.\n');
    }

    // Step 5: If not dry run, insert into DB
    if (!dryRun) {
      console.log('[Step 5] Inserting legacy balances into DB...');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let inserted = 0;
        for (const backfill of backfills) {
          try {
            await client.query(
              `INSERT INTO referral_legacy_balance (referrer_wallet, pending_sp, claimed, claim_method, created_at)
               VALUES ($1, $2, false, 'auto', NOW())
               ON CONFLICT (referrer_wallet) DO UPDATE SET pending_sp = $2`,
              [backfill.referrerWallet, backfill.totalPendingSp]
            );
            inserted++;
          } catch (err) {
            console.error(`Failed to insert ${backfill.referrerWallet}:`, err);
          }
        }

        await client.query('COMMIT');
        console.log(`✅ Inserted/updated ${inserted}/${backfills.length} legacy balances\n`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // Verify insertion
      console.log('[Step 6] Verifying insertion...');
      const verification = await pool.query(
        `SELECT COUNT(*) as cnt, SUM(pending_sp) as total FROM referral_legacy_balance WHERE pending_sp > 0`
      );
      console.log(`✅ ${verification.rows[0].cnt} legacy balances with ${verification.rows[0].total} total SP\n`);
    } else {
      console.log('[Step 5] DRY RUN: Skipping DB insertion (use --execute to commit)\n');
    }

    console.log(`${'='.repeat(70)}`);
    console.log('✅ Backfill complete!');
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
  console.log('Running in DRY RUN mode. No database changes will be made.');
  console.log('To commit changes, run with --execute flag.\n');
}

backfillLegacyReferrers(dryRun);
