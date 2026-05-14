import { snagSyncService } from '../src/services/snagSyncService';
import { pool } from '../src/db/pool';
import { config } from '../src/config';

async function testSnag() {
  const wallet = '3j7Dm8niLaTA2GzTfVBALLW4XGYq1u8TXLbAePqKGoZM'; // Real Solana address
  
  console.log('--- SNAG Integration Test ---');
  console.log('Wallet:', wallet);
  console.log('Rule IDs from Config:');
  console.log('- XP Rule:', config.snagXpRuleId);
  console.log('- First Trade:', config.snagBadgeIds.first_trade);
  console.log('- FOMC Trader:', config.snagBadgeIds.fomc_trader);
  
  console.log('\n1. Testing XP Push...');
  // @ts-ignore - reaching into private for test
  await snagSyncService.pushXPToSnag(wallet, 100);
  
  console.log('\n2. Testing Badge/Rule Push (First Trade)...');
  await snagSyncService.awardBadgeInSnag(wallet, 'first_trade');

  console.log('\n3. Testing Badge/Rule Push (FOMC Trader)...');
  await snagSyncService.awardBadgeInSnag(wallet, 'fomc_trader');

  console.log('\nDone.');
  await pool.end();
}

testSnag().catch(err => {
  console.error(err);
  pool.end();
});
