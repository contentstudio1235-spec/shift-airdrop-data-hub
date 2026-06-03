# 🧪 Local P&L Testing Guide

## Setup & Testing Plan

This guide walks you through testing the P&L feature locally before deploying to production.

---

## Phase 1: Environment & Database Setup

### 1.1 Install Dependencies
```bash
cd /c/Users/Axel/Shift_Backend_Logic
npm install
# Frontend deps
cd frontend
npm install
cd ..
```

### 1.2 Start PostgreSQL Connection
```bash
# Test database connection (already configured in .env.local)
psql postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require

# Verify new P&L columns exist
\d positions
# Should show: price_at_close, close_value_usd, extracted_at
```

### 1.3 Build Backend
```bash
npm run build
# Should compile with 0 errors ✅
```

---

## Phase 2: Backend Service Testing

### 2.1 Test Jupiter Price Service (with Cache)
```bash
npm run ts-node -- --eval "
import { jupiterPriceService } from './src/services/jupiterPriceService';

(async () => {
  console.log('Testing Jupiter Price Service with Cache...\n');
  
  // Test 1: First call (API)
  console.log('📡 Call 1 (API):');
  const start1 = Date.now();
  const prices1 = await jupiterPriceService.getPrices([
    '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT', // TSL2L
    'So11111111111111111111111111111111111111112'     // SOL
  ]);
  const time1 = Date.now() - start1;
  console.log('Prices:', prices1);
  console.log('Time:', time1, 'ms\n');
  
  // Test 2: Second call (cached)
  console.log('💾 Call 2 (cached):');
  const start2 = Date.now();
  const prices2 = await jupiterPriceService.getPrices([
    '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    'So11111111111111111111111111111111111111112'
  ]);
  const time2 = Date.now() - start2;
  console.log('Prices:', prices2);
  console.log('Time:', time2, 'ms (should be <10ms)');
  console.log('Cache hit? Time reduced by:', ((time1 - time2) / time1 * 100).toFixed(0) + '%\n');
  
  process.exit(0);
})();
"
```

**Expected Output:**
```
📡 Call 1 (API): ~500-1000ms
  TSL2L: 22.07 (fallback)
  SOL: 168.45

💾 Call 2 (cached): <10ms
  TSL2L: 22.07
  SOL: 168.45
  Cache hit? Time reduced by: 98%
```

### 2.2 Test P&L Calculation Service
```bash
npm run ts-node -- --eval "
import { calculatePositionPnL, calculateDashboardPnL } from './src/services/pnlService';
import type { Position } from './src/types';

(async () => {
  console.log('Testing P&L Service...\n');
  
  // Mock position with entry price
  const mockPosition: Position = {
    id: 'test-pos-1',
    wallet: 'test-wallet',
    asset: 'TSL2L',
    asset_mint: '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    position_size_usd: 100,
    token_amount: 4.52,
    price_at_open: 22.12,
    price_at_close: null,
    close_value_usd: null,
    opened_at: new Date(),
    closed_at: null,
    current_multiplier: 1.5,
    xp_generated: 150,
    last_xp_calc: new Date(),
    status: 'open',
    tx_signature_open: 'test-sig',
    tx_signature_close: null,
    extracted_at: new Date(),
    created_at: new Date(),
  };
  
  console.log('Position:', {
    asset: mockPosition.asset,
    entryPrice: mockPosition.price_at_open,
    tokenAmount: mockPosition.token_amount,
  });
  
  // Current price higher than entry = gain
  const currentPrice = 24.50;
  const pnl = calculatePositionPnL(mockPosition, currentPrice);
  
  if (pnl) {
    console.log('\nP&L Calculation (Current Price = $24.50):');
    console.log('  Unrealized: $' + pnl.unrealizedUsd.toFixed(2) + ' (' + pnl.unrealizedPct.toFixed(2) + '%) 🟢');
    console.log('  Realized: $' + pnl.realizedUsd.toFixed(2) + ' (closed position)');
    console.log('  Total: $' + pnl.totalPnL.toFixed(2) + ' (' + pnl.totalPnLPct.toFixed(2) + '%)\n');
  }
  
  // Dashboard aggregation
  const prices = {
    'TSL2L': 24.50,
  };
  const dashPnL = calculateDashboardPnL([mockPosition], prices);
  console.log('Dashboard P&L:');
  console.log('  Total Unrealized: $' + dashPnL.totalUnrealizedPnL.toFixed(2));
  console.log('  Total Realized: $' + dashPnL.totalRealizedPnL.toFixed(2));
  console.log('  Overall: $' + dashPnL.totalPnLUsd.toFixed(2) + ' (' + dashPnL.totalPnLPct.toFixed(2) + '%)');
  
  process.exit(0);
})();
"
```

