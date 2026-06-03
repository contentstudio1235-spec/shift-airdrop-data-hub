import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function calc() {
  const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
  const now = new Date();

  // Phase boundaries from config
  const phase1End  = new Date('2026-06-02T09:30:00.000Z'); // 3.0x ends
  const phase2Start = new Date('2026-06-02T09:31:00.000Z'); // 2.0x starts

  const positions = await pool.query(`
    SELECT id, asset, position_size_usd, xp_generated, opened_at, last_xp_calc, status
    FROM positions WHERE wallet = $1 ORDER BY opened_at
  `, [wallet]);

  console.log('══════════════════════════════════════════════════════════');
  console.log(' XP AUDIT: CR2F wallet');
  console.log('══════════════════════════════════════════════════════════\n');

  let totalExpected = 0;
  let totalActual = 0;

  for (const pos of positions.rows as any[]) {
    const size = parseFloat(pos.position_size_usd);
    const actualXP = parseFloat(pos.xp_generated);
    const openedAt = new Date(pos.opened_at);

    if (size < 1) {
      console.log(`${pos.asset.padEnd(8)} | Sub-dollar ($${size}) → skip`);
      continue;
    }

    const rawLog = Math.log10(size) * 100;
    // pos_mult = 1.0 + 0.10 * weeks_open (capped at 3.0) — use avg ~1.05 for ~1 week
    const hoursOpen = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
    const weeksOpen = hoursOpen / 168;
    const posMult = Math.min(1.0 + 0.10 * weeksOpen, 3.0);

    // Phase 1 hours for this position (3.0x)
    const phase1Hours = Math.max(0, (phase1End.getTime() - openedAt.getTime()) / (1000 * 60 * 60));
    // Phase 2 hours for this position so far (2.0x)
    const phase2Hours = Math.max(0, (now.getTime() - phase2Start.getTime()) / (1000 * 60 * 60));

    // XP = rawLog × posMult × launchMult × (hours / 168)
    const xpPhase1 = rawLog * 1.0 * 3.0 * (phase1Hours / 168); // use pos_mult=1.0 for phase 1 (started fresh)
    const xpPhase2 = rawLog * posMult * 2.0 * (phase2Hours / 168);
    const expected = xpPhase1 + xpPhase2;

    totalExpected += expected;
    totalActual += actualXP;

    console.log(`${pos.asset.padEnd(8)} | $${size.toFixed(2).padStart(7)} | P1: ${xpPhase1.toFixed(1).padStart(7)} | P2: ${xpPhase2.toFixed(1).padStart(6)} | Expected: ${expected.toFixed(1).padStart(8)} | Actual: ${actualXP.toFixed(1).padStart(8)}`);
  }

  console.log('\n──────────────────────────────────────────────────────────');
  console.log(`TOTAL EXPECTED (Phase1 + Phase2):  ${totalExpected.toFixed(2)}`);
  console.log(`TOTAL ACTUAL in DB:                ${totalActual.toFixed(2)}`);
  console.log(`DIFFERENCE:                        ${(totalExpected - totalActual).toFixed(2)}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log(`\nNOTE: 3,232 would require ${(3232 / totalExpected * 100).toFixed(0)}% of expected XP — this was based on incorrect original analysis`);
  console.log(`Phase 2 (2.0x) is currently active. XP is still accruing.`);

  await pool.end();
}

calc().catch(console.error);
