import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require', ssl: { rejectUnauthorized: false } });
async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const deleted = await client.query(`
      DELETE FROM badge_definitions
      WHERE badge_name IN (
        '-10% Survivor','-20% Survivor','Black Swan Buyer','Breakout Buyer',
        'Conviction Stack','CPI Bet','Crash Buyer','Diamond Hands','Dip Buyer',
        'Doubled Down','Earnings Conviction','Earnings Short','Fed Day Trade',
        'First Short','Geopolitical Trade','Iron Hands','Macro Bear',
        'Momentum Rider','Multi-Earnings Holder','New High Holder','News Reactor',
        'Pyramid Up','Squeeze Survivor','The Believer','The OG','Top Caller',
        'Triple Down','Volume Veteran I','Volume Veteran II','Volume Veteran III',
        'Long-Hauler'
      )
    `);
    console.log(`Deleted: ${deleted.rowCount} rows`);

    await client.query("UPDATE badge_definitions SET rarity = 'legend' WHERE rarity = 'legendary'");

    const total = await client.query('SELECT COUNT(*) FROM badge_definitions');
    const spaces = await client.query("SELECT COUNT(*) FROM badge_definitions WHERE badge_name LIKE '% %'");
    const nullDn = await client.query("SELECT COUNT(*) FROM badge_definitions WHERE display_name IS NULL");
    console.log(`Total: ${total.rows[0].count}, Spaces: ${spaces.rows[0].count}, NullDN: ${nullDn.rows[0].count}`);

    await client.query('COMMIT');
    console.log('✅ Committed!');
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('❌ Rolled back:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(e => console.error(e.message));
