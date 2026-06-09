# Phase 7: Referral System Production Deployment
**Status:** Ready for deployment  
**Deployment Date:** June 14, 2026 (Week 3, Day 14)  
**Critical Time:** 00:30 UTC (legacy backfill execution)

---

## 📋 Pre-Deployment Checklist

### Database
- [ ] Review migrations 022 and 023 in staging
- [ ] Verify all 11 indexes created successfully
- [ ] Confirm `referral_commission_sp` column exists on users table
- [ ] Test referral_commissions table constraints
- [ ] Verify referral_monthly_caps UNIQUE constraint

### Backend Services
- [ ] ReferralCommissionService compiles without errors
- [ ] UserPointsService weighted formula tests pass
- [ ] LeaderboardCacheService Redis connection works
- [ ] ReferralCronJobs initialized on startup
- [ ] All API routes respond correctly

### Frontend Components
- [ ] ReferralContent loads without wallet → error message
- [ ] ReferralHero displays stats correctly
- [ ] PendingBalanceCard shows legacy balance (if any)
- [ ] ReferredUsersTable fetches and sorts referred users
- [ ] LeaderboardTabs displays all 4 sort options
- [ ] LeaderboardRowChips display metrics per row

### API Endpoints (Test on staging)
```bash
# Test dashboard endpoint
curl https://staging-api.shift/api/referral/<wallet>
# Expected: { wallet, stats: {...}, legacy: {...}, commission: {...} }

# Test referred list
curl https://staging-api.shift/api/referral/<wallet>/referred
# Expected: { wallet, referredCount, referred: [...] }

# Test leaderboard
curl "https://staging-api.shift/api/leaderboard?sort=final_points&limit=10"
# Expected: { sort, limit, count, leaderboard: [...] }
```

### Environment Variables
Ensure these are set in production:
```env
# Backend
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://host:port
NEXT_PUBLIC_API_URL=https://api.shift-airdrop.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.shift-airdrop.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-id>
```

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migrations (Production)
**Timing:** Immediately before backfill script  
**Duration:** ~5 minutes  
**Reversibility:** Keep migration rollback script ready

```bash
# On production database
psql -U postgres -d shift_airdrop < migrations/022_referral_commission_engine.sql
psql -U postgres -d shift_airdrop < migrations/023_referral_indexes.sql

# Verify
psql -U postgres -d shift_airdrop -c "\dt referral_*"
```

**Expected output:**
```
                    List of relations
 Schema |           Name            | Type  | Owner
--------+---------------------------+-------+-------
 public | referral_commissions      | table | postgres
 public | referral_legacy_balance   | table | postgres
 public | referral_monthly_caps     | table | postgres
 public | referral_stats_cache      | table | postgres
```

### Step 2: Deploy Backend Services (Production)
**Timing:** After migrations verified  
**Duration:** ~10 minutes  
**Verification:** Check logs for successful initialization

```bash
# Deploy to production
git push origin main
# CI/CD pipeline runs tests and deploys

# Verify services started
curl https://api.shift-airdrop.com/api/leaderboard?sort=final_points&limit=1
# Should return valid leaderboard data
```

**Verify cron jobs initialized:**
```bash
# Check logs for:
# "[Cron] Initializing referral system jobs..."
# "[Cron] Commission calculation job scheduled..."
# "[Cron] Final score calculation job scheduled..."
# "[Cron] Leaderboard cache refresh job scheduled..."
# "[Cron] Monthly cap reset job scheduled..."
```

### Step 3: Deploy Frontend Components (Production)
**Timing:** After backend verified  
**Duration:** ~5 minutes

```bash
cd frontend
npm run build
# Deploy built app to hosting
npm run deploy  # or your hosting provider's deploy command
```

**Verify frontend accessibility:**
- [ ] https://shift-airdrop.xyz/referral loads
- [ ] Navigation menu shows "Referral" option
- [ ] Connect Wallet button works (Solana wallets)
- [ ] Referral dashboard displays after connection

### Step 4: Run Legacy Backfill Script
**⚠️ CRITICAL: Only execute once at scheduled time**  
**Timing:** June 14, 2026 at 00:30 UTC  
**Duration:** ~2-5 minutes (depends on referrer count)  
**Rollback:** Manual DELETE from referral_legacy_balance if needed

```bash
# First: Dry-run (no database changes)
npx ts-node scripts/backfill_legacy_referrers.ts --dry-run

# Expected output:
# [Step 1] Identifying legacy referrers...
# Found NNN legacy referrers
#
# [Step 2] Calculating pending commissions...
# Calculated backfill for NNN referrers
# Total Position SP to backfill: XXXXX
#
# [Step 3] Top 10 referrers by pending SP:
#   1. 0x1234... → 5000 SP (50 referred)
#   2. 0x5678... → 3200 SP (32 referred)
#   ...
#
# [Step 4] Checking for existing legacy balances...
# No existing legacy balances. Safe to proceed.
#
# [Step 5] DRY RUN: Skipping DB insertion (use --execute to commit)

# Once confirmed, execute (production DB modification)
npx ts-node scripts/backfill_legacy_referrers.ts --execute

# Expected output:
# ...same as dry-run, but with...
# [Step 5] Inserting legacy balances into DB...
# ✅ Inserted/updated NNN/NNN legacy balances
#
# [Step 6] Verifying insertion...
# ✅ NNN legacy balances with XXXXX total SP
```

### Step 5: Send Notification to Legacy Referrers
**Timing:** Immediately after backfill completes  
**Duration:** ~30 minutes (email blast)

