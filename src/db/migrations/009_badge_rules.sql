-- ============================================================
-- Migration: Badge Rule Templates & Multiplier Stacking
-- ============================================================
-- Phase 1: Badge System Foundation
-- Creates template-driven badge system (31 badges per Badge Strategy)
-- Implements +2.0x stacking cap with Hall of Fame bypass

-- ── Table 1: Badge Rule Templates (System Reference) ──────────────
-- Defines available badge rule templates with parameters
CREATE TABLE IF NOT EXISTS badge_rule_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(64) UNIQUE NOT NULL,
  category VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  description TEXT,
  multiplier_value DECIMAL(6,4) NOT NULL,
  duration_type VARCHAR(16) NOT NULL, -- 'permanent', 'dynamic', 'provisional'
  dynamic_duration_days INTEGER,
  is_hall_of_fame BOOLEAN DEFAULT false,
  parameters JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Insert 31 Badges from Badge Strategy ───────────────────────────

-- CONVICTION ADDING BADGES (4 badges: +1.10x to +1.15x Permanent)
INSERT INTO badge_rule_templates (template_key, category, display_name, description, multiplier_value, duration_type, is_hall_of_fame)
VALUES
  ('doubled_down', 'conviction_adding', 'Doubled Down', 'Added to position after -5% drop from entry', 1.10, 'permanent', false),
  ('triple_down', 'conviction_adding', 'Triple Down', 'Added 3+ times during -10% drawdown', 1.12, 'permanent', false),
  ('pyramid_up', 'conviction_adding', 'Pyramid Up', 'Added 3+ times as position rose +10%', 1.10, 'permanent', false),
  ('conviction_stack', 'conviction_adding', 'Conviction Stack', '5+ separate adds over 30+ days', 1.15, 'permanent', false),

-- BUYING DIP/BREAKOUT BADGES (6 badges: +1.10x to +1.20x Permanent)
  ('dip_buyer', 'buying_dip', 'Dip Buyer', 'Opened long on day underlying closed -3%+', 1.10, 'permanent', false),
  ('crash_buyer', 'buying_dip', 'Crash Buyer', 'Opened long on day SPX closed -5%+', 1.15, 'permanent', false),
  ('black_swan_buyer', 'buying_dip', 'Black Swan Buyer', 'Opened long on day SPX closed -10%+', 1.20, 'permanent', false),
  ('momentum_rider', 'buying_dip', 'Momentum Rider', 'Opened long on day underlying closed +3%+', 1.10, 'permanent', false),
  ('breakout_buyer', 'buying_dip', 'Breakout Buyer', 'Opened within 24h of 52-week high', 1.12, 'permanent', false),
  ('new_high_holder', 'buying_dip', 'New High Holder', 'Opened at all-time high, held 30+ days', 1.13, 'permanent', false),

-- EVENT-DRIVEN BADGES (5 badges: 3 Permanent +1.20x, 2 Dynamic)
  ('earnings_conviction', 'event_driven', 'Earnings Conviction', 'Opened 24h before earnings, held through report', 1.20, 'permanent', false),
  ('geopolitical_trade', 'event_driven', 'Geopolitical Trade', 'Opened during major geopolitical event', 1.20, 'permanent', false),
  ('fed_day_trade', 'event_driven', 'Fed Day Trade', 'Opened on FOMC announcement day', 1.20, 'dynamic', false),
  ('cpi_bet', 'event_driven', 'CPI Bet', 'Opened on CPI release day', 1.15, 'dynamic', false),
  ('news_reactor', 'event_driven', 'News Reactor', 'Opened within 60m of market-moving headline', 1.15, 'dynamic', false),

-- SHORT CONVICTION BADGES (4 badges: +1.15x to +1.25x Permanent)
  ('first_short', 'short_conviction', 'First Short', 'First short position opened', 1.15, 'permanent', false),
  ('top_caller', 'short_conviction', 'Top Caller', 'Shorted within 24h of 52-week high', 1.18, 'permanent', false),
  ('earnings_short', 'short_conviction', 'Earnings Short', 'Shorted into earnings, closed profitable', 1.20, 'permanent', false),
  ('squeeze_survivor', 'short_conviction', 'Squeeze Survivor', 'Held short through +10% squeeze, closed profitable', 1.25, 'permanent', false),
  ('macro_bear', 'short_conviction', 'Macro Bear', 'Held short 30+ days', 1.15, 'permanent', false),

