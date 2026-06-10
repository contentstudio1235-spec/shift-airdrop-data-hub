// ============================================================
// Test SHIFT Token — Validate logic for the specific test token
// ============================================================

import { pool } from '../src/db/pool';
import { positionService } from '../src/services/positionService';
import { antiFarmService } from '../src/services/antiFarmService';
import { jupiterPriceService } from '../src/services/jupiterPriceService';
import { holdingService } from '../src/services/holdingService';
import { badgeService } from '../src/services/badgeService';
import { config } from '../src/config';

// User provided wallet and token
const USER_WALLET = '3j7Dm8niLaTA2GzTfVBALLW4XGYq1u8TXLbAePqKGoZM';
const SHIFT_TOKEN = '5dVc9YuDZ3wRbohosa8bwXoj1v6zMvipwr38LFEA7MLJ';

async function testShiftToken() {
  console.log('═══════════════════════════════════════');
  console.log('  SHIFT AIRDROP — SHIFT Token Logic Test');
  console.log('═══════════════════════════════════════\n');

  console.log(`User Wallet: ${USER_WALLET}`);
  console.log(`Shift Token: ${SHIFT_TOKEN}\n`);

  // 1. Check Price Logic
  console.log('1️⃣  Testing Jupiter Price Service for SHIFT...');
  const price = await jupiterPriceService.getPrice(SHIFT_TOKEN);
  const symbol = jupiterPriceService.getSymbol(SHIFT_TOKEN);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Price: $${price} (Expected fallback: $0.50 if not on Jupiter)\n`);

  // 2. Check Anti-Farm Bypass
  console.log('2️⃣  Testing Anti-Farm Dust Bypass for SHIFT...');
  // A $1 position should normally be filtered as dust (min is $10)
  const dustAmountUSD = 1; 
  const filterResult = await antiFarmService.shouldFilter(USER_WALLET, SHIFT_TOKEN, dustAmountUSD, new Date());
  console.log(`   Position Size: $${dustAmountUSD}`);
  console.log(`   Filtered: ${filterResult.filtered ? '❌ YES (Bypass Failed)' : '✅ NO (Bypass Worked)'}`);
  if (filterResult.filtered) {
    console.log(`   Reason: ${filterResult.reason}`);
  }
  console.log();

  // 3. Simulate Position Open
  console.log('3️⃣  Simulating Position Open for SHIFT...');
  const amount = 100; // 100 SHIFT tokens
  const usdValue = amount * (price || 0.5);
  
  const opened = await positionService.openPosition(
    USER_WALLET, 
    symbol, 
    SHIFT_TOKEN,
    usdValue, 
    price || 0.5, 
    amount,
    'test_shift_tx_' + Date.now(),
    new Date()
  );
  
  console.log(`   Result: ${opened ? '✅ Opened successfully' : '❌ Failed to open'}`);
  
  if (opened) {
    // 4. Verify Active Position
    console.log('\n4️⃣  Verifying Active Position in DB...');
    const active = await positionService.getActivePositions(USER_WALLET);
    const shiftPos = active.find(p => p.asset_mint === SHIFT_TOKEN);
    
    if (shiftPos) {
      console.log('   ✅ Position found in active list:');
      console.log(`      ID: ${shiftPos.id}`);
      console.log(`      Asset: ${shiftPos.asset}`);
      console.log(`      Size: $${shiftPos.position_size_usd}`);
      console.log(`      Tokens: ${shiftPos.token_amount}`);
    } else {
      console.log('   ❌ Position NOT found in active list!');
    }
  }

  // 5. Holding Check (Mocked for test)
  console.log('\n5️⃣  Testing Holding Logic (Mocked)...');
  // Mock the holding check to return true for this test
  holdingService.holdsMinimum = async () => true;
  
  const isHolder = await holdingService.holdsMinimum(USER_WALLET, SHIFT_TOKEN, 1);
  console.log(`   Holds Minimum (1 SHIFT): ${isHolder ? '✅ Yes' : '❌ No'}`);
  
  // 6. Badge Evaluation
  console.log('\n6️⃣  Evaluating Badges (including SHIFT Holder)...');
  await badgeService.evaluateBadges(USER_WALLET);
  const badges = await badgeService.getBadges(USER_WALLET);
  console.log(`   Earned Badges: ${badges.map(b => b.badge_name).join(', ')}`);
  
  const hasShiftBadge = badges.some(b => b.badge_name === 'shift_holder');
  console.log(`   SHIFT Holder Badge: ${hasShiftBadge ? '✅ Awarded' : '❌ Not Awarded'}`);

  console.log('\n═══════════════════════════════════════');
  console.log('  SHIFT Token Logic Test Complete!');
  console.log('═══════════════════════════════════════');

  await pool.end();
}

testShiftToken().catch((err) => {
  console.error('Test failed:', err);
  pool.end();
  process.exit(1);
});
