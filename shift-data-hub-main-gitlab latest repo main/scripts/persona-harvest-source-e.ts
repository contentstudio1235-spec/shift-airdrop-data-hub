// scripts/persona-harvest-source-e.ts
// Persona harvest Source E — Hub access log queries.
// Runs the 3 queries from docs/design/2026-06-06-persona-harvest-kickoff.md Part II Source E.
// Reuses the canonical src/db/pool.ts so SSL config matches project convention.

import 'dotenv/config';
import { pool } from '../src/db/pool';

async function tableExists(table: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table],
  );
  return rows.length > 0;
}

async function q1BouncedTabs() {
  const sql = `
    WITH tab_visits AS (
      SELECT
        session_id,
        properties->>'tab' AS tab,
        occurred_at,
        LEAD(occurred_at) OVER (PARTITION BY session_id ORDER BY occurred_at) AS next_event_at,
        LEAD(event_type) OVER (PARTITION BY session_id ORDER BY occurred_at) AS next_event
      FROM hub_events
      WHERE event_type = 'tab_open'
        AND occurred_at > NOW() - INTERVAL '14 days'
    )
    SELECT tab, COUNT(*) AS bounce_count, COUNT(DISTINCT session_id) AS distinct_sessions
    FROM tab_visits
    WHERE next_event_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (next_event_at - occurred_at)) < 5
      AND next_event = 'tab_open'
    GROUP BY tab
    ORDER BY bounce_count DESC;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function q2TopKpiCards() {
  const sql = `
    SELECT properties->>'metric_id' AS metric_id, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS distinct_sessions
    FROM hub_events
    WHERE event_type IN ('card_click', 'drill_down')
      AND occurred_at > NOW() - INTERVAL '14 days'
    GROUP BY 1
    ORDER BY clicks DESC
    LIMIT 20;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function q3NavPaths() {
  const sql = `
    WITH paths AS (
      SELECT session_id, STRING_AGG(properties->>'tab', ' -> ' ORDER BY occurred_at) AS path
      FROM hub_events
      WHERE event_type = 'tab_open'
        AND occurred_at > NOW() - INTERVAL '14 days'
      GROUP BY session_id
      HAVING COUNT(*) BETWEEN 2 AND 6
    )
    SELECT path, COUNT(*) AS sessions
    FROM paths
    GROUP BY path
    ORDER BY sessions DESC
    LIMIT 15;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function q0Metadata() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM hub_events) AS total_events,
      (SELECT COUNT(DISTINCT session_id) FROM hub_events) AS total_sessions,
      (SELECT COUNT(*) FROM hub_events WHERE event_type='tab_open') AS total_tab_opens,
      (SELECT COUNT(*) FROM hub_events WHERE event_type='card_click') AS total_card_clicks,
      (SELECT COUNT(*) FROM hub_events WHERE event_type='drill_down') AS total_drill_downs,
      (SELECT MIN(occurred_at) FROM hub_events) AS earliest_event,
      (SELECT MAX(occurred_at) FROM hub_events) AS latest_event;
  `;
  const { rows } = await pool.query(sql);
  return rows[0];
}

async function main() {
  if (!(await tableExists('hub_events'))) {
    console.log(JSON.stringify({ status: 'NO_TABLE', note: 'hub_events not deployed yet — Source E unavailable' }, null, 2));
    return;
  }
  const meta = await q0Metadata();
  const q1 = await q1BouncedTabs();
  const q2 = await q2TopKpiCards();
  const q3 = await q3NavPaths();
  console.log(JSON.stringify({ status: 'OK', meta, q1_bounced_tabs: q1, q2_top_kpi_cards: q2, q3_nav_paths: q3 }, null, 2));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ status: 'ERROR', message: err.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
