-- ============================================================
-- Migration 005: Gamification Foundation (Sprint 1)
-- Adds level system, daily streak tracking, and stat fields
-- All statements use IF NOT EXISTS — safe to re-run (idempotent)
-- ============================================================

-- 1. Add daily checkin tracking for streak calculation
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_daily_checkin TIMESTAMP,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 2. Leaderboard snapshots for weekly/seasonal tracking
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  xp_at_snapshot DECIMAL(18,4) NOT NULL,
  rank_position INTEGER,
  season VARCHAR(32) DEFAULT 'S1',  -- 'S1', 'S2', etc.
  snapshot_type VARCHAR(16) DEFAULT 'weekly',  -- 'weekly' or 'seasonal'
  snapshot_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet, season, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_season_rank
  ON leaderboard_snapshots(season, rank_position);

-- 3. Daily quest/mission tracking
CREATE TABLE IF NOT EXISTS user_missions (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  mission_id VARCHAR(64) NOT NULL,
  mission_name VARCHAR(128),
  xp_reward INTEGER,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  season VARCHAR(32) DEFAULT 'S1',
  week INTEGER DEFAULT 1,
  UNIQUE(wallet, mission_id, season, week)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_wallet_season
  ON user_missions(wallet, season, completed);

-- 4. Badge progress tracking (towards locked badges)
CREATE TABLE IF NOT EXISTS badge_progress (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(64) NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  badge_name VARCHAR(64) NOT NULL,
  progress_metric VARCHAR(64),  -- 'days_held', 'positions_opened', etc.
  progress_value DECIMAL(18,4) DEFAULT 0,
  target_value DECIMAL(18,4),
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP,
  UNIQUE(wallet, badge_name)
);

CREATE INDEX IF NOT EXISTS idx_badge_progress_wallet
  ON badge_progress(wallet, unlocked);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_level
  ON users(level);

CREATE INDEX IF NOT EXISTS idx_users_total_xp_desc
  ON users(total_xp DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_daily_checkin
  ON users(last_daily_checkin);
