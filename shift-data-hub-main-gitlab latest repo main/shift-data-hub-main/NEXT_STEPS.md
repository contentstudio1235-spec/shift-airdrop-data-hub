# ✅ SHIFT Airdrop MVP — Ready for Deployment!

**Status**: Code is production-ready. Follow these steps to go live.

---

## 📋 What's Done

- ✅ Backend fully built & tested (TypeScript/Express/Node.js)
- ✅ Frontend dashboard built & compiled (Next.js)
- ✅ All APIs implemented (webhook, dashboard, leaderboard, badges)
- ✅ Database schema ready
- ✅ Environment configs prepared
- ✅ Deployment guides written

---

## 🚀 Your Action Plan (Do This Now)

### STEP 1: Add SNAG Credentials to Railway (5 min)

1. Open [Railway Dashboard](https://railway.app)
2. Select your `shift-airdrop-backend-production` project
3. Go to **Variables** tab
4. Add these 9 environment variables:

```
SNAG_API_KEY=[your-snag-api-key]
SNAG_ORGANIZATION_ID=[your-snag-org-id]
SNAG_WEBSITE_ID=[your-snag-website-id]
SNAG_XP_RULE_ID=[from-snag-dashboard]
SNAG_FIRST_TRADE_BADGE_ID=[from-snag-dashboard]
SNAG_DIAMOND_HANDS_BADGE_ID=[from-snag-dashboard]
SNAG_EARNINGS_REACTOR_BADGE_ID=[from-snag-dashboard]
SNAG_FOMC_TRADER_BADGE_ID=[from-snag-dashboard]
SNAG_SHIFT_HOLDER_BADGE_ID=[from-snag-dashboard]
```

*Get these values from your SNAG dashboard*

### STEP 2: Get Database URL from Railway (3 min)

1. Railway Dashboard → Your Project
2. Click on **PostgreSQL** plugin
3. Copy the **DATABASE_URL** connection string
4. In Variables, paste it as:

```
DATABASE_URL=[paste-the-connection-string]
```

### STEP 3: Add Helius Credentials (3 min)

1. Go to [Helius Dashboard](https://dev.helius.xyz)
2. Copy your **API Key**
3. Copy your **Webhook Secret**
4. In Railway Variables, add:

```
HELIUS_API_KEY=[your-helius-api-key]
HELIUS_WEBHOOK_SECRET=[your-webhook-secret]
```

### STEP 4: Deploy Backend to Railway (2 min)

1. Push latest code to GitHub:
   ```bash
   cd C:\Users\Axel\Shift_Backend_Logic\.claude\worktrees\elegant-williams-1d190c
   git add -A
   git commit -m "chore: prepare for production deployment"
   git push origin main
   ```

2. Railway auto-deploys (watch **Logs** tab)
3. Once deployed, copy the Railway URL (looks like: `https://shift-airdrop-backend-production.up.railway.app`)

### STEP 5: Run Database Migrations (5 min)

Once backend is running:

```bash
# Option 1: Via Railway CLI
railway run npm run migrate

# Option 2: Via Railway Dashboard
# Click "Deployment" → Find running instance → click terminal icon
# Run: npm run migrate
```

**Expected output**:
```
[Migrate] ✅ Schema applied successfully
```

### STEP 6: Verify Backend is Live (2 min)

```bash
# Replace with your actual Railway URL
curl https://shift-airdrop-backend-production.up.railway.app/health

# Should return:
# {"status":"ok","service":"shift-airdrop-backend","version":"1.0.0","env":"production","uptime":...}
```

### STEP 7: Deploy Frontend to Vercel (10 min)

Option A (CLI - faster):
```bash
cd frontend
npm install -g vercel
vercel --prod --env NEXT_PUBLIC_API_URL=https://shift-airdrop-backend-production.up.railway.app
```

Option B (Web UI):
1. Go to [vercel.com](https://vercel.com)
2. "Add New" → "Project" → Import GitHub repo
3. Root Directory: `frontend`
4. Environment: `NEXT_PUBLIC_API_URL=https://shift-airdrop-backend-production.up.railway.app`
5. Deploy

### STEP 8: Point Custom Domain to Vercel (5 min)

1. Vercel Dashboard → Project → Settings → Domains
2. Add `airdrop.shift.xyz`
3. Update DNS at your registrar:
   - CNAME: `airdrop.shift.xyz` → `cname.vercel.com`
4. Wait 5-10 min for DNS to propagate

### STEP 9: Update Helius Webhook URL (2 min)

1. Helius Dashboard → Webhooks
2. Find your webhook
3. Update URL to: `https://shift-airdrop-backend-production.up.railway.app/api/webhooks/helius`
4. Save and verify "Webhook is active"

### STEP 10: Test Everything (5 min)

```bash
# Test backend
curl https://shift-airdrop-backend-production.up.railway.app/health

# Test frontend homepage
curl https://airdrop.shift.xyz

# Open in browser
# https://airdrop.shift.xyz ← Should show "Backend: ✅ Connected"
# https://airdrop.shift.xyz/dashboard ← Enter test wallet
# https://airdrop.shift.xyz/leaderboard ← Should show data
```

---

## ⏱️ Time Estimate

| Step | Time |
|------|------|
| 1-3: Add credentials | ~15 min |
| 4-5: Deploy backend & migrate | ~10 min |
| 6: Verify backend | ~2 min |
| 7-8: Deploy frontend | ~15 min |
| 9: Update webhook | ~2 min |
| 10: Test | ~5 min |
| **TOTAL** | **~50 min** |

---

## 📚 Reference Files

Detailed guides are in the repo:
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — Complete step-by-step (read if stuck)
- [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md) — Backend details
- [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) — Frontend details
- [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md) — All env vars needed

---

## 🆘 Troubleshooting

**Backend won't deploy:**
- Check Railway logs for TypeScript errors
- Verify DATABASE_URL is set
- Make sure all SNAG vars are filled

**Frontend shows "Backend: ❌ Offline":**
- Verify backend health check passes
- Check `NEXT_PUBLIC_API_URL` is correct
- Browser console may show CORS errors (add domain to backend CORS list)

**Webhook not triggering:**
- Verify URL in Helius points to Railway prod URL
- Make a test Jupiter swap
- Check Railway logs for POST requests to `/api/webhooks/helius`

---

## 🎯 Success Criteria

You're done when:

1. ✅ Backend health check returns `"status":"ok"`
2. ✅ Frontend loads at `airdrop.shift.xyz`
3. ✅ Frontend shows "Backend: ✅ Connected"
4. ✅ Dashboard accepts wallet address and shows data
5. ✅ Leaderboard displays top traders
6. ✅ Helius webhook is active and receiving events

---

## 📞 Support

If you get stuck on any step, check:
1. The detailed guide files (DEPLOYMENT_GUIDE.md, etc.)
2. Railway logs (Dashboard → Logs)
3. Vercel logs (Dashboard → Deployments → View)
4. Helius webhook status (Dashboard → Webhooks)

Good luck! 🚀