-- DRAWDOWN/DURATION BADGES (7 badges: +1.15x to +1.30x, 2 Hall of Fame)
  ('negative_10_survivor', 'drawdown_duration', 'Negative 10% Survivor', 'Held through -10% drawdown without closing', 1.18, 'permanent', false),
  ('negative_20_survivor', 'drawdown_duration', 'Negative 20% Survivor', 'Held through -20% drawdown without closing', 1.22, 'permanent', false),
  ('iron_hands', 'drawdown_duration', 'Iron Hands', 'Held through -30%+ drawdown and closed profitable', 1.30, 'permanent', true),
  ('diamond_hands', 'drawdown_duration', 'Diamond Hands', 'Held single position 60+ days', 1.15, 'permanent', false),
  ('long_hauler', 'drawdown_duration', 'Long Hauler', 'Held single position 90+ days', 1.18, 'permanent', false),
  ('the_believer', 'drawdown_duration', 'The Believer', 'Held single position 180+ days', 1.25, 'permanent', true),
  ('multi_earnings_holder', 'drawdown_duration', 'Multi-Earnings Holder', 'Held same position through 2+ earnings', 1.15, 'permanent', false),

-- VOLUME & OG BADGES (3 badges: +1.10x to +1.15x Permanent)
  ('volume_veteran_i', 'volume_og', 'Volume Veteran I', 'Cumulative volume ≥ $10,000', 1.10, 'permanent', false),
  ('volume_veteran_ii', 'volume_og', 'Volume Veteran II', 'Cumulative volume ≥ $100,000', 1.12, 'permanent', false),
  ('volume_veteran_iii', 'volume_og', 'Volume Veteran III', 'Cumulative volume ≥ $1,000,000', 1.15, 'permanent', false),
  ('the_og', 'volume_og', 'The OG', 'Active in first 30 days of launch', 1.10, 'permanent', false);

-- ── Table 2: Badge Multiplier Stack (Enforce +2.0x Cap) ─────────────
-- Tracks badge stacking per wallet/position to enforce +2.0x cap
-- Top 3 badges count at full value, rest count at half value
-- Hall of Fame badges bypass cap with +0.10x premium
CREATE TABLE IF NOT EXISTS badge_multiplier_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  total_stacked_multiplier DECIMAL(6,4) NOT NULL,
  top_three_badges JSONB, -- Array of top 3 badge template keys (full value)
  remaining_badges JSONB, -- Array of remaining badges (half value)
  hall_of_fame_multiplier DECIMAL(6,4) DEFAULT 0.0, -- Separate for HOF tier
  final_multiplier DECIMAL(6,4) NOT NULL, -- Capped at 2.0x + HOF on top
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS badge_multiplier_stack_wallet ON badge_multiplier_stack(wallet);
CREATE INDEX IF NOT EXISTS badge_multiplier_stack_position ON badge_multiplier_stack(position_id);
CREATE INDEX IF NOT EXISTS badge_multiplier_stack_updated ON badge_multiplier_stack(updated_at DESC);

-- ── Enhance badge_definitions Table ───────────────────────────────
-- Add columns to support template-driven badge system
ALTER TABLE badge_definitions
ADD COLUMN IF NOT EXISTS rule_template VARCHAR(255),
ADD COLUMN IF NOT EXISTS rule_config JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_hall_of_fame BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS provisional_duration_hours INTEGER,
ADD COLUMN IF NOT EXISTS duration_type VARCHAR(16) DEFAULT 'permanent',
ADD COLUMN IF NOT EXISTS dynamic_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS created_by_admin VARCHAR(64),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS requires_manual_award BOOLEAN DEFAULT false;

-- Create indexes for badge filtering
CREATE INDEX IF NOT EXISTS badge_definitions_active ON badge_definitions(is_active);
CREATE INDEX IF NOT EXISTS badge_definitions_type ON badge_definitions(badge_type);
CREATE INDEX IF NOT EXISTS badge_definitions_template ON badge_definitions(rule_template);

-- ── Map Existing Badges to Templates ───────────────────────────────
-- If badge_definitions has existing entries, map them to templates
-- (This UPDATE assumes existing badges match template_keys)
UPDATE badge_definitions bd
SET rule_template = brt.template_key,
    duration_type = brt.duration_type,
    dynamic_duration_days = brt.dynamic_duration_days,
    is_hall_of_fame = brt.is_hall_of_fame,
    is_active = true
FROM badge_rule_templates brt
WHERE bd.badge_name = brt.template_key;

-- ── Constraints ───────────────────────────────────────────────────
-- Ensure multiplier values are within valid range
ALTER TABLE badge_multiplier_stack
ADD CONSTRAINT multiplier_range CHECK (
  final_multiplier >= 1.0 AND final_multiplier <= 2.0
);

-- Ensure duration_type is valid
ALTER TABLE badge_rule_templates
ADD CONSTRAINT duration_type_valid CHECK (
  duration_type IN ('permanent', 'dynamic', 'provisional')
);

-- Ensure dynamic_duration_days is set for dynamic badges
ALTER TABLE badge_rule_templates
ADD CONSTRAINT dynamic_duration_required CHECK (
  (duration_type != 'dynamic' OR dynamic_duration_days > 0)
);

-- ── Summary ────────────────────────────────────────────────────────
-- Created: badge_rule_templates (31 badges across 8 categories)
-- Created: badge_multiplier_stack (enforce +2.0x cap)
-- Enhanced: badge_definitions (added template support columns)
-- Constraints: Multiplier range (1.0-2.0x), duration type validation
