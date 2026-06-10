import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function findAffected() {
  try {
    // First, let's see what date range has positions
    const dateRangeRes = await pool.query(`
      SELECT MIN(opened_at) as min_date, MAX(opened_at) as max_date
      FROM positions
    `);
    
    console.log('Position date range:', dateRangeRes.rows[0]);
    
    // Find wallets with positions opened during launch week (May 26 - June 2)
    const affectedRes = await pool.query(`
      SELECT 
        wallet,
        COUNT(*) as position_count,
        ROUND(SUM(xp_generated)::numeric, 2) as total_xp,
        MIN(opened_at) as first_position,
        MAX(opened_at) as last_position
      FROM positions
      WHERE opened_at >= '2026-05-25T00:00:00'
        AND opened_at <= '2026-06-03T00:00:00'
        AND status IN ('open', 'closed')
      GROUP BY wallet
      HAVING COUNT(*) > 0
      ORDER BY total_xp DESC
      LIMIT 20
    `);
    
    console.log('\n=== WALLETS DURING PHASE 1 (TOP 20) ===\n');
    console.log(`Found ${affectedRes.rows.length} wallets:\n`);
    
    affectedRes.rows.forEach((row: any, i: number) => {
      const daysSinceLaunch = (new Date(row.last_position).getTime() - new Date('2026-05-25T18:30:00Z').getTime()) / (1000 * 60 * 60 * 24);
      console.log(`${i+1}. ${row.wallet.slice(0, 12)}... (${daysSinceLaunch.toFixed(1)} days into launch)`);
      console.log(`   Positions: ${row.position_count} | XP: ${row.total_xp}`);
    });
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findAffected();
