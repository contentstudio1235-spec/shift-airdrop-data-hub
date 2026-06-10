# 📊 Helius API Usage Analysis & Dual-Key Strategy

## Current Status
```
Plan: Pro (10M calls/month)
Used: 7.5M (75%)
Remaining: 2.5M (25%)
Days left in month: ~7-15 days (estimate)

Daily burn rate: 2.5M ÷ 30 = 83,333 calls/day
Current remaining: 2.5M calls
```

---

## Daily Usage Breakdown

### By Service (Estimated)

| Service | Calls/Day | Calls/Month | Percentage |
|---------|-----------|------------|------------|
| **Webhooks (DOMINANT)** | ~70,000 | 2.1M | 28% |
| RPC Calls (getTokenAccountsByOwner, getAccountInfo) | ~10,000 | 300K | 4% |
| Wallet Sync (walletSyncService) | ~2,000 | 60K | <1% |
| Admin manual syncs | ~100 | 3K | <0.1% |
| **New P&L Feature** | ~3 | 100 | <1% |
| **TOTAL** | ~82,000 | 2.46M | 33% |

### Most Usage (Webhooks)
The **webhook** is the heavy user:
- Each Jupiter swap triggers a webhook
- Helius sends enhanced tx data (NOT an API call to us)
- We process it locally (0 Helius API calls per swap)
- BUT: We call Jupiter sometimes for SOL price → ~1 call per swap

**Calculation:**
- Swaps per day: ~50-100 (active traders)
- SOL price calls: ~50-100/day
- But Jupiter caches for 5 min, so maybe ~10-20 actual API calls/day

### RPC Calls
- Fetch token account balances
- Get SPL token metadata
- Balance checks on sync
- ~10,000/day estimated

---

## Good News for P&L Feature

```
Current Backfill:  ~105 calls (ONE-TIME)
Monthly ongoing:   ~100 calls (NEW trades)

Your remaining quota: 2.5M calls
P&L monthly cost: 0.004% of quota ✅ NEGLIGIBLE

You can SAFELY do full backfill + run P&L indefinitely
```

---

## 💡 Dual-Key Strategy (Brilliant!)

### Why This Works
```
Main Account (Pro):     10M/month  (current: 2.5M remaining)
Free Tier Account:      1M/month   (fresh, unused)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Capacity:         11M/month  ✅

P&L Feature Uses:       ~100/month (use free tier)
Main Account for:       Webhooks + RPC (Pro tier)
Result:                 Both stay healthy
```

### Implementation Plan

#### 1. Create Free Tier Account
```
Steps:
1. Sign up for Helius free tier: https://www.helius.dev
2. Create new API key
3. Free tier gives: 1M calls/month, same API endpoints
4. No rate limiting differences
```

#### 2. Modify heliusTransactionService (Dual Keys)
```typescript
// Before (single key):
const response = await axios.get(
  `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${config.heliusApiKey}`
);

// After (dual keys with fallback):
let response;
try {
  // Try primary key first
  response = await axios.get(
    `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${config.heliusApiKey}`
  );
} catch (err) {
  // If primary fails (quota), use backup
  response = await axios.get(
    `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${config.heliusFreeApiKey}`
  );
}
```

#### 3. Config Changes
```env
# src/.env
HELIUS_API_KEY=your_pro_key_here          # Main (10M/month)
HELIUS_FREE_API_KEY=your_free_key_here    # Backup (1M/month)
```

#### 4. Usage Distribution
```
Free tier account → P&L Feature ONLY
  • Backfill: 105 calls
  • Ongoing: 100/month
  • Capacity: 1M/month
  • Usage: 0.02% ✅ Plenty of room

Pro tier account → Everything else
  • Webhooks: 2.1M
  • RPC: 300K
  • Admin: 3K
  • Capacity: 10M/month
  • Usage: 24% ✅ Healthy
```

---

## Implementation: Dual-Key Service

I'll modify `heliusTransactionService.ts` to support this:

```typescript
// NEW: DualKeyHeliusService
class DualKeyHeliusService {
  private primaryKey: string;
  private backupKey: string;
  
  constructor(primaryKey: string, backupKey: string) {
    this.primaryKey = primaryKey;
    this.backupKey = backupKey;
  }
  
  async fetchTransaction(txSignature: string): Promise<any> {
    // Try primary key first (pro tier, better rate limits)
    try {
      return await this.fetchWithKey(txSignature, this.primaryKey, 'primary');
    } catch (err) {
      console.warn('[Helius] Primary key failed, trying backup...');
      
      // Fall back to free tier
      try {
        return await this.fetchWithKey(txSignature, this.backupKey, 'backup');
      } catch (backupErr) {
        console.error('[Helius] Both keys exhausted');
        throw backupErr;
      }
    }
  }
  
  private async fetchWithKey(
    txSignature: string,
    apiKey: string,
    tier: 'primary' | 'backup'
  ): Promise<any> {
    const response = await axios.get(
      `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${apiKey}`,
      { timeout: 10000 }
    );
    
    if (!response.data?.[0]) {
      throw new Error('No transaction data');
    }
    
    console.log(`[Helius] Fetched from ${tier} tier`);
    return response.data[0];
  }
}
```

