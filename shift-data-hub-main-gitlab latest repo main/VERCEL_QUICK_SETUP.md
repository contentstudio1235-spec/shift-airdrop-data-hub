# ⚡ Vercel Quick Setup - 5 Minute Checklist

## Step 1: Environment Variables
**Go to**: Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these variables** (copy-paste):

```
NEXT_PUBLIC_SNAG_LOYALTY_URL
https://loyalty.shiftrwa.xyz

NEXT_PUBLIC_AIRDROP_DOMAIN
airdrop.shiftrwa.xyz

NEXT_PUBLIC_AIRDROP_URL
https://airdrop.shiftrwa.xyz

NEXT_PUBLIC_API_URL
https://shift-airdrop-backend.onrender.com

NEXT_PUBLIC_POSTHOG_KEY
phc_stzLYR66QWH9zePE5TkExUM2r8rbsUdFTbdomasrPG2r

NEXT_PUBLIC_POSTHOG_HOST
https://us.i.posthog.com

NEXT_PUBLIC_TELEGRAM_BOT_NAME
ShiftRWABot
```

✅ **Make sure all are set for `Production` environment**

---

## Step 2: Deploy Latest Code
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest commit (should be "feat: implement SNAG loyalty integration...")
3. Wait for build to complete (~2-3 minutes)
4. Check status shows ✅ **Ready**

---

## Step 3: Test Key Features (5 minutes)

### Test Referral Redirect
1. Open: `https://airdrop.shiftrwa.xyz/r/test123`
2. Should redirect to: `https://loyalty.shiftrwa.xyz/?ref=test123`
3. ✅ If redirects correctly → working!

### Test Airdrop Dashboard
1. Go to: `https://airdrop.shiftrwa.xyz/airdrop`
2. Connect wallet (MetaMask, Solana, or Trust Wallet)
3. Check:
   - [ ] Referral link displays as `/r/[code]` format
   - [ ] "Go to Quests" button visible
   - [ ] Share buttons (X, Telegram, WhatsApp) work
   - [ ] Copy button copies the link

### Test Registration with Referral
1. Go to: `https://airdrop.shiftrwa.xyz/register?ref=testkol`
2. Check:
   - [ ] "SPECIAL INVITE" bonus banner shows
   - [ ] "View All Quests on SNAG" button visible
   - [ ] Button opens SNAG loyalty page in new tab

### Test on Mobile
1. Open Chrome DevTools (F12)
2. Click device icon (mobile view)
3. Test at 375px width (iPhone):
   - [ ] All buttons clickable (48x48px minimum)
   - [ ] Text readable (no tiny fonts)
   - [ ] No horizontal scrolling
   - [ ] Modals close with X button

---

## Step 4: Performance Check

### Run Lighthouse
1. Go to page in Chrome
2. Press F12 (DevTools)
3. Click **Lighthouse** tab
4. Click **Analyze page load**
5. Wait ~30 seconds

**Target scores**:
- Performance: ≥85
- Accessibility: ≥85
- Best Practices: ≥85
- SEO: ≥85

If below target, check:
- [ ] Images optimized (< 100KB each)
- [ ] No console errors
- [ ] Fonts loading correctly
- [ ] API responses fast (<1s)

---

## Step 5: Monitor Deployments

### Watch for Issues
- Check **Deployments** tab - should show green checkmark
- Click on deployment to see **Build Logs**
- Look for warnings (⚠️) or errors (❌)

### Monitor Errors
- Check **Analytics** tab in Vercel
- Look for increased error rates
- Check **Functions** metrics for API latency

### Real User Monitoring (Optional)
- Vercel automatically tracks Core Web Vitals
- View in **Analytics** tab
- Set alerts if metrics degrade

---

## 🚀 You're Live!

**Your app is now available at:**
```
https://airdrop.shiftrwa.xyz
```

**Key URLs to share**:
- Home: https://airdrop.shiftrwa.xyz
- Register: https://airdrop.shiftrwa.xyz/register
- Dashboard: https://airdrop.shiftrwa.xyz/airdrop
- Referral: https://airdrop.shiftrwa.xyz/r/[your-code]

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Pages show blank | Hard refresh (Ctrl+Shift+R) or clear browser cache |
| Buttons don't work | Check console (F12) for errors |
| Wallet won't connect | Ensure MetaMask/wallet extension installed |
| Redirect loop | Check env variables match exactly |
| Slow loading | Check API backend is running |
| Mobile looks broken | Test in Chrome DevTools device mode (not responsive) |

---

## ✨ What's New

**Files Modified**:
- ✅ `frontend/app/r/[code]/page.tsx` - New referral redirect route
- ✅ `frontend/app/airdrop/page.tsx` - Updated referral display
- ✅ `frontend/app/register/RegisterContent.tsx` - Added quest button
- ✅ `frontend/lib/api.ts` - Added helper functions

**What Works Now**:
- ✅ Branded referral links: `airdrop.shiftrwa.xyz/r/[code]`
- ✅ Automatic redirect to SNAG loyalty page with `?ref=[code]`
- ✅ "Go to Quests" button on dashboard and registration
- ✅ Updated share buttons to use branded links
- ✅ Centralized URL configuration via environment variables

---

## 📞 Need Help?

1. **Check build logs**: Vercel → Deployments → Select deployment → Logs
2. **Check browser console**: F12 → Console tab → Look for red errors
3. **Check API status**: https://shift-airdrop-backend.onrender.com/health
4. **Test on real device**: Don't just test in browser - test on actual phone
5. **Clear all caches**: Browser cache + service worker + local storage

---

## Next Steps After Launch

1. **Monitor analytics** - PostHog is already tracking events
2. **Watch for errors** - Check Vercel analytics daily for first week
3. **Get user feedback** - Ask users about UX/navigation issues
4. **Optimize based on data** - Fix top error sources
5. **A/B test CTAs** - Test button colors and text

Good luck with the launch! 🚀
