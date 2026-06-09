# Production Monitoring & Alerting Guide

**Purpose:** Track system health, catch issues early, and respond to failures  
**Deployment Date:** June 14, 2026  
**Monitoring Window:** First 30 days (daily checks), then ongoing

---

## 🔍 Key Metrics to Monitor

### Backend Performance
| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| API Response Time (dashboard) | < 100ms | 100-500ms | > 500ms |
| API Response Time (leaderboard) | < 50ms | 50-200ms | > 200ms |
| Commission Calc Duration | < 5s | 5-10s | > 10s |
| Final Score Recalc Duration | < 3s | 3-5s | > 5s |
| Leaderboard Cache Rebuild | < 10s | 10-20s | > 20s |
| Redis Connection Latency | < 10ms | 10-50ms | > 50ms |
| PostgreSQL Query Latency | < 5ms | 5-20ms | > 20ms |

### Application Logs
```bash
# Watch for these ERROR patterns:
grep -i "error\|failed\|exception" /var/log/shift-backend.log

# Expected warnings (non-fatal):
# "[Wallet] MetaMask not installed"
# "[Stitch] failed" (attribution tracking is optional)

# CRITICAL issues (must alert):
# "Cannot connect to database"
# "Redis connection failed"
# "Commission calculation error"
# "Leaderboard cache rebuild failed"
# "Unexpected error" with stack trace
```

### Database Health
```sql
-- Commission table growth
SELECT 
  DATE(awarded_at) as date,
  COUNT(*) as commissions,
  SUM(sp_awarded) as total_sp
FROM referral_commissions
GROUP BY DATE(awarded_at)
ORDER BY date DESC
LIMIT 7;
-- Should show daily commissions increasing over time

-- Monthly caps being tracked
SELECT 
  month_year,
  COUNT(DISTINCT referrer_wallet) as referrers,
  COUNT(DISTINCT referred_wallet) as referred,
  SUM(total_awarded) as total_sp
FROM referral_monthly_caps
GROUP BY month_year
ORDER BY month_year DESC
LIMIT 3;
-- Should show records for current month

-- Legacy balance claims
SELECT 
  COUNT(*) as total_legacy,
  SUM(CASE WHEN claimed THEN 1 ELSE 0 END) as claimed,
  SUM(CASE WHEN NOT claimed THEN pending_sp ELSE 0 END) as pending_total_sp
FROM referral_legacy_balance;
-- Track claim rate and pending balance

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_returned
FROM pg_stat_user_indexes
WHERE tablename LIKE 'referral%'
ORDER BY idx_scan DESC;
-- Ensure indexes are being used (high scans count)
```

### Redis Cache Health
```bash
# Monitor cache hit rate
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Check leaderboard cache entries
redis-cli ZCARD leaderboard:final_points
redis-cli ZCARD leaderboard:referral_count
redis-cli ZCARD leaderboard:referred_volume
redis-cli ZCARD leaderboard:referred_holding
# All should have ~thousands of entries after cache rebuild

# Check cache TTL
redis-cli TTL leaderboard:final_points
# Should show ~43200 seconds (12 hours) after rebuild

# Memory usage
redis-cli INFO memory | grep -E "used_memory_human|maxmemory"
# Alert if > 80% of maxmemory
```

---

## 📊 Monitoring Dashboard Setup

### Recommended Tools
- **Logs:** Datadog, LogRocket, or CloudWatch
- **Metrics:** Prometheus + Grafana, or New Relic
- **Uptime:** StatusPage, UptimeRobot
- **Alerting:** PagerDuty, Slack webhooks

### Key Dashboards to Create

#### 1. Referral System Health Dashboard
```
Layout (2x3 grid):
- API Response Times (line graph): 4 endpoints
- Cron Job Execution Times (bar chart): 4 jobs
- Commission Awards Per Hour (line graph)
- Leaderboard Cache Hit Rate (gauge)
- Redis Memory Usage (gauge)
- Active Users on Dashboard (counter)
```

#### 2. Commission Tracking Dashboard
```
Layout (2x3 grid):
- Total Commissions Awarded (counter): cumulative
- Commissions Per Hour (line graph)
- Average Commission Size (gauge): by tier
- Referrers Active This Month (counter)
- Legacy Claims Completed (gauge): % of total
- Monthly Cap Enforcement (stacked bar): usage %
```

