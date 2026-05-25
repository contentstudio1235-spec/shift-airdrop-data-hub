-- ============================================================
-- Migration 007: Comprehensive Badge System (31 badges)
-- Implements the SHIFT Badges Strategy with all categories
-- All statements use IF NOT EXISTS â€” safe to re-run (idempotent)
-- ============================================================

-- 1. Badge definitions table: metadata for all 31 badges
CREATE TABLE IF NOT EXISTS badge_definitions (
  id SERIAL PRIMARY KEY,
  badge_name VARCHAR(64) NOT NULL UNIQUE,
  category VARCHAR(32),  -- 'conviction_adding', 'buying_dip', etc.
  description TEXT,
  trigger_condition VARCHAR(128),
  multiplier_value DECIMAL(6,4) NOT NULL,
  badge_type VARCHAR(16) NOT NULL,  -- 'permanent' or 'dynamic'
  duration_days INTEGER,  -- NULL for permanent, days for dynamic
  rarity VARCHAR(16) DEFAULT 'common',  -- 'common', 'rare', 'epic', 'legendary'
  hall_of_fame BOOLEAN DEFAULT false,  -- special tier (Iron Hands, Black Swan Buyer, The Believer)
  icon_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure category column exists (for idempotency if table already exists)
ALTER TABLE badge_definitions
  ADD COLUMN IF NOT EXISTS category VARCHAR(32);

-- 2. Enhanced badges table: add more metadata to track status
ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS category VARCHAR(32),
  ADD COLUMN IF NOT EXISTS badge_type VARCHAR(16) DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS multiplier_value DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS provisional_until TIMESTAMP,  -- for "Held Through Pain" badges
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'active',  -- 'active', 'provisional', 'revoked'
  ADD COLUMN IF NOT EXISTS metadata JSONB;  -- store badge-specific data

CREATE INDEX IF NOT EXISTS idx_badges_wallet_active
  ON badges(wallet, status);

CREATE INDEX IF NOT EXISTS idx_badges_earned_at
  ON badges(earned_at DESC);

-- 3. Badge earning events: detailed log of how/when badges are earned
CREATE TABLE IF NOT EXISTS badge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  badge_name VARCHAR(64) NOT NULL,
  trigger_event VARCHAR(128),  -- 'position_opened', 'position_closed', 'drawdown_survived', etc.
  position_id UUID REFERENCES positions(id),
  event_data JSONB,  -- stores details specific to the badge (e.g., drawdown %, position return, etc.)
  earned_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_events_wallet
  ON badge_events(wallet, badge_name);

-- 4. Position metrics: extended data for badge calculations
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS direction VARCHAR(16) DEFAULT 'long',  -- 'long' or 'short'
  ADD COLUMN IF NOT EXISTS entry_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS current_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS max_drawdown_pct DECIMAL(6,4) DEFAULT 0,  -- stores worst unrealized loss
  ADD COLUMN IF NOT EXISTS max_gains_pct DECIMAL(6,4) DEFAULT 0,    -- stores best unrealized gain
  ADD COLUMN IF NOT EXISTS highest_price DECIMAL(18,8),  -- for 52-week high detection
  ADD COLUMN IF NOT EXISTS lowest_price DECIMAL(18,8),   -- for dip detection
  ADD COLUMN IF NOT EXISTS held_through_earnings BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS earnings_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_positions_direction
  ON positions(wallet, direction, status);

CREATE INDEX IF NOT EXISTS idx_positions_opened_at
  ON positions(opened_at DESC);

-- 5. Insert all 31 badge definitions

-- Category 1: Conviction Adding (4 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('Doubled Down', 'conviction_adding', 'Added to a position after it dropped -5% from entry.', 'position_add_on_weakness', 1.10, 'permanent', 'common'),
  ('Triple Down', 'conviction_adding', 'Added 3+ times to the same position during a -10% drawdown.', 'multiple_adds_on_weakness', 1.20, 'permanent', 'rare'),
  ('Pyramid Up', 'conviction_adding', 'Added 3+ times to a position as it rose +10% or more from entry.', 'multiple_adds_on_strength', 1.15, 'permanent', 'rare'),
  ('Conviction Stack', 'conviction_adding', '5+ separate adds to the same position over 30+ days.', 'many_adds_over_time', 1.25, 'permanent', 'epic')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 2: Buying the Dip (3 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('Dip Buyer', 'buying_dip', 'Opened long on a day the underlying closed -3% or worse.', 'long_on_down_day', 1.10, 'permanent', 'common'),
  ('Crash Buyer', 'buying_dip', 'Opened long on a day SPX closed -5% or worse.', 'long_on_spx_crash', 1.20, 'permanent', 'rare'),
  ('Black Swan Buyer', 'buying_dip', 'Opened long on a day SPX closed -10% or worse.', 'long_on_spx_crash_10pct', 1.30, 'permanent', 'legendary')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 3: Buying the Breakout (3 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('Momentum Rider', 'buying_breakout', 'Opened long on a day the underlying closed +3% or higher.', 'long_on_up_day', 1.10, 'permanent', 'common'),
  ('Breakout Buyer', 'buying_breakout', 'Opened long within 24h of a stock breaking a 52-week high.', 'long_at_52wk_high', 1.15, 'permanent', 'rare'),
  ('New High Holder', 'buying_breakout', 'Opened long at an all-time high and held the position 30+ days.', 'long_at_ath_hold_30d', 1.20, 'permanent', 'rare')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 4: Event-Driven Trades (5 badges: 2 permanent, 3 dynamic)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, duration_days, rarity)
VALUES
  ('Earnings Conviction', 'event_driven', 'Opened position 24h before earnings, held through the report.', 'position_before_earnings', 1.20, 'permanent', NULL, 'rare'),
  ('Geopolitical Trade', 'event_driven', 'Opened position during a major geopolitical event (war, sanctions, etc).', 'position_during_geopolitical', 1.20, 'permanent', NULL, 'epic'),
  ('Fed Day Trade', 'event_driven', 'Opened position on FOMC announcement day.', 'position_on_fomc_day', 1.20, 'dynamic', 14, 'rare'),
  ('CPI Bet', 'event_driven', 'Opened position on CPI release day.', 'position_on_cpi_day', 1.15, 'dynamic', 7, 'rare'),
  ('News Reactor', 'event_driven', 'Opened position within 1h of a market-moving headline.', 'position_within_1h_news', 1.15, 'dynamic', 7, 'common')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 5: Short Conviction (5 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('First Short', 'short_conviction', 'Opened first short position.', 'first_short', 1.10, 'permanent', 'common'),
  ('Top Caller', 'short_conviction', 'Opened short within 24h of a stock hitting a 52-week high.', 'short_at_52wk_high', 1.25, 'permanent', 'epic'),
  ('Earnings Short', 'short_conviction', 'Shorted into earnings, closed profitable.', 'short_into_earnings', 1.20, 'permanent', 'rare'),
  ('Squeeze Survivor', 'short_conviction', 'Held a short through a +10% squeeze, closed profitable.', 'short_survive_squeeze', 1.30, 'permanent', 'legendary'),
  ('Macro Bear', 'short_conviction', 'Held a short position 30+ days.', 'short_hold_30d', 1.25, 'permanent', 'rare')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 6: Held Through Pain (3 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('-10% Survivor', 'held_through_pain', 'Held a position through a -10% unrealized drawdown without closing.', 'survive_10pct_drawdown', 1.15, 'permanent', 'common'),
  ('-20% Survivor', 'held_through_pain', 'Held a position through a -20% unrealized drawdown without closing.', 'survive_20pct_drawdown', 1.25, 'permanent', 'rare'),
  ('Iron Hands', 'held_through_pain', 'Held through a -30%+ drawdown and closed profitable.', 'survive_30pct_drawdown_profitable', 1.30, 'permanent', 'legendary')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 7: Long-Term Conviction (4 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('Diamond Hands', 'long_term', 'Held a single position open 60+ days.', 'hold_60d', 1.15, 'permanent', 'rare'),
  ('Long-Hauler', 'long_term', 'Held a single position open 90+ days.', 'hold_90d', 1.20, 'permanent', 'rare'),
  ('The Believer', 'long_term', 'Held a single position open 180+ days.', 'hold_180d', 1.30, 'permanent', 'legendary'),
  ('Multi-Earnings Holder', 'long_term', 'Held the same position through 2+ earnings reports.', 'hold_through_2_earnings', 1.20, 'permanent', 'epic')
ON CONFLICT (badge_name) DO NOTHING;

-- Category 8: Volume + OG (4 badges)
INSERT INTO badge_definitions (badge_name, category, description, trigger_condition, multiplier_value, badge_type, rarity)
VALUES
  ('Volume Veteran I', 'volume_og', 'Cumulative trade volume â‰¥ $10,000.', 'volume_10k', 1.10, 'permanent', 'common'),
  ('Volume Veteran II', 'volume_og', 'Cumulative trade volume â‰¥ $100,000.', 'volume_100k', 1.20, 'permanent', 'rare'),
  ('Volume Veteran III', 'volume_og', 'Cumulative trade volume â‰¥ $1,000,000.', 'volume_1m', 1.30, 'permanent', 'epic'),
  ('The OG', 'volume_og', 'Active trader in the first 30 days of launch.', 'og_status', 1.25, 'permanent', 'epic')
ON CONFLICT (badge_name) DO NOTHING;

-- 6. Hall of Fame special badges (these bypass the +2.0x cap and get +0.10x premium)
UPDATE badge_definitions
  SET hall_of_fame = true
  WHERE badge_name IN ('Iron Hands', 'Black Swan Buyer', 'The Believer');

-- 7. Badge cap tracking: per-wallet badge multiplier cap management
CREATE TABLE IF NOT EXISTS badge_multiplier_caps (
  wallet VARCHAR(64) PRIMARY KEY REFERENCES users(wallet) ON DELETE CASCADE,
  total_stacked_multiplier DECIMAL(6,4) DEFAULT 0,  -- sum of all active badge multipliers
  hall_of_fame_multiplier DECIMAL(6,4) DEFAULT 0,   -- sum of hall of fame badges (outside cap)
  permanent_badge_count INTEGER DEFAULT 0,
  dynamic_badge_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_caps_total_multiplier
  ON badge_multiplier_caps(total_stacked_multiplier DESC);

-- 8. Performance indexes for badge queries
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category
  ON badge_definitions(category);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_rarity
  ON badge_definitions(rarity);

-- 9. Audit trail for badge revocations (e.g., "Held Through Pain" provisional period expiring)
CREATE TABLE IF NOT EXISTS badge_revocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  badge_name VARCHAR(64) NOT NULL,
  reason VARCHAR(128),  -- e.g., 'provisional_period_expired', 'position_closed_within_24h'
  position_id UUID REFERENCES positions(id),
  revoked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revocation_wallet_badge
  ON badge_revocation_log(wallet, badge_name);

-- Grant permissions (if user role exists)
-- GRANT SELECT ON badge_definitions TO app_user;
-- GRANT SELECT, INSERT ON badges TO app_user;
-- GRANT SELECT ON badge_events TO app_user;

