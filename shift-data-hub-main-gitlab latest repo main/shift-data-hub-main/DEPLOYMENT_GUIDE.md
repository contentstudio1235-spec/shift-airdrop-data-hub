# 🚀 SHIFT Airdrop MVP — Production Deployment Guide

**Goal**: Get both backend (Railway) and frontend (Vercel) live in hours.

**Timeline**: ~2-3 hours total
- Backend: ~30-45 minutes
- Frontend: ~20-30 minutes
- Webhook setup: ~10 minutes
- Testing: ~15-30 minutes

---

## Phase 1: Backend Deployment to Railway ⚡

### Prerequisites
- Railway account with `shift-airdrop-backend-production` project created
- PostgreSQL plugin added to Railway
- GitHub repo: `https://github.com/contentstudio1235-spec/Shift_airdrop-backend`

### 1A. Set Environment Variables in Railway

Go to **Railway Dashboard** → Project → Variables → Paste all of these:

```
# Database
DATABASE_URL=[copy from Railway PostgreSQL plugin settings]

# Server
PORT=3001
NODE_ENV=production

# Helius
HELIUS_API_KEY=[your-api-key]
HELIUS_WEBHOOK_SECRET=[your-secret]

# SNAG (Loyalty Platform)
SNAG_API_KEY=[your-api-key]
SNAG_ORGANIZATION_ID=[your-org-id]
SNAG_WEBSITE_ID=[your-website-id]
SNAG_XP_RULE_ID=[from SNAG dashboard]
SNAG_FIRST_TRADE_BADGE_ID=[...]
SNAG_DIAMOND_HANDS_BADGE_ID=[...]
SNAG_EARNINGS_REACTOR_BADGE_ID=[...]
SNAG_FOMC_TRADER_BADGE_ID=[...]
SNAG_SHIFT_HOLDER_BADGE_ID=[...]

# Anti-Farm
MIN_POSITION_SIZE_USD=10
MIN_HOLD_HOURS=24
WASH_TRADE_WINDOW_MINUTES=5
COOLDOWN_MINUTES=60

# Jupiter
JUPITER_PRICE_API=https://api.jup.ag/price/v2
```

### 1B. Deploy

1. Railway auto-detects `railway.json` (start command: `npm start`)
2. Push code to main GitHub repo:
   ```bash
   git push origin main
   ```
3. Railway auto-triggers build (watch Logs tab)
4. Once deployed, you'll get a Railway URL

### 1C. Run Database Migrations

**Option 1** (via Railway CLI):
```bash
railway run npm run migrate
```

**Option 2** (via Vercel SSH panel):
- Go to Railway Dashboard → Logs
- Find deployment logs, ensure no errors
- Once running, manually run `npm run migrate` in SSH

### 1D. Verify Backend is Live

```bash
curl https://shift-airdrop-backend-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "shift-airdrop-backend",
  "env": "production",
  "uptime": 123
}
```

---

## Phase 2: Frontend Deployment to Vercel 🎨

### Prerequisites
- Vercel account (free or paid)
- Same GitHub repo linked

### 2A. Build & Test Locally (Optional)

```bash
cd frontend
npm install
npm run build
npm run start
# Visit http://localhost:3000 to verify
```

### 2B. Deploy to Vercel

**Via CLI** (faster):
```bash
cd frontend
npm install -g vercel
vercel --prod \
  --env NEXT_PUBLIC_API_URL=https://shift-airdrop-backend-production.up.railway.app
```

**Via Web UI**:
1. Visit vercel.com → Add New Project
2. Import GitHub repo
3. Root Directory: `frontend`
4. Add Environment Variable: `NEXT_PUBLIC_API_URL=https://shift-airdrop-backend-production.up.railway.app`
5. Deploy

### 2C. Add Custom Domain

Vercel Dashboard → Project → Settings → Domains:
- Add `airdrop.shift.xyz`
- Update DNS CNAME at registrar to `cname.vercel.com`
- Wait ~5-10 minutes for propagation

### 2D. Verify Frontend is Live

```bash
curl https://airdrop.shift.xyz
```

Visit in browser:
- https://airdrop.shift.xyz ← Home page
- https://airdrop.shift.xyz/dashboard ← Dashboard
- https://airdrop.shift.xyz/leaderboard ← Leaderboard

---

## Phase 3: Helius Webhook Configuration 🪝

### 3A. Get Your Railway Production URL

Once backend is live:
- Railway Dashboard → Your Deployment
- Copy the URL: `https://shift-airdrop-backend-production.up.railway.app`

### 3B. Update Helius Webhook

1. Go to **Helius Dashboard** → Webhooks
2. Find your existing webhook (should have dev URL)
3. Update URL to: `https://shift-airdrop-backend-production.up.railway.app/api/webhooks/helius`
4. Save and verify "Webhook is active"

### 3C. Test with Sample Wallet

Use this test wallet: `3j7Dm8niLaTA2GzTfVBALLW4XGYq1u8TXLbAePqKGoZM`

1. Make a swap on Jupiter with this wallet
2. Check Railway logs for webhook event:
   ```
   [Webhook] Received Helius event...
   [Position] Created position for wallet...
   ```

---

## Phase 4: End-to-End Verification ✅

### 4A. Test Backend Endpoints

```bash
# Root
curl https://shift-airdrop-backend-production.up.railway.app/

# Health
curl https://shift-airdrop-backend-production.up.railway.app/health

# Leaderboard
curl https://shift-airdrop-backend-production.up.railway.app/api/leaderboard

# Dashboard (with sample wallet)
curl https://shift-airdrop-backend-production.up.railway.app/api/dashboard/3j7Dm8niLaTA2GzTfVBALLW4XGYq1u8TXLbAePqKGoZM
```

### 4B. Test Frontend

1. Open https://airdrop.shift.xyz
2. Should show "Backend: ✅ Connected"
3. Go to Dashboard, enter wallet address
4. Should load positions and XP data
5. Go to Leaderboard, should show top traders

### 4C. Test Full Flow (Optional but recommended)

1. Make a Jupiter swap with test wallet
2. Wait ~5 seconds for Helius webhook
3. Check dashboard — new position should appear
4. XP should be calculated
5. Check leaderboard rank

---

## Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure DATABASE_URL is correct

### Frontend shows "Backend: ❌ Offline"
- Check if `NEXT_PUBLIC_API_URL` is set correctly
- Verify Railway backend is responding to `/health`
- Check browser console for CORS errors

### Webhook not triggering
- Verify Helius webhook URL is correct
- Check Railway logs for 404 errors
- Test with a sample Jupiter swap

### Database migration fails
- Check PostgreSQL connection string
- Ensure database exists and is empty
- Check Railway logs for SQL errors

---

## Quick Reference

| Service | URL | Status |
|---------|-----|--------|
| Backend Health | https://shift-airdrop-backend-production.up.railway.app/health | ✅ |
| Frontend | https://airdrop.shift.xyz | ✅ |
| Dashboard | https://airdrop.shift.xyz/dashboard | ✅ |
| Leaderboard | https://airdrop.shift.xyz/leaderboard | ✅ |

---

## Next Steps After Deployment

1. **Monitor Logs**: Keep Railway & Vercel dashboards open for first hour
2. **Test with Real Wallets**: Once stable, invite beta users
3. **Resolve SNAG Rules**: Asynchronously resolve prerequisite rules in SNAG
4. **Monitor Webhook**: Ensure Helius keeps sending events

---

**Need help?** Check the detailed deployment guides:
- [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md) — Backend-specific details
- [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) — Frontend-specific details