#### 3. Database Performance Dashboard
```
Layout (2x3 grid):
- Query Latency (line graph): P50, P95, P99
- Index Usage (bar chart): scan counts
- Table Row Counts (gauge): referral_* tables
- Dead Tuple Ratio (gauge): need for VACUUM?
- Connection Pool Usage (gauge): % of max
- Replication Lag (gauge): if replicated DB
```

---

## 🚨 Alert Rules (Recommended)

### Critical Alerts (Page on-call)
```
- API response time > 500ms for 5 consecutive requests
- Redis connection failed or unreachable
- Database connection error
- Cron job failed (any of 4 jobs)
- Unhandled exception in referral routes
- Leaderboard cache empty after rebuild scheduled
```

### Warning Alerts (Email/Slack)
```
- API response time > 200ms for 10 consecutive requests
- Redis latency > 50ms for 5 min
- PostgreSQL slow query detected (> 20ms)
- Cron job took > 2x expected duration
- Legacy claim failed (user-facing error)
- Monthly cap approaching limit (usage > 90%)
```

### Informational (Slack daily digest)
```
- Daily commission volume
- New referrers registered
- Legacy claim rate
- Cache rebuild duration
- Top 5 referrers by commissions earned
```

---

## 🔄 Cron Job Monitoring

### Commission Calculation (Every 30 min)
```bash
# Expected log entries:
# [Cron] Starting commission calculation...
# [Cron] Commission calculation complete: processed XXX wallets, awarded YYY

# Alert if:
# - Missing entry for > 30 min window
# - "Award XXX" count = 0 for > 2 hours (no recent traders)
# - Error message appears
```

### Final Score Recalculation (Every 6 hours)
```bash
# Expected log entries:
# [Cron] Starting final score recalculation...
# [Cron] Final score recalculation complete: NNN users in XXXms

# Alert if:
# - Missing entry (should see at 0, 6, 12, 18 UTC)
# - Duration > 10 seconds
# - User count = 0 (something broke)
```

### Leaderboard Cache Refresh (Every 12 hours)
```bash
# Expected log entries:
# [Cron] Starting leaderboard cache refresh...
# [Leaderboard] Starting cache rebuild...
# [Leaderboard] Rebuilt final_points cache: NNN entries
# [Leaderboard] Rebuilt referral_count cache: NNN entries
# [Leaderboard] Rebuilt referred_volume cache: NNN entries
# [Leaderboard] Rebuilt referred_holding cache: NNN entries
# [Cron] Leaderboard cache refresh complete in XXXms

# Alert if:
# - Missing any cache rebuild entry
# - Entry count = 0 for any sort type
# - Duration > 20 seconds
# - Any Redis error
```

### Monthly Cap Reset (1st @ 00:00 UTC)
```bash
# Expected log entries (once per month):
# [Cron] Starting monthly cap reset...
# [Cron] Monthly cap reset complete: deleted XXX old cap records

# Alert if:
# - Not appearing on 1st of month
# - Error message
```

---

## 📈 Performance Baselines (First Week)

Record these after deployment to establish normal behavior:

```
Baseline Metrics (Sample):
├── API Response Times
│   ├── Dashboard GET: 45ms avg, 120ms p95, 200ms p99
│   ├── Referred List: 180ms avg, 400ms p95, 600ms p99
│   ├── Leaderboard: 25ms avg, 50ms p95, 80ms p99
│   └── Claim Legacy: 150ms avg, 300ms p95, 500ms p99
├── Cron Job Durations
│   ├── Commission Calc: 2.5s avg
│   ├── Final Score: 1.8s avg
│   ├── Leaderboard Cache: 8.5s avg
│   └── Monthly Reset: 0.3s avg
├── Database Metrics
│   ├── Avg Query Latency: 3ms
│   ├── Index Usage: 95% of queries use indexes
│   └── Connection Pool: 20-30% utilized
└── Cache Metrics
    ├── Redis Hit Rate: 99.5%
    ├── Memory Usage: 500MB-1GB
    └── Cache Rebuild: 100% success rate
```

---

## 🔧 Operational Runbooks

### Issue: API Response Time Degradation
**Symptoms:** Dashboard response > 500ms  
**Diagnosis:**
```bash
# Check database connection
psql -c "SELECT 1;" # Should return immediately

# Check slow queries
SELECT * FROM pg_stat_statements
WHERE mean_time > 20
ORDER BY mean_time DESC LIMIT 5;

# Check indexes
ANALYZE referral_commissions;
REINDEX INDEX idx_referral_commissions_referrer_month;
```

