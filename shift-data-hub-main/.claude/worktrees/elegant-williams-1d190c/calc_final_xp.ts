import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function calcFinal() {
  const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
  const now = new Date('2026-06-03T18:18:11.824Z'); // Current timestamp
  
  // Phase boundaries
  const phase1End = new Date('2026-06-02T09:30:00.000Z');
  const phase2Start = new Date('2026-06-02T09:31:00.000Z');

  const positions = await pool.query(`
    SELECT id, asset, position_size_usd, opened_at
    FROM positions
    WHERE wallet = $1 AND position_size_usd >= 1
    ORDER BY opened_at
  `, [wallet]);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('FINAL SHIFT POINTS CALCULATION FOR CR2F');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalFinalXP = 0;

  for (const pos of positions.rows as any[]) {
    const size = parseFloat(pos.position_size_usd);
    const openedAt = new Date(pos.opened_at);
    const rawLog = Math.log10(size) * 100;

    // Time in Phase 1 (opened_at → phase1_end)
    const phase1Start = openedAt > phase1End ? null : openedAt;
    const phase1Hours = phase1Start ? (phase1End.getTime() - phase1Start.getTime()) / (1000 * 60 * 60) : 0;
    
    // Time in Phase 2 (phase2Start → now)
    const phase2Hours = (now.getTime() - phase2Start.getTime()) / (1000 * 60 * 60);

    // Position multiplier at each phase (1.0 + 0.10 * weeks, capped at 3.0)
    const weeksPhase1 = phase1Hours / 168;
    const posMult_phase1 = Math.min(1.0 + 0.10 * weeksPhase1, 3.0);
    
    const totalHours = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
    const weeksTotal = totalHours / 168;
    const posMult_phase2 = Math.min(1.0 + 0.10 * weeksTotal, 3.0);

    // XP calculation: rawLog × posMult × launchMult × (hours/168)
    const xp_phase1 = rawLog * posMult_phase1 * 3.0 * (phase1Hours / 168);
    const xp_phase2 = rawLog * posMult_phase2 * 2.0 * (phase2Hours / 168);
    const totalXP = xp_phase1 + xp_phase2;

    totalFinalXP += totalXP;

    console.log(`${pos.asset.padEnd(8)} ($${size.toFixed(2).padStart(7)}) | Phase1: ${xp_phase1.toFixed(2).padStart(7)} + Phase2: ${xp_phase2.toFixed(2).padStart(7)} = ${totalXP.toFixed(2).padStart(8)}`);
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`FINAL TOTAL XP:  ${totalFinalXP.toFixed(2)}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get current total in DB
  const user = await pool.query(`SELECT total_xp FROM users WHERE wallet = $1`, [wallet]);
  const currentXP = parseFloat(user.rows[0].total_xp);

  console.log(`Current XP in DB:     ${currentXP.toFixed(2)}`);
  console.log(`Calculated Final XP:  ${totalFinalXP.toFixed(2)}`);
  console.log(`Update needed:        ${(totalFinalXP - currentXP).toFixed(2)} XP`);

  if (Math.abs(totalFinalXP - currentXP) > 0.01) {
    console.log('\n⚠️  Updating database...');
    await pool.query(`UPDATE users SET total_xp = $1 WHERE wallet = $2`, [totalFinalXP, wallet]);
    console.log(`✅ Database updated to: ${totalFinalXP.toFixed(2)} XP`);
  } else {
    console.log('\n✅ Already correct in database');
  }

  await pool.end();
}

calcFinal().catch(console.error);