**Email Template:**
```
Subject: 🎉 Your SHIFT Referral Legacy Balance is Ready to Claim

Hi {{referrer_name}},

Your early referrals have earned you Position SP! We've calculated 
your pending balance based on your referred users' positions.

Pending Balance: {{pending_sp}} Position SP
Referred Users: {{referral_count}}

To claim your balance:
1. Visit https://shift-airdrop.xyz/referral
2. Connect your Solana wallet
3. Click "Claim Now" on the Pending Legacy Balance card
4. Your SP will be added to your total score immediately

Your referred users will also start earning commission SP automatically
when they trade. You'll earn:
- 10% commission if they have < 1,000 SP
- 12% commission if they have 1,000 - 10,000 SP
- 15% commission if they have > 10,000 SP

Max 500 Position SP per user per month (reset on 1st of month)

Questions? Reply to this email or visit our Discord.

Best regards,
The SHIFT Team
```

---

## ✅ Post-Deployment Verification

### Monitor Cron Jobs (First 24 hours)
```bash
# Watch logs for successful job execution

# Every 30 min: Commission calculation
grep -i "commission calculation" logs

# Every 6 hours: Final score recalculation
grep -i "final score" logs

# Every 12 hours: Leaderboard cache refresh
grep -i "leaderboard cache refresh" logs
```

### API Response Checks
```bash
# 1. Dashboard endpoint (should have legacy balance)
curl https://api.shift-airdrop.com/api/referral/0x1234...
# { wallet, stats, legacy: {pending: 0, claimed: true}, commission }

# 2. Leaderboard (should show all 4 sorts)
for sort in final_points referral_count referred_volume referred_holding; do
  curl "https://api.shift-airdrop.com/api/leaderboard?sort=$sort&limit=1"
done

# 3. Referred users (should show commission earned)
curl https://api.shift-airdrop.com/api/referral/0x1234.../referred
# { wallet, referredCount, referred: [{...commissionEarned, monthlyEarned}] }
```

### Frontend Smoke Tests
- [ ] Referral page loads without errors
- [ ] Stats display correctly for logged-in user
- [ ] Legacy balance claim button works
- [ ] Referred users table displays and sorts
- [ ] Leaderboard tabs switch between 4 sorts
- [ ] Row chips show referral count, volume, holding

### Database Health Checks
```bash
# Check indexes are being used
SELECT * FROM pg_stat_user_indexes 
WHERE relname LIKE 'referral%';

# Check referral_legacy_balance data
SELECT COUNT(*), SUM(pending_sp) FROM referral_legacy_balance 
WHERE pending_sp > 0;

# Should show: NNN rows, XXXXX total SP (matches backfill output)

# Check monthly caps are reset (if it's 1st of month)
SELECT COUNT(*) FROM referral_monthly_caps 
WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM');
# Should be minimal (only current month entries)
```

---

## 🚨 Rollback Procedure (If Needed)

### If Backfill Script Caused Issues
```bash
# ONLY if legacy balances are corrupt/incorrect
DELETE FROM referral_legacy_balance;

# Re-run backfill script:
npx ts-node scripts/backfill_legacy_referrers.ts --dry-run
npx ts-node scripts/backfill_legacy_referrers.ts --execute
```

### If Migrations Caused Issues
```bash
# Rollback migrations (in reverse order)
psql -U postgres -d shift_airdrop -c "
  DROP TABLE IF EXISTS referral_legacy_balance;
  DROP TABLE IF EXISTS referral_stats_cache;
  DROP TABLE IF EXISTS referral_monthly_caps;
  DROP TABLE IF EXISTS referral_commissions;
  ALTER TABLE users DROP COLUMN IF EXISTS referral_commission_sp;
"
```

### If API Endpoint Failures
- [ ] Check Redis connection: `redis-cli ping`
- [ ] Check PostgreSQL connection: `psql -U postgres -d shift_airdrop -c "SELECT 1"`
- [ ] Verify environment variables are set
- [ ] Check logs for specific error messages
- [ ] Restart backend service: `systemctl restart shift-backend`

---

## 📊 Performance Baselines (Post-Deployment)

| Operation | Expected Time | Actual Time |
|-----------|---------------|-------------|
| Commission calculation (30k users) | < 30s | _____ |
| Final score recalc (10k users) | < 10s | _____ |
| Leaderboard cache rebuild (4 sorts) | < 5s | _____ |
| API: GET /api/referral/:wallet | < 100ms | _____ |
| API: GET /api/leaderboard | < 50ms | _____ |

---

## 📅 Post-Deployment Schedule

| Date | Time (UTC) | Task |
|------|-----------|------|
| Jun 14 | 00:30 | Run legacy backfill script |
| Jun 14 | 01:00 | Send email to legacy referrers |
| Jun 14 | 06:00 | Monitor first cron job execution (commission calc) |
| Jun 14 | 12:00 | Monitor second cron job execution (final score) |
| Jun 15 | 00:00 | Monitor third cron job execution (leaderboard cache) |
| Jun 21 | 00:00 | Monitor monthly cap reset (1st of month) |

---

## 🎯 Success Criteria

✅ **Deployment is successful when:**
1. All migrations apply without errors
2. All 4 API endpoints respond with valid data
3. Frontend referral page loads and displays stats
4. Legacy backfill script completes with expected SP total
5. Cron jobs execute on schedule (visible in logs)
6. No error spikes in application monitoring
7. Leaderboard cache hits 100% for all 4 sorts within 12 hours
8. Zero regression in other dashboard features

---

**🚀 Ready to deploy. Proceed with checklist above.**
