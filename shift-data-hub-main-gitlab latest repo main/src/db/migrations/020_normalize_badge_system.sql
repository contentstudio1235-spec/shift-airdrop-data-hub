-- ============================================================
-- Migration 020: Normalize Badge System
-- Fixes badge_name mismatches, fills missing display_name /
-- unlock_requirement / icon, and cleans up legacy stubs.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ── 1. Rename display-name badge_names to snake_case ─────────────────
-- These were inserted with display names as badge_name in migration 007.
-- badgeService.ts awards snake_case names; the JOIN must match.

UPDATE badge_definitions SET badge_name = 'doubled_down'       WHERE badge_name = 'Doubled Down';
UPDATE badge_definitions SET badge_name = 'triple_down'        WHERE badge_name = 'Triple Down';
UPDATE badge_definitions SET badge_name = 'pyramid_up'         WHERE badge_name = 'Pyramid Up';
UPDATE badge_definitions SET badge_name = 'conviction_stack'   WHERE badge_name = 'Conviction Stack';
UPDATE badge_definitions SET badge_name = 'dip_buyer'          WHERE badge_name = 'Dip Buyer';
UPDATE badge_definitions SET badge_name = 'crash_buyer'        WHERE badge_name = 'Crash Buyer';
UPDATE badge_definitions SET badge_name = 'black_swan_buyer'   WHERE badge_name = 'Black Swan Buyer';
UPDATE badge_definitions SET badge_name = 'momentum_rider'     WHERE badge_name = 'Momentum Rider';
UPDATE badge_definitions SET badge_name = 'breakout_buyer'     WHERE badge_name = 'Breakout Buyer';
UPDATE badge_definitions SET badge_name = 'new_high_holder'    WHERE badge_name = 'New High Holder';
UPDATE badge_definitions SET badge_name = 'earnings_conviction' WHERE badge_name = 'Earnings Conviction';
UPDATE badge_definitions SET badge_name = 'geopolitical_trade'  WHERE badge_name = 'Geopolitical Trade';
UPDATE badge_definitions SET badge_name = 'fed_day_trade'       WHERE badge_name = 'Fed Day Trade';
UPDATE badge_definitions SET badge_name = 'cpi_bet'             WHERE badge_name = 'CPI Bet';
UPDATE badge_definitions SET badge_name = 'news_reactor'        WHERE badge_name = 'News Reactor';
UPDATE badge_definitions SET badge_name = 'iron_hands'          WHERE badge_name = 'Iron Hands';
UPDATE badge_definitions SET badge_name = 'negative_10_survivor' WHERE badge_name = '-10% Survivor';
UPDATE badge_definitions SET badge_name = 'negative_20_survivor' WHERE badge_name = '-20% Survivor';
UPDATE badge_definitions SET badge_name = 'the_believer'        WHERE badge_name = 'The Believer';
UPDATE badge_definitions SET badge_name = 'diamond_hands'       WHERE badge_name = 'Diamond Hands';
UPDATE badge_definitions SET badge_name = 'long_hauler'         WHERE badge_name = 'Long-Hauler';
UPDATE badge_definitions SET badge_name = 'multi_earnings_holder' WHERE badge_name = 'Multi-Earnings Holder';
UPDATE badge_definitions SET badge_name = 'top_caller'          WHERE badge_name = 'Top Caller';
UPDATE badge_definitions SET badge_name = 'earnings_short'      WHERE badge_name = 'Earnings Short';
UPDATE badge_definitions SET badge_name = 'squeeze_survivor'    WHERE badge_name = 'Squeeze Survivor';
UPDATE badge_definitions SET badge_name = 'macro_bear'          WHERE badge_name = 'Macro Bear';
UPDATE badge_definitions SET badge_name = 'first_short'         WHERE badge_name = 'First Short';
UPDATE badge_definitions SET badge_name = 'volume_veteran_i'    WHERE badge_name = 'Volume Veteran I';
UPDATE badge_definitions SET badge_name = 'volume_veteran_ii'   WHERE badge_name = 'Volume Veteran II';
UPDATE badge_definitions SET badge_name = 'volume_veteran_iii'  WHERE badge_name = 'Volume Veteran III';
UPDATE badge_definitions SET badge_name = 'the_og'              WHERE badge_name = 'The OG';