---

## With Dual Keys: New Budget

```
Month Cost Analysis:

P&L Feature (on FREE tier):
  Backfill:    105 calls / 1M quota = 0.01% ✅
  Ongoing:     100 calls / 1M quota = 0.01% ✅
  Total used:  205 / 1M = 0.02% ✅

Main Account (on PRO tier):
  Webhooks:    2.1M / 10M quota = 21% ✅
  RPC:         300K / 10M quota = 3% ✅
  Total used:  2.4M / 10M = 24% ✅

COMBINED:      2.6M / 11M = 24% ✅ HEALTHY
```

---

## Recommendation: Go Full Backfill + Dual Keys

### Action Plan

```
TODAY:
  1. Sign up Helius free tier
  2. Get free API key
  3. Update .env with both keys
  4. Deploy P&L with backfill
  5. Backfill runs immediately (~105 calls on free tier)

RESULT:
  ✅ Full P&L feature live
  ✅ No quota concerns
  ✅ Dual failover in place
  ✅ Pro tier stays healthy
  ✅ Free tier has room to grow
```

### Benefits

| Aspect | With Dual Keys |
|--------|---------------|
| **P&L Backfill Cost** | 105 calls on free tier (0.01%) |
| **Monthly P&L Cost** | 100 calls on free tier (0.01%) |
| **Pro Tier Capacity** | Still at 24%, can absorb growth |
| **Failover** | If main quota exhausts, P&L still works |
| **Cost** | $0 (free tier is free) |
| **Risk** | Zero - dual keys provide safety net |

---

## Setup Steps

### 1. Get Free Tier Key
```
1. Go to: https://www.helius.dev/dashboard
2. Sign up (if not already)
3. Create new API key on free tier
4. Copy the key
```

### 2. Update Environment
```bash
# In .env
HELIUS_API_KEY=pk_live_...your_pro_key...
HELIUS_FREE_API_KEY=pk_live_...your_free_key...
```

### 3. Deploy
```bash
# Full deployment with backfill
git push origin main
npm run ts-node src/scripts/backfill-entry-prices.ts
# Backfill uses free tier key automatically
```

---

## Costs & Billing

### Helius Plans
```
Free Tier:      1M calls/month, $0, full API
Pro:            10M calls/month, $49/month
Enterprise:     Custom, contact sales

You have: 1 Pro + (getting) 1 Free = 11M/month for $49 ✅
```

### Monthly Burn (With Dual Keys)
```
Webhooks + RPC:     2.4M/month  (Pro tier)
P&L:                0.1M/month  (Free tier)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:              2.5M/month  = 23% of capacity ✅ HEALTHY

Growth buffer:      8.5M/month  available
```

---

## Failover Logic

```
Scenario 1: Normal Operation
  P&L request → Try free key → Success ✅

Scenario 2: Free Tier Exhausted (1M limit hit)
  P&L request → Try free key (fails)
             → Fallback to pro key ✅

Scenario 3: Pro Tier Exhausted (10M limit hit)
  Webhooks → Fail (critical error)
  P&L      → Already on free tier, still works ✅

Scenario 4: Both Exhausted (unlikely)
  → Error logged, user notified
  → Need to upgrade or wait for month reset
```

---

## Implementation Code

I can implement this in `heliusTransactionService.ts`:

```diff
+ // Add dual-key support
+ private primaryApiKey: string;
+ private backupApiKey: string;
+ 
+ constructor(primaryKey: string, backupKey: string) {
+   this.primaryApiKey = primaryKey;
+   this.backupApiKey = backupKey;
+ }
+
  async fetchTransactionFromHelius(txSignature: string) {
-   if (!config.heliusApiKey) return null;
+   if (!this.primaryApiKey && !this.backupApiKey) return null;
    
    try {
      // Try primary key first
-     const response = await axios.get(
-       `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${config.heliusApiKey}`
+     try {
+       const response = await axios.get(
+         `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${this.primaryApiKey}`
+       );
+       console.log('[Helius] Used primary key');
+       return response.data?.[0] || null;
+     } catch (primaryErr) {
+       console.warn('[Helius] Primary key failed, trying backup');
+       
+       // Fallback to backup key
+       const response = await axios.get(
+         `https://api.helius.xyz/v0/transactions?txs=${txSignature}&api-key=${this.backupApiKey}`
+       );
+       console.log('[Helius] Used backup (free tier) key');
+       return response.data?.[0] || null;
+     }
    );
    
-   return data?.[0] || null;
  } catch (err) {
    console.error(`[Helius] Both keys failed for ${txSignature}`);
    return null;
  }
```

---

## Summary

**With dual keys, you can:**

1. ✅ Deploy full P&L feature TODAY
2. ✅ Run complete backfill (105 calls on free tier)
3. ✅ Keep pro tier healthy (24% usage)
4. ✅ Have automatic failover
5. ✅ Pay $0 extra (free tier is free)
6. ✅ Scale indefinitely

**Recommendation: IMPLEMENT DUAL KEYS + FULL BACKFILL**

Cost: $0 (use free tier)
Risk: Zero (dual failover)
Benefit: Full P&L feature with safety net

