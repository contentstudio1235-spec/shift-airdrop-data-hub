# SHIFT RWA — Conversion Tracking & Attribution Architecture
**Author:** Paid Media Tracking & Measurement Specialist Agent
**Date:** 2026-06-02
**Status:** Draft v1 — ready for engineering implementation
**Consumed by:** Growth Hacker agent, Backend engineering, Frontend engineering

---

## TL;DR

SHIFT RWA's measurement system is currently single-touch (only `users.referred_by_code`) and stitches identity at only 22%. This document defines: (1) a canonical UTM schema, (2) a server-side event spec keyed off existing webhook handlers, (3) an identity-stitching plan to push attribution coverage from 22% to 60%+, (4) database migrations for first-touch and multi-touch attribution, (5) GA4 custom dimension registration, (6) a sequenced ship-list, and (7) a privacy posture appropriate for a Solana wallet audience.

The core idea: **treat the Solana wallet pubkey as the durable user identity, treat the GA4 `client_id` / `user_id` as the session identity, and stitch them at `wallet_connect` time** via GA4 Measurement Protocol + a server-side `attribution_events` table. Everything else (funnels, ROI, whale origins) becomes derivable from that one stitch.

---

## 1. UTM Schema Standardization

### 1.1 Why this matters first

The 11 new backend endpoints (`/api/funnels/*`, `/api/attribution/*`, `/api/cohorts/:dim`, `/api/stream/whales`) all need a normalized `source` value to group on. If marketing pushes `twitter`, `Twitter`, `tw`, and `x.com` on the same day, every funnel breaks. Lock the taxonomy before any new link goes out.

### 1.2 `utm_source` — canonical values

Lowercase, snake_case, no spaces. Enforced in DB via a CHECK constraint (Section 4) and validated server-side on landing.

| Channel | `utm_source` | Notes |
|---|---|---|
| X / Twitter (official @shiftrwa) | `twitter` | Always `twitter`, never `x` — keeps history consistent across the rename. |
| Discord (official server) | `discord` | |
| Telegram (alpha + announcements) | `telegram` | |
| Reddit organic posts | `reddit` | |
| Reddit paid (if launched) | `reddit_ads` | |
| KOL referral | `kol_<code>` | e.g. `kol_alphawhale`, `kol_solbeach`. Code lowercased, matches `users.referred_by_code`. |
| Email (newsletter) | `email` | |
| Email (transactional broadcast) | `email_txn` | |
| Direct / typed URL | `direct` | Set server-side when no `utm_source` and no `document.referrer` from a known channel. |
| Organic search | `google`, `duckduckgo`, `brave` | Match GA4 default channel grouping. |
| Paid search (future) | `google_ads`, `bing_ads` | |
| Solana ecosystem partner | `solana`, `helius`, `jupiter`, `phantom` | |
| Podcast / YouTube interview | `podcast_<show>`, `yt_<channel>` | e.g. `podcast_bankless`, `yt_coinbureau` |
| Substack / blog mentions | `substack_<author>`, `blog_<domain>` | |

### 1.3 `utm_medium` — fixed taxonomy

Pick from this set. Anything not in the set gets bucketed as `other` in reports and flagged in `admin_logs`.

| Value | Meaning |
|---|---|
| `social` | Organic social posts (twitter, discord, telegram, reddit) |
| `paid_social` | Paid social ads |
| `referral` | KOL referrals, partner links, friend invites |
| `email` | Email campaigns |
| `cpc` | Paid search |
| `organic` | Organic search |
| `display` | Banner / display ads |
| `affiliate` | Affiliate networks (future) |
| `community` | Discord/Telegram inside-channel announcements |
| `event` | Conference QR codes, IRL activations |
| `podcast` | Podcast mentions |
| `pr` | Press / earned media |

### 1.4 `utm_campaign` — naming convention

Format: `{yyyymm}_{objective}_{descriptor}`

- `yyyymm` — year+month launch (e.g. `202606`)
- `objective` — one of: `acq` (acquisition), `act` (activation/first trade), `ret` (retention), `whale` (whale targeting), `airdrop`, `loyalty`, `launch_<token>` (token launches like `launch_tsl2l`)
- `descriptor` — short slug for the campaign theme

