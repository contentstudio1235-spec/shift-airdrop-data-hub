# 🎯 Referral Tracking Verification Plan

## Current Architecture

### Referral Paths
Both paths should funnel into SNAG's referral system:

```
Path 1: airdrop.shiftrwa.xyz/r/[code]
        ↓ (server-side redirect)
        loyalty.shiftrwa.xyz/?ref=[code]
        
Path 2: loyalty.shiftrwa.xyz/?ref=[code]
        ↓ (direct access)
        (same page)
```

Both converge at: `loyalty.shiftrwa.xyz/?ref=[code]`

---

## ✅ Verification Checklist

### 1. Frontend Redirect Works
**File**: `frontend/app/r/[code]/page.tsx`

```javascript
// CURRENT - Verify this exists:
redirect(`https://loyalty.shiftrwa.xyz/?ref=${encodeURIComponent(code)}`);
```

**Test**:
- [ ] Navigate to `airdrop.shiftrwa.xyz/r/test123`
- [ ] Should redirect to `loyalty.shiftrwa.xyz/?ref=test123`
- [ ] Check browser Network tab for 307/308 redirect
- [ ] Referral code should be preserved in URL

---

### 2. SNAG Receives Referral Parameter
**SNAG Backend Need to Verify**:

SNAG's loyalty page (`loyalty.shiftrwa.xyz`) must:
- [ ] Read `?ref=` query parameter from URL
- [ ] Extract referral code value
- [ ] Pass to user registration/login flow
- [ ] Associate user with referrer's wallet

**How to verify**:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit: `https://loyalty.shiftrwa.xyz/?ref=TESTCODE`
4. Look for requests that include `ref` parameter
5. Check SNAG's API calls for referral tracking

---

### 3. Referral Code Resolution
**Files**: 
- `backend/src/services/snagSyncService.ts`
- `backend/src/routes/airdrop.ts`

**What needs to happen**:

```javascript
// Endpoint: GET /api/airdrop/ref/{code}
// Returns ReferralBonusInfo with:
{
  code: "testcode",
  displayName: "TestKOL",
  isKol: true,
  multiplierBonus: 1.3, // 30% bonus
  multiplierType: "permanent" | "temporary"
}
```

**Verify**:
- [ ] Call: `GET https://shift-airdrop-backend.onrender.com/api/airdrop/ref/TESTCODE`
- [ ] Response includes all fields above
- [ ] Status 200 if valid, 404 if invalid
- [ ] Code is case-insensitive (or document requirement)

---

### 4. Referral Attribution in SNAG
**Key Question**: How does SNAG know who referred whom?

**Possible Implementation**:
1. User clicks `loyalty.shiftrwa.xyz/?ref=TESTCODE`
2. User completes pre-registration or signup
3. SNAG's backend:
   - [ ] Extracts `ref` from URL query param
   - [ ] Looks up user wallet associated with `TESTCODE`
   - [ ] Creates referral record: `Referrer: TESTCODE_USER → Referred: NEW_USER`
   - [ ] Stores in SNAG database

**To Verify** (Ask SNAG team):
- [ ] Is referral code the user's wallet address?
- [ ] Is referral code a custom string (like `@twitter_handle`)?
- [ ] How is the code mapped back to user wallet?
- [ ] When is referral credit awarded?

---

### 5. Reward Distribution
**Expected Behavior**:

#### Referrer Gets:
- [ ] 100 XP (flat bonus)
- [ ] 5% of referred user's total XP (ongoing)

#### Timeline:
- [ ] Awarded immediately when referred user registers? OR
- [ ] Awarded when referred user completes first quest? OR
- [ ] Awarded when referred user reaches milestone?

