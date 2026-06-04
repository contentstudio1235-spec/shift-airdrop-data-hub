-- ============================================================
-- Migration: System-Wide Configuration
-- ============================================================
-- Allows non-coders to adjust system settings without code changes
-- All changes logged to admin_logs for audit trail

CREATE TABLE IF NOT EXISTS airdrop_config (
  setting_key VARCHAR(128) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by VARCHAR(64), -- Admin wallet
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Index for efficient lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS airdrop_config_updated_at ON airdrop_config(updated_at DESC);

-- ============================================================
-- Initial Configuration Values (defaults)
-- ============================================================
-- These are inserted by the application on first startup
-- Admin can override any of these via /api/admin/config endpoints

-- Anti-Farm Settings
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('anti_farm', '{"minPositionSizeUSD": 100, "minHoldHours": 24, "washTradeWindowMinutes": 60, "cooldownMinutes": 5, "maxDrawdownPercent": 50}', 'Anti-farm rules to prevent exploitation')
ON CONFLICT (setting_key) DO NOTHING;

-- Multiplier Progression
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('multiplier_progression', '{"weeklyBonus": 0.1, "monthlyBonus": 0.3, "badgeBonus": 0.1, "streakBonus": 0.05, "streakBonusMax": 30, "maxMultiplier": 3.0}', 'Claim multiplier progression settings')
ON CONFLICT (setting_key) DO NOTHING;

-- Launch Configuration
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('launch_config', '{"startDate": "2024-01-01T00:00:00Z", "isActive": true, "week1Multiplier": 3.0, "week2Multiplier": 2.0, "week3PlusMultiplier": 1.0}', 'Launch event multiplier phases')
ON CONFLICT (setting_key) DO NOTHING;

-- Referral Bonuses
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('referral_bonuses', '{"kolDynamicMultiplier": 1.5, "kolPermanentMultiplier": 2.0, "standardInviteXP": 250, "kolInviteXP": 500}', 'Referral reward tiers')
ON CONFLICT (setting_key) DO NOTHING;

-- Tracked Tokens Configuration
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('tracked_tokens', '[{"symbol": "NVDA", "mint": "nvda_mint_address", "baseMultiplier": 1.0, "isActive": true}, {"symbol": "AAPL", "mint": "aapl_mint_address", "baseMultiplier": 1.0, "isActive": true}]', 'Tracked RWA tokens with base multipliers')
ON CONFLICT (setting_key) DO NOTHING;

-- Badge Multiplier Stacking Rules
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('badge_stacking', '{"topThreeBadgesMultiplier": 1.0, "remainingBadgesMultiplier": 0.5, "hardCap": 2.0, "hallOfFameBypass": true, "hallOfFameBonus": 0.1}', 'Badge multiplier stacking rules (+2.0x cap, Hall of Fame bypass)')
ON CONFLICT (setting_key) DO NOTHING;

-- Airdrop Rules
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('airdrop_rules', '{"minXPRequired": 1000, "claimable": true, "claimStartDate": "2024-06-01T00:00:00Z", "claimEndDate": "2024-12-31T23:59:59Z"}', 'Airdrop eligibility and claim rules')
ON CONFLICT (setting_key) DO NOTHING;

-- Feature Flags
INSERT INTO airdrop_config (setting_key, setting_value, description) VALUES
('feature_flags', '{"eventBadgesEnabled": true, "certificatesEnabled": false, "announcementsEnabled": false, "admitConfigEditingEnabled": true}', 'Feature toggles for experimental features')
ON CONFLICT (setting_key) DO NOTHING;

-- Summary comment
-- airdrop_config: Centralized configuration management
-- All changes logged to admin_logs with audit trail and reason
-- Non-coders can adjust system behavior without code changes

