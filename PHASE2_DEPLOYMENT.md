# SHIFT Airdrop — Phase 2 Deployment Guide

**Last Updated:** May 22, 2026  
**Status:** All 4 tasks complete and ready for deployment

---

## What's New in Phase 2

### Task 1: Trade Link Redirect ✅
- External Jupiter app URL: `https://app.shiftrwa.xyz/coming-soon`
- Updated in 3 locations: NavBar, RegisterContent, Airdrop page
- Opens in new tab with `target="_blank"`

### Task 2: Token Data Enrichment ✅
All 6 SHIFT RWA tokens now include:
- Image URLs: `https://tokens-data.shiftrwa.xyz/tokens/{SYM}.png`
- Alpaca symbols (TSLL, TSLS, SOXL, SOXS, SPXL, SPXS)
- Underlying ETF names (Direxion)
- ISIN codes for compliance
- Solscan + Solana explorer links

### Task 3: Full SNAG Integration Rebuild ✅

**Backend:**
- **Batched XP Sync:** 100 entries per SNAG call (vs 1 per user before)
- **Circuit Breaker:** Pauses on 5 consecutive failures for 5 minutes
- **Multiplier Sync:** Pushes updated multipliers every 15 minutes
- **Webhook Handler:** Receives social task completions from SNAG Stratus (HMAC-SHA256)
- **Retry Queue:** Exponential backoff with jitter, max 10 attempts
- **Leaderboard:** Dual-mode (SNAG + local fallback)

**Frontend:**
- SNAG loyalty points displayed in Points sidebar
- Auto-checks completed social tasks on wallet connect
- Share buttons for referral links (X, Telegram, WhatsApp, Copy)

**Database:**
- `snag_completed_tasks` table for webhook task tracking
- New indexes for queue worker and sync log efficiency
- `snag_multiplier_id` column on users table

### Task 4: Performance & Reliability ✅
- **Scale:** 1000 users → 10 SNAG calls (batching)
- **Resilience:** Circuit breaker + 2-minute retry queue
- **Idempotency:** Keys prevent double-crediting on retry
- **Rate Limits:** 50 RPS SNAG API handled via batching + backoff

---

## Deployment Steps

### Step 1: Backend Database Migration
Apply the SNAG rebuild migration to production Postgres:

```bash
# Render PostgreSQL (production)
psql $DATABASE_URL -f src/db/migrations/002_snag_rebuild.sql

# Local development
psql shift_airdrop -f src/db/migrations/002_snag_rebuild.sql
```

**Verify migration:**
```sql
-- Should see snag_completed_tasks table
\d snag_completed_tasks

-- Should see new columns on users
\d users | grep snag

-- Should see new indexes
\di idx_snag*
```

### Step 2: Backend Environment Variables (Render Dashboard)

Set these in **Render Environment** → **Shift Airdrop Backend** → **Environment**:

```
# SNAG Core
SNAG_API_KEY=<from SNAG admin dashboard>
SNAG_ORGANIZATION_ID=<your org ID>
SNAG_WEBSITE_ID=<your website ID>
SNAG_LOYALTY_CURRENCY_ID=<UUID for batched transactions>
SNAG_WEBHOOK_SECRET=<HMAC secret from SNAG Stratus config>

# SNAG Badge Rule IDs (create in SNAG dashboard)
SNAG_FIRST_TRADE_BADGE_ID=<rule ID>
SNAG_DIAMOND_HANDS_BADGE_ID=<rule ID>
SNAG_EARNINGS_REACTOR_BADGE_ID=<rule ID>
SNAG_FOMC_TRADER_BADGE_ID=<rule ID>
SNAG_SHIFT_HOLDER_BADGE_ID=<rule ID>

# SNAG Social Task Rule IDs (for webhook verification)
SNAG_FOLLOW_X_RULE_ID=<rule ID>
SNAG_JOIN_DISCORD_RULE_ID=<rule ID>
SNAG_JOIN_TELEGRAM_RULE_ID=<rule ID>
SNAG_CONNECT_WALLET_RULE_ID=<rule ID>
SNAG_FIRST_TRADE_RULE_ID=<rule ID>
```

### Step 3: Backend Deployment
```bash
# Render auto-deploys on push to main, but you can manually deploy:
# 1. Push to main branch
# 2. Render detects changes
# 3. Runs `npm install && npm run build && npm start`
# 4. Restart happens automatically

git push origin main
```

### Step 4: SNAG Stratus Webhook Configuration
In **SNAG admin dashboard** → **Webhooks** (or **Stratus**):

1. **Webhook URL:** `https://shift-airdrop-backend.onrender.com/api/webhooks/snag`
2. **Events:** Enable `rule.completed` events
3. **Secret Key:** Set to the value of `SNAG_WEBHOOK_SECRET`
4. **Test:** Send a test event from SNAG dashboard

### Step 5: Frontend Deployment (Vercel)
```bash
# Frontend auto-deploys on push to main
# .env variables (already set in Vercel):
NEXT_PUBLIC_API_URL=https://shift-airdrop-backend.onrender.com

git push origin main
# Vercel builds and deploys to https://airdrop.shiftrwa.xyz
```

### Step 6: Verify Everything
**Backend health check:**
```bash
curl https://shift-airdrop-backend.onrender.com/api/webhooks/health
# Expected: {"status":"ok","service":"shift-webhook"}
```

