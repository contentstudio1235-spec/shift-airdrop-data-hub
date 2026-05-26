-- ============================================================
-- Migration: Event Management System
-- ============================================================
-- Tracks real-world events (FOMC, CPI, earnings, news, geopolitical)
-- that trigger event-based badges and special multipliers

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(256) NOT NULL,
  event_type VARCHAR(32) NOT NULL, -- 'earnings', 'macro', 'geopolitical', 'news_headline'
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  eligible_assets VARCHAR[] ARRAY, -- e.g., ARRAY['NVDA', 'AAPL', 'TSLA']
  eligible_indices VARCHAR[] ARRAY, -- e.g., ARRAY['SPX', 'NDX', 'DXY']
  trigger_threshold DECIMAL(10,2), -- Market impact threshold (e.g., -5.00 for -5% drop)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule VARCHAR(255), -- RRULE format: YEARLY on FOMC dates, etc.
  created_by VARCHAR(64), -- Admin wallet
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  CONSTRAINT event_type_check CHECK (event_type IN ('earnings', 'macro', 'geopolitical', 'news_headline', 'custom'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS events_start_end ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS events_created_by ON events(created_by);

-- ============================================================
-- News Feed Table
-- ============================================================
-- Curated market headlines for News Reactor badge
-- Users earn badge if they opened a position within 60 minutes of headline

CREATE TABLE IF NOT EXISTS news_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline VARCHAR(512) NOT NULL,
  source VARCHAR(128), -- e.g., 'Bloomberg', 'Reuters', 'CNBC', 'Twitter', 'Manual'
  market_impact DECIMAL(10,2), -- % market change triggered by headline (e.g., -5.50)
  published_at TIMESTAMP NOT NULL,
  asset_symbols VARCHAR[] ARRAY, -- e.g., ARRAY['SPX', 'NVDA', 'USD']
  sentiment VARCHAR(32), -- 'bearish', 'neutral', 'bullish'
  is_market_moving BOOLEAN DEFAULT true, -- Whether this triggered actual market movement
  created_by VARCHAR(64), -- Admin wallet
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT impact_check CHECK (market_impact IS NULL OR market_impact != 0)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS news_feed_published ON news_feed(published_at DESC);
CREATE INDEX IF NOT EXISTS news_feed_assets ON news_feed USING GIN(asset_symbols);
CREATE INDEX IF NOT EXISTS news_feed_sentiment ON news_feed(sentiment);

-- ============================================================
-- Event-to-Badge Mapping
-- ============================================================
-- Links specific badges to event types/names
-- Example: fed_day_trade badge triggers on events.event_type = 'macro' AND event_name LIKE 'FOMC%'

CREATE TABLE IF NOT EXISTS event_badge_triggers (
  id SERIAL PRIMARY KEY,
  badge_name VARCHAR(128) NOT NULL,
  event_type VARCHAR(32) NOT NULL, -- 'earnings', 'macro', 'geopolitical', 'news_headline'
  event_name_pattern VARCHAR(256), -- Regex pattern or substring match (e.g., 'FOMC%', 'CPI%')
  trigger_condition VARCHAR(256), -- Description of what qualifies (e.g., "opened within 24h before earnings")
  multiplier_bonus DECIMAL(6,4), -- Bonus multiplier value
  duration_type VARCHAR(16), -- 'permanent', 'dynamic'
  dynamic_duration_days INTEGER, -- Days badge bonus applies (for dynamic badges)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT badge_event_unique UNIQUE(badge_name, event_type, event_name_pattern)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS event_badge_triggers_badge ON event_badge_triggers(badge_name);
CREATE INDEX IF NOT EXISTS event_badge_triggers_event ON event_badge_triggers(event_type, event_name_pattern);

-- ============================================================
-- Event Activity Tracking
-- ============================================================
-- Track which users opened positions during specific events
-- Used for analyzing event impact and badge eligibility

CREATE TABLE IF NOT EXISTS event_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  wallet VARCHAR(64) NOT NULL,
  position_id UUID REFERENCES positions(id),
  activity_type VARCHAR(32) NOT NULL, -- 'position_opened', 'position_closed', 'trade_executed'
  activity_time TIMESTAMP NOT NULL,
  asset VARCHAR(64),
  position_size_usd NUMERIC(18,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS event_activity_event ON event_activity(event_id);
CREATE INDEX IF NOT EXISTS event_activity_wallet ON event_activity(wallet);
CREATE INDEX IF NOT EXISTS event_activity_time ON event_activity(activity_time);

-- ============================================================
-- Summary Comments
-- ============================================================
-- events table: Tracks all events that can trigger badges
-- news_feed table: Curated market headlines for News Reactor badge detection
-- event_badge_triggers: Maps badges to event triggers
-- event_activity: Tracks user activity during events for badge eligibility verification

