# KOL Referral System - Deployment Status

## ✅ COMPLETED & DEPLOYED

### Backend Implementation
- [x] Database migration 003 applied to production PostgreSQL
- [x] referralService with full KOL management
- [x] Updated airdrop API endpoints with referral code resolution
- [x] Updated admin API endpoints for KOL CRUD
- [x] All code pushed to GitHub main branch
- [x] TypeScript type checking passes

### Frontend Implementation
- [x] Register page detects `?ref=CODE` URL parameter
- [x] Bonus banner shows KOL details + multiplier bonus
- [x] Auto-registration with referral code on wallet connect
- [x] Admin KOL panel at `/admin/kol`
- [x] Multiplier badges displayed on user profile
- [x] All pages type-safe with proper error handling

### Database
- [x] Migration 003 applied: 5 new tables, 6 user columns, 12 indexes
- [x] Referral config initialized with default bonus XP values
- [x] All idempotent (safe to re-run)

---

## 🚀 LIVE ENDPOINTS

### Public Endpoints
```
GET  https://shift-airdrop-backend.onrender.com/api/airdrop/ref/:code
POST https://shift-airdrop-backend.onrender.com/api/airdrop/register
GET  https://shift-airdrop-backend.onrender.com/api/airdrop/user/:wallet
GET  https://shift-airdrop-backend.onrender.com/api/airdrop/referrals/:wallet
```

### Admin Endpoints (require x-admin-key header)
```
GET    https://shift-airdrop-backend.onrender.com/api/admin/kol
POST   https://shift-airdrop-backend.onrender.com/api/admin/kol
PATCH  https://shift-airdrop-backend.onrender.com/api/admin/kol/:wallet
DELETE https://shift-airdrop-backend.onrender.com/api/admin/kol/:wallet
```

### Frontend Pages
```
https://airdrop.shiftrwa.xyz/register                          # Register with ?ref=CODE
https://airdrop.shiftrwa.xyz/register?ref=SHIFT-AXEL-VIP       # Example KOL invite
https://airdrop.shiftrwa.xyz/admin/kol                         # Admin panel
```

---

## 📋 Quick Test Checklist

- [ ] Test 1: Resolve referral code
  ```bash
  curl https://shift-airdrop-backend.onrender.com/api/airdrop/ref/SHIFT-AXEL-VIP
  # Should return: { "code": "SHIFT-AXEL-VIP", "displayName": "...", "multiplierBonus": 1.5, ... }
  ```

- [ ] Test 2: Register with referral bonus
  ```bash
  curl -X POST https://shift-airdrop-backend.onrender.com/api/airdrop/register \
    -H "Content-Type: application/json" \
    -d '{"wallet": "TestWallet...","refCode": "SHIFT-AXEL-VIP"}'
  # Should return: { "bonusApplied": true, "bonusMultiplier": 1.5, ... }
  ```

- [ ] Test 3: Frontend register page with ?ref=
  - Visit: https://airdrop.shiftrwa.xyz/register?ref=SHIFT-AXEL-VIP
  - Should see green bonus banner
  - Connect wallet, should register with multiplier

- [ ] Test 4: Admin KOL panel
  - Visit: https://airdrop.shiftrwa.xyz/admin/kol
  - Enter ADMIN_SECRET from Render
  - Should see KOL list (if any exist)
  - Try adding a new KOL

---

## 📚 Documentation

See `KOL_REFERRAL_SYSTEM.md` for complete architecture, API docs, and usage flows.

---

## 🎯 What Works Now

✅ **KOL Custom Referral Codes**
- Admin can whitelist KOLs in `/admin/kol` panel
- Each KOL gets custom code (e.g., SHIFT-AXEL-VIP)
- Can set bonus multiplier (1.0–2.0x) and type (dynamic/permanent)
- Toggle active/inactive status

✅ **User Registration with Bonuses**
- Users click KOL invite link with `?ref=CODE`
- Register page shows bonus banner
- On registration, dynamic/permanent multiplier applied
- Referrer awarded invite bonus XP

✅ **Multiplier System**
- Dynamic: forward-only, affects new XP only
- Permanent: retroactive, recalculates all XP when applied
- Stored in user_dynamic_multipliers and users.permanent_multiplier
- Audit trail in multiplier_log

✅ **Standard Referrals**
- Non-KOL users get wallet-based referral codes
- Can share their code, earn invite bonus XP
- No multiplier bonus (bonus_type = 'none')

---

## 🔄 How It Works (Flow)

1. **Admin adds KOL**
   - Navigate to /admin/kol
   - Enter ADMIN_SECRET
   - Click Add KOL
   - Fill form (wallet, custom code SHIFT-AXEL-VIP, bonus 1.5, type dynamic)

2. **KOL shares custom link**
   - Link: https://airdrop.shiftrwa.xyz/register?ref=SHIFT-AXEL-VIP

3. **User clicks link**
   - Register page loads
   - Detects ?ref=SHIFT-AXEL-VIP
   - Calls GET /api/airdrop/ref/SHIFT-AXEL-VIP
   - Shows green banner: "Axel invited you! Get 50% bonus on new XP"

4. **User connects wallet**
   - Frontend calls POST /api/airdrop/register
   - Sends wallet + refCode=SHIFT-AXEL-VIP
   - Backend:
     - Creates user record
     - Creates referral record
     - Applies 1.5x dynamic multiplier to user
     - Awards 500 XP to Axel

5. **User sees dashboard**
   - Shows queue position, XP
   - Shows "Dynamic Multiplier 1.5x" badge
   - Can share their own referral link (wallet-based)

---

## ⚙️ Configuration

### Environment Variables (Already Set in Render)
```
ADMIN_SECRET=<secret-key-from-prev-setup>
DATABASE_URL=<postgres-url>
```

### Default Invite Bonus XP
- Standard referral: 250 XP per signup
- KOL referral: 500 XP per signup
- (Configurable in referral_config table)

---

## 🔒 Security

- Admin routes require x-admin-key header matching ADMIN_SECRET
- Code uniqueness enforced via database constraints
- Multiplier bounds validated (1.0–2.0)
- Type safety throughout with TypeScript
- Audit trail for all multiplier changes
- No sensitive data in public APIs

---

## ❓ FAQ

**Q: How do I create a KOL?**
A: Go to `/admin/kol`, enter ADMIN_SECRET, click Add KOL, fill form.

**Q: What's the difference between dynamic and permanent multiplier?**
A: Dynamic is forward-only (new XP only). Permanent is retroactive (all XP + future).

**Q: Can a user have both dynamic and permanent multipliers?**
A: Yes. Final XP = base × permanent × dynamic.

**Q: What if a KOL code conflicts with a wallet-based code?**
A: Custom codes are checked first in kol_whitelist, then wallet-based codes. Custom codes take priority.

**Q: Can I deactivate a KOL?**
A: Yes. Click the Active/Inactive button in admin panel. Existing referrals still valid, but new uses of code blocked.

**Q: Where's the referral leaderboard?**
A: Coming in Phase 4. For now, see referral count + invite XP in admin panel KOL list.

**Q: How are multipliers synced to SNAG?**
A: Via snagSyncService.syncMultipliers() run every 10 minutes in fullSync().

---

## 📞 Support

For issues or questions:
1. Check logs in Render dashboard
2. Verify ADMIN_SECRET is set correctly
3. Ensure database migration 003 was applied
4. Review KOL_REFERRAL_SYSTEM.md for detailed docs
