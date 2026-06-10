-- ============================================================
-- Migration 006: Sprint 2 Features (Activity Feed, Missions, Badges)
-- All statements use IF NOT EXISTS — safe to re-run (idempotent)
-- ============================================================

-- 1. Activity feed events (user actions for dashboard display)
CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  event_type VARCHAR(32) NOT NULL,  -- 'position_opened', 'position_closed', 'badge_earned', 'level_up', 'milestone'
  event_data JSONB,                 -- flexible data per event type
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_wallet
  ON activity_feed(wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at
  ON activity_feed(created_at DESC);

-- 2. Weekly missions (dynamic quest system)
CREATE TABLE IF NOT EXISTS missions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  xp_reward INTEGER,
  icon VARCHAR(4),
  requirement_type VARCHAR(32),  -- 'hold_days', 'position_size', 'trades_count', etc.
  requirement_value DECIMAL(18,4),
  season VARCHAR(32) DEFAULT 'S1',
  week INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season, week, id)
);

CREATE INDEX IF NOT EXISTS idx_missions_season_week
  ON missions(season, week, is_active);

-- 3. User mission progress
CREATE TABLE IF NOT EXISTS user_mission_progress (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  mission_id VARCHAR(64) NOT NULL REFERENCES missions(id),
  progress_value DECIMAL(18,4) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  claimed_reward BOOLEAN DEFAULT false,
  season VARCHAR(32),
  week INTEGER,
  UNIQUE(wallet, mission_id, season, week)
);

CREATE INDEX IF NOT EXISTS idx_mission_progress_wallet
  ON user_mission_progress(wallet, completed, claimed_reward);

CREATE INDEX IF NOT EXISTS idx_mission_progress_missions
  ON user_mission_progress(mission_id, completed);

-- 4. Badge definitions (reference for badge gallery)
CREATE TABLE IF NOT EXISTS badge_definitions (
  badge_name VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(128),
  description TEXT,
  icon VARCHAR(4),
  rarity VARCHAR(16),  -- 'common', 'rare', 'epic', 'legend'
  unlock_requirement TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_rarity
  ON badge_definitions(rarity);

-- 5. Referral tracking (for referral dashboard)
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multiplier_applied BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_xp
  ON referrals(referrer_wallet, bonus_applied);

-- 6. Seed badge definitions (insert default badges)
INSERT INTO badge_definitions (badge_name, display_name, description, icon, rarity, unlock_requirement)
VALUES
  ('first_trade', 'First Trade', 'Opened your first position', '📈', 'common', 'Open any position'),
  ('diamond_hands_7d', 'Diamond Hands', 'Hold a position for 7 days', '💎', 'rare', 'Hold 7 days'),
  ('whale_mode', 'Whale Mode', 'Open a $10,000+ position', '🐋', 'epic', '$10,000+ position'),
  ('streak_7d', '7-Day Streak', 'Login 7 days in a row', '🔥', 'rare', '7-day daily streak'),
  ('referral_king', 'Referral King', 'Refer 10 users', '👑', 'epic', 'Refer 10 people'),
  ('community_builder', 'Community Builder', 'Join Discord & Telegram', '🤝', 'common', 'Social tasks'),
  ('legend', 'Legend', 'Reach Level 5', '👑', 'legend', 'Earn 50,000+ XP')
ON CONFLICT (badge_name) DO NOTHING;