**Examples:**
- `202606_acq_tsla_split_news` — June 2026 acquisition push around TSLA split
- `202606_whale_tsl2l_5x_promo` — Whale-focused push for TSL2L
- `202607_launch_sox3l_ama` — SOX3L launch AMA
- `202606_loyalty_streak_30day` — Loyalty push for 30-day streaks
- `202606_act_kyc_completion` — Activation push to push users through KYC

### 1.5 `utm_content` and `utm_term`

- **`utm_content`** — creative variant. Format: `{format}_{variant}`. Examples: `tweet_a`, `tweet_b`, `thread_long`, `vid_30s`, `banner_dark`, `dm_template_1`. Critical for A/B testing creative.
- **`utm_term`** — keyword OR audience segment. For paid search, this is the bid keyword. For KOL pushes, use audience descriptor (e.g. `term=whale_solana`, `term=tsla_holders`). Leave blank if not applicable.

### 1.6 Copy-pasteable URL builder pattern

Build a single endpoint the team uses to generate links — **never hand-type UTMs**. Recommend hosting at `https://shiftrwa.xyz/go` (or as a Notion-embedded form):

```
https://shiftrwa.xyz/?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}&utm_term={term}&ref={kol_code_if_applicable}
```

**Concrete examples:**

```
# KOL drop (AlphaWhale)
https://shiftrwa.xyz/?utm_source=kol_alphawhale&utm_medium=referral&utm_campaign=202606_acq_tsla_split_news&utm_content=tweet_a&utm_term=whale_solana&ref=alphawhale

# Official Twitter announcement
https://shiftrwa.xyz/?utm_source=twitter&utm_medium=social&utm_campaign=202607_launch_sox3l_ama&utm_content=thread_long

# Discord pinned post
https://shiftrwa.xyz/?utm_source=discord&utm_medium=community&utm_campaign=202606_loyalty_streak_30day&utm_content=announcement

# Podcast mention (Bankless)
https://shiftrwa.xyz/?utm_source=podcast_bankless&utm_medium=podcast&utm_campaign=202606_acq_episode_417&utm_content=midroll
```

Build the URL-builder as a tiny page in the admin UI at `/admin/utm-builder` that copies to clipboard. Validate against the canonical list — if anyone types `Twitter` it auto-coerces to `twitter`.

### 1.7 Short-link service (recommended)

Use `https://shft.link/{slug}` (or similar) to wrap long URLs for Twitter/Telegram. Two reasons: (a) Twitter strips long UTMs from preview cards, (b) you get a redirect log row server-side that captures `IP`, `User-Agent`, `referer` for fraud detection. The redirect handler writes to `attribution_events` (Section 4) before the 302.

---

## 2. Server-Side Event Spec

The strategic shift: **stop relying on the client to fire conversion events.** Wallets, mobile browsers, and ad blockers eat client events for breakfast. Fire conversion events from the backend where you already have the truth (positions, badges, KYC status).

### 2.1 Events to fire — full catalog

| Event Name | Trigger Location | When | Required Properties |
|---|---|---|---|
| `landing` | Frontend (Next.js middleware or `app/layout.tsx`) | First request, captures UTMs | `client_id`, `session_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer`, `landing_path`, `ts` |
| `wallet_connect` | Frontend → POST `/api/track/wallet_connect` | When user signs Solana wallet message | `wallet`, `client_id`, `chain`, `wallet_type` (phantom/solflare/backpack), `ts` |
| `register` | Backend `POST /api/users` route handler | First time wallet hits backend | `wallet`, `client_id`, `referred_by_code`, `first_utm_*`, `ts` |
| `kyc_start` | Backend on KYC provider webhook (or `POST /api/kyc/start`) | KYC flow initiated | `wallet`, `kyc_provider`, `ts` |
| `kyc_complete` | Backend on KYC provider webhook | KYC approved | `wallet`, `kyc_provider`, `outcome`, `ts` |
| `first_trade` | Backend in Helius webhook handler | First time a wallet's `positions.opened_at` row is INSERTed | `wallet`, `asset`, `position_size_usd`, `ts`, **`is_first_trade: true`** |
| `position_open` | Backend in Helius webhook handler | Every position open | `wallet`, `asset`, `position_size_usd`, `position_id`, `leverage`, `ts` |
| `position_close` | Backend in Helius webhook handler | Position closed | `wallet`, `asset`, `position_size_usd`, `pnl_usd`, `hold_duration_sec`, `ts` |
| `whale_threshold_hit` | Backend in Helius webhook handler | Wallet cumulative volume crosses $1k / $10k / $100k | `wallet`, `tier`, `cumulative_volume_usd`, `ts` |
| `badge_earn` | Backend in Snag webhook handler | Snag fires badge-earned event | `wallet`, `badge_id`, `badge_name`, `xp_awarded`, `ts` |
| `snag_link` | Backend at `users.snag_user_id` UPDATE | When `snag_user_id` is first populated for a wallet | `wallet`, `snag_user_id`, `ts` |
| `cert_issued` | Backend on certificate INSERT | New certificate issued | `wallet`, `cert_id`, `cert_type`, `ts` |
| `airdrop_claim` | Backend on claim handler | User claims SHIFT tokens | `wallet`, `claim_amount`, `claim_multiplier`, `ts` |
| `churn_risk` | Cron (nightly) | Wallet inactive 14+ days after first_trade | `wallet`, `days_inactive`, `last_trade_at` |
| `reactivation` | Backend in Helius webhook handler | Inactive wallet trades again after 30+ day gap | `wallet`, `days_dormant`, `ts` |

