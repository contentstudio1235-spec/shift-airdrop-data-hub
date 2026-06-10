# 🔧 Referral System Technical Implementation Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REFERRAL TRACKING FLOW                       │
└─────────────────────────────────────────────────────────────────┘

User A (Referrer)                                   User B (Referred)
       │                                                  │
       ├─ Gets referral code from SHIFT                  │
       │  "airdrop.shiftrwa.xyz/r/code123"              │
       │                                                  │
       └─ Shares link on social media                    │
                                                         │
                         User B clicks link ◄─────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ airdrop.shiftrwa.xyz│
                    │   /r/code123        │
                    └─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Next.js Redirect   │
                    │  (server-side)      │
                    └─────────────────────┘
                                │
                                ▼
                    ┌────────────────────────────────┐
                    │   loyalty.shiftrwa.xyz         │
                    │   /?ref=code123                │
                    └────────────────────────────────┘
                                │
                                ▼
                    ┌────────────────────────────────┐
                    │    SNAG Loyalty Platform       │
                    │  - Reads ?ref= parameter       │
                    │  - Links to referrer wallet    │
                    │  - Pre-registration created    │
                    └────────────────────────────────┘
                                │
                    ┌───────────┴──────────────┐
                    ▼                          ▼
            User B completes         SNAG records:
            registration at SNAG     - Referrer: User A wallet
                    │                - Referred: User B wallet
                    ▼                - Timestamp
            User B earns XP           - Status: Active
            through activities        
                    │
                    ▼
            ┌─────────────────┐
            │ Reward User A:  │
            │ - 100 XP flat   │
            │ - 5% of User B  │
            │   total XP      │
            └─────────────────┘
                    │
                    ▼
            SHIFT Dashboard
            Shows referral bonus
```

---

## Step 1: Frontend Referral Link Generation

### Location: `frontend/app/airdrop/page.tsx` (Lines 590-715)

**Current Implementation** (Verified ✅):
```jsx
// Get referral code from API response
const referralCode = referralLinks?.customLink || 
                    referralLinks?.defaultLink?.split('/').pop();

// Format as branded SHIFT link
const brandedLink = `${process.env.NEXT_PUBLIC_AIRDROP_URL}/r/${referralCode}`;

// Display to user
<input readOnly value={brandedLink} />
```

**What happens**:
1. User connects wallet on airdrop dashboard
2. Component fetches referral links via `fetchReferralLinks(wallet)`
3. API returns either:
   - `customLink`: "alex_shift" (if user created custom code)
   - `defaultLink`: "wlt_0x1234..." (auto-generated from wallet)
4. Frontend formats as: `airdrop.shiftrwa.xyz/r/[code]`
5. User shares this branded link

**Verification**:
```bash
# Test endpoint
curl "https://shift-airdrop-backend.onrender.com/api/snag/referral/{wallet}" | jq .

# Expected response
{
  "defaultLink": "wlt_0x1234...",
  "customLink": "alex_shift" // optional
}
```

---

## Step 2: Redirect Route Implementation

### Location: `frontend/app/r/[code]/page.tsx`

**Current Implementation** (Created ✅):
```typescript
import { redirect } from 'next/navigation';

export default function ReferralRedirectPage({ params }: { params: { code: string } }) {
  const { code } = params;

  // Validate code format (alphanumeric with underscores/hyphens, max 50 chars)
  if (!code || !/^[a-zA-Z0-9_-]{1,50}$/.test(code)) {
    redirect('https://loyalty.shiftrwa.xyz');
  }

  // Redirect to SNAG loyalty page with ref param
  redirect(`https://loyalty.shiftrwa.xyz/?ref=${encodeURIComponent(code)}`);
}
```

**What happens**:
1. Browser requests: `https://airdrop.shiftrwa.xyz/r/testcode`
2. Next.js matches dynamic route `[code]` with `testcode`
3. Server validates code: `/^[a-zA-Z0-9_-]{1,50}$/`
4. If valid: server-side redirect (HTTP 307)
   ```
   Location: https://loyalty.shiftrwa.xyz/?ref=testcode
   ```
