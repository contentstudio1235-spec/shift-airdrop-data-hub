-- ============================================================
-- Migration: SNAG Badge Mapping
-- ============================================================
-- Maps SHIFT badge names to SNAG badge IDs for syncing

CREATE TABLE IF NOT EXISTS snag_badge_mapping (
  id SERIAL PRIMARY KEY,
  shift_badge_name VARCHAR(128) UNIQUE NOT NULL,
  snag_badge_id VARCHAR(256) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS snag_badge_mapping_shift_name ON snag_badge_mapping(shift_badge_name);

-- Table to track failed syncs for manual review
CREATE TABLE IF NOT EXISTS snag_sync_failures (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(64) NOT NULL,
  sync_type VARCHAR(32),
  value JSONB,
  failure_reason TEXT,
  failed_at TIMESTAMP DEFAULT NOW()
);

-- Index for failed syncs
CREATE INDEX IF NOT EXISTS snag_sync_failures_wallet ON snag_sync_failures(wallet);
