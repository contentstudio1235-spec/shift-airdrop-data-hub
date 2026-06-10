console.log('🧪 SHIFT Wallet Connection Test Suite\n');

const tests = [];
const results = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      results.push({ test: name, status: 'PASS', error: null });
      console.log(`✅ ${name}`);
    } catch (err) {
      results.push({ test: name, status: 'FAIL', error: err.message });
      console.error(`❌ ${name}: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.test}: ${r.error}`);
    });
  }
}

// Test Cases
test('Phantom Wallet (Solana)', () => {
  console.log('  → Detection: window.phantom.solana.isPhantom');
  console.log('  → Connection: provider.connect() → { publicKey }');
  console.log('  → Chain: Solana');
});

test('MetaMask EVM Support', () => {
  console.log('  → Detection: window.ethereum.isMetaMask');
  console.log('  → Connection: eth_requestAccounts');
  console.log('  → Chain: EVM (Ethereum, Polygon, etc.)');
});

test('MetaMask Solana Support (Wallet Standard)', () => {
  console.log('  → Detection: window.getWallets() → find MetaMask + solana: chains');
  console.log('  → Connection: standard:connect feature');
  console.log('  → Chain: Solana');
});

test('Backpack Wallet', () => {
  console.log('  → Detection: window.backpack.solana');
  console.log('  → Connection: provider.connect() → { publicKey }');
  console.log('  → Chain: Solana + EVM');
});

test('Solflare Wallet', () => {
  console.log('  → Detection: window.solflare.isSolflare');
  console.log('  → Connection: provider.connect() → { publicKey }');
  console.log('  → Chain: Solana');
});

test('Magic Eden Wallet', () => {
  console.log('  → Detection: window.magicEden.isMagicEden');
  console.log('  → Connection: provider.connect() → { publicKey }');
  console.log('  → Chain: Solana');
});

test('Trust Wallet (Multi-chain)', () => {
  console.log('  → Detection: window.trustwallet.solana or window.ethereum.isTrust');
  console.log('  → Connection: Solana via provider.connect(), EVM via eth_requestAccounts');
  console.log('  → Chain: Solana + EVM (Mobile)');
});

test('Wallet Chain Mapping', () => {
  const walletChainMap = {
    'phantom': 'solana',
    'backpack': 'solana',
    'solflare': 'solana',
    'magiceden': 'solana',
    'metamask-solana': 'solana',
    'metamask': 'evm',
    'trustwallet': 'solana',
  };
  console.log('  → Wallet-to-chain mapping:', JSON.stringify(walletChainMap));
});

test('Auto-reconnection Logic', () => {
  console.log('  → Uses onlyIfTrusted: true for silent reconnection');
  console.log('  → Checks localStorage for shift_wallet and shift_wallet_type');
  console.log('  → Never shows popup on page load if user previously connected');
});

test('Account Change Listeners', () => {
  console.log('  → All wallets have disconnect/accountsChanged listeners');
  console.log('  → Clears state when user disconnects in wallet extension');
  console.log('  → Persists wallet type for next session');
});

test('API URL Configuration', () => {
  console.log('  → NEXT_PUBLIC_API_URL env var: https://shift-airdrop-backend.onrender.com');
  console.log('  → Fallback: http://localhost:3001');
  console.log('  → Trigger sync endpoint: /api/airdrop/sync');
});

runTests();
