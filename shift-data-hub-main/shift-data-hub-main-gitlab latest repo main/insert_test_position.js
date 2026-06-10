const pg = require('pg');

const connectionString = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop';
const client = new pg.Client({ connectionString });

async function insertTestData() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    const wallet = '3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn';
    const soxMint = 'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT'; // SOX3L (1.25x multiplier)

    // 1. Create user if doesn't exist
    await client.query(`
      INSERT INTO users (wallet, total_xp, created_at, updated_at)
      VALUES ($1, 0, NOW(), NOW())
      ON CONFLICT (wallet) DO NOTHING
    `, [wallet]);
    console.log('✅ User ensured in database');

    // 2. Insert test position (opened 2 days ago, so past 24h minimum hold)
    const openedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await client.query(`
      INSERT INTO positions (wallet, asset_mint, size_usd, opened_at, closed_at, status, xp_earned, last_xp_calc_at, created_at)
      VALUES ($1, $2, $3, $4, NULL, 'open', 0, NOW(), NOW())
    `, [wallet, soxMint, 5.00, openedAt]);
    console.log('✅ Test position inserted ($5 in SOX3L)');
    console.log(`   - Wallet: ${wallet}`);
    console.log(`   - Token: SOX3L (1.25x base multiplier)`);
    console.log(`   - Amount: $5.00 USD`);
    console.log(`   - Opened: ${openedAt.toISOString()}`);

    await client.end();
    console.log('\n✅ Database ready for testing!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

insertTestData();
