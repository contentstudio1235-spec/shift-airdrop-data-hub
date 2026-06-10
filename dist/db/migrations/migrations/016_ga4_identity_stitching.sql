-- Migration 016: Add ga_user_id column for GA4 identity stitching
-- This column stores the Google Analytics 4 client_id that gets linked
-- to a wallet address when the user connects their wallet on the frontend.
-- Without this column, the /api/analytics/stitch endpoint cannot persist
-- GA4 identity links, making cross-channel attribution impossible.

-- Add ga_user_id to users table (safe, idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ga_user_id VARCHAR(128);

-- Index for fast lookup when counting stitched users or fetching the ledger
CREATE INDEX IF NOT EXISTS idx_users_ga_user_id ON users (ga_user_id) WHERE ga_user_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN users.ga_user_id IS 'Google Analytics 4 client_id linked to this wallet via Measurement Protocol stitching';
