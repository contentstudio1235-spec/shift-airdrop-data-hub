# KOL Custom Referral + Dynamic/Permanent Multiplier System

## Overview

The SHIFT airdrop now supports a full KOL (Key Opinion Leader) custom referral system with dynamic and permanent multiplier support. This enables:

- **Admin-controlled KOL whitelisting** with custom referral codes (e.g., `SHIFT-AXEL-VIP`)
- **Two multiplier types** with different behaviors:
  - **Dynamic Multiplier**: forward-only, only affects NEW XP earned after activation
  - **Permanent Multiplier**: retroactive, recalculates total XP when applied
- **Referral tracking** with invite bonus XP awarded to referrers
- **Full audit trail** in multiplier_log table

## Architecture

### Database Schema (Migration 003)

#### kol_whitelist
Stores admin-whitelisted KOL information:
- `wallet`: Solana wallet address (PK)
- `custom_code`: Unique referral code like `SHIFT-AXEL-VIP`
- `display_name`: Shown on register page ("Axel")
- `multiplier_bonus`: 1.0–2.0x (e.g., 1.5 = 50% bonus)
- `multiplier_type`: `'dynamic'` or `'permanent'`
- `is_active`: Toggle to enable/disable the KOL
- `notes`: Admin internal notes

#### referrals
Tracks who referred whom:
- `referred_wallet`: New user who registered (FK → users)
- `referrer_wallet`: Who invited them (FK → users, nullable)
- `code_used`: The referral code string
- `is_kol_referral`: true if code came from kol_whitelist
- `bonus_multiplier`: 1.0–2.0x (copied from KOL at registration time)
- `bonus_type`: `'dynamic'` | `'permanent'` | `'none'`
- `bonus_applied`: Whether multiplier was already applied
- **Unique constraint**: one referrer per referred_wallet

#### user_dynamic_multipliers
Tracks all active dynamic multiplier slots per user:
- `wallet`: User (FK → users)
- `multiplier_value`: The multiplier (e.g., 1.5)
- `source`: Origin (`'kol_referral'` | `'badge_event'` | `'seasonal'` | `'streak'`)
- `expires_at`: NULL = never expires, or a timestamp
- `is_active`: Toggle on/off without deleting

#### users (columns added)
- `permanent_multiplier`: Global retroactive multiplier (default 1.0)
- `dynamic_multiplier`: Effective forward-only multiplier (cached, recomputed on change)
- `referral_code`: This user's standard referral code (wallet-based, e.g., "3UDJ7X")
- `referred_by_wallet`: Who invited this user
- `referred_by_code`: Code used to register
- `invite_bonus_xp`: Total invite bonus XP earned

#### multiplier_log
Audit trail for all multiplier changes:
- `wallet`: User (FK)
- `multiplier_type`: `'dynamic'` | `'permanent'`
- `old_value` / `new_value`: Before/after multiplier
- `reason`: Human-readable explanation
- `source`: Origin of change
- `xp_before` / `xp_after`: For permanent multiplier, tracks XP recalculation

#### referral_config
Singleton row storing global config:
- `standard_bonus_xp`: Invite bonus for standard referrer (default 250)
- `kol_bonus_xp`: Invite bonus for KOL referrer (default 500)

### Two Multiplier Types

#### Dynamic Multiplier (Forward-Only)
- Created in `user_dynamic_multipliers` table
- Does **not** affect existing XP
- Only applies to NEW XP earned after the slot is created
- **Use cases**: event boosts, seasonal campaigns, streak bonuses, badge rewards
- **Example**: User has 5,000 XP → unlock 2x Dynamic → 5,000 unchanged → future XP doubled

#### Permanent Multiplier (Retroactive)
- Single value per user in `users.permanent_multiplier`
- Applies to **both** existing AND future XP
- When activated, **recalculates total_xp = total_xp × (newMult / oldMult)**
- **Use cases**: tier achievements, Genesis status, loyalty milestones, KOL bonuses
- **Example**: User has 5,000 XP → unlock 2x Permanent → instantly 10,000 XP → future doubled

### Backend Services

#### referralService (`src/services/referralService.ts`)

**Core functions:**

