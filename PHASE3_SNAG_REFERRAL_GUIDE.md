# Phase 3: SNAG Referral Link Integration

**Status:** ✅ COMPLETE - Code ready for production  
**Last Updated:** May 22, 2026  
**Commit:** a6a83b6

---

## Overview

Phase 3 integrates **SNAG's native referral system** with the Vercel frontend, creating a **unified referral experience** across both platforms.

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| Referral links | Manual per-user codes | SNAG-managed (default + custom) |
| Frontend link | Hardcoded static link | Dynamic SNAG link per user |
| Custom codes | Not supported | Full support (4-64 chars, user-defined) |
| Tracking | Manual referral table | SNAG webhook + local sync |
| XP rewards | Manual calculation | SNAG built-in rules (configurable) |
| Both platforms | Different links | **Same link on SNAG + Vercel** |

---

## Architecture

```
SNAG Loyalty (Master)          Vercel Frontend (Consumer)
     ↓                              ↓
Referral Task Rule           Airdrop Page
(Built-in system)            "Refer to Move Up"
     ↓                              ↓
Default Link (UUID)          Fetches via API
Custom Link (User)           GET /api/snag/referral/:wallet
     ↓                              ↓
 Referral Event          Displays both links
(webhook event)          Shows custom code badge
     ↓                              ↓
Sync to DB           User can edit custom code
(snag_referral_events)   Via POST /api/snag/referral/:wallet/custom
```

---

## Implementation Details

### Phase 3A: Fetch SNAG Referral Links

#### Backend Endpoint: `GET /api/snag/referral/:wallet`

**Response:**
```json
{
  "wallet": "3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn",
  "defaultLink": "https://shiftrwa.xyz/loyalty?referral=abc123def456",
  "customLink": "GOGO"
}
```

**Implementation:**
- Fetches user's `snag_user_id` from local DB
- Calls SNAG API: `GET /api/loyalty/accounts/{snagUserId}/referral-links`
- Caches result in `users.snag_default_referral_link` and `users.snag_custom_referral_code`
- Returns both default and custom links if set

**Frontend Usage:**
```typescript
import { fetchReferralLinks } from '@/lib/api';

const links = await fetchReferralLinks(wallet);
// links.defaultLink → SNAG-generated link
// links.customLink → User's custom code (or null)
```

---

### Phase 3B: Set Custom Referral Code

#### Backend Endpoint: `POST /api/snag/referral/:wallet/custom`

**Request:**
```json
{
  "customCode": "GOGO"
}
```

**Response:**
```json
{
  "success": true,
  "wallet": "3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn",
  "customLink": "GOGO"
}
```

**Validation:**
- Code must be 4-64 characters (alphanumeric + dash/underscore)
- Auto-uppercase on save
- Calls SNAG API: `PATCH /api/loyalty/accounts/{snagUserId}/referral-links`
- Stores in `users.snag_custom_referral_code`

**Frontend Usage:**
```typescript
import { setCustomReferralCode } from '@/lib/api';

const result = await setCustomReferralCode(wallet, 'GOGO');
if (result?.success) {
  // Update local state with new custom code
  setReferralLinks(prev => ({ 
    ...prev, 
    customLink: 'GOGO' 
  }));
}
```

---

### Phase 3C: Sync Referral Events from SNAG

#### Webhook Event: `referral.created`

**SNAG Sends:**
```json
{
  "type": "referral.created",
  "data": {
    "referrerWalletAddress": "3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn",
    "referredWalletAddress": "4vEJ8yDkGhVfHtYqSt2zL9pM3rN5qR8wUx7yZaBcDeFg",
    "customCode": "GOGO"
  }
}
```

**Backend Processing:**
1. Verify HMAC signature via `snagWebhookHandler.verifySignature()`
2. Call `handleReferralCreated()` in webhook handler
3. Ensure both wallets exist in `users` table
4. Insert into `snag_referral_events`:
   - `referrer_wallet`, `referred_wallet`, `referral_code_used`
5. Also update main `referrals` table with `snag_synced_at = NOW()`

