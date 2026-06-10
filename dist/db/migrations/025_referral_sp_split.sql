-- ============================================================
-- Migration 025: Split referral SP into position + social buckets
-- ============================================================
-- Adds separate tracking columns for the two referral reward streams:
--
--   referral_position_sp  — 10-15% of referred wallet's Position SP
--                           multiplier: 1.0x in final score
--
--   referral_social_sp    — 5% of referred wallet's Social (Snag) SP
--                           multiplier: 0.5x in final score
--
--   last_commission_xp    — watermark: last total_xp value at which
--                           position commission was calculated (diff-based)
--
--   last_commission_social — watermark: last snag_points value at which
--                            social commission was calculated (diff-based)
--
-- Also adds commission_type to referral_commissions for audit trail.
-- ============================================================

-- ── Users table: separate referral SP buckets ──
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_position_sp   NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_social_sp     NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_commission_xp     NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_commission_social NUMERIC(18,4) DEFAULT 0;

-- Migrate any existing referral_commission_sp into position bucket
-- (old column treated everything as position referral)
UPDATE users
SET referral_position_sp = COALESCE(referral_commission_sp, 0)
WHERE referral_commission_sp > 0
  AND referral_position_sp = 0;

-- ── referral_commissions: add type column for audit trail ──
ALTER TABLE referral_commissions
  ADD COLUMN IF NOT EXISTS commission_type VARCHAR(16) DEFAULT 'position'
    CHECK (commission_type IN ('position', 'social'));

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_users_referral_position_sp
  ON users(referral_position_sp DESC)
  WHERE referral_position_sp > 0;

CREATE INDEX IF NOT EXISTS idx_users_referral_social_sp
  ON users(referral_social_sp DESC)
  WHERE referral_social_sp > 0;

CREATE INDEX IF NOT EXISTS idx_referral_commissions_type
  ON referral_commissions(commission_type, referrer_wallet);
