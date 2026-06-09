# Referral System Deployment Checklist - June 14, 2026

**System:** SHIFT RWA Referral System  
**Deployment Time:** 00:30 UTC (exactly)  
**Duration:** ~30 minutes  
**Critical:** Yes - One-time legacy backfill

---

## ✅ PRE-DEPLOYMENT (Day Before)

### Code & Compilation
- [ ] `npm run build` completes without errors
- [ ] Frontend builds: `cd frontend && npm run build` succeeds
- [ ] No TypeScript errors
- [ ] All 6 frontend components exist
- [ ] All 4 backend services exist
- [ ] Backfill script tested with `--dry-run`

### Database
- [ ] Production DB backup created
- [ ] Backup verified restorable
- [ ] Migrations 022 & 023 staged
- [ ] Rollback script ready

### Infrastructure
- [ ] PostgreSQL available (`psql --version`)
- [ ] Redis available (`redis-cli ping`)
- [ ] 2GB+ free disk space (backend)
- [ ] 5GB+ free DB space

### Team & Comms
- [ ] Deployment team ready
- [ ] On-call engineer assigned
- [ ] Support team notified
- [ ] Slack #shift-deployment channel open
- [ ] Customer communication template prepared

---

## 🚀 DEPLOYMENT (June 14, 00:30 UTC)

### T-90 min: Pre-Flight
- [ ] Run: `bash scripts/pre_deployment_check.sh` → All PASS
- [ ] No concurrent deployments
- [ ] Verify env vars set (DATABASE_URL, REDIS_URL, API_URL)
- [ ] Test DB: `psql -c "SELECT 1;"`
- [ ] Test Redis: `redis-cli ping` → PONG

### T-60 min: Standby
- [ ] Post status to #shift-deployment
- [ ] Reconfirm team ready
- [ ] Take baseline metrics:
  ```sql
  SELECT COUNT(*) as users FROM users;
  SELECT COUNT(*) as commissions FROM referral_commissions;
  SELECT COUNT(*) as legacy FROM referral_legacy_balance;
  ```
- [ ] Document user/commission/legacy counts

### T-30 min: Final Prep
- [ ] "Starting in 30 min" notification
- [ ] No recent main branch commits
- [ ] Backup confirmed
- [ ] Rollback scripts accessible
- [ ] Team at keyboards

### T-0: EXECUTE

#### Phase 1: Migrations (00:30-00:05 UTC)

**Migration 022:**
```bash
psql -d shift_airdrop < migrations/022_referral_commission_engine.sql
# Verify 4 tables created
psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'referral%';"
# Should return: 4
```
- [ ] Migration 022: DONE ✓

**Migration 023:**
```bash
psql -d shift_airdrop < migrations/023_referral_indexes.sql
# Verify 11 indexes created
psql -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename LIKE 'referral%';"
# Should return: 11
```
- [ ] Migration 023: DONE ✓
- [ ] **CHECKPOINT:** Both migrations successful or ROLLBACK

#### Phase 2: Backend Deploy (00:05-00:15 UTC)
```bash
git pull origin main && npm ci && npm run build && npm run deploy
curl -s https://api.shift-airdrop.com/api/leaderboard?sort=final_points&limit=1
# Should return valid JSON with leaderboard data
```
- [ ] Backend deployed
- [ ] Health check passed
- [ ] Cron jobs logged as initialized

#### Phase 3: Frontend Deploy (00:15-00:20 UTC)
```bash
cd frontend && npm ci && npm run build && npm run deploy
curl -s https://shift-airdrop.xyz/referral | grep -q "Referral Dashboard"
# Should find "Referral Dashboard" text
```
- [ ] Frontend deployed
- [ ] /referral page loads
- [ ] Navigation includes "Referral" link

#### Phase 4: Legacy Backfill (00:25-00:30 UTC)

