# Phase 2 — Go-Live Action Checklist

**Status:** All code complete. Ready for deployment.

## ⚡ Immediate Actions (Before Go-Live)

### 1. Backend Database Setup (5 min)
- [ ] Apply migration to production Postgres:
  ```bash
  psql $DATABASE_URL -f src/db/migrations/002_snag_rebuild.sql
  ```
- [ ] Verify: `SELECT COUNT(*) FROM snag_completed_tasks;` (returns 0 initially)

### 2. Render Environment Variables (5 min)
Go to **Render.com** → **Shift Airdrop Backend** → **Environment**

Add/update these 13 variables:
```
SNAG_API_KEY=<ask Axel>
SNAG_ORGANIZATION_ID=<ask Axel>
SNAG_WEBSITE_ID=<ask Axel>
SNAG_LOYALTY_CURRENCY_ID=<ask Axel>
SNAG_WEBHOOK_SECRET=<ask Axel>
SNAG_FOLLOW_X_RULE_ID=<ask Axel>
SNAG_JOIN_DISCORD_RULE_ID=<ask Axel>
SNAG_JOIN_TELEGRAM_RULE_ID=<ask Axel>
SNAG_CONNECT_WALLET_RULE_ID=<ask Axel>
SNAG_FIRST_TRADE_RULE_ID=<ask Axel>
SNAG_FIRST_TRADE_BADGE_ID=<ask Axel>
SNAG_DIAMOND_HANDS_BADGE_ID=<ask Axel>
SNAG_EARNINGS_REACTOR_BADGE_ID=<ask Axel>
SNAG_FOMC_TRADER_BADGE_ID=<ask Axel>
SNAG_SHIFT_HOLDER_BADGE_ID=<ask Axel>
```

After saving, Render auto-redeploys.

### 3. SNAG Webhook Configuration (5 min)
In **SNAG Admin Dashboard**:
- [ ] Webhooks → Add webhook
- [ ] URL: `https://shift-airdrop-backend.onrender.com/api/webhooks/snag`
- [ ] Events: `rule.completed`
- [ ] Secret: Paste value from `SNAG_WEBHOOK_SECRET`
- [ ] Test webhook (optional)

### 4. Quick Verification (2 min)
```bash
# Check backend is running
curl https://shift-airdrop-backend.onrender.com/api/webhooks/health

# Test with a real wallet (adjust address)
curl https://shift-airdrop-backend.onrender.com/api/snag/points/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
```

---

## 📊 What Changed (For Testing)

### Frontend
- **Trade button** → Opens https://app.shiftrwa.xyz/coming-soon in new tab
- **Token cards** → Show images from https://tokens-data.shiftrwa.xyz/tokens/{SYM}.png
- **Airdrop sidebar** → Shows "SNAG Loyalty PTS" row
- **Register page** → Auto-checks social tasks on wallet connect
- **Referral section** → 2x2 grid of share buttons (X, Telegram, WhatsApp, Copy)

### Backend
- **Every 10 min:** XP syncs to SNAG in batches of 100 (vs 1 per user before)
- **Every 10 min:** Claim multipliers push to SNAG
- **Every 2 min:** Failed sync queue retries with exponential backoff
- **On webhook:** Social task completions recorded in `snag_completed_tasks`

---

## 🚨 Critical Monitoring (First 24 Hours)

Watch **Render logs** for:
```
✅ Good signs:
[SnagSync] ✅ Full sync complete
[SnagSync] 📊 Batch pushed 50 XP entries
[SnagSync] 🎯 Multiplier sync: 10/10 succeeded
[SnagWebhook] ✅ Task "x_follow" completed

❌ Red flags:
[SnagSync] 🔴 CIRCUIT BREAKER OPEN
[SnagWebhook] ❌ Invalid signature
[SnagSync] ❌ XP batch failed
```

If you see red flags:
1. Check `SNAG_API_KEY` is correct
2. Check `SNAG_WEBHOOK_SECRET` is correct
3. Verify SNAG API is responding
4. Check rate limits (may need backoff tuning)

---

## 📝 Rollback (If Something Breaks)

**Option 1: Disable SNAG (quickest)**
```
Set SNAG_API_KEY= (empty)
Render auto-redeploys in ~30 seconds
Users still earn XP locally, just doesn't sync to SNAG
```

**Option 2: Revert code**
```
Go to Render → Deployments → Previous version → Redeploy
```

**Option 3: Revert Vercel (frontend)**
```
Go to Vercel → Deployments → Previous version → Promote
```

---

## ✅ Success = Phase 2 Live

When all of the following are true:
1. ✅ Database migration applied (snag_completed_tasks table exists)
2. ✅ All 15 SNAG env vars set in Render
3. ✅ Webhook URL configured in SNAG dashboard
4. ✅ Health check returns 200 OK
5. ✅ Logs show "Full sync complete" every 10 minutes
6. ✅ No Circuit Breaker OPEN errors for > 1 hour
7. ✅ Frontend shows Trade link works
8. ✅ Frontend shows token images load
9. ✅ Frontend shows SNAG Loyalty PTS in sidebar
10. ✅ At least one social task via webhook succeeded

→ **Phase 2 is live!**

---

## 📞 Questions?

- **Code locations:**
  - Backend: `src/services/snagSyncService.ts` (batching logic)
  - Backend: `src/services/snagWebhookHandler.ts` (webhook handler)
  - Frontend: `frontend/lib/api.ts` (fetchSnagTasks)
  - Config: `src/config.ts` (all env vars)

- **Documentation:**
  - Full guide: `PHASE2_DEPLOYMENT.md`
  - Monitoring: Check Render logs under `[SnagSync]` tag
  - Debug: All SNAG calls log with `[SnagSync]` prefix