- `resolveReferralCode(code: string)` → ReferralCodeInfo
  - Checks kol_whitelist first (custom codes)
  - Falls back to wallet-based codes
  - Returns: code, referrer_wallet, display_name, isKol, multiplierBonus, multiplierType, isActive

- `registerWithReferral(wallet: string, refCode?: string)` → Registration result
  - Inserts user if not exists
  - If refCode provided, resolves it and applies multiplier bonus
  - Awards invite XP to referrer
  - Returns: queuePosition, totalMembers, bonusApplied, bonusMultiplier, bonusType, etc.

- `addKol(params)` → KolEntry
  - Admin: Create or update KOL entry
  - Validates customCode (alphanumeric + hyphens, 4–32 chars)
  - Validates multiplierBonus (1.0–2.0)

- `listKols()` → KolEntry[] (with referralCount, inviteXpGiven)
  - Fetch all KOLs with stats

- `updateKol(wallet, updates)` → KolEntry | null
  - Partial update (fields can be undefined to skip)

**Helper functions:**

- `walletToCode(wallet: string): string`
  - Generates standard code: first 6 chars uppercase (e.g., "3UDJ7X")

- `isValidCode(code: string): boolean`
  - Validates code format

### Backend Routes

#### GET /api/airdrop/ref/:code
Resolve a referral code (frontend uses to preview bonus before registering):

```json
{
  "code": "SHIFT-AXEL-VIP",
  "displayName": "Axel",
  "isKol": true,
  "multiplierBonus": 1.5,
  "multiplierType": "dynamic"
}
```

Returns 404 if code not found, 410 if inactive.

#### POST /api/airdrop/register
Register a new wallet with optional referral code:

```json
{
  "wallet": "3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn",
  "refCode": "SHIFT-AXEL-VIP"  // optional
}
```

Response:
```json
{
  "wallet": "3uDJ7...",
  "queuePosition": 12345,
  "totalMembers": 50000,
  "bonusApplied": true,
  "bonusMultiplier": 1.5,
  "bonusType": "dynamic",
  "referrerDisplayName": "Axel"
}
```

#### GET /api/airdrop/user/:wallet
Enhanced with multiplier info:

```json
{
  "wallet": "3uDJ7...",
  "queuePosition": 12345,
  "totalMembers": 50000,
  "totalXp": 10000,
  "permanentMultiplier": 1.5,
  "dynamicMultiplier": 2.0,
  "referralCode": "3UDJ7X",
  "referralLink": "https://airdrop.shiftrwa.xyz/register?ref=3UDJ7X",
  "referralCount": 12,
  "inviteBonusXp": 3000,
  "referredByWallet": "...",
  "referredByCode": "SHIFT-AXEL-VIP"
}
```

#### GET /api/airdrop/referrals/:wallet
List referrals made by this wallet:

```json
{
  "wallet": "3uDJ7...",
  "referrals": [
    {
      "wallet": "2ASop…uj31g",  // truncated for privacy
      "codeUsed": "SHIFT-AXEL-VIP",
      "isKol": true,
      "bonusMultiplier": 1.5,
      "bonusType": "dynamic",
      "referredAt": "2026-05-22T12:34:56.789Z",
      "refereeXp": 2500
    }
  ],
  "totalReferrals": 12
}
```

#### GET /api/admin/kol
List all KOL entries (admin-only, requires x-admin-key header):

```json
{
  "kols": [
    {
      "wallet": "3uDJ7...",
      "customCode": "SHIFT-AXEL-VIP",
      "displayName": "Axel",
      "multiplierBonus": 1.5,
      "multiplierType": "dynamic",
      "isActive": true,
      "referralCount": 42,
      "inviteXpGiven": 21000
    }
  ],
  "total": 1
}
```

#### POST /api/admin/kol
Create or update KOL:

```json
{
  "wallet": "3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn",
  "customCode": "SHIFT-AXEL-VIP",
  "displayName": "Axel",
  "multiplierBonus": 1.5,
  "multiplierType": "dynamic",
  "notes": "Popular trader on Twitter"
}
```

#### PATCH /api/admin/kol/:wallet
Partial update (any fields can be omitted):

```json
{
  "multiplierBonus": 2.0,
  "isActive": false
}
```

#### DELETE /api/admin/kol/:wallet
Deactivate (soft delete) a KOL.

