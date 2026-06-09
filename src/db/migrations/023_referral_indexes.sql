-- ============================================================
-- Migration 023: Referral System Indexes
-- ============================================================
-- Creates optimized indexes for:
--   1. Fast referrer commission lookups
--   2. Fast referral pair tracking (monthly cap checks)
--   3. Fast leaderboard aggregation queries
--   4. Legacy balance lookups
-- ============================================================

BEGIN;

-- ── Index 1: referral_commissions - by referrer + month ──
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_month
ON referral_commissions(referrer_wallet, month_year, sp_awarded DESC)
WHERE awarded_at >= (NOW() - INTERVAL '12 months');

-- ── Index 2: referral_commissions - by referred wallet ──
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred
ON referral_commissions(referred_wallet, awarded_at DESC);

-- ── Index 3: referral_monthly_caps - by pair + month ──
CREATE INDEX IF NOT EXISTS idx_referral_monthly_caps_pair_month
ON referral_monthly_caps(referrer_wallet, referred_wallet, month_year);

-- ── Index 4: referral_monthly_caps - by referrer (for dashboard) ──
CREATE INDEX IF NOT EXISTS idx_referral_monthly_caps_referrer
ON referral_monthly_caps(referrer_wallet, month_year DESC);

-- ── Index 5: referral_stats_cache - by referrer ──
CREATE INDEX IF NOT EXISTS idx_referral_stats_cache_referrer
ON referral_stats_cache(referrer_wallet);

-- ── Index 6: referral_stats_cache - by volume (leaderboard sort) ──
CREATE INDEX IF NOT EXISTS idx_referral_stats_cache_volume
ON referral_stats_cache(total_volume DESC);

-- ── Index 7: referral_stats_cache - by holding (leaderboard sort) ──
CREATE INDEX IF NOT EXISTS idx_referral_stats_cache_holding
ON referral_stats_cache(total_holding DESC);

-- ── Index 8: referral_stats_cache - by count (leaderboard sort) ──
CREATE INDEX IF NOT EXISTS idx_referral_stats_cache_count
ON referral_stats_cache(referral_count DESC);

-- ── Index 9: referral_legacy_balance - by referrer ──
CREATE INDEX IF NOT EXISTS idx_referral_legacy_balance_referrer
ON referral_legacy_balance(referrer_wallet);

-- ── Index 10: referral_legacy_balance - by claimed status ──
CREATE INDEX IF NOT EXISTS idx_referral_legacy_balance_claimed
ON referral_legacy_balance(claimed)
WHERE claimed = false;

-- ── Index 11: users - for referral lookups ──
CREATE INDEX IF NOT EXISTS idx_users_referred_by_wallet
ON users(referred_by_wallet)
WHERE referred_by_wallet IS NOT NULL;

-- ── Verify indexes created ────────────────────────────────
DO $$
DECLARE
  count INT;
BEGIN
  SELECT COUNT(*) INTO count FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('referral_commissions', 'referral_monthly_caps', 'referral_stats_cache', 'referral_legacy_balance', 'users')
  AND indexname LIKE 'idx_referral%' OR indexname = 'idx_users_referred_by_wallet';

  RAISE NOTICE 'Migration 023: Created % referral indexes', count;
END $$;

COMMIT;
