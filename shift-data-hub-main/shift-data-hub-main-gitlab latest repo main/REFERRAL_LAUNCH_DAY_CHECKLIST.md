# 🚀 Referral System - Launch Day Checklist

## Pre-Launch (1 Hour Before)

### ✅ Code Verification
- [ ] Latest commit pushed to GitHub: `feat: implement SNAG loyalty integration...`
- [ ] Vercel deployment shows green checkmark
- [ ] Build logs show no errors or warnings
- [ ] Route list includes `ƒ /r/[code]` (dynamic route)

### ✅ Environment Variables
- [ ] NEXT_PUBLIC_SNAG_LOYALTY_URL = https://loyalty.shiftrwa.xyz
- [ ] NEXT_PUBLIC_AIRDROP_URL = https://airdrop.shiftrwa.xyz
- [ ] NEXT_PUBLIC_API_URL = https://shift-airdrop-backend.onrender.com
- [ ] All 7 variables set in Vercel dashboard

### ✅ SNAG Communication
- [ ] SNAG team confirmed `?ref=` parameter is handled
- [ ] Referral rewards configured (100 XP + 5%)
- [ ] Pre-registration accepts referral code
- [ ] Test environment verified

---

## Launch Tests (30 Minutes)

### Test 1: Redirect Chain ⏱️ 2 minutes
```
URL: https://airdrop.shiftrwa.xyz/r/test123
↓
Expected redirect to: https://loyalty.shiftrwa.xyz/?ref=test123
```

**Quick Test**:
1. Open in new browser tab
2. Watch for redirect (should be instant)
3. Check final URL in address bar
4. ✅ If correct, test passed

---

### Test 2: Wallet Connection ⏱️ 5 minutes
```
1. Go to: airdrop.shiftrwa.xyz/airdrop
2. Click "Connect Wallet"
3. Select MetaMask (or other wallet)
4. Approve connection
5. Check dashboard loads
6. Verify referral link displays as /r/[code]
```

**What to look for**:
- [ ] Dashboard loads without errors
- [ ] Referral link visible in "Refer to Move Up" card
- [ ] Link format: `airdrop.shiftrwa.xyz/r/YOUR_CODE`
- [ ] "Go to Quests" button visible

---

### Test 3: Share Buttons ⏱️ 3 minutes
```
1. From referral card, click "Share on X"
2. Verify Twitter pre-fill includes correct link
3. Test other share buttons (Telegram, WhatsApp)
4. Test "Copy Link" button
```

**What to verify**:
- [ ] Links use branded format `/r/[code]`
- [ ] Not SNAG's default link
- [ ] Copy button shows "✓ Copied!" feedback
- [ ] All share buttons work

---

### Test 4: Registration with Referral ⏱️ 5 minutes
```
1. Get your referral link: airdrop.shiftrwa.xyz/r/YOUR_CODE
2. In new incognito window: Visit link
3. Should redirect to: loyalty.shiftrwa.xyz/?ref=YOUR_CODE
4. Complete pre-registration at SNAG
5. Verify bonus banner appeared on SNAG
```

**What to check**:
- [ ] Redirect happens automatically
- [ ] URL shows `?ref=` parameter
- [ ] SNAG recognizes referral code
- [ ] Bonus banner appears (if SNAG displays it)

---

### Test 5: Mobile View ⏱️ 5 minutes
```
1. Open Chrome DevTools (F12)
2. Click device icon (mobile view)
3. Set to iPhone 12 (390px width)
4. Test dashboard and referral card
5. Test all buttons are clickable
```

**Mobile checklist**:
- [ ] No horizontal scrolling
- [ ] Buttons are at least 48x48px
- [ ] Text is readable
- [ ] Modals work and can be closed
- [ ] Share buttons functional

---

### Test 6: Performance ⏱️ 5 minutes
```
1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Click "Analyze page load"
4. Wait ~30 seconds for results
```

**Target scores**:
- [ ] Performance: ≥85
- [ ] Accessibility: ≥85
- [ ] Best Practices: ≥85
- [ ] SEO: ≥85

**If below target**:
- [ ] Check for console errors (F12 → Console)
- [ ] Check image sizes
- [ ] Check API response times
- [ ] Contact team if critical

---

## Launch Verification (Real Users)

### Hour 1: Live Monitoring
- [ ] Monitor Vercel Analytics dashboard
- [ ] Watch for errors in error tracking (Sentry/PostHog)
- [ ] Check browser console for JavaScript errors
- [ ] Monitor API response times (should be <1s)

### Hour 2-4: Spot Checks
- [ ] Verify referral links are working
- [ ] Confirm no redirect loops
- [ ] Check that users can access dashboard
- [ ] Verify no wallet connection issues

### Hour 4-24: Ongoing Monitoring
- [ ] Track error rates (should be ~0.1% or less)
- [ ] Monitor Core Web Vitals
- [ ] Check referral attribution in SNAG
- [ ] Gather user feedback via Discord/Twitter

