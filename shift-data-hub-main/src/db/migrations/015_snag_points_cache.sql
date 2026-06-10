-- Migration 015: Add snag_points cache column to users table
-- Stores the wallet's SNAG loyalty balance (cached from SNAG API).
-- Updated whenever the dashboard is loaded or during fullSync.
-- Used to compute combined leaderboard score without N+1 SNAG API calls.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS snag_points DECIMAL(18,4) DEFAULT 0;

-- Index for combined leaderboard sorting: total_xp + snag_points
CREATE INDEX IF NOT EXISTS idx_users_combined_sp
  ON users (total_xp, snag_points DESC);