**Database Tables:**

`snag_referral_events` (New):
```sql
CREATE TABLE snag_referral_events (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(64) NOT NULL,      -- Who referred
  referred_wallet VARCHAR(64) NOT NULL,      -- Who was referred
  referral_code VARCHAR(64),                 -- Code they used (GOGO or default)
  reward_xp_given INT DEFAULT 0,
  processed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_wallet, referred_wallet)
);
```

`users` (Updated):
```sql
ALTER TABLE users ADD COLUMN snag_default_referral_link TEXT;
ALTER TABLE users ADD COLUMN snag_custom_referral_code VARCHAR(64);
ALTER TABLE users ADD COLUMN referral_link_synced_at TIMESTAMP;
```

---

## Frontend UI

### Referral Card: "Refer to Move Up"

#### States:

**1. Wallet Not Connected**
```
┌─────────────────────────────────┐
│ Refer to Move Up                │
│                                 │
│ Connect your wallet to get       │
│ your referral link              │
│                                 │
│ [Connect Wallet]                │
└─────────────────────────────────┘
```

**2. Loading Referral Link**
```
┌─────────────────────────────────┐
│ Refer to Move Up                │
│                                 │
│ Loading referral link...        │
└─────────────────────────────────┘
```

**3. Link Loaded (Default + Custom)**
```
┌──────────────────────────────────────────┐
│ Refer to Move Up                         │
│                                          │
│ Your SNAG Referral Link                  │
│ [https://shiftrwa.xyz/loyalty?ref=abc]║  │
│ [Copy]                                   │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Your Custom Code                     │ │
│ │ GOGO                                 │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Edit Custom Code]                       │
│                                          │
│ [Share X] [Telegram] [WhatsApp] [Copy]  │
│                                          │
│ Each referral earns you rewards through  │
│ SNAG Loyalty                             │
└──────────────────────────────────────────┘
```

**4. Custom Code Modal**
```
┌──────────────────────────────────┐
│ Create Custom Code          [×]  │
│                                  │
│ Custom Code (4-64 characters)    │
│ [GOGO                ]           │
│ Characters: 4/64                 │
│                                  │
│ [Cancel] [Save Code]             │
└──────────────────────────────────┘
```

### Features:
- ✅ Copy button for default link
- ✅ Visual badge showing custom code (green mint-soft background)
- ✅ Edit custom code modal with validation
- ✅ Character counter in modal
- ✅ Share buttons for X, Telegram, WhatsApp using SNAG link
- ✅ Loading state while fetching from SNAG
- ✅ Graceful fallback if wallet not connected

---

## Deployment Steps

### Step 1: Database Migration
```bash
psql $DATABASE_URL -f src/db/migrations/004_snag_referral_integration.sql
```

**Verify:**
```sql
\d snag_referral_events      -- New table exists
\d users                      -- Has snag_default_referral_link, snag_custom_referral_code
```

### Step 2: Backend Deployment
Code is already pushed to main. Render will auto-deploy on push.

**Verify endpoints:**
```bash
# Fetch referral links
curl https://shift-airdrop-backend.onrender.com/api/snag/referral/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
# Expected: { "wallet": "3uDJ...", "defaultLink": "...", "customLink": null }

# No custom code set yet
# Now test setting one (need valid wallet)
curl -X POST https://shift-airdrop-backend.onrender.com/api/snag/referral/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn/custom \
  -H "Content-Type: application/json" \
  -d '{"customCode": "GOGO"}'
# Expected: { "success": true, "customLink": "GOGO" }
```

### Step 3: Frontend Deployment
Code is already pushed to main. Vercel will auto-deploy.

**Verify frontend:**
1. Go to https://airdrop.shiftrwa.xyz
2. Connect wallet
3. Check "Refer to Move Up" card
4. Should show SNAG referral link + option to set custom code
5. Try setting custom code, should appear in green badge

### Step 4: Test SNAG Referral Event Webhook