**Expected Output:**
```
P&L Calculation (Current Price = $24.50):
  Unrealized: $10.76 (10.70%) 🟢
  Realized: $0.00 (closed position)
  Total: $10.76 (10.70%)

Dashboard P&L:
  Total Unrealized: $10.76
  Total Realized: $0.00
  Overall: $10.76 (10.70%)
```

### 2.3 Test Helius Transaction Extractor
```bash
npm run ts-node -- --eval "
import { verifyTransactionSwap } from './src/services/heliusTransactionService';

(async () => {
  console.log('Testing Helius Transaction Service...\n');
  
  // Find a real swap tx signature from a known wallet
  // Example: use one from your test wallet
  const testTxSig = 'YOUR_SWAP_TX_SIGNATURE_HERE';
  
  if (testTxSig === 'YOUR_SWAP_TX_SIGNATURE_HERE') {
    console.log('⚠️  Skipping: Replace with real swap transaction signature');
    console.log('   (You can get this from Solscan or a recent trade)');
    process.exit(0);
  }
  
  console.log('Verifying transaction:', testTxSig.slice(0, 20) + '...');
  const result = await verifyTransactionSwap(testTxSig);
  
  console.log('\nResult:');
  console.log('  Success:', result.success);
  console.log('  Has Swap Event:', result.hasSwapEvent);
  console.log('  Swap Details:', result.swapEvent);
  
  process.exit(0);
})();
"
```

---

## Phase 3: API Endpoint Testing

### 3.1 Start Backend Server
```bash
npm run dev
# Should start on localhost:5000
# Logs should show: ✅ Database connected
```

### 3.2 Test Dashboard Endpoint
```bash
# Get P&L data for a wallet
curl -X GET http://localhost:5000/api/dashboard/YOUR_TEST_WALLET_ADDRESS \
  -H "Content-Type: application/json" | jq '.totalPnLUsd, .totalPnLPct'

# Expected response:
# {
#   "totalPnLUsd": 10.76,
#   "totalPnLPct": 7.32,
#   "totalUnrealizedPnL": 10.76,
#   "totalRealizedPnL": 0.00
# }
```

### 3.3 Test Positions Active Endpoint
```bash
curl -X GET http://localhost:5000/api/positions/YOUR_TEST_WALLET_ADDRESS/active \
  -H "Content-Type: application/json" | jq '.positions[0] | {asset, positionSizeUsd, pnlUsd, pnlPct}'

# Expected response:
# {
#   "asset": "TSL2L",
#   "positionSizeUsd": 100,
#   "pnlUsd": 10.76,
#   "pnlPct": 10.70
# }
```

### 3.4 Test History Endpoint
```bash
curl -X GET http://localhost:5000/api/positions/YOUR_TEST_WALLET_ADDRESS/history \
  -H "Content-Type: application/json" | jq '.positions[0] | {asset, pnlUsd, pnlPct, status}'
```

---

## Phase 4: Frontend Testing

### 4.1 Build Frontend
```bash
cd frontend
npm run build
# Verify 0 errors
```

### 4.2 Start Frontend Dev Server
```bash
npm run dev
# Frontend runs on localhost:3000
```

