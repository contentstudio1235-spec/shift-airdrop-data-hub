-- ============================================================
-- Migration 017: P&L Fields — Add price tracking for P&L calculation
-- ============================================================

-- Add P&L tracking columns to positions table
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS price_at_close DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS close_value_usd DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP;

-- Index for backfill performance
CREATE INDEX IF NOT EXISTS idx_positions_extracted ON positions(wallet, extracted_at);

-- Log entry for backfill audit
INSERT INTO admin_logs (action, entity_type, details, performed_at)
SELECT
  'schema_migration',
  'positions',
  jsonb_build_object(
    'migration', '017_pnl_fields',
    'added_columns', ARRAY['price_at_close', 'close_value_usd', 'extracted_at'],
    'reason', 'Enable blockchain-backed P&L calculations'
  ),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_logs WHERE action = 'schema_migration' AND entity_type = 'positions');

-- Verification query
-- Run this to confirm columns exist:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'positions' AND column_name IN ('price_at_close', 'close_value_usd', 'extracted_at');
