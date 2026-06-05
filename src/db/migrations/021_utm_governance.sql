-- ============================================================
-- Migration 021: UTM Governance (Phase A)
-- ============================================================
-- Creates the four UTM governance tables:
--   1. utm_approved_sources  — allow-list for utm_source values
--   2. utm_approved_mediums  — allow-list for utm_medium values
--   3. utm_violations        — append-only log of every rejected/normalized UTM
--   4. campaigns             — campaign URL log (every URL Tomer creates)
--
-- Seeds initial approved sources + mediums from the A-Z doc section D.
--
-- Idempotent — safe to re-run. Migration runner splits statements on semicolons
-- and executes each individually (no wrapping transaction).
--
-- Rollback (DOWN):
--   DROP TABLE IF EXISTS campaigns;
--   DROP TABLE IF EXISTS utm_violations;
--   DROP TABLE IF EXISTS utm_approved_mediums;
--   DROP TABLE IF EXISTS utm_approved_sources;
-- ============================================================


-- ── 1. Approved utm_source values ────────────────────────────
-- Any value not in this table is rejected by the capture middleware and
-- logged to utm_violations. Exception process: PR to add a new row.
CREATE TABLE IF NOT EXISTS utm_approved_sources (
  source           TEXT PRIMARY KEY,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by         TEXT NOT NULL,
  channel_grouping TEXT NOT NULL,
  notes            TEXT
);


-- ── 2. Approved utm_medium values ────────────────────────────
-- Locked list from A-Z doc section D table. Aligns with GA4 default
-- channel groupings, plus the SHIFT-specific "kol" medium that rolls up
-- to Referral in GA4 custom channel groups.
CREATE TABLE IF NOT EXISTS utm_approved_mediums (
  medium           TEXT PRIMARY KEY,
  channel_grouping TEXT NOT NULL,
  notes            TEXT
);


-- ── 3. Violation log ──────────────────────────────────────────
-- Append-only feedback loop: marketing learns what's failing by
-- querying this table monthly. profile_id is nullable because the
-- violation can occur before the user is identified (pre-wallet-connect).
CREATE TABLE IF NOT EXISTS utm_violations (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  profile_id      UUID REFERENCES user_profiles(profile_id) ON DELETE SET NULL,
  raw_url         TEXT NOT NULL,
  rejected_field  TEXT NOT NULL CHECK (rejected_field IN ('utm_source','utm_medium','utm_campaign','utm_content','utm_term')),
  rejected_value  TEXT NOT NULL,
  reason          TEXT NOT NULL,
  raw_referrer    TEXT,
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_utm_violations_occurred_at ON utm_violations(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_violations_reason ON utm_violations(reason);


-- ── 4. Campaign log ───────────────────────────────────────────
-- Every URL the operator generates via the UTM Builder gets logged here
-- for cross-reference with utm_violations and analytics rollups.
CREATE TABLE IF NOT EXISTS campaigns (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  utm_source      TEXT NOT NULL,
  utm_medium      TEXT NOT NULL,
  utm_campaign    TEXT NOT NULL,
  utm_content     TEXT,
  utm_term        TEXT,
  notes           TEXT,
  budget_usd      NUMERIC,
  expected_reach  INT,
  full_url        TEXT NOT NULL,
  short_url       TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_utm_campaign ON campaigns(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(created_at DESC) WHERE is_archived = FALSE;


-- ── Seed: approved mediums (locked list) ──────────────────────
INSERT INTO utm_approved_mediums (medium, channel_grouping, notes) VALUES
  ('cpc',          'Paid Search',   'Google/Bing search ads'),
  ('paid-social',  'Paid Social',   'X/Twitter Ads, Reddit Ads, paid posts'),
  ('social',       'Organic Social','Unpaid social media posts'),
  ('referral',     'Referral',      'Partner referrals, guest posts, press'),
  ('email',        'Email',         'Email newsletters, drip campaigns'),
  ('kol',          'Referral',      'KOL personal posts — SHIFT-specific — rolls up to Referral in GA4 custom channel'),
  ('affiliate',    'Affiliates',    'Affiliate partner links'),
  ('qr',           'Offline',       'QR codes on physical materials'),
  ('display',      'Display',       'Banner / programmatic display')
ON CONFLICT (medium) DO NOTHING;


-- ── Seed: approved sources (initial) ──────────────────────────
-- The exception process (PR to add a new source) lives in
-- docs/design/2026-06-05-utm-attribution-a-to-z.md section I.
INSERT INTO utm_approved_sources (source, added_by, channel_grouping, notes) VALUES
  ('twitter',        'system', 'Social',   'X / Twitter, paid or organic — distinguish via utm_medium'),
  ('discord',        'system', 'Social',   'Discord server posts'),
  ('telegram',       'system', 'Social',   'Telegram channel posts'),
  ('reddit',         'system', 'Social',   'Reddit posts or ads'),
  ('youtube',        'system', 'Video',    'YouTube video descriptions / shorts'),
  ('medium',         'system', 'Referral', 'Medium articles, byline links'),
  ('linkedin',       'system', 'Social',   'LinkedIn organic or ads — distinguish via utm_medium'),
  ('hackernoon',     'system', 'Referral', 'Crypto press posts'),
  ('coingecko',      'system', 'Referral', 'CoinGecko listing pages'),
  ('coinmarketcap',  'system', 'Referral', 'CoinMarketCap listing pages'),
  ('direct',         'system', 'Direct',   'Reserved fallback — should DECREASE as discipline improves'),
  ('snag-referrals', 'system', 'Referral', 'Programmatic rollup from Snag 6-char referral codes')
ON CONFLICT (source) DO NOTHING;


COMMENT ON TABLE utm_approved_sources IS 'Allow-list for utm_source. Exception process: PR to docs/design/2026-06-05-utm-attribution-a-to-z.md + migration.';
COMMENT ON TABLE utm_approved_mediums IS 'Locked list of utm_medium values aligned to GA4 channel groupings (plus SHIFT-specific kol).';
COMMENT ON TABLE utm_violations IS 'Append-only feedback log of UTM values that failed validation. Query monthly to inform allow-list updates.';
COMMENT ON TABLE campaigns IS 'Operator-created campaign URL log. Every URL built via the UTM Builder is recorded here.';