### 4.3 Test P&L Display

**Test Case 1: Dashboard P&L Stat**
- Navigate to `http://localhost:3000/airdrop`
- Look for "Portfolio P&L" stat card in top grid
- Should show: `🟢 +$10.76 (+10.70%)` or `🔴 -$X.XX (-X.XX%)`
- **Hover over info icon (ⓘ)** → Should display tooltip with:
  - "Prices cached for 5 minutes"
  - "Dashboard auto-refreshes every 60 seconds"
  - "Manual refresh available"

**Test Case 2: Position-Level P&L**
- In Holdings tab, scroll down to see position rows
- Each position should have P&L row below:
  ```
  Asset: TSL2L | 1wk | 1.32x | +182 XP/wk
  ─────────────────────────────────────────
  P&L  🟢 +$0.43  (+9.58%)  [ⓘ]
  ```
- **Click info icon** → Shows position-specific tooltip

**Test Case 3: Closed Positions**
- Click "History" tab
- Closed positions should show realized P&L
- `priceAtOpen`, `priceAtClose` should be populated

**Test Case 4: Refresh Behavior**
- Click "Refresh" button (top right)
- Observe:
  - Dashboard updates within <500ms (cached prices)
  - Timestamps update
  - P&L recalculates if prices changed

---

## Phase 5: Tooltip Accuracy Testing

### What Tooltip Should Show

**Dashboard Variant:**
```
Portfolio P&L [ⓘ]
  
  Tooltip Title: "Portfolio P&L"
  
  Accuracy Statement (amber):
  "P&L is calculated using cached prices updated every 5 minutes. 
   Dashboard auto-refreshes every 60 seconds."
  
  Details:
  💰 Prices: Cached for 5 minutes (1 API call max per asset)
  🔄 Dashboard: Auto-refreshes every 60 seconds
  ⏱️ Manual refresh: Click "Refresh" button for instant update
  📊 RWA tokens: Use fallback prices (updated monthly)
  ✅ Entry prices: Extracted from blockchain (100% accurate)
  
  Footer: "💡 For real-time prices, click the Refresh button"
```

**Position Variant:**
```
P&L [ⓘ]
  
  Tooltip Title: "Position P&L"
  
  Accuracy Statement (amber):
  "Each position shows unrealized P&L based on cached prices. 
   Real-time prices available via Jupiter or manual refresh."
  
  Details:
  📈 Unrealized P&L: (current price - entry price) × amount
  🔗 Entry price: Extracted from your swap transaction (blockchain)
  💾 Current price: Cached max 5 min, fetched from Jupiter
  🟢 Gains: Green if profit, 🔴 Red if loss
  ⚙️ Manual refresh: Updates all prices immediately
```

### Test Tooltip Functionality

```bash
# Test Case: Tooltip Opens/Closes
1. Hover over info icon → Tooltip appears
2. Click info icon → Tooltip toggles
3. Click outside tooltip → Closes
4. Click X button in tooltip → Closes
5. Mobile: Tap icon → Tooltip appears, tap outside → Closes
```

---

## Phase 6: Performance & Cache Testing

### 6.1 Measure Cache Effectiveness
```bash
# Scenario: Load dashboard 3 times
npm run ts-node -- --eval "
import { jupiterPriceService } from './src/services/jupiterPriceService';

(async () => {
  const mints = [
    '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    'So11111111111111111111111111111111111111112',
  ];
  
  for (let i = 1; i <= 3; i++) {
    const start = Date.now();
    const prices = await jupiterPriceService.getPrices(mints);
    const time = Date.now() - start;
    console.log('Call ' + i + ': ' + time + 'ms');
  }
  process.exit(0);
})();
"

# Expected:
# Call 1: 450ms (API)
# Call 2: <5ms  (cache)
# Call 3: <5ms  (cache)
```

