-- ============================================================
-- Migration: SNAG Badge Mapping
-- ============================================================
-- Maps SHIFT badge names to SNAG badge IDs for syncing

CREATE TABLE IF NOT EXISTS snag_badge_mapping (
  id SERIAL PRIMARY KEY,
  shift_badge_name VARCHAR(128) UNIQUE NOT NULL,
  snag_badge_id VARCHAR(256) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS snag_badge_mapping_shift_name ON snag_badge_mapping(shift_badge_name);