---

## Troubleshooting

### 🔴 Redirect Not Working
**Problem**: `/r/code` doesn't redirect to SNAG
**Solution**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache (Settings → Clear browsing data)
3. Try in incognito window
4. Check Vercel build logs for errors
5. Verify env variables are set
6. Redeploy if needed

---

### 🔴 Wallet Won't Connect
**Problem**: "Cannot connect wallet" error
**Solution**:
1. Ensure MetaMask extension installed
2. Reload page (F5)
3. Check browser console for errors
4. Try different browser
5. Check backend API is running

---

### 🔴 Referral Link Not Showing
**Problem**: No link displayed on dashboard
**Solution**:
1. Wait 5 seconds (might be loading)
2. Reload page
3. Check API response: F12 → Network → find referral request
4. Verify API endpoint is responding
5. Check wallet is connected

---

### 🔴 SNAG Not Tracking Referral
**Problem**: Referral code received but not tracked
**Solution**:
1. Verify code is being passed: Check URL for `?ref=code`
2. Check SNAG dashboard for referral records
3. Verify referral code exists in SNAG system
4. Check SNAG backend logs
5. Contact SNAG team

---

### 🔴 Rewards Not Showing
**Problem**: User referred but no bonus XP
**Solution**:
1. Wait 5-10 minutes (might have sync delay)
2. Refresh dashboard
3. Check SNAG's reward system is active
4. Verify referred user earned some XP
5. Contact SNAG team about reward delay

---

## Post-Launch (First Week)

### Day 1
- [ ] Monitor error logs every 2 hours
- [ ] Track referral conversion rate
- [ ] Respond to user issues on Discord/Twitter
- [ ] Check Core Web Vitals in Vercel Analytics

### Day 2-3
- [ ] Verify rewards are being distributed
- [ ] Check for duplicate referral issues
- [ ] Monitor performance metrics
- [ ] Gather user feedback

### Day 4-7
- [ ] Analyze referral data and patterns
- [ ] Identify and fix any issues
- [ ] Optimize based on user feedback
- [ ] Prepare post-mortem/retrospective

---

## Emergency Contacts

**If Critical Issues**:
- [ ] SNAG Team: [Contact info]
- [ ] Vercel Support: vercel.com/support
- [ ] Backend Team: [Contact info]

**If Redirect Broken**:
1. Check Vercel deployment status
2. Verify `/r/[code]/page.tsx` exists in code
3. Redeploy from main branch

**If SNAG Not Receiving Code**:
1. Verify env var NEXT_PUBLIC_SNAG_LOYALTY_URL is correct
2. Test URL manually: visit `loyalty.shiftrwa.xyz/?ref=test`
3. Check SNAG team has deployed latest code

---

## Success Criteria ✅

**All of these must be true**:
- [ ] Redirect works: `/r/code` → SNAG with `?ref=code`
- [ ] Dashboard shows branded referral links
- [ ] Share buttons use branded links
- [ ] Mobile view works perfectly
- [ ] Lighthouse scores ≥85
- [ ] Zero critical errors in first 24 hours
- [ ] SNAG tracks referral codes
- [ ] Rewards calculated correctly
- [ ] No user complaints about referral system

---

## Quick Reference URLs

**Test URLs**:
- Home: https://airdrop.shiftrwa.xyz
- Dashboard: https://airdrop.shiftrwa.xyz/airdrop
- Register: https://airdrop.shiftrwa.xyz/register
- Test Redirect: https://airdrop.shiftrwa.xyz/r/test123
- SNAG Direct: https://loyalty.shiftrwa.xyz/?ref=test123

**Management URLs**:
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub: https://github.com/AxelShift/Shift-Airdrop-Backend
- API Status: https://shift-airdrop-backend.onrender.com/health

---

## Notes for Launch Team

**Remember**:
1. Test on REAL devices, not just browser
2. Test on REAL user account (not your admin account)
3. Test both referral paths (branded + direct SNAG)
4. Monitor for first 24 hours continuously
5. Have rollback plan ready (redeploy previous version)
6. Be ready to hotfix critical issues immediately

**Stay calm**: Most issues are minor and fixable. The system is well-tested and ready to go! 🚀

Good luck with the launch! You've got this! 💪

---

## Rapid Response Commands

If you need to redeploy:
```bash
cd /c/Users/Axel/Shift_Backend_Logic
git add .
git commit -m "hotfix: [brief description]"
git push origin main
# Then redeploy in Vercel dashboard
```

If you need to check logs:
```bash
# Vercel: Deployments → Select deployment → Logs
# Backend: Check Render.com service logs
# Frontend: Check browser console (F12)
```

---

**Launch Time: __________ (Fill in actual time)**
**Launch Team: __________**
**Backup Contact: __________**

✅ Ready to launch!