### 2.2 Two delivery channels for every server-side event

Every event above must be sent to **both** GA4 and the internal `attribution_events` table.

**Channel A — GA4 Measurement Protocol v2** (server → GA4)
- Endpoint: `https://www.google-analytics.com/mp/collect?measurement_id=G-16YK1Q7QHD&api_secret=<MP_SECRET>`
- POST body shape:
  ```
  {
    "client_id": "<the same client_id captured at landing>",
    "user_id": "<wallet pubkey, base58>",
    "events": [{
      "name": "first_trade",
      "params": {
        "asset": "TSL2L",
        "position_size_usd": 142.50,
        "currency": "USD",
        "value": 142.50,
        "session_id": "<from cookie>",
        "engagement_time_msec": 1
      }
    }]
  }
  ```
- `api_secret` is generated in GA4 admin → Data Streams → web → Measurement Protocol API secrets. Store as `GA4_MP_API_SECRET` env var.
- Crucial: include `engagement_time_msec: 1` or GA4 silently drops the event from realtime.
- Use `value` + `currency` so GA4 treats it as a monetized event.

**Channel B — Internal `attribution_events` table** (Section 4.2)
- Write a single row with the event name, wallet, source, timestamp, raw JSON payload.
- This is the source of truth for the new `/api/funnels/*` endpoints — do not rely on GA4 for funnels, GA4 lags and samples.

### 2.3 Where to wire each event (concrete integration points)

Based on the existing codebase structure:

| Event | File / Handler |
|---|---|
| `landing` | New Next.js middleware at `frontend/middleware.ts` — reads UTMs from `req.nextUrl.searchParams`, sets a `shift_session` cookie with a UUID, fires Beacon to `POST /api/track/landing`. |
| `wallet_connect` | Frontend wallet adapter callback → `POST /api/track/wallet_connect`. New route in `src/routes/track.ts`. |
| `register` | `src/routes/admin.ts` or wherever the user-INSERT happens. Wrap the INSERT in a function that also calls `emitEvent('register', ...)`. |
| `kyc_start` / `kyc_complete` | KYC provider webhook handler (new route `src/routes/kyc-webhook.ts`). |
| `first_trade`, `position_open`, `position_close`, `whale_threshold_hit`, `reactivation` | Existing Helius webhook handler. After validating `HELIUS_WEBHOOK_SECRET`, dispatch to `emitEvent(...)` for each trade-derived event. |
| `badge_earn`, `snag_link` | Existing Snag webhook handler. |
| `cert_issued` | Wherever `user_certificates` rows are INSERTed (likely `src/routes/admin.ts`). |
| `airdrop_claim` | Wherever claim handler lives. |
| `churn_risk` | New cron job in `src/cron/churn-detector.ts`, run hourly. |

### 2.4 Code-shape recommendation (not code — shape only)

Centralize in `src/lib/tracking.ts`:

- `emitEvent(eventName, wallet, properties)` — single entrypoint. It:
  1. Resolves `client_id` from `users.ga_client_id` (new column, Section 4.1) given the wallet.
  2. Resolves first-touch UTMs from `users.first_utm_*` (Section 4.1).
  3. Writes to `attribution_events` table with the full payload.
  4. POSTs to GA4 Measurement Protocol with `client_id` + `user_id` (the wallet).
  5. If `client_id` is null (no stitch yet), still writes to `attribution_events` with `client_id = null` — these become backfill targets.
