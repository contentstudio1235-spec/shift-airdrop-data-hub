import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function migrate() {
  console.log('[Migrate] Starting database migration...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('[Migrate] ✅ Schema applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migrate] ❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }

  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