**Dry-run first:**
```bash
npx ts-node scripts/backfill_legacy_referrers.ts --dry-run
# Note the "Total Position SP to backfill: XXXXX" number
```
- [ ] Dry-run successful
- [ ] Expected SP total noted: _________ SP

**Execute (only with --execute flag):**
```bash
npx ts-node scripts/backfill_legacy_referrers.ts --execute
# Verify: ✅ Inserted/updated NNN/NNN legacy balances
# Verify: ✅ NNN legacy balances with XXXXX total SP
```
- [ ] Execute successful
- [ ] SP total matches dry-run
- [ ] Referrer count: _________ 
- [ ] Total SP: _________ 

### T+5 min: Verification (00:35 UTC)

**Test all endpoints:**
```bash
curl https://api.shift-airdrop.com/api/referral/0x123... 
curl https://api.shift-airdrop.com/api/referral/0x123.../referred
curl https://api.shift-airdrop.com/api/leaderboard?sort=final_points
curl https://api.shift-airdrop.com/api/leaderboard?sort=referral_count
curl https://api.shift-airdrop.com/api/leaderboard?sort=referred_volume
curl https://api.shift-airdrop.com/api/leaderboard?sort=referred_holding
# All should return valid JSON
```
- [ ] Dashboard endpoint: ✓
- [ ] Referred list endpoint: ✓
- [ ] Leaderboard (4 sorts): ✓

**Check logs:**
```bash
tail -50 /var/log/shift-backend.log | grep -i "error\|exception\|failed"
# Should be empty or only non-critical warnings
```
- [ ] No critical errors in logs: ✓

---

## 📧 POST-DEPLOYMENT (00:40 UTC+)

### Notifications
- [ ] Support team notified
- [ ] Legacy referrers emailed with claim instructions
- [ ] Status posted to main Slack channel

### Monitoring (First 6 Hours)
- [ ] Tail backend logs
- [ ] Check API response times
- [ ] Monitor for errors (should be 0)
- [ ] Verify leaderboard caches populated
- [ ] Track legacy balance claims (should be > 0 after 1 hour)

### Hourly Spot Checks (01:30, 02:30, 03:30, etc. UTC)
- [ ] 01:30: ✓
- [ ] 02:30: ✓  
- [ ] 03:30: ✓
- [ ] 04:30: ✓
- [ ] 05:30: ✓
- [ ] 06:30: ✓

---

## ✅ SUCCESS = All These True

- [ ] Migrations 022 & 023: Applied
- [ ] Backend: Deployed + Cron jobs running
- [ ] Frontend: Deployed + Page accessible
- [ ] Backfill: Executed + SP total matches
- [ ] APIs: All 4 returning data
- [ ] Logs: Zero critical errors
- [ ] Cache: Leaderboard populated
- [ ] Features: No regression
- [ ] Communications: Team & users notified

---

## 🚨 ROLLBACK (If Needed)

```bash
# Option 1: Drop tables (if corrupted data)
psql -c "
  DROP TABLE IF EXISTS referral_legacy_balance CASCADE;
  DROP TABLE IF EXISTS referral_stats_cache CASCADE;
  DROP TABLE IF EXISTS referral_monthly_caps CASCADE;
  DROP TABLE IF EXISTS referral_commissions CASCADE;
  ALTER TABLE users DROP COLUMN IF EXISTS referral_commission_sp;
"

# Option 2: Restore database from backup
# (contact DB admin - varies by provider)

# Option 3: Disable endpoints
# Comment out referral routes, redeploy backend
```

---

## 👥 Sign-Off

| Role | Name | Time | Status |
|------|------|------|--------|
| Deployment Lead | ________ | _____ UTC | |
| Database Admin | ________ | _____ UTC | |
| Backend Lead | ________ | _____ UTC | |
| Frontend Lead | ________ | _____ UTC | |
| QA | ________ | _____ UTC | |

---

**🎉 Referral system LIVE in production!**

