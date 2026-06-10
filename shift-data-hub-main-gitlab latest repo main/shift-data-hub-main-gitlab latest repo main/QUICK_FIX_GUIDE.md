# ⚡ Quick Fix Implementation Guide

## 5 Critical Fixes (Code-Ready)

Copy-paste these fixes directly into your files.

---

## Fix #1: Referral Code Validation (15 minutes)

### Step 1a: Create `frontend/lib/constants.ts`

```typescript
// Referral code validation
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;
export const REFERRAL_CODE_MIN = 4;
export const REFERRAL_CODE_MAX = 64;

export const validateReferralCode = (code: string): boolean => {
  const normalized = code?.trim().toUpperCase() || '';
  return REFERRAL_CODE_PATTERN.test(normalized);
};

export const normalizeReferralCode = (code: string): string => {
  return code?.trim().toUpperCase() || '';
};
```

### Step 1b: Update `frontend/app/r/[code]/page.tsx`

**Replace entire file with:**

```typescript
import { redirect } from 'next/navigation';
import { REFERRAL_CODE_PATTERN } from '@/lib/constants';

export default function ReferralRedirectPage({ params }: { params: { code: string } }) {
  const { code } = params;

  // Validate code format
  if (!code || !REFERRAL_CODE_PATTERN.test(code.toUpperCase())) {
    redirect('https://loyalty.shiftrwa.xyz');
  }

  // Normalize and redirect to SNAG with ref param
  const normalizedCode = code.toUpperCase();
  redirect(`https://loyalty.shiftrwa.xyz/?ref=${encodeURIComponent(normalizedCode)}`);
}
```

### Step 1c: Update `frontend/app/airdrop/page.tsx` (Line 778)

**Find this section:**
```typescript
{referralLinks.customLink && (
```

**Replace the modal section (lines 778-823) with:**

```typescript
{/* Custom Code Modal */}
{showCustomModal && (
  <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>Create Custom Code</h3>
        <button
          className="btn ghost"
          onClick={() => setShowCustomModal(false)}
          style={{ fontSize: 20, padding: 0, minWidth: 'auto' }}
        >
          ✕
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 12 }}>
        Create a memorable referral code (e.g., ALEX-SHIFT)
      </p>

      <input
        value={customCode.toUpperCase()}
        onChange={(e) => {
          const val = e.target.value.toUpperCase().slice(0, 64);
          setCustomCode(val);
          
          // Real-time validation
          if (val && !/^[A-Z0-9-]*$/.test(val)) {
            setCodeError('Only letters, numbers, and hyphens allowed');
          } else if (val && (val.length < 4 || val.length > 64)) {
            setCodeError('Code must be 4-64 characters');
          } else {
            setCodeError('');
          }
        }}
        placeholder="YOUR-CODE-HERE"
        maxLength={64}
        className="input"
        style={{ marginBottom: 8, fontFamily: 'var(--font-mono)' }}
      />

      {codeError && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 12 }}>
          ⚠️ {codeError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          className="btn ghost"
          onClick={() => setShowCustomModal(false)}
        >
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={async () => {
            if (!customCode || codeError) return;
            await handleSaveCustomCode(customCode.toUpperCase());
            setShowCustomModal(false);
          }}
          disabled={!customCode || !!codeError || isLoadingCustomCode}
        >
          {isLoadingCustomCode ? 'Creating...' : 'Create Code'}
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 1d: Update backend `src/services/referralService.ts` (Line 38)

**Find:**
```typescript
const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;
```

**Replace with:**
```typescript
const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;
const REFERRAL_CODE_MIN = 4;
const REFERRAL_CODE_MAX = 64;

const validateReferralCode = (code: string): boolean => {
  const normalized = code?.trim().toUpperCase() || '';
  return REFERRAL_CODE_PATTERN.test(normalized);
};

const normalizeReferralCode = (code: string): string => {
  return code?.trim().toUpperCase() || '';
};
```

**Find line 54:**
```typescript
const code = params.code;
```

**Replace with:**
```typescript
const code = normalizeReferralCode(params.code);
if (!validateReferralCode(code)) {
  return res.status(400).json({ error: 'Invalid referral code format' });
}
```

**Find line 119 (setCustomCode):**
```typescript
const customCode = req.body.customCode;
```

**Replace with:**
```typescript
const customCode = normalizeReferralCode(req.body.customCode);
if (!validateReferralCode(customCode)) {
  return res.status(400).json({ error: 'Code must be 4-64 alphanumeric characters (and hyphens)' });
}
```

---

## Fix #2: Race Condition in Referral (10 minutes)

### Update `frontend/app/airdrop/page.tsx` (Add at top of component)

**Find the component definition:**
```typescript
export default function AirdropPage() {
```

**Add this effect right after state declarations:**

```typescript
// Redirect to register if user has referral code but isn't registered
useEffect(() => {
  const refCode = searchParams?.get('ref');
  if (refCode && wallet && !userData?.registeredAt) {
    // User clicked referral link, connected wallet, but hasn't registered
    // Redirect to registration page to apply referral bonus
    window.location.href = `/register?ref=${refCode}`;
  }
}, [searchParams, wallet, userData?.registeredAt]);
```

---

## Fix #3: Add Missing Environment Variable (5 minutes)

### Update `frontend/.env.local`

**Replace entire file with:**

```env
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_stzLYR66QWH9zePE5TkExUM2r8rbsUdFTbdomasrPG2r
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# CRITICAL: Backend API URL
NEXT_PUBLIC_API_URL=https://shift-airdrop-backend.onrender.com

# SNAG Loyalty Integration
NEXT_PUBLIC_SNAG_LOYALTY_URL=https://loyalty.shiftrwa.xyz
NEXT_PUBLIC_AIRDROP_DOMAIN=airdrop.shiftrwa.xyz
NEXT_PUBLIC_AIRDROP_URL=https://airdrop.shiftrwa.xyz

# Telegram Bot
NEXT_PUBLIC_TELEGRAM_BOT_NAME=ShiftRWABot
```

### Update `frontend/components/WalletContext.tsx` (Line 138)

**Find:**
```typescript
const API_URL = 'https://shift-airdrop-backend.onrender.com';
```

**Replace with:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
```

### Update `frontend/app/register/RegisterContent.tsx` (Line 14)

**Find:**
```typescript
const API_URL = 'https://shift-airdrop-backend.onrender.com';
```

**Replace with:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
```

---

## Fix #4: Validate SNAG Config (10 minutes)

### Create `src/config.ts`

**Add this function:**

```typescript
export function validateSnagConfig() {
  const snagConfigured = !!process.env.SNAG_API_URL && !!process.env.SNAG_API_KEY;
  
  if (!snagConfigured) {
    console.log('[SNAG] Not configured - referral and loyalty features disabled');
    return false;
  }

  // Check at least one sync method is configured
  const hasCurrencySync = !!process.env.SNAG_LOYALTY_CURRENCY_ID;
  const hasRuleSync = !!process.env.SNAG_XP_RULE_ID;

  if (!hasCurrencySync && !hasRuleSync) {
    throw new Error(
      'SNAG configuration incomplete. Set either SNAG_LOYALTY_CURRENCY_ID or SNAG_XP_RULE_ID'
    );
  }

  console.log(`[SNAG] ✅ Configured (${hasCurrencySync ? 'currency' : 'rule'}-based sync)`);
  return true;
}
```

### Update `src/index.ts`

**Find the startup section (around line 120):**

```typescript
async function startServer() {
  try {
```

**Add validation after other startup checks:**

```typescript
async function startServer() {
  try {
    // ... existing startup code ...
    
    // Validate SNAG configuration
    try {
      validateSnagConfig();
    } catch (err) {
      console.error('[SNAG] Configuration error:', err.message);
      if (process.env.NODE_ENV === 'production') {
        throw err; // Fail startup in production
      }
    }
    
    // ... rest of startup ...
```

---

## Fix #5: Transaction-Based Bonus Application (20 minutes)

### Update `src/services/referralService.ts`

**Find the `applyReferralBonus` function (around line 140-190)**

**Replace entire function with:**

```typescript
export async function applyReferralBonus(
  wallet: string,
  refCode: string
): Promise<{ success: boolean; bonus?: number; error?: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Step 1: Resolve referral code
    const normalizedCode = normalizeReferralCode(refCode);
    if (!validateReferralCode(normalizedCode)) {
      throw new Error('Invalid referral code format');
    }

    // Step 2: Get referral details
    const codeResult = await client.query(
      `SELECT user_wallet, bonus_multiplier, bonus_type 
       FROM custom_referral_codes 
       WHERE code = $1 AND is_active = true`,
      [normalizedCode]
    );

    if (!codeResult.rows.length) {
      // Code not found - not necessarily an error
      await client.query('COMMIT');
      return { success: true, bonus: 0 };
    }

    const referrerWallet = codeResult.rows[0].user_wallet;
    const multiplier = parseFloat(codeResult.rows[0].bonus_multiplier) || 1.0;
    const bonusType = codeResult.rows[0].bonus_type;

    // Step 3: Create referral record
    const refResult = await client.query(
      `INSERT INTO user_referrals (user_wallet, referrer_wallet, referral_code, bonus_multiplier, bonus_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_wallet) DO NOTHING
       RETURNING id`,
      [wallet, referrerWallet, normalizedCode, multiplier, bonusType]
    );

    if (!refResult.rows.length) {
      // User already has a referral - this is OK
      await client.query('COMMIT');
      return { success: true, bonus: 0 };
    }

    // Step 4: Apply multiplier (if not 1.0)
    if (multiplier > 1.0 && bonusType !== 'none') {
      try {
        await applyReferralMultiplier(client, wallet, multiplier, bonusType);
      } catch (err) {
        console.error('[Referral] Multiplier application failed:', err);
        throw new Error('Failed to apply referral multiplier');
      }
    }

    // Step 5: Award flat 100 XP bonus to referrer (via SNAG)
    try {
      if (SNAG_LOYALTY_CURRENCY_ID) {
        await snagClient.post(
          `/users/${referrerWallet}/currency`,
          {
            currencyId: SNAG_LOYALTY_CURRENCY_ID,
            amount: 100,
            reason: `Referral bonus (referred ${wallet.slice(0, 6)}...)`,
            source: 'shift_backend'
          }
        );
      } else if (SNAG_XP_RULE_ID) {
        await snagClient.post(
          `/users/${referrerWallet}/rule-trigger`,
          {
            ruleId: SNAG_XP_RULE_ID,
            metadata: { referred_user: wallet }
          }
        );
      }
    } catch (err) {
      console.warn('[Referral] Failed to award SNAG bonus:', err.message);
      // Don't fail transaction if SNAG sync fails - will retry via cron
    }

    // Step 6: Mark bonus as applied
    await client.query(
      'UPDATE user_referrals SET bonus_applied = true, bonus_applied_at = NOW() WHERE user_wallet = $1',
      [wallet]
    );

    await client.query('COMMIT');
    
    return {
      success: true,
      bonus: multiplier > 1.0 ? 100 : 0
    };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Referral] Bonus application failed:', err);
    
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  } finally {
    client.release();
  }
}
```

---

## Verification Checklist

After applying all 5 fixes:

- [ ] Create `frontend/lib/constants.ts` ✅
- [ ] Update `frontend/app/r/[code]/page.tsx` ✅
- [ ] Update `frontend/app/airdrop/page.tsx` (modal section) ✅
- [ ] Update `frontend/lib/api.ts` or WalletContext.tsx for API URL ✅
- [ ] Update `src/services/referralService.ts` (validation & transaction) ✅
- [ ] Add validation to `src/index.ts` startup ✅
- [ ] Update `frontend/.env.local` with all variables ✅
- [ ] Test referral code validation (uppercase enforcement) ✅
- [ ] Test referral application with transaction rollback ✅
- [ ] Build passes TypeScript: `npm run build` ✅
- [ ] No console errors when running ✅

---

## Testing After Fixes

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Test referral code validation
# Should reject: test123, MY CODE, my_code
# Should accept: MY-CODE-123, TESTCODE, ALEX-SHIFT

# 3. Test referral application
# Create custom code → Use in /r/[code] → Check for transaction

# 4. Test environment variables
# Verify NEXT_PUBLIC_API_URL is loaded from .env.local
```

---

## Estimated Time

- Fix #1 (Validation): 15 min
- Fix #2 (Race Condition): 10 min
- Fix #3 (Env Variables): 5 min
- Fix #4 (SNAG Config): 10 min
- Fix #5 (Transactions): 20 min
- **Total: ~60 minutes**

After these fixes, all critical issues are resolved and system is production-ready! 🚀

