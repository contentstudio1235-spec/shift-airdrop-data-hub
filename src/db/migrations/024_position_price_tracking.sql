-- ============================================================
-- Migration 024: Position Price Tracking
-- Adds close_price and close_token_amount columns so we can
-- accurately record what price and how many tokens were sold.
-- entry_price and current_price columns already exist.
-- ============================================================

-- Add close_price: price per token at the moment position was closed
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS close_price NUMERIC;

-- Add close_token_amount: how many tokens were sold when closing
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS close_token_amount NUMERIC;

-- Add close_value_usd: USD value at time of close (close_price × close_token_amount)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS close_value_usd NUMERIC;

-- Add last_price_update: timestamp of last current_price refresh
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP;

-- Index for fast price update queries (all open positions with a known mint)
CREATE INDEX IF NOT EXISTS idx_positions_open_mint
  ON positions (asset_mint)
  WHERE status = 'open' AND asset_mint IS NOT NULL;

-- Index for price health monitoring
CREATE INDEX IF NOT EXISTS idx_positions_no_entry_price
  ON positions (id)
  WHERE entry_price IS NULL AND status = 'open';

-- ── Backfill last_price_update for existing open positions ──
UPDATE positions
SET last_price_update = updated_at
WHERE status = 'open'
  AND last_price_update IS NULL
  AND updated_at IS NOT NULL;

COMMENT ON COLUMN positions.entry_price       IS 'Token price (USD) at the moment the position was opened';
COMMENT ON COLUMN positions.current_price     IS 'Latest token price (USD) — updated every 5 min by price cron';
COMMENT ON COLUMN positions.close_price       IS 'Token price (USD) at the moment the position was closed';
COMMENT ON COLUMN positions.close_token_amount IS 'Number of tokens sold when the position was closed';
COMMENT ON COLUMN positions.close_value_usd   IS 'USD value of the position at close (close_price × close_token_amount)';
COMMENT ON COLUMN positions.last_price_update IS 'Timestamp of last current_price refresh by price cron';
