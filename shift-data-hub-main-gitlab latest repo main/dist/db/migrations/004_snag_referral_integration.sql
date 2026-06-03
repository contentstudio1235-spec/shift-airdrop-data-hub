-- ============================================================
-- Migration 004: SNAG Referral Link Integration
-- Syncs SNAG's native referral system with Vercel frontend
-- All statements use IF NOT EXISTS — safe to re-run (idempotent)
-- Apply: psql $DATABASE_URL -f src/db/migrations/004_snag_referral_integration.sql
-- ============================================================

-- 1. Add referral link columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS snag_default_referral_link TEXT,
  ADD COLUMN IF NOT EXISTS snag_custom_referral_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS referral_link_synced_at TIMESTAMP;

-- 2. Add snag_synced_at to referrals table
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS snag_synced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(64);

-- 3. Index for quick referral link lookups
CREATE INDEX IF NOT EXISTS idx_users_snag_referral_link
  ON users(wallet) WHERE snag_default_referral_link IS NOT NULL;

-- 4. Index for custom code lookups
CREATE INDEX IF NOT EXISTS idx_users_snag_custom_code
  ON users(snag_custom_referral_code) WHERE snag_custom_referral_code IS NOT NULL;

-- 5. Index for unsync'd referrals
CREATE INDEX IF NOT EXISTS idx_referrals_snag_unsynced
  ON referrals(referrer_wallet) WHERE snag_synced_at IS NULL;

-- 6. Track referral event processing from webhooks
CREATE TABLE IF NOT EXISTS snag_referral_events (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  referred_wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  referral_code VARCHAR(64),
  reward_xp_given INT DEFAULT 0,
  processed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_wallet, referred_wallet)
);

CREATE INDEX IF NOT EXISTS idx_snag_referral_events_referrer
  ON snag_referral_events(referrer_wallet);

CREATE INDEX IF NOT EXISTS idx_snag_referral_events_referred
  ON snag_referral_events(referred_wallet);
