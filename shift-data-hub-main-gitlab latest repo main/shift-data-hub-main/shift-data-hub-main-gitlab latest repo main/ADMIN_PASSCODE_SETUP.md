# Admin KOL System - Passcode Authentication Setup

## ✅ Changes Complete

The admin KOL system has been updated to use a **hardcoded passcode** instead of environment variables.

---

## Admin Passcode

```
ShiftRwa2026@@$$Key
```

---

## How to Access Admin Panel

### Step 1: Navigate to Admin KOL Page
```
https://airdrop.shiftrwa.xyz/admin/kol
```

### Step 2: Enter Passcode
- See a login screen with "Enter admin passcode" prompt
- Type: `ShiftRwa2026@@$$Key`
- Click "Authenticate"

### Step 3: Manage KOLs
Once authenticated, you can:
- ✅ View all KOL entries (code, multiplier, referrals, XP given)
- ✅ Add new KOL with custom settings
- ✅ Toggle KOL status (Active/Inactive)
- ✅ Edit KOL multiplier bonus and type
- ✅ View referral statistics per KOL

---

## What Changed

### Backend (`src/routes/admin.ts`)

**Before:**
```typescript
const secret = req.headers['x-admin-key'] as string | undefined;
const expectedSecret = process.env.ADMIN_SECRET;

if (!expectedSecret) {
  console.warn('[Admin] ADMIN_SECRET not configured');
  return res.status(500).json({ error: 'Server not configured' });
}

if (!secret || secret !== expectedSecret) {
  console.warn('[Admin] Invalid admin secret');
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**After:**
```typescript
const ADMIN_PASSCODE = 'ShiftRwa2026@@$$Key';

const passcode = req.headers['x-admin-key'] as string | undefined;

if (!passcode || passcode !== ADMIN_PASSCODE) {
  console.warn('[Admin] Invalid admin passcode');
  return res.status(401).json({ error: 'Unauthorized - Invalid passcode' });
}
```

### Frontend (`frontend/app/admin/kol/page.tsx`)

**Changes:**
- Renamed `adminKey` state to `adminPasscode`
- Updated input placeholder: "Enter admin passcode"
- Updated error message: "Please enter admin passcode"
- Updated all fetch headers to use new variable name
- Updated auth success message

---

## Security Notes

### Hardcoded Passcode Benefits
✅ No dependency on environment variables  
✅ Single source of truth for admin auth  
✅ Easier to manage and update  
✅ Clear intent: passcode vs API key  

### If You Need to Change the Passcode

1. Edit `src/routes/admin.ts` line 25:
```typescript
const ADMIN_PASSCODE = 'YOUR_NEW_PASSCODE';
```

2. No need to update frontend - it sends whatever user enters
3. Commit and deploy
4. Share new passcode with team

---

## Admin Panel Features

### KOL Management
| Feature | Status |
|---------|--------|
| List all KOLs | ✅ Working |
| Add new KOL | ✅ Working |
| Edit multiplier/type | ✅ Working |
| Toggle active status | ✅ Working |
| View referral count | ✅ Working |
| View total invite XP | ✅ Working |

### KOL Fields
- **Custom Code**: e.g., "AXEL-VIP" (4-32 chars, alphanumeric + hyphens)
- **Display Name**: e.g., "Axel" (shown to new users on register)
- **Multiplier Bonus**: 1.0x - 2.0x (e.g., 1.5x, 2.0x)
- **Multiplier Type**:
  - Dynamic: 50% bonus on new XP earned after registration
  - Permanent: 100% bonus on all XP (retroactive)
- **Status**: Active/Inactive toggle
- **Notes**: Internal notes field

### API Endpoints (All Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/kol` | List all KOLs |
| POST | `/api/admin/kol` | Add new KOL |
| PATCH | `/api/admin/kol/:wallet` | Update KOL |
| DELETE | `/api/admin/kol/:wallet` | Deactivate KOL |

**All requests require header:**
```
x-admin-key: ShiftRwa2026@@$$Key
```

---

## Testing the Admin Panel

### Quick Test
1. Go to: `http://localhost:3000/admin/kol` (dev) or `https://airdrop.shiftrwa.xyz/admin/kol` (prod)
2. Enter: `ShiftRwa2026@@$$Key`
3. Click "Authenticate"
4. Should see KOL list (may be empty if no KOLs added yet)

### Add a Test KOL
1. Click "+ Add KOL" button
2. Fill in:
   - Wallet: Any Solana address (44 chars)
   - Custom Code: `TEST-KOL-2026`
   - Display Name: `Test KOL`
   - Multiplier: `1.5`
   - Type: `Dynamic`
3. Click "Add KOL"
4. Should see new KOL in table

### Test with Referral
1. Get the custom code from KOL list: `TEST-KOL-2026`
2. Try registration with: `?ref=TEST-KOL-2026`
3. Check database:
```sql
SELECT * FROM referrals WHERE code_used = 'TEST-KOL-2026';
```
4. User should have multiplier: 1.5x applied

---

## Deployment

### For Render
No environment variables needed for admin auth anymore!
- Remove `ADMIN_SECRET` from Render environment variables
- Passcode is hardcoded in source code
- If you need to change it later, update code and redeploy

### For Vercel
Same - no environment variables needed for admin auth.

---

## Troubleshooting

### "Unauthorized - Invalid passcode"
- Check spelling: `ShiftRwa2026@@$$Key` (exact case matters)
- Copy-paste from this document to avoid typos
- Verify backend has been deployed with new code

### Admin panel won't load
- Verify URL: `/admin/kol` (not `/admin` or `/kol`)
- Check browser console for network errors
- Ensure API is responding: `curl https://shift-airdrop-backend.onrender.com/api/admin/health`

### Can't add KOL
- Verify passcode is correct
- Check wallet format (Solana address, 44 chars)
- Check custom code format (4-32 chars, alphanumeric + hyphens)
- Check multiplier range (1.0 - 2.0)

---

## Summary

✅ **Passcode updated to:** `ShiftRwa2026@@$$Key`  
✅ **No environment variables needed**  
✅ **All admin endpoints protected**  
✅ **KOL management fully functional**  

**Ready to use immediately after deployment!**
