# ✅ SHIFT Airdrop — Live Deployment Checklist

**Goal**: Get live and working in a few hours  
**Status**: Code is ready, follow this checklist to deploy

---

## 🔧 PRE-DEPLOYMENT (Gather Information)

- [ ] Have Railway project URL ready: `shift-airdrop-backend-production.up.railway.app`
- [ ] Have Vercel account ready
- [ ] Have all SNAG credentials (API key, org ID, website ID, rule IDs)
- [ ] Have Helius API key and webhook secret
- [ ] Have domain `airdrop.shift.xyz` ready (or use Railway/Vercel default)

---

## 🚀 DEPLOYMENT PHASE 1: RAILWAY BACKEND (30 min)

### Set Environment Variables
- [ ] Go to Railway Dashboard → Your Project → Variables
- [ ] Add `SNAG_API_KEY` = [value]
- [ ] Add `SNAG_ORGANIZATION_ID` = [value]
- [ ] Add `SNAG_WEBSITE_ID` = [value]
- [ ] Add `SNAG_XP_RULE_ID` = [value]
- [ ] Add `SNAG_FIRST_TRADE_BADGE_ID` = [value]
- [ ] Add `SNAG_DIAMOND_HANDS_BADGE_ID` = [value]
- [ ] Add `SNAG_EARNINGS_REACTOR_BADGE_ID` = [value]
- [ ] Add `SNAG_FOMC_TRADER_BADGE_ID` = [value]
- [ ] Add `SNAG_SHIFT_HOLDER_BADGE_ID` = [value]
- [ ] Add `HELIUS_API_KEY` = [value]
- [ ] Add `HELIUS_WEBHOOK_SECRET` = [value]
- [ ] Add `DATABASE_URL` = [copy from PostgreSQL plugin]
- [ ] Add `PORT` = `3001`
- [ ] Add `NODE_ENV` = `production`

### Deploy
- [ ] Push code: `git push origin main`
- [ ] Railway auto-builds (watch Logs tab)
- [ ] Wait for ✅ "Deployment successful"
- [ ] Copy Railway production URL

### Verify Backend
- [ ] Run health check: `curl https://shift-airdrop-backend-production.up.railway.app/health`
- [ ] Status should be `"ok"`
- [ ] Helius should show ✅ configured
- [ ] SNAG should show ✅ configured

### Database
- [ ] Run migrations: `railway run npm run migrate`
- [ ] Check for ✅ "Schema applied successfully"
- [ ] If fails, check Railway logs for SQL errors

---

## 🎨 DEPLOYMENT PHASE 2: VERCEL FRONTEND (20 min)

### Deploy
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click "Add New" → "Project"
- [ ] Import GitHub repo: `Shift_airdrop-backend`
- [ ] Set Root Directory: `frontend`
- [ ] Add Environment: `NEXT_PUBLIC_API_URL` = `https://shift-airdrop-backend-production.up.railway.app`
- [ ] Click Deploy
- [ ] Wait for ✅ Deployment complete

### Configure Domain
- [ ] Vercel Dashboard → Settings → Domains
- [ ] Add `airdrop.shift.xyz`
- [ ] Update DNS CNAME: `airdrop.shift.xyz` → `cname.vercel.com`
- [ ] Wait 5-10 min for DNS propagation

### Verify Frontend
- [ ] Open https://airdrop.shift.xyz in browser
- [ ] Should show "Backend: ✅ Connected"
- [ ] Click "Go to Dashboard"
- [ ] Enter test wallet address
- [ ] Should load positions without errors

---

## 🪝 DEPLOYMENT PHASE 3: HELIUS WEBHOOK (10 min)

- [ ] Go to Helius Dashboard → Webhooks
- [ ] Find your existing webhook
- [ ] Update URL: `https://shift-airdrop-backend-production.up.railway.app/api/webhooks/helius`
- [ ] Save changes
- [ ] Verify status = "Active"

---

## ✅ FINAL VERIFICATION (15 min)

### Backend Health Checks
- [ ] `/health` returns OK
- [ ] `/api/leaderboard` returns leaderboard data
- [ ] `/api/dashboard/[wallet]` returns wallet data

### Frontend Health Checks
- [ ] Homepage loads (`https://airdrop.shift.xyz`)
- [ ] Shows "Backend: ✅ Connected"
- [ ] Dashboard page loads (`/dashboard`)
- [ ] Leaderboard page loads (`/leaderboard`)

### End-to-End Test
- [ ] Make a Jupiter swap with test wallet: `3j7Dm8niLaTA2GzTfVBALLW4XGYq1u8TXLbAePqKGoZM`
- [ ] Wait 5 seconds
- [ ] Check Railway logs for webhook event
- [ ] Check dashboard for new position
- [ ] Check leaderboard for updated rank

---

## 🎯 SUCCESS!

All items checked? You're LIVE! 🚀

**Next Steps:**
1. Monitor Railway & Vercel logs for errors (first hour)
2. Invite beta users to test
3. Monitor Helius webhook for events
4. Resolve SNAG prerequisite rules asynchronously

---

## 📞 QUICK REFERENCE

| What | Where |
|------|-------|
| Backend Logs | Railway Dashboard → Logs |
| Frontend Logs | Vercel Dashboard → Deployments |
| Backend Health | https://shift-airdrop-backend-production.up.railway.app/health |
| Frontend Home | https://airdrop.shift.xyz |
| Helius Status | Helius Dashboard → Webhooks |

---

## 🆘 COMMON ISSUES

**Issue**: Backend won't deploy  
**Fix**: Check Railway logs for TypeScript errors, verify DATABASE_URL

**Issue**: Frontend shows "Backend: ❌ Offline"  
**Fix**: Verify backend health check passes, check NEXT_PUBLIC_API_URL

**Issue**: Webhook not triggering  
**Fix**: Verify URL in Helius, check Railway logs for POST requests

---

**Questions?** See the detailed guides:
- `NEXT_STEPS.md` — Detailed step-by-step
- `DEPLOYMENT_GUIDE.md` — Complete reference
- `RAILWAY_DEPLOYMENT.md` — Backend specifics
- `VERCEL_DEPLOYMENT.md` — Frontend specifics