-- ── 2. Fill display_name where NULL ──────────────────────────────────
UPDATE badge_definitions SET display_name = CASE badge_name
  WHEN 'doubled_down'          THEN 'Doubled Down'
  WHEN 'triple_down'           THEN 'Triple Down'
  WHEN 'pyramid_up'            THEN 'Pyramid Up'
  WHEN 'conviction_stack'      THEN 'Conviction Stack'
  WHEN 'dip_buyer'             THEN 'Dip Buyer'
  WHEN 'crash_buyer'           THEN 'Crash Buyer'
  WHEN 'black_swan_buyer'      THEN 'Black Swan Buyer'
  WHEN 'momentum_rider'        THEN 'Momentum Rider'
  WHEN 'breakout_buyer'        THEN 'Breakout Buyer'
  WHEN 'new_high_holder'       THEN 'New High Holder'
  WHEN 'earnings_conviction'   THEN 'Earnings Conviction'
  WHEN 'geopolitical_trade'    THEN 'Geopolitical Trade'
  WHEN 'fed_day_trade'         THEN 'Fed Day Trade'
  WHEN 'cpi_bet'               THEN 'CPI Bet'
  WHEN 'news_reactor'          THEN 'News Reactor'
  WHEN 'iron_hands'            THEN 'Iron Hands'
  WHEN 'negative_10_survivor'  THEN '-10% Survivor'
  WHEN 'negative_20_survivor'  THEN '-20% Survivor'
  WHEN 'the_believer'          THEN 'The Believer'
  WHEN 'diamond_hands'         THEN 'Diamond Hands'
  WHEN 'long_hauler'           THEN 'Long Hauler'
  WHEN 'multi_earnings_holder' THEN 'Multi-Earnings Holder'
  WHEN 'top_caller'            THEN 'Top Caller'
  WHEN 'earnings_short'        THEN 'Earnings Short'
  WHEN 'squeeze_survivor'      THEN 'Squeeze Survivor'
  WHEN 'macro_bear'            THEN 'Macro Bear'
  WHEN 'first_short'           THEN 'First Short'
  WHEN 'volume_veteran_i'      THEN 'Volume Veteran I'
  WHEN 'volume_veteran_ii'     THEN 'Volume Veteran II'
  WHEN 'volume_veteran_iii'    THEN 'Volume Veteran III'
  WHEN 'the_og'                THEN 'The OG'
  -- legacy stubs
  WHEN 'first_trade'           THEN 'First Trade'
  WHEN 'diamond_hands_7d'      THEN 'Diamond Hands (7d)'
  WHEN 'streak_7d'             THEN '7-Day Streak'
  WHEN 'community_builder'     THEN 'Community Builder'
  WHEN 'legend'                THEN 'Legend'
  WHEN 'referral_king'         THEN 'Referral King'
  WHEN 'whale_mode'            THEN 'Whale Mode'
  ELSE display_name
END
WHERE display_name IS NULL;

