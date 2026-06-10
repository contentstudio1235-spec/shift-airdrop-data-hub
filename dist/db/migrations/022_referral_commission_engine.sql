-- ============================================================
-- Migration 022: Referral Commission Engine & Legacy Balance
-- ============================================================
-- Creates tables for:
--   1. referral_commissions - tracks all commission awards
--   2. referral_monthly_caps - enforces 500 SP/month per pair
--   3. referral_stats_cache - pre-computed aggregates (volume, holding, count)
--   4. referral_legacy_balance - pending SP for early referrers
--
-- Also adds referral_commission_sp column to users table.
-- ============================================================

BEGIN;

-- ── Table 1: referral_commissions ──────────────────────────
CREATE TABLE IF NOT EXISTS referral_commissions (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(255) NOT NULL,
  referred_wallet VARCHAR(255) NOT NULL,
  commission_rate NUMERIC(4,2) NOT NULL CHECK (commission_rate >= 5 AND commission_rate <= 15),
  sp_awarded NUMERIC(18,4) NOT NULL DEFAULT 0,
  source_sp NUMERIC(18,4),  -- The SP amount that generated this commission
  month_year CHAR(7),  -- Format: 'YYYY-MM'
  awarded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_wallet, referred_wallet, awarded_at)
);

-- ── Table 2: referral_monthly_caps ────────────────────────
CREATE TABLE IF NOT EXISTS referral_monthly_caps (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(255) NOT NULL,
  referred_wallet VARCHAR(255) NOT NULL,
  month_year CHAR(7) NOT NULL,  -- Format: 'YYYY-MM'
  total_awarded NUMERIC(18,4) DEFAULT 0,
  reset_at TIMESTAMP,
  UNIQUE(referrer_wallet, referred_wallet, month_year)
);

-- ── Table 3: referral_stats_cache ────────────────────────
-- Pre-computed aggregates for leaderboard performance
CREATE TABLE IF NOT EXISTS referral_stats_cache (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(255) UNIQUE NOT NULL,
  referral_count INT DEFAULT 0,
  total_volume NUMERIC(18,4) DEFAULT 0,  -- Sum of all referred wallets' position_size_usd
  total_holding NUMERIC(18,4) DEFAULT 0,  -- Current open position sizes
  last_updated TIMESTAMP DEFAULT NOW()
);

-- ── Table 4: referral_legacy_balance ─────────────────────
-- Tracks pending SP for legacy referrers (before system launch)
CREATE TABLE IF NOT EXISTS referral_legacy_balance (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(255) UNIQUE NOT NULL,
  pending_sp NUMERIC(18,4) DEFAULT 0,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claim_method VARCHAR(50),  -- 'auto', 'manual', 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Add column to users table ──────────────────────────────
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_commission_sp NUMERIC(18,4) DEFAULT 0;

-- ── Verify tables exist ────────────────────────────────────
DO $$
DECLARE
  count INT;
BEGIN
  SELECT COUNT(*) INTO count FROM information_schema.tables
  WHERE table_name IN ('referral_commissions', 'referral_monthly_caps', 'referral_stats_cache', 'referral_legacy_balance')
  AND table_schema = 'public';

  IF count = 4 THEN
    RAISE NOTICE 'Migration 022: All 4 referral tables created successfully';
  ELSE
    RAISE EXCEPTION 'Migration 022: Table creation failed. Expected 4 tables, found %', count;
  END IF;
END $$;

COMMIT;