### Frontend Implementation

#### Register Page (`frontend/app/register/page.tsx`)

Features:
- Detects `?ref=CODE` URL parameter on mount
- Resolves code via GET /api/airdrop/ref/:code
- Shows **bonus banner** if code is valid and active
  - Displays KOL display name ("Axel invited you!")
  - Shows bonus percentage ("Get 50% bonus multiplier")
  - Shows multiplier type ("on all XP" for permanent, "on new XP" for dynamic)
- Auto-registers user on wallet connect (POST /api/airdrop/register with refCode)
- Shows multiplier badges on user profile (permanent & dynamic values)
- Referral section displays own standard referral link + sharing options

#### Admin Panel (`frontend/app/admin/kol/page.tsx`)

Admin-only dashboard (requires x-admin-key header):

**Features:**
- Authentication: Prompt for admin key on page load
- **KOL List** table:
  - Custom code, display name, multiplier (bonus × type)
  - Referral count, invite XP given
  - Active/Inactive toggle button
- **Add KOL Form**:
  - Wallet address input
  - Custom code (validated: alphanumeric + hyphens, 4–32 chars)
  - Display name (optional, shown to referrals)
  - Multiplier bonus (1.0–2.0, step 0.05)
  - Multiplier type dropdown (dynamic / permanent)
  - Notes field
  - Form validation with toast feedback

**Access:**
- Navigate to `/admin/kol`
- Enter ADMIN_SECRET from Render environment
- CRUD operations on KOLs

### Configuration

#### Environment Variables (Render)

```
ADMIN_SECRET=<your-secret-key>
```

Used for:
- POST /api/admin/sync
- POST /api/admin/queue-retry
- GET /api/admin/kol
- POST /api/admin/kol
- PATCH /api/admin/kol/:wallet
- DELETE /api/admin/kol/:wallet

#### Database Config

Already initialized via Migration 003. Run:

```bash
psql $DATABASE_URL -f src/db/migrations/003_referral_multiplier.sql
```

## Usage Flows

### 1. KOL Onboarding (Admin)

1. Navigate to `/admin/kol`
2. Enter ADMIN_SECRET
3. Click **+ Add KOL**
4. Fill form:
   - Wallet: `3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn`
   - Custom Code: `SHIFT-AXEL-VIP`
   - Display Name: `Axel`
   - Multiplier Bonus: `1.5` (50% bonus)
   - Multiplier Type: `dynamic`
5. Click **Add KOL**
6. KOL is now active, can be shared

### 2. User Registration with KOL Link

**User receives link:** `https://airdrop.shiftrwa.xyz/register?ref=SHIFT-AXEL-VIP`

1. User clicks link
2. Register page loads, resolves code
3. Shows: "✨ SPECIAL INVITE — Axel invited you! Get 50% bonus multiplier on new XP"
4. User connects wallet
5. Frontend calls POST /api/airdrop/register with refCode=SHIFT-AXEL-VIP
6. Backend:
   - Inserts user
   - Creates referral record (referred_wallet, referrer_wallet, code_used, is_kol_referral)
   - Applies dynamic multiplier (1.5x) to user
   - Awards 500 invite XP to Axel
7. User sees dashboard with "Dynamic Multiplier 1.5x" badge
8. Axel sees referral in their dashboard: "12 referrals, 6000 invite bonus XP"

### 3. Standard Referral (Non-KOL)

User registers without a KOL code → gets standard wallet-based code.

1. User's code: `3UDJ7X` (from wallet address)
2. Shares `https://airdrop.shiftrwa.xyz/register?ref=3UDJ7X`
3. When someone uses it:
   - referral record: is_kol_referral=false, bonus_multiplier=1.0, bonus_type='none'
   - User awarded 250 invite XP (std_bonus_xp)
   - No multiplier bonus applied to referee

### 4. Multiplier Activation (Future)

When badges or NFTs grant multipliers:

**Dynamic (e.g., seasonal event boost):**
```js
INSERT INTO user_dynamic_multipliers
  (wallet, multiplier_value, reason, source, expires_at, is_active)
VALUES (
  '3uDJ7...',
  1.5,
  'Summer Festival 2x bonus',
  'event',
  NOW() + INTERVAL '30 days',
  true
);
```

