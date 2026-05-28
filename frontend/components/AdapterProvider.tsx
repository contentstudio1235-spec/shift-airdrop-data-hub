'use client';

import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust';
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { ExodusWalletAdapter } from '@solana/wallet-adapter-exodus';
import { Coin98WalletAdapter } from '@solana/wallet-adapter-coin98';
import { AvanaWalletAdapter } from '@solana/wallet-adapter-avana';
import { BitpieWalletAdapter } from '@solana/wallet-adapter-bitpie';
import { KeystoneWalletAdapter } from '@solana/wallet-adapter-keystone';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletProvider } from './WalletContext';

/**
 * AdapterProvider wraps the app with:
 * 1. Solana ConnectionProvider (RPC connection)
 * 2. Solana WalletProvider (wallet adapter for Solana wallets)
 * 3. Custom WalletContext (for Solana + EVM wallet state management)
 */
export function AdapterProvider({ children }: { children: React.ReactNode }) {
  // Solana network configuration
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), []);

  // All supported Solana wallet adapters
  const wallets = useMemo(
    () => [
      // Most Popular
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TrustWalletAdapter(),

      // Hardware & Exchange
      new LedgerWalletAdapter(),

      // Multi-Chain
      new BackpackWalletAdapter(),
      new ExodusWalletAdapter(),

      // Regional/Community
      new Coin98WalletAdapter(),
      new AvanaWalletAdapter(),
      new BitpieWalletAdapter(),
      new KeystoneWalletAdapter(),

      // QR-based (WalletConnect)
      new WalletConnectWalletAdapter({
        network,
        options: {
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        },
      }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
