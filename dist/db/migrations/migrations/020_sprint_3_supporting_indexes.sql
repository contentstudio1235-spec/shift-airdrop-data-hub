-- ============================================================
-- Migration 020: Sprint 3 Supporting Indexes
-- Adds indexes that are justified by query plans for:
--   - computeKOLLeaderboard  (users.referred_by_code GROUP BY)
--   - fetchInitialWhales / pollNewWhales  (positions WHERE size >= 1000)
--   - computeWhaleOrigins vol CTE  (positions.wallet LEFT JOIN)
--
-- Migration runner note: migrationRunner.ts splits on ';' and executes
-- each statement individually (no wrapping transaction), so
-- CREATE INDEX CONCURRENTLY is safe to use here.
--
-- Rollback (DOWN):
--   DROP INDEX CONCURRENTLY IF EXISTS idx_users_referred_by_code_partial;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_positions_size_opened;
-- ============================================================

-- 1. Partial index on users.referred_by_code
--
-- Justification:
--   computeKOLLeaderboard filters users WHERE referred_by_code IS NOT NULL AND
--   referred_by_code <> '' on the 16,148-row users table, then groups by
--   referred_by_code. Without this index the planner issues a full sequential
--   scan (16,148 rows) to build the agg CTE. The partial condition eliminates
--   every row that is NULL or empty before the index is even consulted, so the
--   index is narrow (only referred users) and cheap to maintain.
--
--   The HAVING COUNT(*) >= 5 prune happens AFTER the GROUP BY aggregation;
--   the index does not change that ordering, but it eliminates the seq scan.
--
--   The KOL leaderboard is also used by computeChannelROI and
--   computeAttributionCoverage via the same column, giving the index two callers.
--
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_referred_by_code_partial
  ON users(referred_by_code)
  WHERE referred_by_code IS NOT NULL AND referred_by_code <> '';


-- 2. Partial composite index on positions(position_size_usd, opened_at)
--    WHERE position_size_usd >= 1000
--
-- Justification:
--   WHALE_SQL runs on every SSE connection poll (every 5 s, up to 10 concurrent
--   streams = 120 queries/min). The predicate is pos.position_size_usd >= 1000.
--   At 430 active positions today, ~10-20% are whale-sized (estimated 40-90 rows).
--   Without this index the executor performs a full seq scan on positions every
--   5 s per stream.
--
--   fetchInitialWhales appends ORDER BY pos.opened_at DESC LIMIT 20, so the
--   trailing column in the index (opened_at DESC) lets the planner satisfy both
--   the WHERE predicate and the ORDER BY from the index alone — no sort step.
--
--   pollNewWhales appends AND pos.opened_at > $1, which the (opened_at) portion
--   of the index accelerates.
--
--   The partial condition (position_size_usd >= 1000) keeps the index small:
--   it only indexes the rows the query will ever return, not the full table.
--   As positions grow historically, the full table grows but this index stays
--   proportional to whale positions only.
--
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_positions_size_opened
  ON positions(position_size_usd, opened_at DESC)
  WHERE position_size_usd >= 1000;


-- ============================================================
-- Rejected candidates (documented here for audit trail)
-- ============================================================
--
-- REJECTED: positions(wallet) for LEFT JOIN in computeWhaleOrigins vol CTE
--   idx_positions_wallet already exists (schema.sql line 115).
--   Status: PRESENT — no duplicate needed.
--
-- REJECTED: positions(opened_at) for computeChannelROI holders CTE
--   idx_positions_opened_at already exists (schema.sql line 118 +
--   007_badges_comprehensive.sql line 80). Status: PRESENT.
--
-- REJECTED: users(wallet) for JOIN in computeWhaleOrigins / computeChannelROI
--   users.wallet IS the PRIMARY KEY. B-tree index implicit. Status: PRESENT.
--
-- REJECTED: Additional index on attribution_events
--   No Sprint 3 query reads attribution_events directly without a WHERE on
--   profile_id or wallet. idx_ae_profile_event_time and idx_ae_wallet_event_time
--   (migration 017) already cover those paths. No additional index warranted.
--
-- ============================================================