**To Verify** (Check SNAG's loyalty page):
1. Register as User A (get referral code)
2. Use User A's code to register User B
3. Complete some XP-earning activities as User B
4. Check User A's XP balance
5. Verify: User A received 100 + (5% of User B's XP)

---

## 🔍 End-to-End Testing Scenarios

### Scenario 1: Branded Link Flow
```
1. User A on airdrop.shiftrwa.xyz/airdrop
   → Gets referral link: airdrop.shiftrwa.xyz/r/USER_A_CODE
   
2. User A shares link on Twitter
   
3. User B clicks link
   → Browser navigates to: airdrop.shiftrwa.xyz/r/USER_A_CODE
   → Server redirects to: loyalty.shiftrwa.xyz/?ref=USER_A_CODE
   
4. User B at SNAG loyalty page
   → ?ref=USER_A_CODE is in URL
   → SNAG reads parameter
   → User B completes pre-registration with referral code
   
5. User B earns XP
   → User A automatically receives:
      - 100 XP (referral bonus)
      - 5% of User B's XP (ongoing)
   
6. Verification on Dashboard
   → User A sees updated XP balance
   → Both users appear as referral pair in SNAG
```

### Scenario 2: Direct SNAG Link Flow
```
1. User C at loyalty.shiftrwa.xyz/?ref=USER_A_CODE
   → Same behavior as Scenario 1 Step 4
   
2. User C earns XP
   → User A receives same rewards:
      - 100 XP
      - 5% of User C's XP
```

### Scenario 3: Custom Referral Code
```
1. User A creates custom code: "alex_shift"
   → New referral link: airdrop.shiftrwa.xyz/r/alex_shift
   
2. User B clicks link
   → Redirects to: loyalty.shiftrwa.xyz/?ref=alex_shift
   → SNAG resolves "alex_shift" back to User A's wallet
   
3. Rewards work the same way
```

---

## 🔗 Integration Points

### 1. Frontend → SNAG
**Current**: 
- `/r/[code]` redirects to `loyalty.shiftrwa.xyz/?ref=[code]`
- ✅ This is correct

**Verify**:
- [ ] Redirect preserves query parameter exactly
- [ ] No URL encoding issues
- [ ] SNAG receives parameter correctly

---

### 2. SNAG → Backend (Optional)
**Question**: Does SNAG sync referral data back to SHIFT backend?

**Possibilities**:

A) **SNAG handles everything** (recommended)
   - SNAG stores referral relationships
   - SNAG awards rewards
   - SHIFT doesn't need to do anything
   - Check SNAG dashboard for referral stats

B) **SNAG → SHIFT sync** (if needed)
   - SNAG sends referral events to SHIFT API
   - Endpoint: POST `/api/snag/referral/track` (hypothetical)
   - Data: `{ referrer: wallet, referred: wallet, xpEarned: 100 }`
   - SHIFT stores in database

**Current Status**: Unknown - depends on SNAG's architecture

---

### 3. Display Referral Status
**Files to Update**:

#### `frontend/app/airdrop/page.tsx`
Show referral stats:
```jsx
{userData.referralStats && (
  <div className="card">
    <div className="section-title">Your Referrals</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Total Referrals</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{userData.referralStats.count}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Referral Bonus XP</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{userData.referralStats.xpFromReferrals}</div>
      </div>
    </div>
  </div>
)}
```

**Data needed from backend**:
```typescript
interface ReferralStats {
  count: number; // Total referrals
  xpFromReferrals: number; // 100 per referral + 5% bonus
  referralList?: Array<{
    wallet: string;
    dateReferred: string;
    xpEarned: number;
  }>;
}
```

---

## 🚨 Potential Issues & Solutions

### Issue 1: Referral Code Case Sensitivity
**Problem**: 
- User enters `TestCode` vs `testcode`
- SNAG doesn't find referral

**Solution**:
- [ ] Normalize code to lowercase before redirect
- [ ] Update `frontend/app/r/[code]/page.tsx`:
```javascript
const normalizedCode = code.toLowerCase();
redirect(`https://loyalty.shiftrwa.xyz/?ref=${encodeURIComponent(normalizedCode)}`);
```

### Issue 2: Invalid/Expired Codes
**Problem**:
- User has `/r/invalidcode`
- Code doesn't exist in SNAG

**Solution**:
- [ ] Fallback redirect to base loyalty page
- [ ] Current implementation already does this ✅

### Issue 3: Referral Not Counted
**Problem**:
- User uses referral link but reward not awarded

**Debugging**:
1. Check SNAG dashboard for referral records
2. Check user's XP history
3. Verify timestamp of registration vs reward
4. Ask SNAG team about sync delay

### Issue 4: Duplicate Referral Records
**Problem**:
- User registered via `/r/code` AND `?ref=code`
- Counted twice

**Solution**:
- [ ] SNAG should deduplicate by wallet + timestamp
- [ ] No changes needed on SHIFT side

---

## 📊 Verification Test Plan

### Pre-Launch Testing (1 hour)

#### Test 1: Redirect Chain
```bash
# Step 1: Test redirect
curl -i "https://airdrop.shiftrwa.xyz/r/test123" 2>/dev/null | grep -E "Location|HTTP"
# Expected: 307/308 redirect to loyalty.shiftrwa.xyz/?ref=test123