**Permanent (e.g., Genesis NFT):**
```js
// Get current state
SELECT total_xp, permanent_multiplier FROM users WHERE wallet = '3uDJ7...';
// User has: 5000 XP, 1.0 permanent

// Apply 2x permanent multiplier
// Recalculate: 5000 × (2.0 / 1.0) = 10000 XP
UPDATE users SET permanent_multiplier = 2.0, total_xp = 10000;

// Log the change
INSERT INTO multiplier_log (...) VALUES (...);
```

## Testing

### Test KOL Registration

1. Admin: Add test KOL
   ```
   Wallet: 3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn
   Code: TEST-KOL-2026
   Display Name: Test KOL
   Bonus: 1.5
   Type: dynamic
   ```

2. Get code info:
   ```bash
   curl https://shift-airdrop-backend.onrender.com/api/airdrop/ref/TEST-KOL-2026
   ```
   
   Should return:
   ```json
   {
     "code": "TEST-KOL-2026",
     "displayName": "Test KOL",
     "isKol": true,
     "multiplierBonus": 1.5,
     "multiplierType": "dynamic"
   }
   ```

3. Register with code:
   ```bash
   curl -X POST https://shift-airdrop-backend.onrender.com/api/airdrop/register \
     -H "Content-Type: application/json" \
     -d '{
       "wallet": "2ASop4tRtRPYkw3b9XZQLka4RY8TLXtesEa3GfQJZZcn",
       "refCode": "TEST-KOL-2026"
     }'
   ```
   
   Should show: `"bonusApplied": true, "bonusMultiplier": 1.5`

4. Verify user:
   ```bash
   curl https://shift-airdrop-backend.onrender.com/api/airdrop/user/2ASop4tRtRPYkw3b9XZQLka4RY8TLXtesEa3GfQJZZcn
   ```
   
   Should show: `"dynamicMultiplier": 1.5`

### Test Admin Panel

1. Navigate to `https://airdrop.shiftrwa.xyz/admin/kol`
2. Enter ADMIN_SECRET from Render
3. Should see list of all KOLs
4. Toggle active status
5. Add new KOL (validates code format, bonus range, etc.)

## Security

- **Admin key required** for all /api/admin routes (validated against ADMIN_SECRET env var)
- **Code uniqueness** enforced via UNIQUE constraint on kol_whitelist.custom_code
- **No duplicate referrals** per user (UNIQUE on referrals.referred_wallet)
- **Multiplier bounds** validated: 1.0–2.0 only
- **Type safety** in backend validation (multiplier_type must be 'dynamic' or 'permanent')
- **Audit trail** all multiplier changes logged to multiplier_log table

## Integration with Existing Systems

### SNAG Loyalty Platform

Multiplier changes are synced to SNAG:
- Dynamic multiplier creates entry in snagSyncService.syncMultipliers()
- Permanent multiplier also synced via snagSyncService
- Invite bonus XP processed in fullSync cron job
- All changes logged in multiplier_log for reconciliation

### XP Calculation

XP formula includes multiplier:
```
base_xp = log₁₀(position_size_usd) × 100
final_xp = base_xp × permanent_multiplier × dynamic_multiplier
```

Dynamic multiplier only affects XP earned AFTER activation.
Permanent multiplier affects all XP (retroactively applied on activation).

### Badges & NFTs (Future)

Badges can grant dynamic multipliers:
- Social badges (10% bonus): dynamic 1.1x
- Trading badges (20% bonus): dynamic 1.2x
- Loyalty badges (30% bonus): dynamic 1.3x

NFTs grant permanent multipliers:
- Bronze: 1.1x permanent
- Silver: 1.25x permanent
- Gold: 1.5x permanent
- Genesis: 2.0x permanent (max)

## Future Enhancements

- [ ] Multiplier expiration (e.g., seasonal boost expires after 30 days)
- [ ] Multiplier stacking rules (can users have multiple dynamic multipliers?)
- [ ] Leaderboard rank display for KOLs
- [ ] Email notifications on referral registration
- [ ] Social sharing analytics
- [ ] Invitation bonus XP UI on referral page
- [ ] Multiplier tier system (unlock higher bonus at higher referral count)