- `emitEvent` must be **non-blocking** — wrap in `setImmediate` or use a lightweight queue (a Postgres `LISTEN/NOTIFY` worker, or just a fire-and-forget Promise with logged failures). Trade webhooks cannot wait on GA4 RTT.
- Add idempotency: every event takes an optional `event_id` (we already have `position_id` for trade events; use `position_id` as the dedup key). The `attribution_events` table gets a UNIQUE constraint on `(event_name, event_id)`.

### 2.5 Required properties — the non-negotiable minimum

Every event payload, regardless of which event, must carry:

- `wallet` (where applicable — null for pre-connect events)
- `client_id` (GA4 client ID)
- `session_id` (the shift_session UUID)
- `ts` (ISO8601 server time)
- `event_id` (idempotency key)
- `source` (the resolved `utm_source` — either current session's UTMs or the wallet's first-touch UTMs)

This shape makes the funnel endpoints trivial to write — they all group by `source`, filter by date range, and count distinct wallets.

---

## 3. Identity Stitching Plan — 22% → 60%+

### 3.1 The current stitch model (broken)

Today, `users.ga_user_id` is presumably set when a user does some action that ties them to a GA event. Coverage is 22% because: (a) most users connect a wallet from mobile where third-party cookies are dead, (b) `ga_user_id` is probably being read from a client-side gtag context that didn't get populated, (c) Solana wallet popups break the GA session continuity.

### 3.2 New stitch model — wallet as the durable ID

Use the wallet pubkey as the `user_id` everywhere, and capture the `client_id` at the FIRST moment we can — even before wallet connect.

**Sequenced steps:**

**Step 1: Capture `client_id` on every landing, store in a first-party cookie + DB row.**
- On `landing` (Section 2), call `gtag('get', 'G-16YK1Q7QHD', 'client_id', cb)` client-side, write to a first-party cookie `shift_cid` (1 year, SameSite=Lax, HttpOnly=false because gtag needs it).
- Also POST `client_id` + `session_id` + UTMs to `POST /api/track/landing`. Backend INSERTs into `attribution_events` with `wallet = NULL, client_id = '<cid>'`.

**Step 2: At `wallet_connect`, bind wallet to client_id.**
- Frontend wallet adapter triggers a `personal_sign` of a nonce.
- After signature verification, frontend POSTs `{ wallet, client_id, session_id }` to `POST /api/track/wallet_connect`.
- Backend:
  1. UPSERTs `users` row with `wallet`.
  2. Sets `users.ga_client_id = client_id` (new column, Section 4.1).
  3. UPDATEs all previous `attribution_events` rows where `client_id = '<cid>'` AND `wallet IS NULL` to set `wallet = '<wallet>'`. **This backfills the entire pre-connect history for that user.**
  4. Sets `users.first_utm_*` from the earliest `attribution_events` row for that `client_id` (if not already set).
  5. Fires GA4 Measurement Protocol `wallet_connect` with `user_id = <wallet>` so GA4 also stitches.

**Step 3: Push the wallet to gtag as `user_id` for client-side continuity.**
- Immediately after wallet connect on the frontend:
  ```js
  gtag('set', { user_id: walletPubkey });
  gtag('event', 'wallet_connect', { wallet: walletPubkey });
  ```
- This makes every subsequent client-side GA4 event carry the wallet as `user_id`. GA4 will retroactively stitch the session.

**Step 4: Reverse stitch on return visits.**
- On every landing, frontend reads `shift_cid` cookie. POSTs to `POST /api/track/landing` with `client_id`.
- Backend looks up `users` WHERE `ga_client_id = '<cid>'`. If found, sets `user_id = wallet` on the GA4 event and on the `attribution_events` row.
- This covers the user who clears their wallet but keeps cookies.

**Step 5: Snag-side stitch.**
- When Snag webhook fires (`badge_earn`, etc.), it carries `snag_user_id`. Existing `users.snag_user_id` column is the bridge. Add: when Snag webhook arrives for a wallet that has no `ga_client_id`, look up by `snag_user_id`, fill in wallet. When wallet connects but Snag isn't yet linked, push the `client_id` to Snag's external attributes API so Snag knows the same user.