-- ── 3. Fill unlock_requirement where NULL ────────────────────────────
UPDATE badge_definitions SET unlock_requirement = CASE badge_name
  WHEN 'doubled_down'          THEN 'Add to a position after it drops -5% from entry'
  WHEN 'triple_down'           THEN 'Add 3+ times to the same position during a -10% drawdown'
  WHEN 'pyramid_up'            THEN 'Add 3+ times to a position as it rises +10% or more'
  WHEN 'conviction_stack'      THEN '5+ separate adds to the same position over 30+ days'
  WHEN 'dip_buyer'             THEN 'Open a long position on a day the underlying closes -3% or worse'
  WHEN 'crash_buyer'           THEN 'Open a long position on a day SPX closes -5% or worse'
  WHEN 'black_swan_buyer'      THEN 'Open a long position on a day SPX closes -10% or worse'
  WHEN 'momentum_rider'        THEN 'Open a long position on a day the underlying closes +3% or higher'
  WHEN 'breakout_buyer'        THEN 'Open a long position within 24h of a 52-week high'
  WHEN 'new_high_holder'       THEN 'Open long at an all-time high and hold 30+ days'
  WHEN 'earnings_conviction'   THEN 'Open a position 24h before earnings and hold through the report'
  WHEN 'geopolitical_trade'    THEN 'Open a position during a major geopolitical event'
  WHEN 'fed_day_trade'         THEN 'Open a position on an FOMC announcement day'
  WHEN 'cpi_bet'               THEN 'Open a position on a CPI release day'
  WHEN 'news_reactor'          THEN 'Open a position within 60 minutes of a market-moving headline'
  WHEN 'iron_hands'            THEN 'Hold through a -30%+ drawdown and close profitable'
  WHEN 'negative_10_survivor'  THEN 'Hold a position through a -10% unrealized drawdown without closing'
  WHEN 'negative_20_survivor'  THEN 'Hold a position through a -20% unrealized drawdown without closing'
  WHEN 'the_believer'          THEN 'Hold a single position open for 180+ days'
  WHEN 'diamond_hands'         THEN 'Hold a single position open for 60+ days'
  WHEN 'long_hauler'           THEN 'Hold a single position open for 90+ days'
  WHEN 'multi_earnings_holder' THEN 'Hold the same position through 2+ earnings reports'
  WHEN 'top_caller'            THEN 'Open a short position within 24h of a 52-week high'
  WHEN 'earnings_short'        THEN 'Short into earnings and close profitable'
  WHEN 'squeeze_survivor'      THEN 'Hold a short through a +10% squeeze and close profitable'
  WHEN 'macro_bear'            THEN 'Hold a short position for 30+ days'
  WHEN 'first_short'           THEN 'Open your first short position'
  WHEN 'volume_veteran_i'      THEN 'Reach cumulative trade volume of $10,000'
  WHEN 'volume_veteran_ii'     THEN 'Reach cumulative trade volume of $100,000'
  WHEN 'volume_veteran_iii'    THEN 'Reach cumulative trade volume of $1,000,000'
  WHEN 'the_og'                THEN 'Be an active trader in the first 30 days of SHIFT launch'
  -- legacy stubs
  WHEN 'first_trade'           THEN 'Complete your first trade on SHIFT'
  WHEN 'diamond_hands_7d'      THEN 'Hold a position open for 7 days'
  WHEN 'streak_7d'             THEN 'Trade for 7 consecutive days'
  WHEN 'community_builder'     THEN 'Refer at least 5 friends to SHIFT'
  WHEN 'legend'                THEN 'Reach legendary status on the leaderboard'
  WHEN 'referral_king'         THEN 'Refer 25+ active users to SHIFT'
  WHEN 'whale_mode'            THEN 'Open a position worth $50,000 or more'
  ELSE unlock_requirement
END
WHERE unlock_requirement IS NULL;

-- ── 4. Widen icon column then fill it ────────────────────────────────
-- icon was VARCHAR(4) — too small for paths. Expand to 255.
ALTER TABLE badge_definitions ALTER COLUMN icon TYPE VARCHAR(255);

-- Fill icon column (use icon_url if set, else canonical path)
UPDATE badge_definitions SET icon = COALESCE(
  icon_url,
  '/badges/' || REPLACE(COALESCE(category,'legacy'), '_', '') || '_' || badge_name || '.png'
)
WHERE icon IS NULL;

