# Wallet Connection Testing Guide

**Last Updated:** May 22, 2026  
**Status:** ✅ All fixes implemented and tested locally

---

## Quick Summary of Changes

| Component | Issue | Fix | Status |
|-----------|-------|-----|--------|
| WalletContext.tsx | MetaMask disconnect broken | Capture walletType before clearing state | ✅ Fixed |
| ConnectWalletModal.tsx | Generic icon designs | Updated with official wallet branding | ✅ Improved |
| NavBar.tsx + pages | Trade links internal | All changed to external URL | ✅ Fixed |
| All files | No debug logging | Added console logging for troubleshooting | ✅ Added |

---

## How to Test Locally

### Prerequisites
- Browser with wallet extensions installed (or use devtools to simulate)
- Latest code from main branch
- `npm run dev` running on localhost:3000

### Test 1: Phantom Connection & Disconnect ✅

```bash
# Start dev server
cd frontend && npm run dev

# Open browser to http://localhost:3000
```

**Steps:**
1. Click "Connect Wallet"
2. Select "Phantom" (marked as "Recommended")
3. ✓ Should see Phantom approve dialog
4. After approving:
   - Wallet address shows in navbar chip
   - Console logs: `[Wallet] Phantom connected: 3uDJ7x...`
5. Click wallet chip in navbar
6. Click "Disconnect"
   - Console logs: `[Wallet] Disconnecting wallet type: phantom`
   - Console logs: `[Wallet] Wallet state cleared from localStorage`
   - Wallet chip disappears
   - "Connect Wallet" button reappears

**Verify in DevTools:**
- Open Console tab (F12)
- Look for `[Wallet]` prefixed messages
- Open Application → LocalStorage
- Check that `shift_wallet` and `shift_wallet_type` are cleared after disconnect

---

### Test 2: Backpack Connection & Disconnect ✅

**Steps:**
1. Click "Connect Wallet"
2. Select "Backpack"
3. ✓ Should see Backpack approve dialog
4. After approving:
   - Wallet address shows in navbar chip
   - Console logs: `[Wallet] Backpack connected: <address>`
5. Disconnect (same as Test 1)

---

### Test 3: Solflare Connection & Disconnect ✅

**Steps:**
1. Click "Connect Wallet"
2. Select "Solflare"
3. ✓ Should see Solflare approve dialog
4. After approving:
   - Wallet address shows in navbar chip
   - Console logs: `[Wallet] Solflare connected: <address>`
5. Disconnect (same as Test 1)

---

### Test 4: MetaMask Connection & Disconnect ✅ [CRITICAL]

**This was the main issue fixed!**

**Steps:**
1. Click "Connect Wallet"
2. Scroll to "EVM" section
3. Select "MetaMask"
4. ✓ Should see MetaMask approve dialog
5. After approving:
   - EVM address shows in navbar chip (0x... format)
   - Console logs: `[Wallet] MetaMask connected: 0x...`
   - **KEY:** localStorage shows `shift_wallet_type: metamask`
6. Click wallet chip → dropdown menu
7. Click "Disconnect"
   - Console logs: `[Wallet] Disconnecting wallet type: metamask`
   - Console logs: `[Wallet] MetaMask disconnected (session cleared locally)`
   - Console logs: `[Wallet] Wallet state cleared from localStorage`
   - Wallet chip disappears
   - **KEY:** localStorage shows `shift_wallet_type` = empty

**Why this matters:**
- Previously, disconnect() set walletType to null BEFORE checking which type to disconnect
- This meant the `walletType === 'metamask'` check would never be true
- Now we capture it first, so MetaMask properly disconnects

---

### Test 5: Copy Address Button ✅

**Steps:**
1. Connect any wallet (Phantom, Backpack, Solflare, or MetaMask)
2. Click wallet chip in navbar
3. Click "Copy address" button
4. ✓ Address should be in clipboard
5. Paste it somewhere (e.g., text editor)
   - Should see full wallet address
   - For Solana: 44-character base58
   - For EVM: 0x + 40 hex characters

**Verify in DevTools:**
- Paste in console to see: `navigator.clipboard.readText()`

---

### Test 6: Trade Links (External) ✅

**Steps:**
1. Click "Trade" in navbar
   - ✓ Should open `https://app.shiftrwa.xyz/coming-soon` in NEW TAB
   - ✓ Current page should not change

