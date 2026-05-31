-- ============================================================
-- SHIFT Airdrop MVP — Database Schema
-- ============================================================

-- Users table: core wallet identity + aggregated stats
CREATE TABLE IF NOT EXISTS users (
  wallet                       VARCHAR(64) PRIMARY KEY,
  total_xp                     DECIMAL(18,4) DEFAULT 0,
  claim_multiplier             DECIMAL(6,4) DEFAULT 1.0,
  current_streak               INTEGER DEFAULT 0,
  last_active                  TIMESTAMP,
  snag_user_id                 VARCHAR(128),
  snag_default_referral_link   TEXT,
  snag_custom_referral_code    VARCHAR(64),
  referral_link_synced_at      TIMESTAMP,
  snag_points                  DECIMAL(18,4) DEFAULT 0,
  ga_user_id                   VARCHAR(128),
  created_at                   TIMESTAMP DEFAULT NOW(),
  updated_at                   TIMESTAMP DEFAULT NOW()
);

-- Positions table: every tracked trading position
CREATE TABLE IF NOT EXISTS positions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet              VARCHAR(64) NOT NULL REFERENCES users(wallet),
  asset               VARCHAR(64) NOT NULL,
  asset_mint          VARCHAR(64),
  position_size_usd   DECIMAL(18,4) NOT NULL,
  token_amount        DECIMAL(18,8),
  price_at_open       DECIMAL(18,8),
  opened_at           TIMESTAMP NOT NULL,
  closed_at           TIMESTAMP,
  current_multiplier  DECIMAL(6,4) DEFAULT 1.0,
  xp_generated        DECIMAL(18,4) DEFAULT 0,
  last_xp_calc        TIMESTAMP,
  status              VARCHAR(16) DEFAULT 'open',
  tx_signature_open   VARCHAR(128) UNIQUE,
  tx_signature_close  VARCHAR(128),
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Badges table: earned badges per wallet
CREATE TABLE IF NOT EXISTS badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet        VARCHAR(64) NOT NULL REFERENCES users(wallet),
  badge_name    VARCHAR(64) NOT NULL,
  snag_badge_id VARCHAR(128),
  earned_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet, badge_name)
);

-- Events table: manually managed market events (FOMC, CPI, earnings)
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name      VARCHAR(128) NOT NULL,
  event_type      VARCHAR(32) NOT NULL,
  start_time      TIMESTAMP NOT NULL,
  end_time        TIMESTAMP NOT NULL,
  eligible_assets TEXT[],
  badge_reward    VARCHAR(64),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Anti-farm log: flagged suspicious activity
CREATE TABLE IF NOT EXISTS anti_farm_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      VARCHAR(64),
  reason      VARCHAR(64),
  position_id UUID,
  details     JSONB,
  flagged_at  TIMESTAMP DEFAULT NOW()
);

-- Transaction dedup: prevent processing same tx twice
CREATE TABLE IF NOT EXISTS processed_transactions (
  tx_signature VARCHAR(128) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Claim multiplier history: audit trail for macro multiplier changes
CREATE TABLE IF NOT EXISTS claim_multiplier_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      VARCHAR(64) REFERENCES users(wallet),
  old_value   DECIMAL(6,4),
  new_value   DECIMAL(6,4),
  reason      VARCHAR(128),
  applied_at  TIMESTAMP DEFAULT NOW()
);

-- XP sync tracking: last synced XP to SNAG per wallet
CREATE TABLE IF NOT EXISTS xp_sync_log (
  wallet         VARCHAR(64) PRIMARY KEY REFERENCES users(wallet),
  last_synced_xp DECIMAL(18,4) DEFAULT 0,
  last_synced_at TIMESTAMP DEFAULT NOW()
);

-- SNAG Sync Queue: Fallback mechanism when SNAG API is unreachable or gated
CREATE TABLE IF NOT EXISTS snag_sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet          VARCHAR(64) REFERENCES users(wallet),
  sync_type       VARCHAR(32), -- 'xp' or 'badge'
  payload         JSONB,
  status          VARCHAR(16) DEFAULT 'pending', -- 'pending', 'failed', 'completed'
  created_at      TIMESTAMP DEFAULT NOW(),
  last_attempt_at TIMESTAMP,
  attempts        INTEGER DEFAULT 0
);

-- SNAG Failed Events: Log for manual review
CREATE TABLE IF NOT EXISTS snag_failed_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id        UUID REFERENCES snag_sync_queue(id),
  wallet          VARCHAR(64),
  error_message   TEXT,
  failed_at       TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_wallet_status ON positions(wallet, status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON positions(opened_at);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_badges_wallet ON badges(wallet);
CREATE INDEX IF NOT EXISTS idx_anti_farm_wallet ON anti_farm_log(wallet);
CREATE INDEX IF NOT EXISTS idx_claim_mult_wallet ON claim_multiplier_log(wallet);
CREATE INDEX IF NOT EXISTS idx_snag_queue_status ON snag_sync_queue(status);
