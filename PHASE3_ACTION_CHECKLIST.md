# Phase 3: SNAG Referral Integration — Go-Live Checklist

**Status:** Code complete and tested. Ready for deployment.

---

## ⚡ Quick Setup (5 minutes)

### 1. Database Migration (1 min) — Node.js Runner

**Option A: Automated** (Recommended)
```bash
npm run migrate
```

**Option B: On Render Deploy**
Update Render Build Command:
```bash
npm install && npm run build && npm run migrate
```

**Verify:**
```bash
# Should see in logs:
✅ Base schema applied successfully
✅ 004_snag_referral_integration.sql completed
✅ All migrations completed!
```

### 2. Backend & Frontend Auto-Deploy (2 min)
- Code already pushed to main branch
- Render backend: Auto-deploys on push ✅
- Vercel frontend: Auto-deploys on push ✅
- No additional env vars needed (uses existing SNAG config)

### 3. Quick Verification (2 min)

**Test backend referral endpoint:**
```bash
curl https://shift-airdrop-backend.onrender.com/api/snag/referral/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
# Expected: { "wallet": "...", "defaultLink": "...", "customLink": null }
```

**Test frontend:**
1. Go to https://airdrop.shiftrwa.xyz
2. Connect wallet
3. Look for "Refer to Move Up" card
4. Should show referral link from SNAG
5. Try setting a custom code (e.g., "GOGO")

---

## 📋 Deployment Checklist

- [ ] Apply migration 004
- [ ] Verify migration applied (run SQL checks above)
- [ ] Wait for auto-deploy to Render (check Deployments tab)
- [ ] Wait for auto-deploy to Vercel (check Deployments tab)
- [ ] Test `/api/snag/referral/:wallet` endpoint with curl
- [ ] Test frontend referral card loads
- [ ] Test custom code modal appears and saves
- [ ] Check Render logs for errors (`[SnagWebhook]` or `[SnagSync]` tags)

---

## 🧪 Testing Scenarios

### Scenario 1: User Gets Referral Link
1. Connect wallet on airdrop page
2. Look for "Refer to Move Up" card
3. Verify default SNAG link displays
4. Click copy button, paste somewhere to verify it's a real URL
5. Share buttons should work with SNAG link

**Expected:** Default link loads from SNAG API within 2 seconds

### Scenario 2: User Sets Custom Code
1. In "Refer to Move Up" card, click "Create Custom Code"
2. Modal pops up
3. Type "GOGO" and click "Save Code"
4. Modal closes, "GOGO" appears in green badge
5. Custom code persists on refresh

**Expected:** Custom code saves to SNAG and displays immediately

### Scenario 3: Share Button
1. Click "Share on X" button
2. Should open Twitter with pre-filled text including SNAG referral link
3. Verify link is the SNAG default link, not hardcoded

**Expected:** Shares use SNAG-generated links

---

## 🔍 Monitoring (First 24 Hours)

**Watch Render Logs for:**
```
✅ Good signs:
[SnagSync] 🔗 Fetched referral links for 3uDJ7...
[SnagSync] ✅ Custom referral code "GOGO" set for...
[SnagWebhook] ✅ Referral: 3uDJ7... → 4vEJ8... (code: GOGO)

❌ Red flags:
[SnagSync] Failed to fetch referral links
[SnagWebhook] ❌ Invalid signature
[SnagSync] CIRCUIT BREAKER OPEN
```

**Query Database:**
```sql
-- Check if custom codes are being saved
SELECT COUNT(*) FROM users WHERE snag_custom_referral_code IS NOT NULL;
-- Expected: 0+ (depends on test users)

-- Check if referral events are coming in
SELECT COUNT(*) FROM snag_referral_events;
-- Expected: 0+ (only if SNAG fires webhook events)

-- Check migration applied
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'snag_referral_events';
-- Expected: 1
```

---

## 🚨 Troubleshooting

### Referral link doesn't load
**Check:**
- Is SNAG API key valid? (Check Render env vars)
- Are you connected to a wallet?
- Do backend logs show `[SnagSync] 🔗 Fetched`?

**Fix:**
- Verify SNAG_API_KEY in Render dashboard
- Try refreshing browser
- Check browser console for network errors

### Custom code modal appears but doesn't save
**Check:**
- Are you entering 4+ characters?
- Do backend logs show error?
- Is POST request going through?

**Fix:**
- Verify code is 4-64 characters
- Check SNAG API credentials
- Restart backend if needed

### Referral webhook not working
**Check:**
- Is referral event actually happening in SNAG?
- Does Render receive the webhook request?

**Fix:**
- Manually test webhook with curl (see PHASE3_SNAG_REFERRAL_GUIDE.md)
- Verify webhook URL in SNAG dashboard
- Verify SNAG_WEBHOOK_SECRET matches

---

## 📊 What's New in Phase 3

| Feature | Before | After |
|---------|--------|-------|
| Referral links | Static hardcoded | Dynamic from SNAG |
| Custom codes | Not available | Full support |
| Link per user | No | Yes (SNAG-managed) |
| Both platforms | Different links | Same link (SNAG) |
| Webhook support | None | Full support |
| Tracking | Manual DB | SNAG webhook → DB |

---

## 🎯 Success Criteria

Phase 3 is successful when:
- ✅ Referral link loads on airdrop page
- ✅ Custom code can be set and saved
- ✅ Same link displays on both SNAG and Vercel
- ✅ Share buttons work with SNAG link
- ✅ SNAG referral event webhook fires successfully
- ✅ No errors in logs for 24+ hours
- ✅ Database records show custom codes and referral events

---

## 📚 Documentation

- **Full Guide:** `PHASE3_SNAG_REFERRAL_GUIDE.md` (Comprehensive)
- **Data Flow:** See "Architecture" section in guide
- **API Docs:** See "API Reference" section in guide

---

## ⏱️ Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Apply migration | 1 min | SQL script |
| Auto-deploy backend | 2 min | Render auto-deploys |
| Auto-deploy frontend | 2 min | Vercel auto-deploys |
| Verify endpoints | 2 min | curl + browser test |
| Monitor logs | 24 hours | Watch for errors |

**Total time to go-live:** ~10 minutes (mostly waiting for deploys)

---

## 🔗 Quick Links

- Render Backend: https://render.com/dashboard
- Vercel Frontend: https://vercel.com/dashboard
- SNAG Admin: https://admin.snagsolutions.io
- Full Guide: `PHASE3_SNAG_REFERRAL_GUIDE.md`

---

**Phase 3 is ready! No additional configuration needed.** 🚀
