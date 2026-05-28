-- ============================================================
-- Migration 003: KOL Referral System + Dynamic/Permanent Multiplier
-- Run: psql $DATABASE_URL -f src/db/migrations/003_referral_multiplier.sql
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- ── KOL Whitelist ──────────────────────────────────────────────────────────
-- Only admin-whitelisted wallets can generate custom referral codes.
-- multiplier_bonus: the bonus multiplier granted to users who register via this code (1.0 = no bonus, 2.0 = 2x)
-- multiplier_type: 'dynamic' (forward-only) or 'permanent' (retroactive)
CREATE TABLE IF NOT EXISTS kol_whitelist (
  wallet           VARCHAR(64)  PRIMARY KEY REFERENCES users(wallet),
  custom_code      VARCHAR(32)  UNIQUE NOT NULL,         -- e.g. "SHIFT-AXEL-VIP"
  display_name     VARCHAR(64),                           -- KOL display name shown on register page
  multiplier_bonus DECIMAL(6,4) DEFAULT 1.5,             -- bonus applied to referee (1.0–2.0)
  multiplier_type  VARCHAR(16)  DEFAULT 'dynamic',        -- 'dynamic' | 'permanent'
  is_active        BOOLEAN      DEFAULT true,
  notes            TEXT,                                  -- admin notes
  created_by       VARCHAR(64),                           -- admin who created it
  created_at       TIMESTAMP    DEFAULT NOW(),
  updated_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kol_whitelist_code ON kol_whitelist(custom_code);
CREATE INDEX IF NOT EXISTS idx_kol_whitelist_active ON kol_whitelist(is_active);

-- ── Referrals ──────────────────────────────────────────────────────────────
-- Tracks who referred whom. One referrer per registered user (first one wins).
-- bonus_multiplier / bonus_type copied from kol_whitelist at registration time
-- (standard referrals from non-KOL users have no bonus, bonus_multiplier = 1.0)
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_wallet  VARCHAR(64)  NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  referrer_wallet  VARCHAR(64)  REFERENCES users(wallet),
  code_used        VARCHAR(32),                           -- the referral code string used
  is_kol_referral  BOOLEAN      DEFAULT false,
  bonus_multiplier DECIMAL(6,4) DEFAULT 1.0,             -- multiplier applied to referee
  bonus_type       VARCHAR(16)  DEFAULT 'none',           -- 'none' | 'dynamic' | 'permanent'
  bonus_applied    BOOLEAN      DEFAULT false,             -- has the multiplier been applied yet?
  referred_at      TIMESTAMP    DEFAULT NOW(),
  UNIQUE(referred_wallet)                                 -- one referrer per user
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code_used);
CREATE INDEX IF NOT EXISTS idx_referrals_unapplied ON referrals(bonus_applied) WHERE bonus_applied = false;

-- ── Multiplier Log ─────────────────────────────────────────────────────────
-- Detailed audit trail for all multiplier changes (both dynamic and permanent)
CREATE TABLE IF NOT EXISTS multiplier_log (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet           VARCHAR(64)  NOT NULL REFERENCES users(wallet),
  multiplier_type  VARCHAR(16)  NOT NULL,   -- 'dynamic' | 'permanent'
  old_value        DECIMAL(6,4),
  new_value        DECIMAL(6,4),
  reason           VARCHAR(128),
  source           VARCHAR(64),             -- 'kol_referral' | 'badge' | 'nft' | 'certificate' | 'event'
  source_id        VARCHAR(128),            -- badge name / NFT id / event id
  xp_before        DECIMAL(18,4),           -- for permanent: XP before retroactive recalc
  xp_after         DECIMAL(18,4),           -- for permanent: XP after retroactive recalc
  applied_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multiplier_log_wallet ON multiplier_log(wallet);

-- ── Dynamic Multiplier Slots per user ─────────────────────────────────────
-- Tracks all active dynamic multipliers for a wallet.
-- The effective dynamic multiplier = MAX of all active records (or product, per config)
-- Expires automatically via expires_at
CREATE TABLE IF NOT EXISTS user_dynamic_multipliers (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet           VARCHAR(64)  NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  multiplier_value DECIMAL(6,4) NOT NULL,
  reason           VARCHAR(128),
  source           VARCHAR(64),             -- 'kol_referral' | 'badge_event' | 'seasonal' | 'streak'
  source_id        VARCHAR(128),
  activated_at     TIMESTAMP    DEFAULT NOW(),
  expires_at       TIMESTAMP,               -- NULL = never expires
  is_active        BOOLEAN      DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dyn_mult_wallet ON user_dynamic_multipliers(wallet);
CREATE INDEX IF NOT EXISTS idx_dyn_mult_active ON user_dynamic_multipliers(wallet, is_active);

-- ── users table additions ──────────────────────────────────────────────────
-- permanent_multiplier: the global retroactive multiplier for this user
-- dynamic_multiplier:   the current effective forward-only multiplier (cached, recomputed on change)
-- referral_code:        this user's own standard referral code (wallet-based)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permanent_multiplier DECIMAL(6,4) DEFAULT 1.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dynamic_multiplier   DECIMAL(6,4) DEFAULT 1.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code        VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_wallet   VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code     VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_bonus_xp      DECIMAL(18,4) DEFAULT 0;

-- Populate referral_code for existing users (wallet-based shortcode)
UPDATE users SET referral_code = UPPER(SUBSTRING(wallet, 1, 6)) WHERE referral_code IS NULL;

-- ── Referral invite bonus config ───────────────────────────────────────────
-- Standard referral bonus XP awarded to referrer when friend registers
CREATE TABLE IF NOT EXISTS referral_config (
  id               INTEGER      PRIMARY KEY DEFAULT 1,  -- singleton row
  standard_bonus_xp DECIMAL(18,4) DEFAULT 250,          -- XP given to referrer per signup
  kol_bonus_xp      DECIMAL(18,4) DEFAULT 500,          -- XP given to KOL referrer per signup
  updated_at        TIMESTAMP    DEFAULT NOW()
);

INSERT INTO referral_config (id, standard_bonus_xp, kol_bonus_xp)
VALUES (1, 250, 500)
ON CONFLICT (id) DO NOTHING;

-- ── Final indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_wallet);
