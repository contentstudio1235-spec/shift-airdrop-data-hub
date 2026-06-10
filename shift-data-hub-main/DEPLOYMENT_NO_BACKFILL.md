# 🚀 Deployment Guide: P&L Without Backfill (Safe for Quota)

## Strategy: Deploy Now, Backfill Next Month

**Goal:** Get P&L live without hitting Helius quota limits

---

## Phase 1: Deploy P&L Feature (Skip Backfill)

### Steps
```bash
# 1. Test locally (normal flow)
npm run build                    # 0 errors
npm run dev                      # Start backend

# 2. Deploy to production
git push origin main
# Render + Vercel auto-deploy (5 min)

# 3. ❌ DO NOT RUN BACKFILL
#    Skip this command:
#    npm run ts-node src/scripts/backfill-entry-prices.ts
```

### What This Means for Users

**New Positions (Going Forward):**
```
✅ User opens TSL2L position
   → Entry price captured from blockchain immediately
   → P&L shows from day 1
   → 100% accurate
```

**Old Positions (Existing):**
```
⚪ Positions opened before P&L feature
   → Show as "N/A" initially
   → Fine, they're not active anyway
   → Will be filled in next month during backfill
```

**Closed Positions (History):**
```
⚪ Previously closed trades
   → Show as "N/A" for P&L
   → Will show realized P&L next month
```

---

## Phase 2: Monitor & Verify (Week 1)

### What to Watch
```
✅ New positions opening
   → Check: price_at_open is populated
   → Check: P&L badges display
   → Check: No Helius errors in logs

✅ Helius quota usage
   → Check dashboard daily
   → Monitor for unexpected spikes
   → Should be ~3-5 calls/day
```

### Test New Position Flow
```bash
1. Create a test position on Jupiter (buy TSL2L)
2. Wait for blockchain confirmation
3. Check API: curl https://api.../api/positions/$WALLET/active
4. Verify: "priceAtOpen" field populated
5. Check dashboard: P&L badge shows
```

---

## Phase 3: Next Month (When Quota Resets)

### Day 1 of Next Month
```bash
# Run full backfill NOW that quota resets
npm run ts-node src/scripts/backfill-entry-prices.ts

# Expected:
# • 1,051 positions processed
# • ~950 updated successfully
# • ~100 old positions with missing data
```

### What Happens
```
Before Backfill:
  Old positions: N/A
  New positions: P&L calculated
  
After Backfill:
  Old positions: P&L calculated
  New positions: P&L calculated
  Complete coverage ✅
```

---

## Cost Breakdown (This Month)

```
Deployment: 0 calls (no backfill)
Ongoing P&L: ~100 calls (new/closed positions)

Total: ~100 calls = 10% of remaining quota ✅ SAFE
Buffer: 90% of remaining quota available for other uses
```

---

## Cost Breakdown (Next Month)

```
Backfill: ~105 calls (one-time, safe)
Ongoing: ~100-150 calls
Total: ~200-250 calls = 20-25% of reset quota ✅ HEALTHY
```

---

## User Messaging

### What to Announce
```
"Portfolio P&L is now live! 

✅ Entry prices extracted from blockchain (100% accurate)
✅ P&L shows immediately for new trades
✅ Dashboard refreshes every 60 seconds

📝 Note: Positions created before today won't show P&L yet.
   This will be added next month when we process historical data."
```

### FAQ Addition
```
Q: Why don't old positions show P&L?
A: We're processing entry prices for new trades first.
   Historical P&L will be added early next month.
   
Q: Will my P&L change?
A: No, entry prices from blockchain don't change.
   Current prices refresh every 60 seconds.
```

---

## Helius Quota Management (Going Forward)

### Monthly Budget (Assuming 1,000 calls/month)
```
Webhooks: 700 calls (70%) - Essential, can't reduce
RPC calls: 200 calls (20%) - Can optimize
P&L feature: 100 calls (10%) - Efficient, batched
Total: 1,000 calls (100%) ✅ At capacity
```

### Ways to Optimize for Future
```
1. Cache RPC responses (token metadata, balances)
2. Batch webhook processing (deduplicate events)
3. Use Jupiter for prices (not Helius) ✅ Already doing
4. Limit backfill frequency (once/month)
5. Consider upgrading Helius plan if heavy users increase
```

---

## Comparison: Backfill vs No Backfill

| Aspect | With Backfill | Without Backfill |
|--------|---------------|------------------|
| Cost this month | 255 calls (risky) | 100 calls (safe) |
| Cost next month | 250 calls (healthy) | 250 calls (healthy) |
| User experience | Complete P&L day 1 | Partial P&L day 1 |
| Risk | High (quota overrun) | Zero (safe) |
| Implementation | Run script now | Run script next month |
| Recommendation | ❌ Not advisable | ✅ Recommended |

---

## Checklist Before Deploying

```
✅ Code Changes
  □ P&L feature code is complete
  □ Tooltip explains "not real-time"
  □ Build succeeds (0 errors)
  
✅ Quota Review
  □ Checked Helius dashboard
  □ Confirmed remaining calls
  □ Confirmed plan tier
  □ Decision: Option 2 (no backfill)
  
✅ Deployment Setup
  □ Won't run backfill script
  □ Will monitor quota daily
  □ Will test new position flow
  □ Will schedule backfill for next month
  
✅ Communication
  □ FAQ prepared with "old positions show N/A" message
  □ Team briefed on no-backfill approach
  □ Support ready for user questions
  □ Reminder set for next month's backfill
```

---

## Timeline

```
TODAY:
  ├─ Test locally (2-3 hours)
  ├─ Deploy to production (5 min)
  └─ Announce: "P&L live, old positions N/A temporarily"

WEEK 1:
  ├─ Monitor quota usage (daily)
  ├─ Test new position P&L flow
  └─ Watch for user feedback

NEXT MONTH (Day 1):
  ├─ Run backfill: npm run ts-node src/scripts/backfill-entry-prices.ts
  ├─ Verify: All old positions now have P&L
  └─ Announce: "Historical P&L now available"
```

---

## If Quota Still Looks Tight

Even safer option: Lite backfill (50 most recent positions)

```bash
# Edit src/scripts/backfill-entry-prices.ts line 19:
# Change FROM: 
#   WHERE status = 'open' AND price_at_open IS NULL
# Change TO:
#   WHERE status = 'open' AND price_at_open IS NULL
#   ORDER BY opened_at DESC LIMIT 50

# Run:
npm run ts-node src/scripts/backfill-entry-prices.ts

# Result: Only recent positions get P&L (uses 50 calls instead of 105)
```

Cost: 50 calls (safe)
Coverage: Most important 5% of positions

---

## Summary

**Recommended approach: Deploy without backfill**

- ✅ Zero risk of quota overrun
- ✅ New positions get P&L immediately
- ✅ Old positions show N/A (acceptable for inactive positions)
- ✅ Backfill next month when quota resets
- ✅ Users understand via FAQ messaging
- ✅ Healthy quota usage for future

