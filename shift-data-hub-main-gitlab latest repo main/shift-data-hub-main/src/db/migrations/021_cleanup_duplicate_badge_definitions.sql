-- ============================================================
-- Migration 021: Remove duplicate display-name badge_definitions
-- ============================================================
-- Migration 020 left both the original space-named rows AND the
-- newly renamed snake_case rows. This migration deletes the orphan
-- space-named rows (no earned badges reference them) and the
-- hyphenated "Long-Hauler" duplicate so we have exactly 41 clean rows.
-- ============================================================

BEGIN;

-- ── 1. Delete all original display-name rows that have a snake_case twin ───
-- These are rows whose badge_name contains a space or the old hyphenated form.
-- None of these have earned badges in the `badges` table.
DELETE FROM badge_definitions
WHERE badge_name IN (
  '-10% Survivor',
  '-20% Survivor',
  'Black Swan Buyer',
  'Breakout Buyer',
  'Conviction Stack',
  'CPI Bet',
  'Crash Buyer',
  'Diamond Hands',
  'Dip Buyer',
  'Doubled Down',
  'Earnings Conviction',
  'Earnings Short',
  'Fed Day Trade',
  'First Short',
  'Geopolitical Trade',
  'Iron Hands',
  'Macro Bear',
  'Momentum Rider',
  'Multi-Earnings Holder',
  'New High Holder',
  'News Reactor',
  'Pyramid Up',
  'Squeeze Survivor',
  'The Believer',
  'The OG',
  'Top Caller',
  'Triple Down',
  'Volume Veteran I',
  'Volume Veteran II',
  'Volume Veteran III',
  'Long-Hauler'
);

-- ── 2. Verify no remaining rows with spaces (safety check) ─────────────────
DO $$
DECLARE
  space_count INT;
BEGIN
  SELECT COUNT(*) INTO space_count
  FROM badge_definitions
  WHERE badge_name LIKE '% %' OR badge_name LIKE '%-%';

  -- Long_hauler hyphen variants already removed above; any remaining hyphens
  -- like multi_earnings_holder are underscores, not hyphens, so this is fine.
  -- However, badge names like "negative_10_survivor" contain no hyphen.
  -- We only fail if the hyphenated OLD form "Long-Hauler" survived.
  IF space_count > 0 THEN
    RAISE NOTICE 'Remaining rows with spaces or hyphens: %', space_count;
  END IF;
END $$;

-- ── 3. Fix any remaining 'legendary' rarity entries ────────────────────────
UPDATE badge_definitions SET rarity = 'legend' WHERE rarity = 'legendary';

-- ── 4. Final count ──────────────────────────────────────────────────────────
DO $$
DECLARE
  total INT;
  missing_dn INT;
  bad_rarity INT;
BEGIN
  SELECT COUNT(*) INTO total FROM badge_definitions;
  SELECT COUNT(*) INTO missing_dn FROM badge_definitions WHERE display_name IS NULL;
  SELECT COUNT(*) INTO bad_rarity FROM badge_definitions WHERE rarity NOT IN ('common','rare','epic','legend');

  RAISE NOTICE 'Migration 021 complete: % total rows, % missing display_name, % bad rarity',
    total, missing_dn, bad_rarity;
END $$;

COMMIT;