5. If invalid: redirect to base SNAG page
   ```
   Location: https://loyalty.shiftrwa.xyz
   ```
6. Browser navigates to SNAG with `?ref=testcode` in URL

**Verification**:
```bash
# Test redirect
curl -i "https://airdrop.shiftrwa.xyz/r/testcode" 2>/dev/null | grep -A2 "HTTP"
# Expected: HTTP/1.1 307 Temporary Redirect (or 308)
#           Location: https://loyalty.shiftrwa.xyz/?ref=testcode

# Test invalid code
curl -i "https://airdrop.shiftrwa.xyz/r/!!!invalid!!!" 2>/dev/null | grep "Location"
# Expected: Location: https://loyalty.shiftrwa.xyz
```

---

## Step 3: SNAG Receives Referral Parameter

### Location: SNAG Loyalty Page (External)

**Expected SNAG Behavior**:

When user lands on `loyalty.shiftrwa.xyz/?ref=testcode`, SNAG should:

1. **Extract parameter**:
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   const referralCode = urlParams.get('ref');
   // referralCode = "testcode"
   ```

2. **Store in session/state**:
   ```javascript
   sessionStorage.setItem('referralCode', referralCode);
   ```

3. **Pre-fill registration form** (if applicable):
   ```html
   <input value="testcode" name="referralCode" />
   ```

4. **Send with signup/registration**:
   ```javascript
   const signupData = {
     wallet: userWallet,
     referralCode: "testcode",
     email: userEmail,
     // ... other fields
   };
   
   POST /api/auth/register
   Body: signupData
   ```

**To Verify** (Check Network Tab):
1. Open DevTools: F12
2. Go to Network tab
3. Visit: `https://loyalty.shiftrwa.xyz/?ref=TESTCODE`
4. Look for requests that include `ref` parameter
5. Check initial page load and subsequent API calls

---

## Step 4: SNAG Backend Stores Referral

### Location: SNAG Backend (External)

**Expected SNAG Database Entry**:

```sql
-- SNAG referral_relationships table (hypothetical)
INSERT INTO referral_relationships (
  referrer_wallet,
  referred_wallet,
  referral_code,
  source, -- "airdrop" or "loyalty"
  created_at,
  status
) VALUES (
  '0xReferrerWallet',      -- Resolved from code
  '0xReferredWallet',      -- From registration
  'testcode',              -- Original code
  'branded_link',          -- Source tracking
  NOW(),
  'active'
);
```

**What needs to happen**:
1. Resolve referral code to referrer's wallet
   - If `customLink`: lookup in custom_codes table
   - If `defaultLink`: extract wallet from code
2. Link referrer and referred user
3. Track source (branded link vs direct SNAG)
4. Mark as active referral

---

## Step 5: Reward Distribution

### A. Flat Referral Bonus (100 XP)

**When**: User completes first quest or earns first XP

```javascript
// SNAG backend
if (isFirstEarning(userId) && hasActiveReferrer(userId)) {
  const referrerWallet = getReferrer(userId);
  
  // Award flat bonus
  awardXP(referrerWallet, 100, {
    type: 'referral_bonus',
    referredUser: userId,
    timestamp: NOW()
  });
}
```

**Verification**:
```bash
# Check User A's XP history
# Should include entry: "+100 XP - Referral Bonus (Invited User B)"
```

### B. Percentage of Referred User's XP (5%)

**When**: Continuously as referred user earns XP

```javascript
// SNAG backend - on every XP award
function awardXP(userId, amount, reason) {
  // Award to user
  user.xp += amount;
  
  // If user was referred, award percentage to referrer
  const referrer = getReferrer(userId);
  if (referrer) {
    const bonusXP = Math.floor(amount * 0.05);
    awardXP(referrer, bonusXP, {
      type: 'referral_percentage',
      percentage: 5,
      sourcedFrom: userId,
      originalAmount: amount
    });
  }
}
```

