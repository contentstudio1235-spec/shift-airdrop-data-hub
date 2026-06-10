// One-shot schema probe for hub_events / hub_sessions / hub_flags / hub_incidents.
import 'dotenv/config';
import { pool } from '../src/db/pool';

async function main() {
  const tables = ['hub_events', 'hub_sessions', 'hub_flags', 'hub_incidents'];
  const out: any = {};
  for (const t of tables) {
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t],
    );
    const count = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
    let sample: any[] = [];
    if (Number(count.rows[0].n) > 0) {
      const s = await pool.query(`SELECT * FROM ${t} ORDER BY 1 DESC LIMIT 2`);
      sample = s.rows;
    }
    out[t] = { columns: cols.rows, row_count: Number(count.rows[0].n), sample };
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