**Step 6: Backfill the 78%.**
- Run a one-time job: for every `users` row with `ga_user_id IS NULL`, look in `attribution_events` for any row with the same wallet (will exist after Step 2 is deployed for new users). For legacy users with no events, set `first_utm_source = 'unknown_legacy'` and accept the loss — these are sunk cost.
- For new users post-deployment, this stitch path should approach 100% of wallet-connected users; even the 22% baseline is wrong because wallet connect IS the moment of stitch. After this fix, ANY user who connects a wallet is stitched. The remaining gap (sub-100%) is users who land but never connect — those stay attributed by `client_id` only.

### 3.3 What 60%+ actually means

Realistic targets:

- **Wallet-connected users:** 95-100% stitched (every wallet connect writes both `ga_client_id` and `user_id`).
- **Pre-connect visitors:** ~70% stitched (cookie blockers and Brave-with-shields drop ~30%).
- **Blended across all GA4 users:** 60-75%, depending on the connect rate (currently 22% wallet connect ÷ landing implies a low connect rate, so the blended number will be lower than 60% until activation improves).
- The 22% number is misleading. The real KPI to track post-launch is **% of wallet-connected users with non-null `first_utm_source`** — that should be 95%+.

### 3.4 Privacy boundary

The `user_id` we send to GA4 is the wallet pubkey. Wallet pubkeys are public on-chain, but Google's policy bars sending PII. Treat the pubkey as a pseudonymous ID — it is not PII under GA4's definition. Document this in the privacy policy as "pseudonymous wallet identifier."

---

## 4. Storage Schema Additions

### 4.1 New columns on `users`

```
ALTER TABLE users
  ADD COLUMN ga_client_id           TEXT,
  ADD COLUMN first_utm_source       TEXT,
  ADD COLUMN first_utm_medium       TEXT,
  ADD COLUMN first_utm_campaign     TEXT,
  ADD COLUMN first_utm_content      TEXT,
  ADD COLUMN first_utm_term         TEXT,
  ADD COLUMN first_seen_at          TIMESTAMPTZ,
  ADD COLUMN first_referrer         TEXT,
  ADD COLUMN first_landing_path     TEXT,
  ADD COLUMN last_utm_source        TEXT,        -- for last-touch attribution
  ADD COLUMN last_utm_medium        TEXT,
  ADD COLUMN last_utm_campaign      TEXT,
  ADD COLUMN last_seen_at           TIMESTAMPTZ,
  ADD COLUMN wallet_type            TEXT,        -- phantom / solflare / backpack / other
  ADD COLUMN country_code           TEXT,        -- ISO 3166-1 alpha-2, set from IP on landing (do NOT store IP)
  ADD COLUMN attribution_locked_at  TIMESTAMPTZ; -- first_utm_* immutable after this timestamp

CREATE INDEX idx_users_ga_client_id    ON users (ga_client_id);
CREATE INDEX idx_users_first_utm_source ON users (first_utm_source);
CREATE INDEX idx_users_first_seen_at   ON users (first_seen_at);
```

Notes:
- `first_utm_*` columns are write-once. Code path: `IF first_utm_source IS NULL THEN SET ...`. Once `attribution_locked_at` is set, never overwrite.
- `last_utm_*` mutates on every visit — useful for last-touch reports and for re-engagement campaign attribution.
- `country_code` is derived from IP at landing and stored; the raw IP is NEVER persisted (Section 7).

### 4.2 New `attribution_events` table

```
CREATE TABLE attribution_events (
  id              BIGSERIAL PRIMARY KEY,
  event_name      TEXT NOT NULL,
  event_id        TEXT,                          -- idempotency key (e.g. position_id, claim_id)
  wallet          TEXT,                          -- nullable: pre-connect events have no wallet
  ga_client_id    TEXT,                          -- always set when we have it
  session_id      TEXT,
  source          TEXT,                          -- resolved utm_source for this event
  medium          TEXT,
  campaign        TEXT,
  content         TEXT,
  term            TEXT,
  referrer        TEXT,
  landing_path    TEXT,
  asset           TEXT,                          -- for trade events
  value_usd       NUMERIC(18,4),                 -- monetized event value
  payload         JSONB NOT NULL,                -- full event properties
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_name, event_id)
);

CREATE INDEX idx_ae_wallet_event_time   ON attribution_events (wallet, event_name, occurred_at DESC);
CREATE INDEX idx_ae_client_id_time      ON attribution_events (ga_client_id, occurred_at);
CREATE INDEX idx_ae_source_time         ON attribution_events (source, occurred_at);
CREATE INDEX idx_ae_event_name_time     ON attribution_events (event_name, occurred_at);
```

