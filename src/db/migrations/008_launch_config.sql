-- ============================================================
-- Launch Configuration - Dynamic Phase Management
-- ============================================================
-- Enables real-time configuration of launch phases without code changes.
-- All timestamps are in UTC for consistency.

CREATE TABLE launch_config (
  id SERIAL PRIMARY KEY,

  -- Phase 1: Week 1 (3x multiplier)
  phase1_start_time TIMESTAMP NOT NULL,      -- UTC: May 26, 2026 00:00:00
  phase1_end_time TIMESTAMP NOT NULL,        -- UTC: June 2, 2026 15:00:00
  phase1_multiplier DECIMAL(6,4) DEFAULT 3.0,
  phase1_label VARCHAR(128) DEFAULT '🚀 LAUNCH WEEK',

  -- Phase 2: Week 2 (2x multiplier)
  phase2_start_time TIMESTAMP NOT NULL,      -- UTC: June 2, 2026 15:01:00
  phase2_end_time TIMESTAMP NOT NULL,        -- UTC: June 9, 2026 15:00:00
  phase2_multiplier DECIMAL(6,4) DEFAULT 2.0,
  phase2_label VARCHAR(128) DEFAULT '🔥 MOMENTUM WEEK',

  -- Phase 3: Week 3+ (1x multiplier)
  phase3_start_time TIMESTAMP NOT NULL,      -- UTC: June 9, 2026 15:01:00
  phase3_end_time TIMESTAMP,                 -- UTC: June 16, 2026 15:01:00 (optional)
  phase3_multiplier DECIMAL(6,4) DEFAULT 1.0,
  phase3_label VARCHAR(128) DEFAULT '⭐ STEADY STATE',

  -- Global config
  is_active BOOLEAN DEFAULT true,            -- Master toggle for launch bonuses
  launch_start_time TIMESTAMP NOT NULL,      -- Overall launch start (May 26, 2026 00:00:00 UTC)

  -- Metadata
  updated_by VARCHAR(64),                    -- Admin wallet who last updated
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable fast lookups by current phase
CREATE INDEX launch_config_times ON launch_config(phase1_start_time, phase1_end_time);

-- Audit trail for launch config changes
CREATE TABLE launch_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_wallet VARCHAR(64),
  action VARCHAR(64),                        -- 'phase_updated', 'toggle_active', 'time_adjusted'
  resource_type VARCHAR(32) DEFAULT 'launch_config',
  resource_id VARCHAR(16),                   -- 'phase1', 'phase2', 'phase3'
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default: Insert initial configuration (UTC times)
-- Phase 1: May 26, 2026 00:00 UTC → June 2, 2026 15:00 UTC (3x)
-- Phase 2: June 2, 2026 15:01 UTC → June 9, 2026 15:00 UTC (2x)
-- Phase 3: June 9, 2026 15:01 UTC → June 16, 2026 15:01 UTC (1x)
-- After June 6: No launch multiplier
INSERT INTO launch_config (
  phase1_start_time, phase1_end_time, phase1_multiplier, phase1_label,
  phase2_start_time, phase2_end_time, phase2_multiplier, phase2_label,
  phase3_start_time, phase3_end_time, phase3_multiplier, phase3_label,
  is_active, launch_start_time,
  created_at, updated_at
) VALUES (
  '2026-05-26 00:00:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  '2026-06-02 15:00:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  3.0,
  '🚀 LAUNCH WEEK',
  '2026-06-02 15:01:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  '2026-06-09 15:00:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  2.0,
  '🔥 MOMENTUM WEEK',
  '2026-06-09 15:01:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  '2026-06-16 15:01:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  1.0,
  '⭐ STEADY STATE',
  true,
  '2026-05-26 00:00:00+00'::TIMESTAMP WITH TIME ZONE AT TIME ZONE 'UTC',
  NOW(),
  NOW()
);

-- Comments
COMMENT ON TABLE launch_config IS 'Real-time launch phase configuration with UTC timestamps. Non-coders can adjust phases via admin panel.';
COMMENT ON COLUMN launch_config.is_active IS 'Master toggle: if false, no launch multiplier is applied (flat 1.0x for all phases)';
COMMENT ON COLUMN launch_config.launch_start_time IS 'Overall launch start time in UTC (used for phase calculations)';
COMMENT ON TABLE launch_config_audit IS 'Audit trail for all launch configuration changes (logs who changed what and when)';
