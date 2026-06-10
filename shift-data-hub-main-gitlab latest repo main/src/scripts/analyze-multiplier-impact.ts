import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

interface PositionAnalysis {
  id: string;
  asset: string;
  position_size_usd: number;
  xp_generated: number;
  opened_at: Date;
  raw_xp: number;
  detected_multiplier: number;
  expected_multiplier: number;
  multiplier_delta: number;
}

async function analyze() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          LAUNCH MULTIPLIER BUG - IMPACT ANALYSIS                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get all positions from May 25 to June 2 (Phase 1 window)
    const res = await pool.query(`
      SELECT 
        id,
        wallet,
        asset,
        position_size_usd,
        xp_generated,
        opened_at,
        status
      FROM positions
      WHERE opened_at >= '2026-05-25T00:00:00Z'
        AND opened_at < '2026-06-02T09:31:00Z'
        AND status IN ('open', 'closed')
      ORDER BY wallet, opened_at
    `);

    console.log(`Total positions in Phase 1 window: ${res.rows.length}\n`);

    // Analyze each position
    const byWallet: { [key: string]: PositionAnalysis[] } = {};
    const walletIssues: { [key: string]: { loss: number; count: number; expected: number } } = {};

    for (const pos of res.rows) {
      const rawXP = Math.log10(parseFloat(pos.position_size_usd)) * 100;
      const detectedMult = parseFloat(pos.xp_generated) / rawXP;
      const expectedMult = 3.0; // Phase 1 should be 3.0x
      const delta = detectedMult - expectedMult;

      if (!byWallet[pos.wallet]) {
        byWallet[pos.wallet] = [];
      }

      byWallet[pos.wallet].push({
        id: pos.id,
        asset: pos.asset,
        position_size_usd: parseFloat(pos.position_size_usd),
        xp_generated: parseFloat(pos.xp_generated),
        opened_at: new Date(pos.opened_at),
        raw_xp: rawXP,
        detected_multiplier: detectedMult,
        expected_multiplier: expectedMult,
        multiplier_delta: delta,
      });

      // Check if this position has the wrong multiplier
      if (Math.abs(delta) > 0.1) {
        if (!walletIssues[pos.wallet]) {
          walletIssues[pos.wallet] = { loss: 0, count: 0, expected: 0 };
        }

        // Calculate loss
        const correctXP = rawXP * expectedMult;
        const loss = correctXP - parseFloat(pos.xp_generated);
        walletIssues[pos.wallet].loss += loss;
        walletIssues[pos.wallet].count += 1;
        walletIssues[pos.wallet].expected += correctXP;
      }
    }

    // Report affected wallets
    const affectedWallets = Object.entries(walletIssues).sort(
      (a, b) => b[1].loss - a[1].loss
    );

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║              AFFECTED WALLETS (by XP loss)                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (affectedWallets.length === 0) {
      console.log('✓ No wallets with significant multiplier discrepancies found.\n');
    } else {
      console.log(`Found ${affectedWallets.length} wallets with multiplier issues:\n`);

      affectedWallets.forEach(([wallet, issues], i) => {
        console.log(`${i + 1}. ${wallet.slice(0, 12)}...${wallet.slice(-8)}`);
        console.log(`   └─ Lost XP: ${issues.loss.toFixed(2)} | Positions: ${issues.count} | Expected: ${issues.expected.toFixed(2)}`);
        console.log(`   └─ Loss %: ${((issues.loss / issues.expected) * 100).toFixed(1)}%\n`);
      });
    }

    // Detailed analysis for CR2F user
    const cr2fWallet = Object.keys(byWallet).find(w => w.includes('CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'));
    
    if (cr2fWallet) {
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║         DETAILED ANALYSIS: CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      const positions = byWallet[cr2fWallet];
      let totalRawXP = 0;
      let totalStoredXP = 0;
      let totalExpectedXP = 0;

      console.log('Position Analysis:\n');
      positions.forEach((p, i) => {
        totalRawXP += p.raw_xp;
        totalStoredXP += p.xp_generated;
        totalExpectedXP += p.raw_xp * 3.0;

        const status = Math.abs(p.multiplier_delta) > 0.1 ? '⚠️' : '✓';
        console.log(`${i + 1}. ${p.asset.padEnd(10)} | Size: $${p.position_size_usd.toFixed(2).padEnd(8)} | Raw: ${p.raw_xp.toFixed(2).padEnd(8)} | Stored: ${p.xp_generated.toFixed(2).padEnd(8)} | Mult: ${p.detected_multiplier.toFixed(2)}x ${status}`);
      });

      console.log('\n' + '═'.repeat(65));
      console.log(`Total Raw XP:      ${totalRawXP.toFixed(2)}`);
      console.log(`Total Stored XP:   ${totalStoredXP.toFixed(2)} ${Math.abs(totalStoredXP - totalRawXP * 3.0) > 1 ? '⚠️ WRONG' : '✓'}`);
      console.log(`Total Expected XP: ${totalExpectedXP.toFixed(2)} (all at 3.0x)`);
      console.log(`Missing XP:        ${(totalExpectedXP - totalStoredXP).toFixed(2)}`);
      console.log(`Loss %:            ${(((totalExpectedXP - totalStoredXP) / totalExpectedXP) * 100).toFixed(1)}%`);
      console.log('═'.repeat(65) + '\n');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

analyze();
