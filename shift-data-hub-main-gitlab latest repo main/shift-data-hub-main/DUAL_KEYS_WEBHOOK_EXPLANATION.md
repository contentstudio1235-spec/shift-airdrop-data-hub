# 🔌 Webhook vs API Key: Why You Only Need ONE Webhook

## Quick Answer

**Keep only ONE webhook (on your Pro account).**

The free tier account is for **API calls only**, not webhooks.

---

## How It Works

### Two Different Mechanisms

```
WEBHOOK (Pro Account):
  Helius → Your Server (PUSH)
  ├─ Triggered by blockchain events
  ├─ Helius sends data to your endpoint
  ├─ Creates positions when swaps happen
  └─ Essential for position tracking

API CALLS (Free Account):
  Your Server → Helius (PULL)
  ├─ You request transaction details
  ├─ P&L feature extracts entry prices
  ├─ Dual-key fallback if pro quota exhausted
  └─ No webhook involved
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                         │
│              (Jupiter Swaps Happen Here)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (Event occurs)
                       ▼
        ┌──────────────────────────────┐
        │  Helius Pro Account           │
        │  (10M calls/month)            │
        │                               │
        │  1. WEBHOOK                   │
        │     └─ Sends swap data to     │
        │        your endpoint          │
        │        (POST /webhooks/helius)│
        │                               │
        │  2. API (if called)           │
        │     └─ Fetches transaction    │
        │        details for pricing    │
        └──────────┬───────────────────┘
                   │
        ┌──────────┴───────────────────┐
        │                               │
        ▼                               ▼
    ┌────────────┐          ┌──────────────────┐
    │  WEBHOOK   │          │   API CALLS      │
    │ Processed  │          │   P&L Feature    │
    │  Create    │          │  Extract Prices  │
    │ Positions  │          │  (DUAL-KEY)      │
    └────────────┘          │                  │
                            │  Tries:          │
                            │  1. Pro key      │
                            │  2. Free key     │
                            │     (fallback)   │
                            └──────────────────┘
                                    │
        ┌───────────────────────────┴────────────────┐
        │                                             │
        ▼                                             ▼
    ┌─────────────────┐                 ┌──────────────────────┐
    │  Backend        │                 │  Helius Free Account │
    │  Database       │                 │  (1M calls/month)    │
    │  ├─ Positions   │                 │                      │
    │  └─ P&L Data    │                 │  API Fallback        │
    │                 │                 │  └─ Only used if     │
    │  Frontend       │                 │     pro quota exhausted
    │  ├─ P&L Badges  │                 │                      │
    │  └─ Dashboard   │                 │  (Never sends webhooks)
    └─────────────────┘                 └──────────────────────┘
                        │
                        ▼
                  ┌──────────────┐
                  │   Users See  │
                  │  P&L on UI   │
                  └──────────────┘
```

---

## Why Only One Webhook?

### Reason 1: Webhooks Are Account-Specific
```
Pro Account (10M):
  ├─ Webhook configured → Sends swap data to your endpoint ✅
  ├─ Your endpoint processes → Creates positions in DB ✅
  └─ Essential for core functionality ✅

Free Account (1M):
  ├─ No webhook configured ⚪
  ├─ Only used for API calls when needed ⚪
  └─ Not needed for webhook mechanism ⚪
```

### Reason 2: Dual Webhooks = Duplicate Data
```
If you set up BOTH webhooks:
  Swap happens on blockchain
    ↓
  Pro webhook: "New position TSL2L - $100"
  Free webhook: "New position TSL2L - $100" ← DUPLICATE!
    ↓
  Creates same position twice ❌
  Breaks duplicate detection ❌
  Wastes quota on duplicate processing ❌
```

### Reason 3: Free Tier is Backup, Not Primary
```
Free tier account purpose:
  • Fallback API key for P&L requests
  • Only called if pro key quota exhausted
  • NEVER needed for webhooks
  
P&L API calls flow:
  1. heliusTransactionService tries pro key
  2. If pro quota exhausted → tries free key
  3. Extracts entry prices from transactions
  • Completely separate from webhook flow
```

---

## Data Flow Comparison

### Position Creation (Webhook Only)
```
User buys TSL2L on Jupiter
  ↓ (blockchain transaction)
Helius detects swap
  ↓ (sends webhook)
POST /api/webhooks/helius (Pro account)
  ↓
heliusWebhookHandler.ts processes
  ↓
Extracts: wallet, asset, amount, price
  ↓
positionService.openPosition() created
  ↓
Database: new row in positions table
  ✅ Done (webhook only)
```

