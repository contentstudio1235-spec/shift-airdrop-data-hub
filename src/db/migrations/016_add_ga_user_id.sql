-- Migration 016: Add ga_user_id column to users table
-- Stores the GA4 client ID associated with the user's session.
-- Used to attribute Solana wallets and Snag referrals to Google Analytics sessions.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ga_user_id VARCHAR(128);

-- Index for quick lookups by GA4 client ID
CREATE INDEX IF NOT EXISTS idx_users_ga_user_id
  ON users (ga_user_id) WHERE ga_user_id IS NOT NULL;