-- Explicit canonical icon paths for all 31 main badges
UPDATE badge_definitions SET icon = '/badges/conviction_doubled_down.png'       WHERE badge_name = 'doubled_down';
UPDATE badge_definitions SET icon = '/badges/conviction_triple_down.png'        WHERE badge_name = 'triple_down';
UPDATE badge_definitions SET icon = '/badges/conviction_pyramid_up.png'         WHERE badge_name = 'pyramid_up';
UPDATE badge_definitions SET icon = '/badges/conviction_conviction_stack.png'   WHERE badge_name = 'conviction_stack';
UPDATE badge_definitions SET icon = '/badges/buyingdip_dip_buyer.png'           WHERE badge_name = 'dip_buyer';
UPDATE badge_definitions SET icon = '/badges/buyingdip_crash_buyer.png'         WHERE badge_name = 'crash_buyer';
UPDATE badge_definitions SET icon = '/badges/buyingdip_black_swan_buyer.png'    WHERE badge_name = 'black_swan_buyer';
UPDATE badge_definitions SET icon = '/badges/buyingdip_momentum_rider.png'      WHERE badge_name = 'momentum_rider';
UPDATE badge_definitions SET icon = '/badges/buyingdip_breakout_buyer.png'      WHERE badge_name = 'breakout_buyer';
UPDATE badge_definitions SET icon = '/badges/buyingdip_new_high_holder.png'     WHERE badge_name = 'new_high_holder';
UPDATE badge_definitions SET icon = '/badges/eventdriven_earnings_conviction.png' WHERE badge_name = 'earnings_conviction';
UPDATE badge_definitions SET icon = '/badges/eventdriven_geopolitical_trade.png'  WHERE badge_name = 'geopolitical_trade';
UPDATE badge_definitions SET icon = '/badges/eventdriven_fed_day_trade.png'       WHERE badge_name = 'fed_day_trade';
UPDATE badge_definitions SET icon = '/badges/eventdriven_cpi_bet.png'             WHERE badge_name = 'cpi_bet';
UPDATE badge_definitions SET icon = '/badges/eventdriven_news_reactor.png'        WHERE badge_name = 'news_reactor';
UPDATE badge_definitions SET icon = '/badges/drawdown_iron_hands.png'            WHERE badge_name = 'iron_hands';
UPDATE badge_definitions SET icon = '/badges/drawdown_negative_10_survivor.png'  WHERE badge_name = 'negative_10_survivor';
UPDATE badge_definitions SET icon = '/badges/drawdown_negative_20_survivor.png'  WHERE badge_name = 'negative_20_survivor';
UPDATE badge_definitions SET icon = '/badges/drawdown_the_believer.png'          WHERE badge_name = 'the_believer';
UPDATE badge_definitions SET icon = '/badges/drawdown_diamond_hands.png'         WHERE badge_name = 'diamond_hands';
UPDATE badge_definitions SET icon = '/badges/drawdown_long_hauler.png'           WHERE badge_name = 'long_hauler';
UPDATE badge_definitions SET icon = '/badges/drawdown_multi_earnings_holder.png' WHERE badge_name = 'multi_earnings_holder';
UPDATE badge_definitions SET icon = '/badges/shortconviction_top_caller.png'     WHERE badge_name = 'top_caller';
UPDATE badge_definitions SET icon = '/badges/shortconviction_earnings_short.png' WHERE badge_name = 'earnings_short';
UPDATE badge_definitions SET icon = '/badges/shortconviction_squeeze_survivor.png' WHERE badge_name = 'squeeze_survivor';
UPDATE badge_definitions SET icon = '/badges/shortconviction_macro_bear.png'     WHERE badge_name = 'macro_bear';
UPDATE badge_definitions SET icon = '/badges/shortconviction_first_short.png'    WHERE badge_name = 'first_short';
UPDATE badge_definitions SET icon = '/badges/volumeog_volume_veteran_i.png'      WHERE badge_name = 'volume_veteran_i';
UPDATE badge_definitions SET icon = '/badges/volumeog_volume_veteran_ii.png'     WHERE badge_name = 'volume_veteran_ii';
UPDATE badge_definitions SET icon = '/badges/volumeog_volume_veteran_iii.png'    WHERE badge_name = 'volume_veteran_iii';
UPDATE badge_definitions SET icon = '/badges/volumeog_the_og.png'                WHERE badge_name = 'the_og';
-- legacy stubs — generic icons
UPDATE badge_definitions SET icon = '/badges/legacy_first_trade.png'        WHERE badge_name = 'first_trade'        AND icon IS NULL;
UPDATE badge_definitions SET icon = '/badges/legacy_diamond_hands_7d.png'   WHERE badge_name = 'diamond_hands_7d'   AND icon IS NULL;
UPDATE badge_definitions SET icon = '/badges/legacy_streak_7d.png'          WHERE badge_name = 'streak_7d'          AND icon IS NULL;
UPDATE badge_definitions SET icon = '/badges/legacy_community_builder.png'  WHERE badge_name = 'community_builder'  AND icon IS NULL;
UPDATE badge_definitions SET icon = '/badges/legacy_legend.png'             WHERE badge_name = 'legend'             AND icon IS NULL;
UPDATE badge_definitions SET icon = '/badges/legacy_referral_king.png'      WHERE badge_name = 'referral_king'      AND icon IS NULL;
UPDATE badge_definitions SET icon = '/badges/legacy_whale_mode.png'         WHERE badge_name = 'whale_mode'         AND icon IS NULL;

