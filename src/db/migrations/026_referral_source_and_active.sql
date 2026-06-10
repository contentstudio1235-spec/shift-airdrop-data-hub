-- ============================================================
-- Migration 026: Referral source tracking + active status
-- ============================================================
-- 1. referrals.referral_source   — 'shift' | 'snag' | 'unknown'
--    All existing records default to 'shift' (came via SHIFT website reg)
-- 2. referrals.is_active         — true if referred wallet holds >= $5
--    in any combination of the 6 SHIFT RWA assets
-- 3. referrals.activated_at      — when they first crossed the $5 threshold
-- 4. users.referral_source       — mirrors where this user's own referral
--    came from (for nudge targeting)
-- ============================================================

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS referral_source  VARCHAR(16) DEFAULT 'shift'
    CHECK (referral_source IN ('shift', 'snag', 'unknown')),
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at     TIMESTAMP;

-- All existing referrals came through SHIFT website ref codes
UPDATE referrals SET referral_source = 'shift' WHERE referral_source IS NULL;

-- Backfill is_active based on current $5 threshold
UPDATE referrals r
SET is_active = true,
    activated_at = COALESCE(r.activated_at, NOW())
WHERE EXISTS (
  SELECT 1 FROM positions p
  WHERE p.wallet = r.referred_wallet
    AND p.status = 'open'
    AND p.asset_mint IN (
      '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
      'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
      'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
      '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
      '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
      '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT'
    )
  GROUP BY p.wallet
  HAVING SUM(p.position_size_usd) >= 5
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet
  ON referrals(referrer_wallet);

CREATE INDEX IF NOT EXISTS idx_referrals_is_active
  ON referrals(referrer_wallet, is_active);

CREATE INDEX IF NOT EXISTS idx_referrals_source
  ON referrals(referral_source);