**Test SNAG endpoints:**
```bash
curl https://shift-airdrop-backend.onrender.com/api/snag/points/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
# Expected: {"wallet":"3uDJ..","loyaltyPoints":0}

curl https://shift-airdrop-backend.onrender.com/api/snag/tasks/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
# Expected: {"wallet":"3uDJ..","completedTasks":[]}
```

**Frontend:**
1. Go to https://airdrop.shiftrwa.xyz
2. Connect wallet
3. Check "Points" sidebar → should show SNAG Loyalty PTS (if any)
4. Check Register page → should auto-verify social tasks via SNAG

---

## SNAG Configuration in Dashboard

### Create Badge Rules (if not exists)
In SNAG admin → Loyalty Rules:
- **First Trade:** Custom rule that triggers on first position > $10
- **Diamond Hands:** Triggers when 30+ day hold
- **Earnings Reactor:** Triggers during earnings events
- **FOMC Trader:** Triggers during FOMC events
- **Shift Holder:** Triggers on any SHIFT token position

### Create Social Task Rules (if not exists)
These trigger via external actions or user verification:
- **Follow X:** User follows @ShiftRWA
- **Join Discord:** User joins Discord server
- **Join Telegram:** User joins Telegram group
- **Connect Wallet:** User connects phantom/solflare
- **First Trade:** User completes first trade

### Set Loyalty Currency
Create or configure a **Loyalty Currency** for XP points:
- **Name:** SHIFT XP or similar
- **Display:** Points
- Use this ID in `SNAG_LOYALTY_CURRENCY_ID` env var

---

## Architecture

### Data Flow: XP Sync
```
1. User holds position → Helius webhook → heliusWebhookHandler
2. xpEngine.recalculateAllXP() (every 10 min)
3. multiplierService.recalculateAllMultipliers()
4. snagSyncService.syncAllXP() → batches 100 entries
5. POST /api/loyalty/transactions to SNAG (idempotent)
6. xp_sync_log tracks last synced amount per wallet
```

### Data Flow: Social Tasks
```
1. User completes social task in SNAG (Follow X, etc.)
2. SNAG Stratus → POST /api/webhooks/snag with event
3. snagWebhookHandler verifies HMAC signature
4. Maps ruleId → taskId via config.snagSocialRuleIds
5. INSERT INTO snag_completed_tasks (wallet, task_id)
6. Frontend: fetchSnagTasks() → auto-checks on register page
```

### Reliability Features
- **Circuit Breaker:** After 5 SNAG failures, pause 5 minutes
- **Retry Queue:** Failed items queued with exponential backoff
- **Cron Worker:** Every 2 minutes, retries failed items (max 10 attempts)
- **Fallback:** If SNAG down, users still earn local XP

---

## Monitoring

### Logs to Watch
```bash
# Render logs (https://render.com/dashboard)
# Filter for [SnagSync] patterns:

[SnagSync] ✅ Full sync complete  # Success
[SnagSync] batchPushXP            # XP pushed to SNAG
[SnagSync] Multiplier sync: 5/10  # Multiplier updates
[SnagSync] 🔴 CIRCUIT BREAKER OPEN # Failure detected
[SnagWebhook] Task "x_follow" completed  # Social task
```

### Key Metrics
1. **XP Sync Success Rate:** Check `xp_sync_log` row count vs `users` count
2. **SNAG Multiplier ID:** Query `users WHERE snag_multiplier_id IS NOT NULL`
3. **Queue Length:** `SELECT COUNT(*) FROM snag_sync_queue WHERE status='failed'`
4. **Circuit Breaker:** Look for OPEN/CLOSED logs

---

## Troubleshooting

### "Circuit Breaker OPEN"
- Check SNAG API status and credentials
- Verify `SNAG_LOYALTY_CURRENCY_ID` is correct UUID
- Check rate limits: SNAG may have hit 50 RPS limit
- Wait 5 minutes (auto-reset) or restart backend

### Webhook not firing
- Verify webhook URL in SNAG dashboard points to correct environment
- Check `SNAG_WEBHOOK_SECRET` matches SNAG config
- Test webhook: SNAG admin dashboard → Send Test
- Look for errors in Render logs

### Missing SNAG Loyalty PTS in frontend
- User may not have any synced XP yet
- `loyaltyPoints` is null until first SNAG sync succeeds
- Check `/api/dashboard/:wallet` response includes `loyaltyPoints`

### Social tasks not auto-checking on register
- Verify `SNAG_FOLLOW_X_RULE_ID` etc. are set in config
- Check `snag_completed_tasks` table has rows
- Confirm webhook received events: grep "[SnagWebhook]" logs

---

## Rollback Plan

If issues arise:

1. **Frontend:** Vercel → Deployments → Revert to previous
2. **Backend:** Render → Deployments → Revert to previous
3. **Database:** Keep migration (it's additive, no data loss)
4. **Disable SNAG:** Set `SNAG_API_KEY=` (empty) to skip all SNAG calls

---

## Success Criteria

✅ Phase 2 is successful when:
1. Trade links open external Jupiter app
2. Token data displays with images and ISIN codes
3. SNAG webhook receives social task completions (logs show ✅)
4. XP syncs to SNAG in batches (logs show 📊)
5. Multipliers push to SNAG (logs show 🎯)
6. Frontend shows SNAG Loyalty PTS in sidebar
7. Register page auto-checks social tasks on wallet connect
8. No Circuit Breaker OPEN errors for > 24 hours

---

## Next Steps (Phase 3 - Future)

- Enhanced multiplier tiers (Bronze/Silver/Gold)
- Certificate NFT system
- Advanced leaderboard filters
- SNAG reward distribution at TGE
- Automated compliance reporting