2. Go to /register page
3. Look for "⚡ Complete your first trade" task
4. Click it
   - ✓ Should open same URL in NEW TAB

5. Go to /airdrop page (after connecting wallet)
6. If no positions, see "No active positions yet" empty state
7. Click "Go to Trade" button
   - ✓ Should open same URL in NEW TAB

---

### Test 7: Wallet Icons ✅

**Steps:**
1. Click "Connect Wallet"
2. Visually inspect icons:
   - **Phantom:** Purple gradient background with white design ✓
   - **Backpack:** Red background with backpack symbol ✓
   - **Solflare:** Orange background with diamond/star ✓
   - **MetaMask:** Orange background with fox silhouette ✓

3. All icons should look professional and recognizable
4. "Phantom" should have "Recommended" badge
5. Solana section should be first (primary)
6. EVM section should be second (after "or" divider)

---

### Test 8: Auto-Reconnect on Page Reload ✅

**Steps:**
1. Connect any wallet
2. Refresh page (Ctrl+R or Cmd+R)
3. ✓ Should auto-reconnect without showing dialog
4. Wallet chip should reappear immediately
5. Console logs: `[Wallet] Phantom connected: ...` (or other wallet type)

**Why this matters:**
- User shouldn't have to re-approve every time they refresh
- Uses `onlyIfTrusted: true` flag so no popup is shown
- Seamless UX

---

### Test 9: External Disconnection Detection ✅

**Advanced test (requires manual wallet manipulation):**

1. Connect Phantom
2. Open Phantom extension
3. Click the wallet chip in Phantom
4. Select different account
5. ✓ App should detect the change
6. Wallet chip should show new address
7. Console logs: `[Wallet] Phantom connected: <new_address>`

**Or for MetaMask:**
1. Connect MetaMask
2. In MetaMask extension, switch account
3. ✓ App detects account change
4. Wallet chip updates with new address

---

## Console Output Checklist

When running tests, you should see these patterns in the browser console:

```
✓ [Wallet] Phantom connected: 3uDJ7x...
✓ [Wallet] Disconnecting wallet type: phantom
✓ [Wallet] Wallet state cleared from localStorage

✓ [Wallet] MetaMask connected: 0x1234...
✓ [Wallet] MetaMask disconnected (session cleared locally)

✓ [Wallet] <wallet_type> connection rejected or failed
✓ [Wallet] <wallet_type> not installed, opening <url>
```

---

## Deployment Checklist

After all local tests pass:

### Frontend Deployment (Vercel)
```bash
# Ensure all tests pass
npm run build  # ✅ Should succeed with 0 errors

# Push to main
git push origin main

# Vercel auto-deploys from main branch
# Monitor: https://vercel.com/<project>/deployments
```

### Backend Deployment (Render)
```bash
# No backend changes needed for this fix
# All changes are frontend-only
```

---

## Production Verification

After deployment to production:

1. **Test on https://airdrop.shiftrwa.xyz**
   - [ ] MetaMask disconnect works
   - [ ] Copy address works
   - [ ] Trade links open in new tab
   - [ ] Wallet icons look correct

2. **Monitor Vercel Analytics**
   - [ ] No JavaScript errors
   - [ ] Web Vitals within acceptable range

3. **Monitor PostHog Events**
   - [ ] `wallet_connected` events firing
   - [ ] No errors related to wallet operations

4. **Monitor Console Logs**
   - [ ] No `[Wallet]` error messages in production
   - [ ] Connection flows are smooth

---

## Rollback Plan (If Needed)

If issues occur after production deployment:

```bash
# On Vercel dashboard:
1. Click "Deployments"
2. Find previous deployment (before this change)
3. Click the three dots
4. Select "Redeploy"

# Via CLI:
vercel rollback <deployment-id>
```

---

## Related PRs & Issues

- **Issue:** MetaMask disconnect not working
- **Issue:** Generic wallet icons
- **Issue:** Internal trade links should be external
- **PR:** All fixes in single commit: `Fix wallet connection issues...`

---

## Questions or Issues?

If you encounter any problems during testing:

1. Check browser console (F12) for `[Wallet]` logs
2. Check localStorage in DevTools (Application tab)
3. Check network tab for failed API calls
4. Check mobile responsiveness (some issues may only appear on mobile)

All changes are frontend-only and can be deployed independently without coordinating backend changes.

