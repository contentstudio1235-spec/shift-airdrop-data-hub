-- ============================================================
-- Migration 013: Add launch_multiplier_at_open snapshot column
-- 
-- Prevents future phase transition bugs by capturing the launch 
-- multiplier at the exact time a position is opened.
-- ============================================================

-- Add column to capture launch multiplier at position open time
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS launch_multiplier_at_open DECIMAL(5,2) DEFAULT 1.0;

-- Index for faster queries about positions opened at specific phase
CREATE INDEX IF NOT EXISTS idx_positions_launch_mult_at_open
ON positions(wallet, launch_multiplier_at_open);

-- Comment explaining the column
COMMENT ON COLUMN positions.launch_multiplier_at_open IS 
'Snapshot of launch phase multiplier (3.0/2.0/1.0) at time of position open. Prevents phase transition bugs where XP calculated at different multipliers.';

-- Add audit table for future launches
CREATE TABLE IF NOT EXISTS launch_phase_audit (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50),  -- 'config_created', 'config_updated', 'phase_transition'
  old_multiplier DECIMAL(5,2),
  new_multiplier DECIMAL(5,2),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

COMMENT ON TABLE launch_phase_audit IS 
'Track all launch config changes to detect when multipliers change mid-phase.';
