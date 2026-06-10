# SHIFT Airdrop MVP — Master Implementation Plan (APPROVED)

> **Deadline:** May 17, 2026 (~4 days)
> **Status:** ALL QUESTIONS RESOLVED — EXECUTING

---

## Finalized Decisions

| Decision | Answer |
|---|---|
| Trading Protocol | **Jupiter** — parse Jupiter swap events via Helius |
| Price Source | **Jupiter Price API** — snapshot once at position open |
| Claim vs Position Multiplier | **Separate** — position mult = XP gen, claim mult = macro loyalty |
| Auth Provider | **Dynamic** (via SNAG) |
| Frontend | **Standalone Next.js** at `airdrop.shift.xyz` |
| Backend Hosting | **Railway** |
| Frontend Hosting | **Vercel** |

---

## Architecture (Final)

```text
┌─────────────────────────────────────────────────┐
│               SOLANA (Jupiter Swaps)             │
└────────────────────┬────────────────────────────┘
                     │ Helius enhanced webhooks
                     ▼
┌─────────────────────────────────────────────────┐
│           NODE.JS BACKEND (Railway)              │
│                                                  │
│  Webhook Handler → Position Service              │
│       ↓                                          │
│  Jupiter Price API (snapshot USD at open)         │
│       ↓                                          │
│  Anti-Farm Filter → XP Engine → Badge Engine     │
│       ↓                                          │
│  SNAG Sync Service (push points/badges/mult)     │
│                                                  │
│  Cron: hourly recalc + sync                      │
│  DB: Railway PostgreSQL                          │
└────────────────────┬────────────────────────────┘
                     │
              ┌──────┴──────┐
              ↓              ↓
     ┌──────────────┐  ┌──────────────┐
     │  SNAG Platform│  │ Next.js FE   │
     │  - XP ledger  │  │ (Vercel)     │
     │  - Leaderboard│  │ - Dashboard  │
     │  - Badges     │  │ - Positions  │
     │  - Auth       │  │ - Leaderboard│
     │  - Streaks    │  │ - Badges     │
     └──────────────┘  └──────────────┘
```

---

## Build Here vs Push to SNAG

### BUILD IN-HOUSE (This Repo)

| Service | Why |
|---|---|
| Helius Webhook Handler | Parse Jupiter swap txs — SNAG can't |
| Position Service | Track open/close/duration — SNAG has no position concept |
| Jupiter Price Service | Snapshot USD price at open |
| XP Engine | `log₁₀(max(size,10)) × 100 × position_mult` |
| Position Multiplier | `min(1.0 + 0.10 × weeks, 3.0)` |
| Claim Multiplier | Separate macro progression (time + badges) |
| Anti-Farm Service | 24h hold, dust, wash trade, cooldown |
| Badge Eligibility | Determines who qualifies |
| Event Service | Manual FOMC/CPI/earnings feed |
| SNAG Sync Service | Bridge to push all data |

### PUSH TO SNAG

| Feature | SNAG API |
|---|---|
| Wallet Auth | Dynamic provider |
| XP Balance + Ledger | Loyalty Accounts + Transactions |
| Leaderboard | `GET /accounts?sort=points` + `/rank` |
| Badge Storage | Badge API (create/award/revoke) |
| Multiplier Display | Multipliers API |
| Streak Tracking | Account Streaks API |

---

## Database Schema

```sql
-- USERS
CREATE TABLE users (
  wallet            VARCHAR(64) PRIMARY KEY,
  total_xp          DECIMAL(18,4) DEFAULT 0,
  claim_multiplier  DECIMAL(6,4) DEFAULT 1.0,
  current_streak    INTEGER DEFAULT 0,
  last_active       TIMESTAMP,
  snag_user_id      VARCHAR(128),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- POSITIONS
CREATE TABLE positions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet              VARCHAR(64) REFERENCES users(wallet),
  asset               VARCHAR(64) NOT NULL,
  asset_mint          VARCHAR(64),
  position_size_usd   DECIMAL(18,4) NOT NULL,
  token_amount        DECIMAL(18,8),
  price_at_open       DECIMAL(18,8),
  opened_at           TIMESTAMP NOT NULL,
  closed_at           TIMESTAMP,
  current_multiplier  DECIMAL(6,4) DEFAULT 1.0,
  xp_generated        DECIMAL(18,4) DEFAULT 0,
  last_xp_calc        TIMESTAMP,
  status              VARCHAR(16) DEFAULT 'open',
  tx_signature_open   VARCHAR(128) UNIQUE,
  tx_signature_close  VARCHAR(128),
  created_at          TIMESTAMP DEFAULT NOW()
);

-- BADGES
CREATE TABLE badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet        VARCHAR(64) REFERENCES users(wallet),
  badge_name    VARCHAR(64) NOT NULL,
  snag_badge_id VARCHAR(128),
  earned_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet, badge_name)
);

-- EVENTS
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name      VARCHAR(128) NOT NULL,
  event_type      VARCHAR(32) NOT NULL,
  start_time      TIMESTAMP NOT NULL,
  end_time        TIMESTAMP NOT NULL,
  eligible_assets TEXT[],
  badge_reward    VARCHAR(64),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ANTI-FARM LOG
CREATE TABLE anti_farm_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      VARCHAR(64),
  reason      VARCHAR(64),
  position_id UUID,
  details     JSONB,
  flagged_at  TIMESTAMP DEFAULT NOW()
);

-- TX DEDUP
CREATE TABLE processed_transactions (
  tx_signature VARCHAR(128) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- CLAIM MULTIPLIER HISTORY
CREATE TABLE claim_multiplier_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      VARCHAR(64) REFERENCES users(wallet),
  old_value   DECIMAL(6,4),
  new_value   DECIMAL(6,4),
  reason      VARCHAR(128),
  applied_at  TIMESTAMP DEFAULT NOW()
);

-- SNAG FALLBACK QUEUE
CREATE TABLE snag_sync_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet       VARCHAR(64) NOT NULL,
  payload      JSONB NOT NULL,
  sync_type    VARCHAR(32) NOT NULL,
  status       VARCHAR(16) DEFAULT 'pending',
  attempts     INTEGER DEFAULT 0,
  next_attempt TIMESTAMP DEFAULT NOW(),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- SNAG FAILED EVENTS
CREATE TABLE snag_failed_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      VARCHAR(64) NOT NULL,
  payload     JSONB NOT NULL,
  error_msg   TEXT,
  failed_at   TIMESTAMP DEFAULT NOW()
);
```
