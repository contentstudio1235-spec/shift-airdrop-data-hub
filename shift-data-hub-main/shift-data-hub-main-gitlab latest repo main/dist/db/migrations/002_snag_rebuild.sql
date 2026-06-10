-- ============================================================
-- Migration 002: SNAG Integration Rebuild
-- All statements use IF NOT EXISTS — safe to re-run (idempotent)
-- Apply: psql $DATABASE_URL -f src/db/migrations/002_snag_rebuild.sql
-- ============================================================

-- 1. Add snag_multiplier_id to users (tracks SNAG multiplier record ID)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS snag_multiplier_id VARCHAR(128);

-- 2. Enhance snag_sync_queue with batch tracking and backoff
ALTER TABLE snag_sync_queue
  ADD COLUMN IF NOT EXISTS batch_id      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS backoff_until TIMESTAMP,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 3. Performance indexes for queue worker
CREATE INDEX IF NOT EXISTS idx_snag_queue_status_backoff
  ON snag_sync_queue(status, backoff_until);

CREATE INDEX IF NOT EXISTS idx_snag_queue_batch
  ON snag_sync_queue(batch_id) WHERE batch_id IS NOT NULL;

-- 4. Index for SNAG user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_snag_user_id
  ON users(snag_user_id) WHERE snag_user_id IS NOT NULL;

-- 5. Index for XP sync log efficiency
CREATE INDEX IF NOT EXISTS idx_xp_sync_log_wallet
  ON xp_sync_log(wallet, last_synced_at);

-- 6. Table for tracking social task completions from SNAG webhooks
CREATE TABLE IF NOT EXISTS snag_completed_tasks (
  wallet       VARCHAR(64)  NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  task_id      VARCHAR(64)  NOT NULL,
  completed_at TIMESTAMP    DEFAULT NOW(),
  PRIMARY KEY (wallet, task_id)
);

CREATE INDEX IF NOT EXISTS idx_snag_completed_tasks_wallet
  ON snag_completed_tasks(wallet);
