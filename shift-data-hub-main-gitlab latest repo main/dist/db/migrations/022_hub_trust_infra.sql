-- ============================================================
-- Migration 022: Hub Trust Infrastructure (Phase 1)
-- ============================================================
-- Backend tables for the three Hub trust workflows defined in
-- docs/design/2026-06-06-hub-audit-plan-v2.md Part IV:
--
--   1. hub_sessions   -- one row per Hub browser-tab open
--   2. hub_events     -- in-session telemetry stream (tab opens, clicks, etc.)
--   3. hub_flags      -- one-click "this number looks wrong" reports
--   4. hub_incidents  -- active "Hub is wrong" investigations, drive banners
--
-- Idempotent. Safe to re-run.
--
-- IMPORTANT -- the migration runner naively splits on the semicolon character
-- (see src/db/migrationRunner.ts executeMigration). Any semicolon inside a
-- string literal, comment body, or dollar-quoted block will break execution.
-- This file deliberately uses em-dashes as separators inside COMMENT bodies
-- and avoids DO/PL/pgSQL blocks entirely. The FK is added via the
-- DROP CONSTRAINT IF EXISTS -> ADD CONSTRAINT pattern (same pattern used in
-- migration 017 for chk_first_utm_lower).
--
-- Rollback (DOWN):
--   ALTER TABLE hub_flags DROP CONSTRAINT IF EXISTS fk_hub_flags_incident;
--   DROP TABLE IF EXISTS hub_incidents;
--   DROP TABLE IF EXISTS hub_flags;
--   DROP TABLE IF EXISTS hub_events;
--   DROP TABLE IF EXISTS hub_sessions;
-- ============================================================


-- -- 1. hub_sessions -------------------------------------------
-- One row per Hub browser-tab open. The frontend generates a fresh UUID
-- on each page load and POSTs it to /api/hub-trust/sessions. The
-- session_id is then attached to every subsequent event + flag.
CREATE TABLE IF NOT EXISTS hub_sessions (
  id              BIGSERIAL PRIMARY KEY,
  session_id      UUID NOT NULL UNIQUE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent      TEXT,
  hub_role        TEXT,
  initial_view    TEXT,
  closed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hub_sessions_started_at ON hub_sessions(started_at DESC);


-- -- 2. hub_events ---------------------------------------------
-- Append-only telemetry log. Frontend rate-limits to 500/min/session and
-- the backend telemetry service enforces the same ceiling.
CREATE TABLE IF NOT EXISTS hub_events (
  id              BIGSERIAL PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES hub_sessions(session_id) ON DELETE CASCADE,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type      TEXT NOT NULL CHECK (event_type IN ('tab_open','tab_close','card_click','filter_change','drill_down','answer_reached','flag_filed')),
  tab             TEXT,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_hub_events_session_occurred ON hub_events(session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_events_type_occurred ON hub_events(event_type, occurred_at DESC);


-- -- 3. hub_flags ----------------------------------------------
-- A one-click "this number looks wrong" report from any numeric cell in
-- the Hub. The frontend pre-fills tab + metric_id + displayed_value + as_of
-- so all the operator has to do is add an optional comment.
CREATE TABLE IF NOT EXISTS hub_flags (
  id              BIGSERIAL PRIMARY KEY,
  flagged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id      UUID REFERENCES hub_sessions(session_id) ON DELETE SET NULL,
  hub_role        TEXT,
  tab             TEXT NOT NULL,
  metric_id       TEXT NOT NULL,
  displayed_value TEXT,
  as_of           TIMESTAMPTZ,
  comment         TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaging','closed_correct','closed_delayed','closed_fixed')),
  triaged_at      TIMESTAMPTZ,
  triaged_by      TEXT,
  resolution_note TEXT,
  incident_id     BIGINT
);

CREATE INDEX IF NOT EXISTS idx_hub_flags_status ON hub_flags(status) WHERE status IN ('open','triaging');
CREATE INDEX IF NOT EXISTS idx_hub_flags_flagged_at ON hub_flags(flagged_at DESC);


-- -- 4. hub_incidents ------------------------------------------
-- An active "Hub is wrong" investigation. While a row here has
-- resolved_at IS NULL, the frontend renders an incident banner over the
-- affected metric cells. Frontend polls /api/hub-trust/incidents/active
-- every 30s for banner state.
CREATE TABLE IF NOT EXISTS hub_incidents (
  id              BIGSERIAL PRIMARY KEY,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by       TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('P0','P1','P2')),
  affected_tabs   TEXT[] NOT NULL,
  affected_metric TEXT NOT NULL,
  hypothesis      TEXT,
  resolved_at     TIMESTAMPTZ,
  resolution      TEXT,
  fix_commit_sha  TEXT
);

CREATE INDEX IF NOT EXISTS idx_hub_incidents_active ON hub_incidents(opened_at DESC) WHERE resolved_at IS NULL;


-- -- FK: hub_flags.incident_id -> hub_incidents.id --
-- DROP+ADD pattern (same shape as migration 017) keeps this idempotent
-- across re-runs because Postgres has no ADD CONSTRAINT IF NOT EXISTS.
ALTER TABLE hub_flags DROP CONSTRAINT IF EXISTS fk_hub_flags_incident;
ALTER TABLE hub_flags
  ADD CONSTRAINT fk_hub_flags_incident
  FOREIGN KEY (incident_id) REFERENCES hub_incidents(id) ON DELETE SET NULL;


-- -- Table comments (em-dashes only, no semicolons inside strings) ---
COMMENT ON TABLE hub_sessions IS 'One row per Hub browser tab open -- source of session_id used by events and flags.';
COMMENT ON TABLE hub_events IS 'Append-only Hub telemetry stream -- tab opens, card clicks, filter changes, flag-filed events.';
COMMENT ON TABLE hub_flags IS 'One-click flags filed when the operator sees a number that looks wrong -- triaged into incidents when a real bug.';
COMMENT ON TABLE hub_incidents IS 'Active Hub-wrong investigations -- drives the incident banner UI while resolved_at IS NULL.';