This table is the source of truth for funnel queries. Every `/api/funnels/*` endpoint reduces to SELECTs against this table grouped by `source` and `occurred_at` buckets.

### 4.3 New `attribution_touches` table (multi-touch)

Optional but recommended for the `/api/attribution/channel-roi` endpoint:

```
CREATE TABLE attribution_touches (
  id            BIGSERIAL PRIMARY KEY,
  wallet        TEXT,
  ga_client_id  TEXT,
  source        TEXT,
  medium        TEXT,
  campaign      TEXT,
  touched_at    TIMESTAMPTZ NOT NULL,
  touch_index   INT NOT NULL,                    -- 1 = first, N = latest
  UNIQUE (wallet, touch_index)
);

CREATE INDEX idx_at_wallet_touch ON attribution_touches (wallet, touched_at);
```

Insert one row per unique `(wallet, source, day-bucket)` so the table doesn't explode. Powers position-based attribution (first-touch 40%, last-touch 40%, middle 20%) and linear attribution out of the box.

### 4.4 Validation constraint on UTM source

```
ALTER TABLE users
  ADD CONSTRAINT chk_first_utm_source_lower
  CHECK (first_utm_source = lower(first_utm_source));
```

Stops `Twitter` and `TWITTER` from polluting the dataset.

### 4.5 Migration sequence

1. Create `attribution_events` table.
2. Create `attribution_touches` table.
3. ALTER `users` to add new columns (nullable — never NOT NULL on existing tables).
4. Backfill `first_seen_at` from `users.created_at` for legacy rows.
5. Deploy the `emitEvent` helper.
6. Deploy `/api/track/landing` and `/api/track/wallet_connect`.
7. Wire Helius and Snag webhook handlers to call `emitEvent`.
8. Run the one-time backfill job from Section 3.2 Step 6.

---

## 5. GA4 Custom Dimensions

