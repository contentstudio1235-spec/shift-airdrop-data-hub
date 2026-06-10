import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('Checking database state...\n');

  // 1. Check total positions in time window
  const timeWindowResult = await pool.query(`
    SELECT 
      COUNT(*) as total_positions,
      MIN(opened_at) as earliest,
      MAX(opened_at) as latest
    FROM positions
    WHERE opened_at >= '2026-05-25T00:00:00Z'
      AND opened_at < '2026-06-02T09:31:00Z'
      AND status IN ('open', 'closed')
      AND position_size_usd > 0
  `);

  console.log('Time Window Check (May 25 - June 2):');
  console.log(timeWindowResult.rows[0]);
  console.log();

  // 2. Sample positions with their multipliers
  const sampleResult = await pool.query(`
    SELECT 
      id,
      wallet,
      asset,
      position_size_usd,
      xp_generated,
      opened_at
    FROM positions
    WHERE opened_at >= '2026-05-25T00:00:00Z'
      AND opened_at < '2026-06-02T09:31:00Z'
      AND status IN ('open', 'closed')
      AND position_size_usd > 0
    ORDER BY opened_at
    LIMIT 10
  `);

  console.log('Sample Positions:');
  sampleResult.rows.forEach((pos, i) => {
    const rawXP = Math.log10(parseFloat(pos.position_size_usd)) * 100;
    const detectedMult = parseFloat(pos.xp_generated) / rawXP;
    console.log(`${i+1}. ${pos.wallet.slice(0, 12)}... | ${pos.asset.padEnd(8)} | $${parseFloat(pos.position_size_usd).toFixed(2).padStart(8)} | XP: ${parseFloat(pos.xp_generated).toFixed(2).padStart(8)} | Mult: ${detectedMult.toFixed(2)}x`);
  });
  console.log();

  // 3. Check for CR2F user specifically
  const cr2fResult = await pool.query(`
    SELECT 
      wallet,
      total_xp,
      claim_multiplier
    FROM users
    WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
  `);

  console.log('CR2F User Status:');
  if (cr2fResult.rows.length > 0) {
    console.log(`Total XP: ${cr2fResult.rows[0].total_xp}`);
    console.log(`Claim Multiplier: ${cr2fResult.rows[0].claim_multiplier}`);
  } else {
    console.log('User not found');
  }

  await pool.end();
}

check().catch(console.error);
