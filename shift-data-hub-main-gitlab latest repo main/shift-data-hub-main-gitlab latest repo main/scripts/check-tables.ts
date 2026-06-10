import { pool } from '../src/db/pool';
import { config } from '../src/config';

async function checkTables() {
  console.log(`[Check] Connecting to database: ${config.databaseUrl.split('@')[1]}...`);
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('[Check] Tables found in "public" schema:');
    if (res.rows.length === 0) {
      console.log('   (No tables found)');
    } else {
      res.rows.forEach(row => console.log(`   - ${row.table_name}`));
    }

    const res2 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'railway' 
      ORDER BY table_name;
    `);
    if (res2.rows.length > 0) {
      console.log('[Check] Tables found in "railway" schema:');
      res2.rows.forEach(row => console.log(`   - ${row.table_name}`));
    }

  } catch (error) {
    console.error('[Check] ❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
