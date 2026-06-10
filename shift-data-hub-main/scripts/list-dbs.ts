import { pool } from '../src/db/pool';

async function listDbs() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('[Check] Databases on this server:');
    res.rows.forEach(row => console.log(`   - ${row.datname}`));
    
    console.log(`[Check] Currently connected to: ${ (await client.query('SELECT current_database();')).rows[0].current_database }`);
  } finally {
    client.release();
    await pool.end();
  }
}
listDbs();
