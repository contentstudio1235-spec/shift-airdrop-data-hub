import { Pool } from 'pg';
import { config } from '../config';

// Neon free tier supports max 10 connections.
// Keep pool at 5 to leave headroom for migrations + cron + webhooks running in parallel.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
  ssl: config.databaseUrl.includes('neon.tech') || config.databaseUrl.includes('neon.db')
    ? { rejectUnauthorized: false }
    : false,
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