### P&L Entry Price Extraction (API Only)
```
Backfill script needs entry prices
  ↓
for each position in DB:
  get tx_signature_open
  ↓
heliusTransactionService.extractSwapPriceFromTx()
  ↓
API call: https://api.helius.xyz/v0/transactions?txs=...
  ├─ Tries: HELIUS_API_KEY (pro, 10M)
  └─ Fallback: HELIUS_FREE_API_KEY (free, 1M)
  ↓
Extracts price_at_open from transaction
  ↓
Database: UPDATE positions SET price_at_open = X
  ✅ Done (API only)
```

---

## Real Example

### What Actually Happens

**Day 1: User trades**
```
1. User: buys 4.5 TSL2L for $100 on Jupiter
2. Blockchain: Transaction confirmed
3. Helius: Detects swap
4. Pro Account Webhook: Sends to /api/webhooks/helius
5. Backend: Creates position in DB
   └─ wallet: ABC123...
   └─ asset: TSL2L
   └─ position_size_usd: 100
   └─ price_at_open: NULL (not known yet!)
6. Database: Position stored
```

**Day 2: Backfill runs**
```
1. Backfill script: Finds 1,051 positions without price_at_open
2. For each position:
   └─ heliusTransactionService makes API call
      ├─ Tries: Pro API key
      ├─ Fails if quota exhausted → tries free key
      └─ Extracts: price_at_open from transaction
3. Database: price_at_open updated
   └─ UPDATE positions SET price_at_open = 22.12
4. Frontend: P&L now shows!
```

**Ongoing: New trades get prices immediately**
```
1. User buys position
2. Webhook creates position (as before)
3. positionService.capturePositionOpen() called
   └─ Extracts entry price from same webhook transaction
   └─ API call uses dual-key failover if needed
4. Database: price_at_open populated immediately
5. Frontend: P&L shows from day 1 ✅
```

---

## Configuration

### Your Setup

```env
HELIUS_API_KEY=pk_live_...pro_account_key...
HELIUS_FREE_API_KEY=pk_live_...free_account_key...
```

### Webhook Configuration

**Only in Pro Account Dashboard:**
```
Helius Dashboard → Webhooks
├─ Webhook URL: https://shift-airdrop-backend.onrender.com/api/webhooks/helius
├─ Events: Transaction
├─ Programs: Jupiter (JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4)
└─ Status: Active ✅
```

**Free Account Dashboard:**
```
Helius Dashboard → Webhooks
└─ None configured (not needed)
```

---

## Summary Table

| Aspect | Pro Account | Free Account |
|--------|------------|--------------|
| **Webhook** | ✅ YES (required) | ❌ NO (not needed) |
| **API Calls** | ✅ YES (primary) | ✅ YES (fallback) |
| **Calls/month** | 10M | 1M |
| **P&L usage** | Handles everything | Only if pro exhausted |
| **Setup needed** | Existing | Get key + add .env |

---

## FAQ

### Q: If I set up webhook on free tier, will it work?
**A:** It would work, but create duplicates and waste quota. Don't do it.

### Q: Will free account automatically get webhook?
**A:** No, webhooks are manually configured. It won't happen automatically.

### Q: Can P&L work without pro account?
**A:** Yes! Free tier is enough for P&L alone. But your existing webhook needs pro account.

### Q: What if pro webhook fails?
**A:** Positions won't be created (major issue). Free tier can't help because it doesn't have webhook. But if pro webhook works, P&L is safe with dual-key fallback.

### Q: Do I need to configure free account in Helius dashboard?
**A:** Only to get the API key. No webhook setup needed.

---

## Checklist

```
✅ Keep PRO account webhook (unchanged)
  └─ Creating positions works

✅ Add FREE account API key to .env
  └─ HELIUS_FREE_API_KEY=pk_live_xxxxx

✅ Deploy dual-key code
  └─ heliusTransactionService automatically uses both

✅ Run backfill
  └─ Uses free tier for API calls (fallback if needed)

✅ No additional webhook setup needed ✅
```

---

## Visual Summary

```
┌─────────────────────────────────────────┐
│  Helius Pro Account (10M/month)          │
│  ├─ Webhook: CONFIGURED ✅ (creates pos) │
│  └─ API: PRIMARY (P&L requests)         │
└─────────────────────────────────────────┘
         + Fallback
         │
┌────────▼────────────────────────────────┐
│  Helius Free Account (1M/month)          │
│  ├─ Webhook: NOT CONFIGURED ⚪           │
│  └─ API: FALLBACK (if pro exhausted)    │
└──────────────────────────────────────────┘

Result: ONE webhook, TWO API keys ✅
```

