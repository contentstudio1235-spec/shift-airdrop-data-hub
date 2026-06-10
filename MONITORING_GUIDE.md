# Post-Deployment Monitoring Guide

## 🚀 Quick Summary

Three tasks for deployment follow-up:

### 1. 📢 Post Announcements (Manual - Copy/Paste)
- **Telegram**: Copy the Telegram text and post to SHIFT channels
- **Discord**: Copy the Discord text and post to SHIFT server

### 2. 🔍 Monitor Leaderboard Cache Refresh
Verify the cache formula is working correctly and data is fresh.

```bash
npx ts-node scripts/monitor-leaderboard-cache.ts
```

**What it checks:**
- ✅ Cache has entries (should be 100s of wallets)
- ✅ Formula accuracy (samples 10 top wallets, verifies calculation matches database)
- ✅ Data freshness (checks TTL, time since last refresh)
- ✅ Redis health (memory usage, cache hit rate)

**Expected output:**
```
📊 LEADERBOARD CACHE HEALTH CHECK

1️⃣  Cache Freshness & Status
  📈 Final Points: 342 entries
  🎯 Referral Count: 156 entries
  💰 Referred Volume: 98 entries
  📊 Referred Holding: 87 entries
  ⏱️  Cache TTL: 710 minutes remaining
  🔄 Last Refresh: ~6/10/2026, 2:30:45 PM

2️⃣  Formula Accuracy Verification
  ✅ Passed: 10/10 samples
  ❌ Failed: 0/10 samples

3️⃣  Redis Metrics
  💾 Used Memory: 2.5M
  📍 Keyspace Hits: 45,230
  📍 Keyspace Misses: 3,421
  🎯 Hit Rate: 92.95%

4️⃣  Sample Top 5 Entries (by Final SP)
  Rank | Wallet               | Final SP
  -----|----------------------|----------
  1    | 0x1234ab...          | 52000
  2    | 0x5678cd...          | 48500
  ...
```

**Success criteria:**
- ✅ **Passed: 10/10 samples** (all formulas match)
- ✅ **Cache TTL > 0** (cache is still fresh)
- ✅ **Hit Rate > 80%** (Redis is performing well)

### 3. 🎁 Track Legacy Balance Claims
Monitor early referrers' pending legacy balance and activation progress.

```bash
npx ts-node scripts/track-legacy-balance-claims.ts
```

**What it checks:**
- ✅ Count of referrers with pending legacy balance
- ✅ How many referrals are unlocked (≥$5) vs pending (<$5)
- ✅ Total legacy SP waiting to be claimed
- ✅ Recently activated referrals (unlocked in last 7 days)

**Expected output:**
```
🎁 LEGACY BALANCE CLAIMS TRACKER

1️⃣  Referrers with Pending Legacy Balance
  👥 Referrers with Old Referrals: 42
  ✅ Unlocked (referred ≥$5): 28
  ⏳ Pending (referred <$5): 14

2️⃣  Pending Claims (Waiting for $5 Activation)
  Found 14 claims pending activation

  1. 0x1234ab... → 0x5678cd...
     Pending SP: 450 | Holding: $2.50 | $2.50 needed

3️⃣  Recently Unlocked Claims (Last 7 Days)
  Found 6 recently activated referrals

  1. 0xabcdef... ← 0x112233...
     Unlocked SP: 320 | Activated: 6/9/2026

4️⃣  Legacy Balance Summary
  💰 Total Legacy SP Pending: 6,240 SP
  ✅ Total Legacy SP Unlocked (7d): 1,850 SP
  📊 Average per Referrer: 445 SP pending
  🎯 Activation Rate: 66.7%

============================================================
📊 LEGACY BALANCE HEALTH METRICS
============================================================
Total Legacy Referrers: 42
Activated Referrals: 28
Pending Referrals: 14
Unlocked SP Available: 12,450
Pending SP (awaiting activation): 6,240
Total Legacy SP in System: 18,690
============================================================
```

**Success criteria:**
- ✅ **Activation Rate > 50%** (most referrers reaching $5)
- ✅ **Pending claims visible** (system tracking correctly)
- ✅ **Recent unlocks happening** (users reaching $5 threshold)

---

## 📅 Recommended Monitoring Schedule

| When | What | Command |
|------|------|---------|
| **Immediately after deploy** | Run both monitors to confirm baselines | Both scripts |
| **Every 6 hours (1st day)** | Check cache freshness and formula | `monitor-leaderboard-cache.ts` |
| **Daily (1st week)** | Track legacy activation progress | `track-legacy-balance-claims.ts` |
| **Weekly** | Full health check on both | Both scripts |
| **Monthly** | Detailed analysis + reporting | Both scripts |

---

## 🛠️ Troubleshooting

### Cache shows 0 entries or formula failures
```
❌ Failed: 3/10 samples
  ❌ 0x1234... | Cached: 5000 | Computed: 5150 | Diff: 150
```
**Action:** Backend cache rebuild may have failed. Check:
```bash
docker logs <backend-container> | grep "Leaderboard"
```
Then manually trigger cache rebuild via admin API.

### Hit rate is low (< 50%)
```
🎯 Hit Rate: 28.45%
```
**Action:** Cache may be thrashing. Check:
- Are there many new users? (expected, will stabilize)
- Redis memory usage OK? (< 1GB)
- Cache TTL running out soon? (wait for next 12-hour refresh)

### Legacy balance pending claims not decreasing
```
⏳ Pending (referred <$5): 14 (no change from yesterday)
```
**Action:** This is normal — users need time to reach $5. If staying flat for > 7 days, check:
- Are referred traders actually buying SHIFT tokens?
- Is the $5 activation gate working? (check one referral in dashboard)

---

## 📊 Key Metrics to Watch

| Metric | Target | Acceptable | Action |
|--------|--------|-----------|--------|
| Cache entries (final_points) | 200+ | > 100 | Rebuild if < 50 |
| Formula accuracy | 10/10 | 9/10+ | Rebuild cache if < 9/10 |
| Redis hit rate | > 90% | > 70% | Investigate if < 70% |
| Cache TTL | 12h remaining | > 30min | Upcoming refresh (normal) |
| Activation rate | 70%+ | > 50% | Monitor, give time |
| Legacy SP pending | Decreasing | Stable | Normal, users activating slowly |

---

## 🔔 Alerts to Set Up

Consider setting up automated alerts for:

1. **Cache formula failure**: If any sample fails accuracy check
2. **Redis disconnection**: If scripts can't connect
3. **Zero cache entries**: Sign of cache rebuild failure
4. **Hit rate drop**: Below 50% indicates issues
5. **TTL near zero**: Less than 5 minutes until expiry

Set these up in your monitoring tool (DataDog, NewRelic, etc.) for production.