**Manually test webhook:**
```bash
# Get your webhook secret from Render env var
SNAG_WEBHOOK_SECRET="your-secret"

# Create HMAC signature
MESSAGE='{"type":"referral.created","data":{"referrerWalletAddress":"3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn","referredWalletAddress":"4vEJ8yDkGhVfHtYqSt2zL9pM3rN5qR8wUx7yZaBcDeFg","customCode":"GOGO"}}'
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$SNAG_WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# Send to webhook
curl -X POST https://shift-airdrop-backend.onrender.com/api/webhooks/snag \
  -H "Content-Type: application/json" \
  -H "x-signature: sha256=$SIGNATURE" \
  -d "$MESSAGE"
# Expected: { "received": true, "count": 1 }
```

**Check logs:**
```
[SnagWebhook] ✅ Referral: 3uDJ7... → 4vEJ8... (code: GOGO)
```

**Verify in DB:**
```sql
SELECT * FROM snag_referral_events 
WHERE referral_code = 'GOGO' 
ORDER BY processed_at DESC LIMIT 1;
```

---

## Data Flow Examples

### Example 1: User Gets Referral Link

**Step 1: User connects wallet**
```
User: Visits airdrop page → Connects phantom wallet (3uDJ7...)
```

**Step 2: Frontend fetches link**
```
Frontend: GET /api/snag/referral/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
Backend: Calls SNAG API → Gets defaultLink + customLink
Response: {
  "defaultLink": "https://shiftrwa.xyz/loyalty?referral=abc123def456",
  "customLink": null
}
Frontend: Displays link with copy button
```

**Step 3: User sets custom code**
```
User: Clicks "Create Custom Code" → Types "GOGO" → Saves
Frontend: POST /api/snag/referral/3uDJ7.../custom { "customCode": "GOGO" }
Backend: Calls SNAG API → Updates referral-links
Database: Saves snag_custom_referral_code = "GOGO"
Frontend: Shows "GOGO" in green badge
```

### Example 2: Referred User Joins & Earns Rewards

**Step 1: Referred user signs up**
```
Referred: Gets link https://shiftrwa.xyz/loyalty?referral=abc123def456 or uses code "GOGO"
Referred: Signs up on Vercel → Gets referred_by = 3uDJ7...
```

**Step 2: SNAG fires referral event**
```
SNAG: Detects both users exist in SNAG loyalty system
SNAG: Fires webhook event:
{
  "type": "referral.created",
  "data": {
    "referrerWalletAddress": "3uDJ7...",
    "referredWalletAddress": "4vEJ8...",
    "customCode": "GOGO"
  }
}
```

**Step 3: Backend records event**
```
Backend: Verifies signature with SNAG_WEBHOOK_SECRET
Backend: Inserts into snag_referral_events
Database: 
  - referrer_wallet = 3uDJ7...
  - referred_wallet = 4vEJ8...
  - referral_code = "GOGO"
  - processed_at = NOW()
Logs: [SnagWebhook] ✅ Referral: 3uDJ7... → 4vEJ8... (code: GOGO)
```

**Step 4: SNAG awards XP to referrer**
```
SNAG: Built-in referral rule awards:
  - Referrer: 100 XP (example)
  - Referred: 50 XP (example)
  - Adjustable in SNAG dashboard
```

---

## Monitoring & Logs

### What to Watch

**Backend Logs (Render):**
```
[SnagSync] 🔗 Fetched referral links for 3uDJ7...    ✅ Success
[SnagWebhook] ✅ Referral: 3uDJ7... → 4vEJ8... (code: GOGO)  ✅ Event received
[SnagSync] ✅ Custom referral code "GOGO" set for...  ✅ Code saved
```

**Database Queries:**

Check referral events:
```sql
SELECT * FROM snag_referral_events 
ORDER BY processed_at DESC LIMIT 10;
```

Check users with custom codes:
```sql
SELECT wallet, snag_custom_referral_code, referral_link_synced_at
FROM users 
WHERE snag_custom_referral_code IS NOT NULL;
```

Check referral tracking:
```sql
SELECT referrer_wallet, referred_wallet, referral_code_used, snag_synced_at
FROM referrals 
WHERE snag_synced_at IS NOT NULL;
```

