import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
  const now = new Date();

  // Get all positions for CR2F (all time, not just bug window)
  const positions = await pool.query(`
    SELECT 
      id, asset, asset_mint, position_size_usd, xp_generated,
      opened_at, closed_at, status, last_xp_calc
    FROM positions
    WHERE wallet = $1
    ORDER BY opened_at
  `, [wallet]);

  console.log(`\nALL positions for CR2F wallet (${positions.rows.length} total):\n`);

  let totalXpGenerated = 0;
  positions.rows.forEach((pos: any, i: number) => {
    const size = parseFloat(pos.position_size_usd);
    const xp = parseFloat(pos.xp_generated);
    const rawLog = size >= 1 ? Math.log10(size) * 100 : 0;
    const mult = rawLog > 0 ? xp / rawLog : 0;
    totalXpGenerated += xp;
    const ageHours = (now.getTime() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60);
    console.log(`${i+1}. [${pos.status.padEnd(6)}] ${pos.asset.padEnd(8)} | $${size.toFixed(2).padStart(8)} | XP: ${xp.toFixed(2).padStart(8)} | Effective mult: ${mult.toFixed(2)}x | Age: ${ageHours.toFixed(0)}h`);
  });

  console.log(`\nSum of all xp_generated: ${totalXpGenerated.toFixed(2)}`);

  // Check user total_xp
  const user = await pool.query(`SELECT total_xp FROM users WHERE wallet = $1`, [wallet]);
  console.log(`User total_xp in DB: ${user.rows[0].total_xp}`);

  // Check current launch phase
  const config = await pool.query(`
    SELECT * FROM launch_config ORDER BY created_at DESC LIMIT 1
  `).catch(() => ({ rows: [] }));

  if (config.rows.length > 0) {
    console.log('\nCurrent launch config:');
    console.log(config.rows[0]);
  }

  await pool.end();
}

check().catch(console.error);
