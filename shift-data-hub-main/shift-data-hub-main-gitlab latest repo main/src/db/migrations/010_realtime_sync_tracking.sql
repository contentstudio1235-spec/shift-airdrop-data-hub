-- ============================================================
-- Migration: Real-time SNAG Sync Tracking
-- ============================================================
-- Tracks failed real-time syncs for manual review and debugging

CREATE TABLE IF NOT EXISTS snag_sync_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(64) NOT NULL,
  sync_type VARCHAR(32) NOT NULL, -- 'xp', 'multiplier', 'badge'
  value JSONB,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  failed_at TIMESTAMP DEFAULT NOW()
);

-- Index for finding failed syncs by wallet
CREATE INDEX IF NOT EXISTS snag_sync_failures_wallet ON snag_sync_failures(wallet);
CREATE INDEX IF NOT EXISTS snag_sync_failures_type ON snag_sync_failures(sync_type);
CREATE INDEX IF NOT EXISTS snag_sync_failures_failed_at ON snag_sync_failures(failed_at DESC);

-- Add column to track last SNAG sync time (for monitoring/debugging)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_snag_xp_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_snag_multiplier_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS snag_sync_status VARCHAR(32) DEFAULT 'pending'; -- pending, syncing, synced, failed

-- Create index for monitoring sync status
CREATE INDEX IF NOT EXISTS users_snag_status ON users(snag_sync_status);

-- Summary comment
-- Tracks real-time sync failures so admins can retry manually if needed
-- Also adds monitoring columns to users table for debugging sync issues