**Resolution:**
1. Check if cron job is running (might be blocking queries)
2. Run VACUUM ANALYZE on referral tables
3. Check if indexes are corrupted: REINDEX
4. Increase connection pool size if many queries queue up

### Issue: Leaderboard Cache Empty
**Symptoms:** Leaderboard returns 0 entries  
**Diagnosis:**
```bash
# Check Redis connection
redis-cli PING # Should return PONG

# Check cache keys
redis-cli KEYS "leaderboard:*"

# Manually trigger cache rebuild
curl -X POST https://api.shift/admin/cache/rebuild

# Or run directly
npx ts-node -e "
  import { leaderboardCacheService } from './src/services/leaderboardCacheService';
  leaderboardCacheService.rebuildAllCaches().then(() => process.exit(0));
"
```

**Resolution:**
1. Verify Redis is running: `redis-cli ping`
2. Check Redis memory: `redis-cli INFO memory`
3. Manually rebuild cache if needed
4. Increase Redis maxmemory if at limit

### Issue: Commission Awards Missing
**Symptoms:** User expects commission but doesn't see it  
**Diagnosis:**
```bash
# Check commission table
SELECT * FROM referral_commissions 
WHERE referrer_wallet = '0xUSER'
ORDER BY awarded_at DESC
LIMIT 10;

# Check monthly cap (might be hit)
SELECT * FROM referral_monthly_caps
WHERE referrer_wallet = '0xUSER'
AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

# Check if referred user has low SP (tier matters)
SELECT wallet, total_xp FROM users
WHERE referred_by_wallet = '0xUSER';
```

**Resolution:**
1. If monthly cap hit: wait until next month (500 SP limit)
2. If no commissions: verify referred users are trading
3. Run commission calculation manually:
   ```bash
   npx ts-node -e "
     import { referralCommissionService } from './src/services/referralCommissionService';
     referralCommissionService.calculateAndAwardCommission('0xWALLET', 100);
   "
   ```

### Issue: Legacy Balance Claim Fails
**Symptoms:** User gets error when clicking "Claim Now"  
**Diagnosis:**
```bash
# Check if legacy balance exists
SELECT * FROM referral_legacy_balance 
WHERE referrer_wallet = '0xUSER';

# Check if already claimed
SELECT * FROM referral_legacy_balance 
WHERE referrer_wallet = '0xUSER'
AND claimed = true;

# Check API logs for error
grep -A 5 "claim-legacy" /var/log/shift-backend.log | tail -20
```

**Resolution:**
1. If no legacy balance: run backfill script again
2. If already claimed: show user message "Balance already claimed"
3. If database error: check connection + disk space

---

## 📞 Escalation Path

1. **Level 1 (Automated Alerts):** Slack notification to #alerts channel
2. **Level 2 (Manual Investigation):** Team reviews logs, runs diagnostics
3. **Level 3 (Incident Response):** Page on-call engineer if issue not resolved in 5 min
4. **Level 4 (Rollback):** Revert latest deployment if critical

---

## ✅ Post-Deployment Monitoring Schedule

**Day 1 (June 14):**
- Every 30 min: Check cron job logs
- Hourly: Review API response times
- After backfill: Verify legacy balance claims work
- Evening: Check error rates (should be zero)

**Days 2-7:**
- Daily: Review commission totals, cache hit rates, error logs
- Twice daily: Check database size growth
- Monitor referral activation (users claiming balance)

**Week 2-4:**
- Daily: Core metrics review
- Weekly: Performance trend analysis
- Monitor for memory leaks or connection pool issues

**Month 2+:**
- Weekly: System health review
- Monthly: Performance baseline comparison
- Quarterly: Capacity planning based on growth

---

## 📋 Monitoring Checklist

After deployment, verify:
- [ ] All 4 cron jobs executing successfully
- [ ] API response times within baseline
- [ ] Redis cache populated and being used
- [ ] PostgreSQL indexes performing
- [ ] No unhandled exceptions in logs
- [ ] Legacy balance claims working
- [ ] Leaderboard displaying correctly (all 4 sorts)
- [ ] Monthly cap enforcement active
- [ ] Commission calculation running every 30 min
- [ ] No critical alerts firing
- [ ] Dashboard accessible and responsive

---

**🎯 With these monitoring practices, the referral system will stay healthy and performant in production.**

