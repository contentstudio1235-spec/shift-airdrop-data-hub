import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.databaseUrl.includes('render.com') || config.databaseUrl.includes('neon.tech') ? {
    rejectUnauthorized: false
  } : undefined
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[DB] Closing pool...');
  await pool.end();
});

process.on('SIGINT', async () => {
  console.log('[DB] Closing pool...');
  await pool.end();
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

export async function execute(text: string, params?: any[]): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount || 0;
}