### 6.2 Measure Database Query Time
```bash
npm run ts-node -- --eval "
import { positionService } from './src/services/positionService';

(async () => {
  const wallet = 'YOUR_TEST_WALLET';
  const start = Date.now();
  const positions = await positionService.getActivePositions(wallet);
  const time = Date.now() - start;
  
  console.log('Query time:', time, 'ms');
  console.log('Positions returned:', positions.length);
  process.exit(0);
})();
"

# Expected: <50ms for DB query
```

---

## Phase 7: Edge Cases & Error Handling

### 7.1 Test Missing price_at_open
```bash
# Scenario: Position without entry price (old data)
# Expected: P&L shows as "N/A" or not displayed
# Tooltip should explain: "Blockchain prices only recorded for new positions"
```

### 7.2 Test Zero Price
```bash
# Scenario: Jupiter API returns 0 price (error)
# Expected: Fallback to RWA hardcoded price
# P&L recalculates with fallback
```

### 7.3 Test Network Error
```bash
# Scenario: Kill internet briefly, refresh dashboard
# Expected:
# - First API call fails, uses fallback prices
# - Cache still serves old prices
# - Error logged but UI continues
# - User sees "Last updated: [time]" (not fresh)
```

---

## Checklist: What to Test

```
✅ Backend Tests
  □ Jupiter cache (2nd call <10ms)
  □ P&L calculation (math correct)
  □ Helius transaction parsing
  □ Dashboard P&L aggregation

✅ API Tests
  □ GET /api/dashboard/:wallet → totalPnLUsd present
  □ GET /api/positions/:wallet/active → pnlUsd per position
  □ GET /api/positions/:wallet/history → realizedPnL
  □ Response time <200ms

✅ Frontend Tests
  □ Dashboard displays P&L stat (green/red)
  □ Position rows show P&L badge
  □ History tab shows closed position P&L
  □ Manual refresh updates prices
  □ Auto-refresh every 60s updates P&L

✅ Tooltip Tests
  □ Info icon visible and clickable
  □ Tooltip displays correct message
  □ Tooltip can be closed (X button, click outside)
  □ Shows cache frequency (5 min, 60 sec refresh)
  □ Shows blockchain prices are accurate

✅ Performance Tests
  □ Cache working (2nd API call <5ms)
  □ DB query <50ms
  □ Dashboard loads <500ms
  □ No memory leaks in cache

✅ Edge Cases
  □ Missing price_at_open → Shows N/A
  □ Network error → Uses fallback, continues
  □ Zero price → Falls back to hardcoded
  □ Wallet with 0 positions → No P&L stat shown
```

---

## Troubleshooting

### "Database connection failed"
- Check `.env.local` has correct DATABASE_URL
- Verify Render database is online
- Try: `psql $DATABASE_URL -c "SELECT 1"`

### "Price is NaN or undefined"
- Check Jupiter API key in .env.local
- RWA tokens should use fallback ($22.07, etc.)
- Look for "Using RWA fallback" in logs

### "P&L doesn't update"
- Is auto-refresh running? Check browser dev tools → Network tab
- Manual refresh should work: Click "Refresh" button
- Clear browser cache: Ctrl+Shift+Delete

### "Tooltip not showing"
- Verify PnLInfoTooltip component is imported
- Check z-index: tooltip should be z-50
- Mobile: Try tap instead of hover

---

## Success Criteria

✅ **All tests pass** when:
1. Dashboard shows P&L stat with tooltip
2. Positions show individual P&L
3. Cache reduces API calls by 95%+
4. Tooltip accurately explains "5 min cache + 60s refresh"
5. No errors in browser console
6. Response times <200ms
7. Users understand P&L is not real-time
8. Green/red colors display correctly

---

## Next: Production Deployment

Once local testing ✅, deploy:
```bash
git add -A
git commit -m "feat: Add P&L with tooltip explaining update frequency"
git push origin main
# Render + Vercel auto-deploy
npm run ts-node src/scripts/backfill-entry-prices.ts
```