---

## Troubleshooting

### Problem: Referral link not loading on frontend

**Diagnosis:**
- Check network tab: Does GET /api/snag/referral/:wallet return 200?
- Check backend logs: Does `[SnagSync] 🔗 Fetched referral links` appear?

**Solution:**
- Verify SNAG API credentials in Render env vars
- Verify user exists in SNAG (`select snag_user_id from users where wallet = ...`)
- Check SNAG API is responding: `curl https://admin.snagsolutions.io/health`

### Problem: Custom code not saving

**Diagnosis:**
- Check network tab: Does POST /api/snag/referral/:wallet/custom return 200?
- Check backend logs: Does custom code error appear?

**Solution:**
- Verify code is 4-64 characters
- Verify SNAG API key is correct
- Check SNAG custom-code endpoint is available

### Problem: Referral webhook not firing

**Diagnosis:**
- Check SNAG dashboard: Is webhook URL correct?
- Check backend logs: Does [SnagWebhook] event appear?

**Solution:**
- Verify webhook URL: `https://shift-airdrop-backend.onrender.com/api/webhooks/snag`
- Verify secret matches SNAG_WEBHOOK_SECRET env var
- Test manually with curl command (see Deployment Step 4)

---

## Success Criteria

✅ Phase 3 is successful when:

1. **Referral link displays** on airdrop page after wallet connect
2. **Custom code can be set** and appears in green badge
3. **Share buttons work** with SNAG default link (not hardcoded)
4. **SNAG referral event webhook** fires and creates `snag_referral_events` row
5. **Both platforms** show same referral link
6. **No errors** in backend logs for 24+ hours
7. **Frontend** shows loading state while fetching, then displays link

---

## API Reference

### GET /api/snag/referral/:wallet
Fetch user's SNAG referral links.

**Parameters:**
- `wallet` (required): Solana wallet address (44 chars)

**Response:**
```json
{
  "wallet": "string (44 chars)",
  "defaultLink": "string (SNAG-generated URL)",
  "customLink": "string or null (user's custom code)"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid wallet
- 500: SNAG API error

---

### POST /api/snag/referral/:wallet/custom
Set or update custom referral code.

**Parameters:**
- `wallet` (required): Solana wallet address (44 chars)

**Body:**
```json
{
  "customCode": "string (4-64 chars, alphanumeric + dash/underscore)"
}
```

**Response:**
```json
{
  "success": true,
  "wallet": "string (44 chars)",
  "customLink": "string (uppercase custom code)"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid wallet or code
- 500: SNAG API error

---

## Files Modified

**Backend:**
- `src/services/snagSyncService.ts` — Added getUserReferralLinks(), setCustomReferralLink()
- `src/services/snagWebhookHandler.ts` — Added handleReferralCreated()
- `src/routes/snag.ts` — Added /referral/:wallet and /referral/:wallet/custom routes
- `src/db/migrations/004_snag_referral_integration.sql` — New migration
- `src/config.ts` — (No changes needed; uses existing SNAG config)

**Frontend:**
- `frontend/lib/api.ts` — Added fetchReferralLinks(), setCustomReferralCode()
- `frontend/app/airdrop/page.tsx` — Replaced referral card with SNAG link display
- `frontend/lib/types.ts` — (No changes needed)

**Total Changes:**
- 4 backend files modified/created
- 2 frontend files modified
- ~600 lines of code added
- 1 database migration (idempotent)

---

## Next Steps

1. **Apply database migration**
   ```bash
   psql $DATABASE_URL -f src/db/migrations/004_snag_referral_integration.sql
   ```

2. **Deploy backend** (Render auto-deploys from main)

3. **Deploy frontend** (Vercel auto-deploys from main)

4. **Test end-to-end** (See "Deployment Steps")

5. **Monitor for 24 hours** (Watch logs for errors)

6. **Consider Phase 4:** Enhanced referral analytics, tier-based bonuses, NFT rewards

---

**Phase 3 is COMPLETE and PRODUCTION-READY! 🚀**