Register these in GA4 admin → Custom definitions. Both `event-scoped` and `user-scoped` are noted per row. (Reminder: GA4 caps free properties at 50 event-scoped + 25 user-scoped dimensions. We're nowhere near that.)

| Dimension Name | Parameter Name | Scope | Description |
|---|---|---|---|
| Wallet | `wallet` | User | Solana pubkey, base58. Set via `user_id` and also as user property. |
| Wallet Type | `wallet_type` | User | phantom / solflare / backpack |
| First UTM Source | `first_utm_source` | User | Set once at wallet_connect from `users.first_utm_source` |
| First UTM Medium | `first_utm_medium` | User | Same |
| First UTM Campaign | `first_utm_campaign` | User | Same |
| KOL Referral Code | `kol_code` | User | From `users.referred_by_code` |
| Snag User ID | `snag_user_id` | User | For cross-product cohort building |
| Asset | `asset` | Event | TSL2L / TSL1S / SOX3L / SOX3S / SPX3L / SPX3S |
| Position Size USD | `position_size_usd` | Event | For trade events |
| PnL USD | `pnl_usd` | Event | For position_close |
| Leverage | `leverage` | Event | 2 / 3 / 5 |
| Is First Trade | `is_first_trade` | Event | Boolean flag on first_trade — useful for new-user trade ratio |
| Whale Tier | `whale_tier` | Event | bronze / silver / gold / whale |
| Badge Name | `badge_name` | Event | For badge_earn |
| Cert Type | `cert_type` | Event | For cert_issued |
| Campaign Objective | `campaign_objective` | Event | Extracted from `utm_campaign` middle segment (acq/act/whale/etc.) |
| Session Source Override | `session_source_override` | Event | When the session source differs from first-touch — flags re-engagement |

### Mapping to internal events

- `wallet`, `first_utm_*`, `wallet_type` → set as **user properties** at `wallet_connect` via `gtag('set', 'user_properties', {...})`. Also set on every Measurement Protocol call via `user_properties` payload key.
- `asset`, `position_size_usd`, `pnl_usd`, `is_first_trade` → set as **event parameters** on `first_trade` / `position_open` / `position_close`.
- `kol_code` → set as user property at register time. Also sets up a GA4 audience: "KOL-referred users."

### How to register in GA4 admin

1. Admin → Property Settings → Data display → Custom definitions.
2. Click "Create custom dimensions."
3. For each row above: Dimension name (human-readable), Scope (Event or User), Description (paste from table), Event parameter / User property (the parameter name from column 2).
4. Save. Allow 24 hours before the dimension is queryable in Explorations.

---

## 6. Sequenced "Wire Up First" Checklist

Effort: S = <2h, M = 2-8h, L = 1-3 days. Impact: H = unblocks multiple funnels / channels, M = single channel, L = nice-to-have.

| # | Step | Effort | Impact |
|---|---|---|---|
| 1 | Publish the canonical UTM taxonomy doc (Section 1) to the team's Notion + Discord. Lock it. | S | H — stops new bad data immediately. |
| 2 | Run the migrations in Section 4.5 (steps 1-4). Schema-only, zero risk. | S | H — unblocks everything downstream. |
| 3 | Generate the GA4 Measurement Protocol API secret. Store as `GA4_MP_API_SECRET` env var on Render. | S | H — required for every server-side event. |
| 4 | Register all custom dimensions in GA4 admin (Section 5). | M | H — without these the events still fire but reports can't slice. |
| 5 | Ship `src/lib/tracking.ts` with the `emitEvent` helper. Non-blocking, logged failures, idempotent. | M | H — single integration point for all events. |
| 6 | Ship `frontend/middleware.ts` to capture UTMs + set `shift_session` cookie + fire `landing` event. | M | H — turns the firehose of anonymous traffic into attributable data. |
| 7 | Ship `POST /api/track/landing` and `POST /api/track/wallet_connect` routes. | M | H — this is the stitch point. |
| 8 | Wire the Helius webhook handler to fire `first_trade`, `position_open`, `position_close`, `whale_threshold_hit`. Use `position_id` as `event_id` for idempotency. | M | H — first_trade IS the primary conversion. |
| 9 | Wire Snag webhook to fire `badge_earn`, `snag_link`. | S | M — feeds the loyalty funnel. |
| 10 | Ship the admin UTM-builder UI at `/admin/utm-builder`. | M | H — operationally prevents UTM drift. |
| 11 | Ship the one-time backfill job (Section 3.2 Step 6) for legacy users. | S | M — recovers some history from existing data. |
| 12 | Wire `kyc_start` / `kyc_complete` via KYC provider webhook. | M | M — necessary for the activation funnel. |
| 13 | Ship the `attribution_touches` insertion logic in `emitEvent`. | S | M — unlocks multi-touch attribution. |
| 14 | Build the `churn_risk` nightly cron. | S | L — feeds retention funnel; can wait until day 30 of data. |
| 15 | Add `country_code` derivation from IP (server-side, do NOT persist IP). | S | L — useful for geo cohorts, GDPR signaling. |

Ship steps 1-9 in the first week. By end of week 1 every new user has full attribution; by end of week 2 funnel endpoints can return real numbers.

---

## 7. Privacy / Compliance Notes

### 7.1 Posture

SHIFT RWA serves a global crypto audience. Treat GDPR (EU), UK GDPR, CCPA (California), and LGPD (Brazil) as in-scope. Wallet users are unusually privacy-aware — getting this wrong costs trust, not just legal exposure.

### 7.2 GA4 Consent Mode v2 — required

Implement Google Consent Mode v2 on the frontend:

- Default `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` to `denied` until consent banner action.
- On consent: `gtag('consent', 'update', { analytics_storage: 'granted', ... })`.
- Use a consent banner that's region-aware (display in EU/UK/CA, skip elsewhere — handled automatically by tools like Cookiebot, Osano, or a custom Next.js component reading Cloudflare's `CF-IPCountry` header).

When consent is denied, GA4 still receives cookieless pings — useful for modeled conversions and aggregated traffic counts, but no `client_id` is persisted. For our purposes this means we lose the stitch for ~30% of EU traffic. Acceptable.

### 7.3 What to track without consent

