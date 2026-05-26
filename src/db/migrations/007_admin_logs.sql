-- ============================================================
-- Admin Logs - Comprehensive Audit Trail for All Admin Actions
-- ============================================================
-- This migration creates the foundation for tracking all admin panel changes
-- MUST RUN FIRST before any other admin features

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Admin who made the change
  admin_wallet VARCHAR(64) NOT NULL,

  -- What action was performed
  action VARCHAR(64) NOT NULL, -- 'badge_created', 'config_updated', 'certificate_awarded', 'event_created', etc.

  -- What resource was affected
  resource_type VARCHAR(32), -- 'badge', 'config', 'user', 'event', 'certificate', 'announcement', 'kol'
  resource_id VARCHAR(256), -- badge_name, config_key, wallet, event_id, certificate_id, etc.

  -- State change details
  old_value JSONB, -- Previous state (if applicable)
  new_value JSONB, -- New state (if applicable)

  -- Context
  reason TEXT, -- Why the change was made
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT, -- Browser info

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS admin_logs_resource_type ON admin_logs(resource_type);
CREATE INDEX IF NOT EXISTS admin_logs_resource_id ON admin_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS admin_logs_admin_wallet ON admin_logs(admin_wallet);
CREATE INDEX IF NOT EXISTS admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_resource_time ON admin_logs(resource_type, created_at DESC);

-- Add comments for clarity
COMMENT ON TABLE admin_logs IS 'Audit trail for all admin panel actions - immutable record of changes';
COMMENT ON COLUMN admin_logs.action IS 'Type of action: badge_created, config_updated, certificate_awarded, event_created, announcement_created, user_multiplier_changed, kol_added, kol_updated, etc.';
COMMENT ON COLUMN admin_logs.resource_type IS 'What was affected: badge, config, user, event, certificate, announcement, kol';
COMMENT ON COLUMN admin_logs.reason IS 'Required: why was this change made (for compliance and decision tracking)';
COMMENT ON COLUMN admin_logs.old_value IS 'JSON snapshot of previous state - useful for undoing or analyzing changes';
COMMENT ON COLUMN admin_logs.new_value IS 'JSON snapshot of new state - shows exactly what changed';

-- Optional: Add retention policy comment
-- In production, you may want to archive logs older than 90 days to a separate table
COMMENT ON COLUMN admin_logs.created_at IS 'When action occurred - used for chronological audit trail and archival policies';