**Example**:
- User B earns 1000 XP total
- User A (referrer) receives:
  - 100 XP flat bonus (one time)
  - 50 XP (5% of 1000) ongoing

**Verification**:
```bash
# Check User A's XP balance
xpFromReferrals = 100 + (referredUser.totalXP * 0.05)

# Example: Referred user has 1000 XP
# Total bonus = 100 + (1000 * 0.05) = 150 XP
```

---

## Step 6: Display Referral Stats on SHIFT Dashboard

### Location: `frontend/app/airdrop/page.tsx`

**What to Add**:

```jsx
// Fetch referral stats from backend
const referralStats = await fetchReferralStats(wallet);

// Display stats card
<div className="card">
  <div className="section-title">Your Referrals</div>
  
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
    {/* Total Referrals */}
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 4 }}>
        Total Referrals
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--mint)' }}>
        {referralStats?.totalReferrals || 0}
      </div>
    </div>
    
    {/* Referral Bonus XP */}
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 4 }}>
        Referral Bonus XP
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--mint)' }}>
        {referralStats?.totalBonusXP || 0}
      </div>
    </div>
  </div>
  
  {/* Referral List */}
  {referralStats?.referrals?.length > 0 && (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 12, fontWeight: 600 }}>
        Referred Users
      </div>
      {referralStats.referrals.map((ref) => (
        <div key={ref.wallet} style={{ 
          padding: '12px', 
          background: 'var(--panel)', 
          borderRadius: 8, 
          marginBottom: 8,
          fontSize: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{shortWallet(ref.wallet)}</span>
            <span style={{ color: 'var(--mint)', fontWeight: 600 }}>+{ref.bonusXP} XP</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>
            Referred: {formatDate(ref.dateReferred)}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**Backend Endpoint Needed**:

```typescript
// GET /api/snag/referral-stats/{wallet}
// Returns:
{
  wallet: "0x...",
  totalReferrals: 5,
  totalBonusXP: 250, // 100 flat * 5 + percentage bonuses
  activeReferrals: 4,
  referrals: [
    {
      wallet: "0x...",
      dateReferred: "2025-01-01T00:00:00Z",
      bonusXP: 100,
      earnedXP: 1500,
      status: "active"
    },
    // ...more
  ]
}
```

---

## Edge Cases & Solutions

### Case 1: User Clicks Link Multiple Times
**Problem**: Same user registers with referral code twice
**Solution**: SNAG should deduplicate by wallet address
- Only count first registration as referral
- Prevent double-awarding of bonus

### Case 2: Code Contains Special Characters
**Problem**: URL encoding issues with code
**Solution**: Current implementation uses `encodeURIComponent(code)`
- Example: `code with spaces` → `code%20with%20spaces`
- SNAG must decode parameter properly

**Verify**:
```javascript
// Frontend
encodeURIComponent("alex_shift");      // "alex_shift" (no change)
encodeURIComponent("code with space");  // "code%20with%20space"

// SNAG backend
decodeURIComponent("code%20with%20space"); // "code with space"
```

### Case 3: Expired or Deleted Code
**Problem**: User created custom code, then deleted it
**Solution**: Handle gracefully
- Check if code is still active before linking
- If not found, fall back to default behavior
- Don't award bonus if code invalid

### Case 4: Network Latency
**Problem**: User clicks link but connection is slow
**Solution**: Ensure redirect happens server-side
- Current implementation: ✅ Server-side redirect
- No JavaScript execution needed
- Works even if SNAG is slow to load

### Case 5: Direct URL Access
**Problem**: User shares SNAG URL directly: `loyalty.shiftrwa.xyz/?ref=code`
**Expected**: Works identically to branded link
- SNAG reads `?ref=` parameter
- Links referrer and referred user
- Awards same rewards
- ✅ Already supported by SNAG

---

## Testing Script

### Local Testing (Before Deployment)

```bash
#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing Referral System${NC}\n"

