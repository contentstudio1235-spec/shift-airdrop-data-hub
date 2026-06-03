import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('Checking for positions with LOW multipliers (< 2.9x)...\n');

  const result = await pool.query(`
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
  `);

  let lowMultCount = 0;
  let lowMultPositions: Array<{wallet: string; asset: string; xp: number; mult: number}> = [];

  result.rows.forEach((pos: any) => {
    const rawXP = Math.log10(parseFloat(pos.position_size_usd)) * 100;
    const detectedMult = parseFloat(pos.xp_generated) / rawXP;
    
    if (detectedMult < 2.9 && rawXP > 0) {
      lowMultCount++;
      lowMultPositions.push({
        wallet: pos.wallet,
        asset: pos.asset,
        xp: parseFloat(pos.xp_generated),
        mult: detectedMult
      });
    }
  });

  console.log(`Total positions in time window: ${result.rows.length}`);
  console.log(`Positions with multiplier < 2.9x: ${lowMultCount}`);
  console.log();

  if (lowMultCount > 0) {
    console.log('Sample of LOW multiplier positions:');
    lowMultPositions.slice(0, 10).forEach((pos, i) => {
      console.log(`${i+1}. ${pos.wallet.slice(0,12)}... | ${pos.asset} | XP: ${pos.xp.toFixed(2)} | Mult: ${pos.mult.toFixed(2)}x`);
    });
  } else {
    console.log('✅ NO positions with multiplier < 2.9x found!');
    console.log('All positions have been corrected (multiplier >= 2.9x)');
  }

  await pool.end();
}

check().catch(console.error);
