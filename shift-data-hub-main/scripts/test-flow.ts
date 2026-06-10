// ============================================================
// Test Flow — Simulate a full user journey for validation
// ============================================================

import { pool } from '../src/db/pool';
import { positionService } from '../src/services/positionService';
import { xpEngine } from '../src/services/xpEngine';
import { antiFarmService } from '../src/services/antiFarmService';
import { badgeService } from '../src/services/badgeService';
import { multiplierService } from '../src/services/multiplierService';

const TEST_WALLET = 'TestWallet1111111111111111111111111111111111';

async function testFlow() {
  console.log('═══════════════════════════════════════');
  console.log('  SHIFT AIRDROP — Test Flow');
  console.log('═══════════════════════════════════════\n');

  // 1. Open a position
  console.log('1️⃣  Opening position: SOL @ $500...');
  const opened = await positionService.openPosition(
    TEST_WALLET, 'SOL', 'So11111111111111111111111111111111111111112',
    500, 3.5, 142.85,
    'test_tx_open_' + Date.now(),
    new Date()
  );
  console.log(`   Result: ${opened ? '✅ Opened' : '❌ Failed/Duplicate'}\n`);

  // 2. Check anti-farm: dust filter
  console.log('2️⃣  Anti-farm test: dust position ($5)...');
  const dustResult = await antiFarmService.shouldFilter(TEST_WALLET, 'BONK', 5, new Date());
  console.log(`   Filtered: ${dustResult.filtered ? '✅ Yes (correct)' : '❌ No (bug!)'} | Reason: ${dustResult.reason}\n`);

  // 3. Check active positions
  console.log('3️⃣  Active positions...');
  const positions = await positionService.getActivePositions(TEST_WALLET);
  console.log(`   Count: ${positions.length}`);
  for (const p of positions) {
    const age = positionService.getPositionAge(p.opened_at);
    console.log(`   - ${p.asset} | $${p.position_size_usd} | ${age.hours}h old | ${p.current_multiplier}x`);
  }
  console.log();

  // 4. XP calculation
  console.log('4️⃣  XP formula tests...');
  const testCases = [
    { size: 100, weeks: 0, expected: 'base' },
    { size: 100, weeks: 4, expected: '1.4x' },
    { size: 1000, weeks: 10, expected: '2.0x' },
    { size: 10000, weeks: 20, expected: '3.0x (capped)' },
  ];
  for (const tc of testCases) {
    const mult = xpEngine.calculatePositionMultiplier(tc.weeks);
    const xp = xpEngine.calculateWeeklyXP(tc.size, mult);
    console.log(`   $${tc.size} @ ${tc.weeks}w → ${mult.toFixed(1)}x → ${xp.toFixed(1)} XP/week (${tc.expected})`);
  }
  console.log();

  // 5. Badge check
  console.log('5️⃣  Badge evaluation...');
  const badges = await badgeService.evaluateBadges(TEST_WALLET);
  console.log(`   New badges: ${badges.length > 0 ? badges.map(b => b.badge_name).join(', ') : 'none'}\n`);

  // 6. Multiplier info
  console.log('6️⃣  Claim multiplier...');
  const multInfo = await multiplierService.getMultiplierInfo(TEST_WALLET);
  console.log(`   Value: ${multInfo.claimMultiplier}x`);
  console.log(`   Breakdown: base=${multInfo.breakdown.base}, time=${multInfo.breakdown.timeBonus}, badges=${multInfo.breakdown.badgeBonus}, streak=${multInfo.breakdown.streakBonus}`);
  console.log(`   Next: ${multInfo.nextMilestone}\n`);

  // 7. Close position
  console.log('7️⃣  Closing position...');
  const closed = await positionService.closePosition(
    TEST_WALLET, 'SOL',
    'test_tx_close_' + Date.now(),
    new Date()
  );
  console.log(`   Result: ${closed ? '✅ Closed' : '❌ No position found'}\n`);

  // 8. Verify closed
  const remaining = await positionService.getActivePositions(TEST_WALLET);
  console.log(`8️⃣  Remaining active positions: ${remaining.length}\n`);

  console.log('═══════════════════════════════════════');
  console.log('  Test flow complete!');
  console.log('═══════════════════════════════════════');

  await pool.end();
}

testFlow().catch((err) => {
  console.error('Test flow failed:', err);
  pool.end();
  process.exit(1);
});
