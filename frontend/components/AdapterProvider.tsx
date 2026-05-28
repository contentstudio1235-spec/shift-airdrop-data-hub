'use client';

import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust';
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
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TrustWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletProvider>
          {children}
        </WalletProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
