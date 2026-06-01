const { query } = require('./dist/db/pool');

async function checkWallets() {
  try {
    // Wallet 1
    console.log('\n=== WALLET 1: CSwviABKjDF4YvpC2UJ7M7Rvpwq4AYERkP3sPT8zJnoS ===\n');
    
    const w1_user = await query(
      `SELECT wallet, total_sp, position_sp, social_sp FROM users WHERE wallet = $1`,
      ['CSwviABKjDF4YvpC2UJ7M7Rvpwq4AYERkP3sPT8zJnoS']
    );
    console.log('User stats:', w1_user.rows[0] || 'NOT FOUND');
    
    const w1_positions = await query(
      `SELECT id, asset, position_size_usd, weeks_held, base_multiplier, current_multiplier, status, created_at, closed_at FROM positions WHERE wallet = $1 ORDER BY created_at DESC`,
      ['CSwviABKjDF4YvpC2UJ7M7Rvpwq4AYERkP3sPT8zJnoS']
    );
    console.log('Positions:', w1_positions.rows);

    // Wallet 2
    console.log('\n=== WALLET 2: Bg3SN2Qgmgt9d9FohkFG4fbQGBNgjkQ2hyJd9JX6hqXZ ===\n');
    
    const w2_user = await query(
      `SELECT wallet, total_sp, position_sp, social_sp FROM users WHERE wallet = $1`,
      ['Bg3SN2Qgmgt9d9FohkFG4fbQGBNgjkQ2hyJd9JX6hqXZ']
    );
    console.log('User stats:', w2_user.rows[0] || 'NOT FOUND');
    
    const w2_positions = await query(
      `SELECT id, asset, position_size_usd, weeks_held, base_multiplier, current_multiplier, status, created_at, closed_at FROM positions WHERE wallet = $1 ORDER BY created_at DESC`,
      ['Bg3SN2Qgmgt9d9FohkFG4fbQGBNgjkQ2hyJd9JX6hqXZ']
    );
    console.log('Positions:', w2_positions.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkWallets();