# Step 2: Verify parameter reaches SNAG
# (Open in browser and check Network tab)
```

#### Test 2: Referral Code Resolution
```bash
# Get valid test code first
curl "https://shift-airdrop-backend.onrender.com/api/airdrop/ref/testcode" | jq .
# Expected: ReferralBonusInfo object with displayName, multiplierBonus
```

#### Test 3: Manual Referral Flow
1. **Setup**:
   - User A wallet address: `0x1111...`
   - User A referral code: `kol_test` (custom or default)
   - User B wallet address: `0x2222...`

2. **Steps**:
   - [ ] User A gets referral link: `airdrop.shiftrwa.xyz/r/kol_test`
   - [ ] User B clicks link
   - [ ] Browser shows redirect to: `loyalty.shiftrwa.xyz/?ref=kol_test`
   - [ ] User B completes registration at SNAG
   - [ ] User B earns 100 XP through quest/activity
   - [ ] Check User A's balance:
     - [ ] Base balance + 100 XP (referral bonus)
     - [ ] Plus 5% of User B's earnings

3. **Verification**:
   - [ ] SNAG dashboard shows referral relationship
   - [ ] Referral stats visible on SHIFT dashboard
   - [ ] Both paths (branded + direct) tracked identically

---

## 📋 Checklist for SNAG Team Communication

**Questions to ask SNAG**:

- [ ] How is the `?ref=` parameter handled in pre-registration?
- [ ] Is it automatically linked to user account on signup?
- [ ] When are referral rewards distributed? (immediately or delayed)
- [ ] How is the referral code resolved to wallet address?
- [ ] Can we access referral stats via API? (for dashboard display)
- [ ] Is there a test environment we can use first?
- [ ] What's the API endpoint to check referral balance?
- [ ] How do you handle duplicate registrations with same code?

---

## 🎯 Success Criteria

✅ **All the following must be true**:

1. **Redirect Works**:
   - [ ] `/r/[code]` redirects to `loyalty.shiftrwa.xyz/?ref=[code]`
   - [ ] Query parameter preserved exactly

2. **Referral Tracking**:
   - [ ] SNAG receives and processes `ref` parameter
   - [ ] Referrer and referred user linked in SNAG database
   - [ ] Rewards calculated correctly

3. **Both Paths Work**:
   - [ ] `airdrop.shiftrwa.xyz/r/code` → tracked in SNAG
   - [ ] `loyalty.shiftrwa.xyz/?ref=code` → tracked in SNAG
   - [ ] Both show identical results

4. **Rewards Distributed**:
   - [ ] Referrer gets 100 XP flat bonus
   - [ ] Referrer gets 5% of referred user's total XP
   - [ ] Rewards appear in dashboard within reasonable time

5. **Dashboard Display**:
   - [ ] Referral stats visible on airdrop dashboard
   - [ ] Shows number of referrals
   - [ ] Shows total XP from referrals
   - [ ] Shows referral links (branded + custom)

6. **Edge Cases Handled**:
   - [ ] Invalid codes → graceful fallback
   - [ ] Expired codes → fallback to base loyalty page
   - [ ] Case sensitivity handled correctly
   - [ ] Special characters in codes handled

---

## 📝 Implementation Checklist

### Phase 1: Verify Current Setup ✅
- [x] `/r/[code]/page.tsx` created and redirects correctly
- [x] Referral parameter passed to SNAG
- [x] Code builds without errors
- [x] Both paths converge to same SNAG URL

### Phase 2: Test End-to-End ⏳
- [ ] Manual testing of referral flow
- [ ] Test with real SNAG accounts
- [ ] Verify rewards appear in dashboard
- [ ] Test edge cases (invalid codes, special chars)
- [ ] Performance test (multiple referrals)

### Phase 3: Monitor Live ⏳
- [ ] After launch, track referral metrics
- [ ] Monitor for failed referral attributions
- [ ] Check error logs for issues
- [ ] Collect user feedback

---

## 🔗 Related Files

**Frontend**:
- `frontend/app/r/[code]/page.tsx` - Referral redirect
- `frontend/app/airdrop/page.tsx` - Dashboard display
- `frontend/lib/api.ts` - API client functions

**Backend**:
- `src/services/snagSyncService.ts` - SNAG integration
- `src/routes/airdrop.ts` - Referral code resolution
- `src/routes/auth.ts` - User registration

**SNAG** (External):
- Loyalty page: `https://loyalty.shiftrwa.xyz`
- Pre-registration: `/pre-register?ref=[code]`
- Referral tracking: (internal SNAG logic)

---

## 🚀 Next Steps

1. **Immediate** (Before Launch):
   - [ ] Confirm SNAG team has deployed referral tracking
   - [ ] Test redirect flow in staging
   - [ ] Verify rewards work in test accounts
   - [ ] Check dashboard displays referral stats

2. **At Launch**:
   - [ ] Monitor for errors in first 24 hours
   - [ ] Track referral conversion rates
   - [ ] Gather user feedback on process

3. **Post-Launch Optimization**:
   - [ ] Add referral leaderboard (most referrals)
   - [ ] Add referral milestones (5 referrals = bonus, etc.)
   - [ ] Send referral notifications (email/notification)
   - [ ] A/B test referral incentives

Good luck with the launch! The referral system is well-designed and should track correctly across both paths. 🎉