Server-side `attribution_events` writes can proceed regardless of consent state for **operationally necessary** events (`first_trade`, `position_open` — these are the user's own on-chain actions that we need for ledger integrity). Mark these as "legitimate interest" in the privacy policy. Marketing events (`landing` without wallet) require consent.

### 7.4 What to NEVER track

- **Raw IP address.** Derive country at landing, then drop the IP. Never write IP to `attribution_events.payload` or any persistent store.
- **Email addresses in clear text.** If we ever take an email, hash with SHA-256 before storing for matching purposes (mirror enhanced conversions pattern).
- **Wallet balance details beyond the platform's tokens.** We can see other holdings via Helius — do NOT log or transmit them.
- **Personally identifying messages** signed by the wallet beyond the connect nonce.
- **Device fingerprints** (canvas fingerprinting, font enumeration, etc.). Pubkey + cookie is sufficient.

### 7.5 Cookie inventory

| Cookie | Purpose | Duration | Consent class |
|---|---|---|---|
| `shift_session` | Session UUID for event correlation | Session | Strictly necessary |
| `shift_cid` | GA4 client_id mirror for server-side stitching | 1 year | Analytics |
| `_ga`, `_ga_*` | GA4 client_id, session_id | 2 years | Analytics |
| `shift_consent` | Stores consent decision | 1 year | Strictly necessary |

Document each in the privacy policy with the table above.

### 7.6 Data subject rights

- **Right to access:** On request, return all `attribution_events` rows for `wallet = <pubkey>`. Build endpoint `GET /api/admin/user-data-export?wallet=<x>` gated by admin passcode.
- **Right to deletion:** On request, set `users.deletion_requested_at`, run a nightly job that NULLs PII fields and deletes `attribution_events` for that wallet. Keep on-chain trade records (those are public on Solana anyway, but we don't have to mirror them).
- **Right to opt-out of sale:** We don't sell data. Document that in the privacy policy.

### 7.7 Solana wallet audience — the cultural read

This audience runs Brave, uses ad blockers, sets DNS-level blocking, and views every cookie banner with suspicion. Implications:

- Server-side first. Client-side tracking will lose 30-50%.
- Don't show a sticky cookie banner — use a one-line bottom bar, dismissable, that respects the choice for a year.
- Be transparent in the banner: "We use cookies to attribute traffic to our community channels (X, Discord, etc.). No third-party sharing." Conversion rate on consent is meaningfully higher with that copy than the generic "we and our 847 partners" boilerplate.
- Phantom and Solflare in-app browsers strip referrers aggressively. Plan for `referrer = ''` to be common — rely on UTMs, not referrer.

---

## Appendix A — Resolving "source" at event time

When `emitEvent` fires for a wallet, "source" is resolved in this priority order:

1. Current session's `utm_source` from cookie (if `landing` happened this session with UTMs).
2. `users.first_utm_source` (first-touch).
3. `users.referred_by_code` → mapped to `kol_<code>`.
4. Referrer host parsing (e.g. `t.co` → `twitter`, `discord.com` → `discord`).
5. Literal `'direct'`.

For `position_open` events specifically, ALSO record `session_source_override` if (1) differs from (2) — this is the signal that re-engagement campaigns are working.

## Appendix B — Funnel endpoint query shapes (preview for backend team)

These are illustrative SQL skeletons the new endpoints can use against `attribution_events`:

- **Acquisition funnel:** `landing → wallet_connect → register`, grouped by `source`, counted as distinct `ga_client_id` per step.
- **Activation funnel:** `register → kyc_complete → first_trade`, grouped by `first_utm_source`, distinct `wallet`.
- **Conversion funnel:** `wallet_connect → first_trade → 2nd_trade`, distinct `wallet`.
- **Whale pipeline:** `first_trade (size > $X) → whale_threshold_hit (gold) → whale_threshold_hit (whale)`.
- **Loyalty funnel:** `register → snag_link → badge_earn (first) → badge_earn (5+)`.
- **Referral funnel:** users where `users.referred_by_code IS NOT NULL`, funneled same as acquisition but bucketed by KOL.
- **Retention funnel:** `first_trade → trade in week 2 → trade in week 4`, retention by source.

The schema in Section 4 makes all of these one-or-two-CTE SQL queries.

---

## Sign-off

This document is the source of truth for the SHIFT RWA tracking architecture. Changes require explicit sign-off and a new version dated below this line. The Growth Hacker agent and engineering team can begin implementation in the order specified in Section 6.

**Next review:** 2026-07-02, after first 30 days of new-pipeline data.
