# Production Wallet Testing Guide

## Overview
After deploying to Vercel, test all 7 wallet types on the production domain.

## Pre-Testing Requirements
1. Install all 7 wallet extensions/apps on your browser
2. Create test accounts or use existing wallets
3. Have browser DevTools open (F12) to monitor network and console
4. Test on the production domain: https://airdrop.shiftrwa.xyz

## Test Checklist

### 1. Phantom Wallet
- [ ] Browser has Phantom extension installed
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet" button
- [ ] Select "Phantom"
- [ ] Approve in Phantom popup
- [ ] Verify connected wallet address shows
- [ ] Reload page - should auto-reconnect without popup
- [ ] Check browser console for "[Wallet] Phantom connected:" message

### 2. MetaMask EVM
- [ ] Browser has MetaMask extension
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet"
- [ ] Select "MetaMask"
- [ ] If MetaMask Solana available: should connect to Solana
- [ ] If only EVM: should connect to Ethereum
- [ ] Approve in MetaMask popup
- [ ] Verify connected address shows (starts with 0x for EVM)
- [ ] Check console for "[Wallet] MetaMask connected:" message

### 3. MetaMask Solana (Wallet Standard)
- [ ] MetaMask extension has Solana enabled
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet"
- [ ] Select "MetaMask"
- [ ] Should connect to Solana (not EVM)
- [ ] Check console for "[Wallet] MetaMask Solana connected:" message
- [ ] Verify Solana address displays (Base58 format)

### 4. Backpack Wallet
- [ ] Backpack extension installed
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet"
- [ ] Select "Backpack"
- [ ] Approve in Backpack
- [ ] Verify Solana address connected
- [ ] Test account switching in Backpack extension
- [ ] Verify address updates in app

### 5. Solflare Wallet
- [ ] Solflare extension installed
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet"
- [ ] Select "Solflare"
- [ ] Approve in Solflare popup
- [ ] Verify Solana address connected
- [ ] Reload page - auto-reconnect should work
- [ ] Check console for "[Wallet] Solflare connected:" message

### 6. Magic Eden Wallet
- [ ] Magic Eden extension installed
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet"
- [ ] Select "Magic Eden"
- [ ] Approve in Magic Eden popup
- [ ] Verify Solana address connected
- [ ] Check console for "[Wallet] Magic Eden connected:" message

### 7. Trust Wallet
- [ ] Trust Wallet app/extension installed
- [ ] Open https://airdrop.shiftrwa.xyz
- [ ] Click "Connect Wallet"
- [ ] Select "Trust Wallet"
- [ ] Should prefer Solana chain if available
- [ ] Approve in Trust Wallet
- [ ] Verify Solana address connected
- [ ] Test on mobile if possible

## Auto-Reconnection Testing
1. Connect any wallet and verify address shows
2. Reload page (Cmd+Shift+R or Ctrl+Shift+F5 for hard refresh)
3. Should auto-connect WITHOUT showing wallet popup
4. Verify address immediately visible
5. Check localStorage: 
   - Key: `shift_wallet` (contains address)
   - Key: `shift_wallet_type` (contains wallet type)

## Account Switching Test
1. Connect Phantom wallet
2. Switch accounts within Phantom extension
3. App should update wallet address automatically
4. Verify new address shown in app
5. Repeat for other wallets

## Disconnect Testing
1. Connect any wallet
2. Disconnect from wallet extension
3. App should clear wallet state
4. "Connect Wallet" button should reappear
5. localStorage should be cleared

## Network Sync Testing
1. Open browser DevTools → Network tab
2. Connect Solana wallet (Phantom, Backpack, Solflare, Magic Eden, MetaMask Solana)
3. Should see POST request to `/api/airdrop/sync`
4. Request should include wallet address
5. Response should be 200 OK
6. Note: EVM wallets (MetaMask) skip sync (SHIFT is Solana-based)

## Console Monitoring
Open DevTools → Console and look for these log messages:

```javascript
// Phantom
[Wallet] Phantom connected: 0x...

// MetaMask Solana
[Wallet] MetaMask Solana connected: ...

// MetaMask EVM
[Wallet] MetaMask connected: 0x...

// Backpack
(no specific log, should work silently)

// Solflare
(no specific log, should work silently)

// Magic Eden
[Wallet] Magic Eden connected: ...

// Wallet Sync (Solana only)
[Wallet] Sync triggered for 0x...

// Disconnect
[Wallet] Disconnecting wallet type: phantom
[Wallet] Wallet state cleared from localStorage
```

## Error Handling Tests
1. Click "Connect Wallet" and close popup without approving
   - Should show "Phantom connection rejected or failed" in console
   - App should not be stuck in loading state

2. Disconnect from wallet extension while app is open
   - App should detect disconnect
   - Clear wallet state
   - Show "Connect Wallet" button again

3. Switch chains in MetaMask while connected
   - For EVM: should work normally
   - Verify address still displays

## Referral Redirect Testing
1. Click on a referral link: https://airdrop.shiftrwa.xyz/r/TEST123
2. Should redirect to: https://loyalty.shiftrwa.xyz/?ref=TEST123
3. Should happen server-side (instant redirect, no redirect JS)

## Performance Testing
1. Time wallet connection establishment
   - Phantom: Should be < 2 seconds
   - MetaMask: Should be < 2 seconds
   - Other wallets: < 3 seconds

2. Monitor page load time with cached wallet
   - Hard refresh: ~2-3 seconds
   - Soft refresh: < 500ms (localStorage retrieval)

## PostHog Analytics
If PostHog is configured, check:
1. Event: "wallet_connected"
   - Property: wallet_type (phantom, metamask, etc.)
   - Property: chain (solana, evm)

2. Event: "wallet_disconnected"
   - Property: wallet_type

3. Event: "sync_triggered"
   - Property: wallet (address)

## Final Verification Checklist
- [ ] All 7 wallet types connect successfully
- [ ] Auto-reconnection works (reload page)
- [ ] Account switching works
- [ ] Disconnect works
- [ ] Solana wallets trigger API sync
- [ ] Console shows proper log messages
- [ ] No JavaScript errors
- [ ] Referral redirects work
- [ ] Performance is acceptable
- [ ] Analytics events logged correctly

## Sign-off
Once all tests pass, sign off on production readiness:
- Date: _________
- Tester: _________
- Notes: _________
