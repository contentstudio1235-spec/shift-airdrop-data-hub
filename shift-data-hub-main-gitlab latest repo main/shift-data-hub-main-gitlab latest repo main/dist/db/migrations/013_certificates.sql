-- ============================================================
-- Migration: Achievement Certificate System
-- ============================================================
-- 5-category achievement certificates with auto-unlock logic
-- Soulbound (can't be revoked), off-ceiling bonuses for meta-cards

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) UNIQUE NOT NULL,
  category VARCHAR(64) NOT NULL, -- seasonal_rankings, tier_holders, mastery_cards, personality_series, lifetime
  display_name VARCHAR(128),
  description TEXT,
  icon_url VARCHAR(255),
  multiplier_value DECIMAL(6,4), -- Bonus value (e.g., 1.15x)
  multiplier_type VARCHAR(16), -- permanent, dynamic, off_ceiling
  dynamic_duration_days INTEGER, -- For dynamic multipliers
  is_off_ceiling BOOLEAN DEFAULT false, -- Personality meta-card bypass cap
  is_soulbound BOOLEAN DEFAULT false, -- Once earned, can't be revoked
  scarcity_cap INTEGER, -- e.g., 280 for top 1% (NULL = unlimited)
  unlock_requirement VARCHAR(256), -- e.g., "6/6_personality_cards"
  badge_requirement VARCHAR(64), -- Optional: requires specific badge
  tier_requirement INTEGER, -- For tier holders: min badge count
  season_id INTEGER, -- For seasonal: which season
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(64), -- Admin wallet
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS certificates_category ON certificates(category);
CREATE INDEX IF NOT EXISTS certificates_active ON certificates(is_active);
CREATE INDEX IF NOT EXISTS certificates_season ON certificates(season_id);
CREATE INDEX IF NOT EXISTS certificates_name ON certificates(name);

-- ============================================================
-- User Certificate Awards
-- ============================================================
-- Track which users have earned which certificates

CREATE TABLE IF NOT EXISTS user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet),
  certificate_id UUID NOT NULL REFERENCES certificates(id),
  awarded_by VARCHAR(64), -- Admin wallet (or 'system' for auto-award)
  awarded_at TIMESTAMP DEFAULT NOW(),
  revoked_by VARCHAR(64), -- NULL if still valid
  revoked_at TIMESTAMP, -- NULL if not revoked
  revocation_reason TEXT,
  CONSTRAINT unique_user_cert UNIQUE(wallet, certificate_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS user_certificates_wallet ON user_certificates(wallet);
CREATE INDEX IF NOT EXISTS user_certificates_cert ON user_certificates(certificate_id);
CREATE INDEX IF NOT EXISTS user_certificates_awarded ON user_certificates(awarded_at DESC);
CREATE INDEX IF NOT EXISTS user_certificates_active ON user_certificates(revoked_at) WHERE revoked_at IS NULL;

-- ============================================================
-- Seasonal Configuration
-- ============================================================
-- Define seasons for seasonal ranking certificates

CREATE TABLE IF NOT EXISTS seasonal_config (
  id SERIAL PRIMARY KEY,
  season_name VARCHAR(64) UNIQUE NOT NULL, -- e.g., "Season 1", "Q1 2024"
  season_number INTEGER,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reset_date TIMESTAMP, -- When seasonal certs are reset
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false, -- Mark when season ends and reset happens
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS seasonal_config_active ON seasonal_config(is_active);
CREATE INDEX IF NOT EXISTS seasonal_config_dates ON seasonal_config(start_date, end_date);

-- ============================================================
-- Certificate Unlock Tracker
-- ============================================================
-- Track progress toward unlock requirements (e.g., "6/6 Personality")

CREATE TABLE IF NOT EXISTS certificate_unlock_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet),
  unlock_requirement VARCHAR(256) NOT NULL, -- e.g., "6/6_personality_cards"
  progress_count INTEGER DEFAULT 0, -- e.g., 4 out of 6
  requirement_count INTEGER, -- e.g., 6
  completed_at TIMESTAMP, -- When requirement met
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Indexes for tracking
CREATE INDEX IF NOT EXISTS unlock_progress_wallet ON certificate_unlock_progress(wallet);
CREATE INDEX IF NOT EXISTS unlock_progress_requirement ON certificate_unlock_progress(unlock_requirement);

-- ============================================================
-- Summary Comments
-- ============================================================
-- certificates: 5 categories (Seasonal, Tier Holders, Mastery, Personality, Lifetime)
-- user_certificates: Track earned certificates, allow revocation (unless soulbound)
-- seasonal_config: Define seasons for seasonal ranking certificates
-- certificate_unlock_progress: Track progress toward unlock requirements