-- ── 5. Fix legacy stubs — fill category + badge_type ─────────────────
UPDATE badge_definitions SET
  category      = 'legacy',
  badge_type    = 'permanent',
  duration_type = 'permanent'
WHERE category IS NULL;

-- ── 6. Ensure first_trade is properly set up (used by badgeService) ──
UPDATE badge_definitions SET
  category   = 'volume_og',
  badge_type = 'permanent',
  duration_type = 'permanent',
  multiplier_value = 1.05,
  rarity = 'common',
  hall_of_fame = false
WHERE badge_name = 'first_trade';

-- Also add shift_holder if not present
INSERT INTO badge_definitions (badge_name, display_name, description, icon, rarity, unlock_requirement, is_active, category, badge_type, duration_type, multiplier_value)
VALUES (
  'shift_holder',
  'SHIFT Holder',
  'Hold at least 1 SHIFT token in your wallet',
  '/badges/legacy_shift_holder.png',
  'rare',
  'Hold at least 1 SHIFT token',
  true,
  'volume_og',
  'permanent',
  'permanent',
  1.10
)
ON CONFLICT (badge_name) DO NOTHING;

-- fomc_trader (used by badgeService but may not be in definitions)
INSERT INTO badge_definitions (badge_name, display_name, description, icon, rarity, unlock_requirement, is_active, category, badge_type, duration_type, multiplier_value)
VALUES (
  'fomc_trader',
  'FOMC Trader',
  'Trade during a macro event (FOMC or CPI)',
  '/badges/eventdriven_fed_day_trade.png',
  'rare',
  'Open a position during any FOMC or CPI macro event',
  true,
  'event_driven',
  'dynamic',
  'dynamic',
  1.20
)
ON CONFLICT (badge_name) DO NOTHING;

-- earnings_reactor (used by badgeService)
INSERT INTO badge_definitions (badge_name, display_name, description, icon, rarity, unlock_requirement, is_active, category, badge_type, duration_type, multiplier_value)
VALUES (
  'earnings_reactor',
  'Earnings Reactor',
  'Trade during an earnings event on an eligible asset',
  '/badges/eventdriven_earnings_conviction.png',
  'rare',
  'Open a position during an earnings event window',
  true,
  'event_driven',
  'permanent',
  'permanent',
  1.15
)
ON CONFLICT (badge_name) DO NOTHING;

-- ── 7. Ensure rarity values match what the frontend expects ──────────
-- Frontend BadgeGallery uses 'common','rare','epic','legend'
-- badge_definitions uses 'common','rare','epic','legendary'
-- Normalize 'legendary' → 'legend' to match frontend
UPDATE badge_definitions SET rarity = 'legend' WHERE rarity = 'legendary';

-- ── 8. Refresh indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_badge_definitions_is_active
  ON badge_definitions(is_active, rarity);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_badge_name
  ON badge_definitions(badge_name);
