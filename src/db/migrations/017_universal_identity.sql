-- ============================================================
-- Migration 017: Universal Identity Layer
-- - user_profiles: unified identity entity (profile-primary)
-- - identity_links: stitching graph (N identities per profile)
-- - attribution_events: event log (write target)
-- - attribution_touches: multi-touch attribution
-- - users.user_profile_id: backwards-compat FK
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name      TEXT,
  primary_wallet    VARCHAR(64) NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_utm_source     TEXT,
  first_utm_medium     TEXT,
  first_utm_campaign   TEXT,
  first_utm_content    TEXT,
  first_utm_term       TEXT,
  first_referrer       TEXT,
  first_landing_path   TEXT,
  attribution_locked_at TIMESTAMPTZ,
  last_utm_source      TEXT,
  last_utm_medium      TEXT,
  last_utm_campaign    TEXT,
  wallet_type          TEXT,
  country_code         TEXT,
  merged_into_profile_id UUID REFERENCES user_profiles(profile_id),
  merge_evidence_id    BIGINT,
  merged_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_primary_wallet
  ON user_profiles(primary_wallet) WHERE merged_into_profile_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_first_utm
  ON user_profiles(first_utm_source) WHERE merged_into_profile_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON user_profiles(last_seen_at DESC);

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS chk_first_utm_lower;
ALTER TABLE user_profiles ADD CONSTRAINT chk_first_utm_lower
  CHECK (first_utm_source IS NULL OR first_utm_source = LOWER(first_utm_source));

CREATE TABLE IF NOT EXISTS identity_links (
  id                BIGSERIAL PRIMARY KEY,
  profile_id        UUID NOT NULL REFERENCES user_profiles(profile_id),
  identity_type     VARCHAR(32) NOT NULL,
  identity_value    TEXT NOT NULL,
  confidence        VARCHAR(16) NOT NULL,
  evidence_event_id BIGINT,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by         TEXT,
  unlinked_at       TIMESTAMPTZ,
  unlinked_by       TEXT,
  unlink_reason     TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique_active
  ON identity_links(identity_type, identity_value) WHERE unlinked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_links_profile
  ON identity_links(profile_id) WHERE unlinked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_links_linked_at
  ON identity_links(linked_at DESC);

CREATE TABLE IF NOT EXISTS attribution_events (
  id              BIGSERIAL PRIMARY KEY,
  event_name      TEXT NOT NULL,
  event_id        TEXT,
  profile_id      UUID REFERENCES user_profiles(profile_id),
  wallet          VARCHAR(64),
  ga_client_id    TEXT,
  session_id      TEXT,
  source          TEXT,
  medium          TEXT,
  campaign        TEXT,
  content         TEXT,
  term            TEXT,
  referrer        TEXT,
  landing_path    TEXT,
  asset           VARCHAR(64),
  value_usd       DECIMAL(18,4),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_name, event_id)
);

CREATE INDEX IF NOT EXISTS idx_ae_profile_event_time
  ON attribution_events(profile_id, event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_wallet_event_time
  ON attribution_events(wallet, event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_client_id_time
  ON attribution_events(ga_client_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_ae_source_time
  ON attribution_events(source, occurred_at);

CREATE TABLE IF NOT EXISTS attribution_touches (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    UUID REFERENCES user_profiles(profile_id),
  wallet        VARCHAR(64),
  source        TEXT,
  medium        TEXT,
  campaign      TEXT,
  touched_at    TIMESTAMPTZ NOT NULL,
  touch_index   INT NOT NULL,
  UNIQUE (profile_id, touch_index)
);

CREATE INDEX IF NOT EXISTS idx_at_profile_touch
  ON attribution_touches(profile_id, touched_at);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_users_profile
  ON users(user_profile_id);

COMMENT ON TABLE user_profiles IS 'Universal identity entity. One profile can link N wallets/socials/ga_client_ids. Profile-primary architecture.';
COMMENT ON TABLE identity_links IS 'Stitching graph. Each row = one piece of evidence that this profile owns this identifier.';
COMMENT ON TABLE attribution_events IS 'Event log. Source of truth for funnel/attribution reads.';
COMMENT ON TABLE attribution_touches IS 'Multi-touch attribution snapshot. One row per (profile, source, day-bucket).';