# Test 1: Redirect works
echo -e "${YELLOW}Test 1: Check redirect route exists${NC}"
curl -s "http://localhost:3000/r/test123" -L -I | head -5
echo ""

# Test 2: Backend API
echo -e "${YELLOW}Test 2: Test referral code resolution${NC}"
curl -s "http://localhost:3001/api/airdrop/ref/test123" | jq . || echo -e "${RED}Failed${NC}"
echo ""

# Test 3: Verify env variables
echo -e "${YELLOW}Test 3: Check environment variables${NC}"
if grep -q "NEXT_PUBLIC_SNAG_LOYALTY_URL" frontend/.env.local; then
  echo -e "${GREEN}✓ NEXT_PUBLIC_SNAG_LOYALTY_URL set${NC}"
else
  echo -e "${RED}✗ NEXT_PUBLIC_SNAG_LOYALTY_URL missing${NC}"
fi

if grep -q "NEXT_PUBLIC_AIRDROP_URL" frontend/.env.local; then
  echo -e "${GREEN}✓ NEXT_PUBLIC_AIRDROP_URL set${NC}"
else
  echo -e "${RED}✗ NEXT_PUBLIC_AIRDROP_URL missing${NC}"
fi
echo ""

# Test 4: Check frontend build
echo -e "${YELLOW}Test 4: Check frontend build${NC}"
if [ -d "frontend/.next" ]; then
  echo -e "${GREEN}✓ Frontend built${NC}"
else
  echo -e "${RED}✗ Frontend not built${NC}"
fi

echo -e "\n${YELLOW}Testing complete!${NC}"
```

**Save as**: `test-referral-system.sh`
**Run**: `bash test-referral-system.sh`

---

## Deployment Checklist

- [ ] Frontend code pushed to GitHub
- [ ] Vercel environment variables set:
  - [ ] NEXT_PUBLIC_SNAG_LOYALTY_URL
  - [ ] NEXT_PUBLIC_AIRDROP_URL
  - [ ] NEXT_PUBLIC_API_URL
- [ ] Vercel deployment successful (green checkmark)
- [ ] Build includes `/r/[code]` route
- [ ] Test redirect: `airdrop.shiftrwa.xyz/r/test` → SNAG
- [ ] SNAG team confirmed `?ref=` parameter is handled
- [ ] Backend API verified for referral code resolution
- [ ] Test with real referral code from test account
- [ ] Monitor logs for first 24 hours

---

## Monitoring & Debugging

### Check Vercel Build Output
```
Vercel Dashboard → Deployments → [Latest] → Logs
Look for: "✓ Compiled successfully"
Look for: "ƒ /r/[code]" in route list
```

### Check Frontend Logs
```javascript
// Browser console (F12)
console.log(process.env.NEXT_PUBLIC_SNAG_LOYALTY_URL);
console.log(process.env.NEXT_PUBLIC_AIRDROP_URL);
```

### Check Redirect
```
1. Open DevTools (F12)
2. Network tab
3. Visit: airdrop.shiftrwa.xyz/r/testcode
4. Look for 307/308 response
5. Check redirect URL in Location header
```

### Check SNAG Integration
```
1. Visit: loyalty.shiftrwa.xyz/?ref=testcode
2. Check if ?ref= in URL bar
3. Check Network tab for API calls with "ref" parameter
4. Verify pre-registration form has referral code
```

---

## Success Indicators ✅

After launch, confirm:

- [ ] Referral links work end-to-end
- [ ] Both path types tracked identically
- [ ] Rewards calculated correctly (100 + 5%)
- [ ] Dashboard shows referral stats
- [ ] No console errors
- [ ] No redirect loops
- [ ] Performance metrics good (< 3s load)
- [ ] Zero referral-related error reports in first week

**You're all set!** The system is designed to work seamlessly. 🚀
