import { Pool } from 'pg';
import { config } from '../config';

// Render Postgres internal URL: no SSL needed (same private network).
// Neon/external URLs: require SSL with rejectUnauthorized: false.
// Keep pool at 5 — enough for cron + webhooks + API requests without exhausting DB limits.
const isExternalDb =
  config.databaseUrl.includes('neon.tech') ||
  config.databaseUrl.includes('neon.db') ||
  config.databaseUrl.includes('ohio-postgres.render.com') || // Render external
  config.databaseUrl.includes('rlwy.net');                    // Railway

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
  ssl: isExternalDb ? { rejectUnauthorized: false } : false,
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
