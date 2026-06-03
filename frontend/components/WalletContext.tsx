'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import type { WalletContextValue, WalletType, WalletChain } from '@/lib/types';
import {
  hasMetaMask,
  getLastUsedWallet,
  setLastUsedWallet,
  clearWalletStorage,
} from '@/lib/walletConfig';

// ── Context ────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  walletType: null,
  walletChain: null,
  connecting: false,
  connectPhantom: async () => {},
  connectBackpack: async () => {},
  connectSolflare: async () => {},
  connectMagicEden: async () => {},
  connectMetaMaskSolana: async () => {},
  connectMetaMask: async () => {},
  connectTrustWallet: async () => {},
  connectJupiter: async () => {},
  disconnect: () => {},
  shortWallet: (a) => a,
});

// ── Helpers ────────────────────────────────────────────────────────────────

function chainFor(type: WalletType): WalletChain {
  if (type === 'metamask') return 'evm';
  if (
    type === 'phantom' ||
    type === 'backpack' ||
    type === 'solflare' ||
    type === 'magiceden' ||
    type === 'metamask-solana' ||
    type === 'trustwallet' ||
    type === 'jupiter'
  )
    return 'solana';
  return null;
}

const API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'https://shift-airdrop-backend.onrender.com';

/**
 * Fire-and-forget: register + sync SHIFT holdings for a wallet.
 * Called automatically after any Solana wallet connects.
 */
async function triggerWalletSync(walletAddr: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/airdrop/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletAddr }),
    });
    console.log('[Wallet] Sync triggered for', walletAddr.slice(0, 8) + '...');
  } catch (err) {
    console.warn('[Wallet] Sync call failed (non-critical):', err);
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Solana wallet adapter hook
  const solanaWallet = useSolanaWallet();
  const { publicKey: solanaPublicKey, connecting: solanaConnecting, disconnect: disconnectSolana } = solanaWallet;

  // Local state
  const [wallet, setWallet] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('shift_wallet');
  });

  const [walletType, setWalletType] = useState<WalletType>(() => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem('shift_wallet_type') as WalletType) || null;
  });

  const [connecting, setConnecting] = useState(false);
  const walletChain = chainFor(walletType);

  // ── Persist helpers ────────────────────────────────────────────────────

  const persist = useCallback((addr: string, type: WalletType) => {
    localStorage.setItem('shift_wallet', addr);
    localStorage.setItem('shift_wallet_type', type || '');
    setWallet(addr);
    setWalletType(type);
  }, []);

  const clear = useCallback(() => {
    clearWalletStorage();
    setWallet(null);
    setWalletType(null);
  }, []);

  // ── Sync Solana wallet adapter state to local state ─────────────────────
  // When user connects via Solana wallet adapter, update our state

  useEffect(() => {
    if (solanaPublicKey && !solanaConnecting) {
      const addr = solanaPublicKey.toString();
      // Get wallet name from adapter (Phantom, Solflare, etc.)
      const walletName = solanaWallet.wallet?.adapter?.name;
      let type: WalletType = 'phantom';

      if (walletName === 'Phantom') type = 'phantom';
      else if (walletName === 'Solflare') type = 'solflare';
      else if (walletName === 'Backpack') type = 'backpack';
      else if (walletName === 'Magic Eden') type = 'magiceden';
      else if (walletName === 'Jupiter') type = 'jupiter';
      else if (walletName === 'Trust Wallet') type = 'trustwallet';

      if (addr !== wallet) {
        console.log('[Wallet] Solana wallet connected:', addr.slice(0, 8) + '...');
        persist(addr, type);
      }
    }
  }, [solanaPublicKey, solanaConnecting, wallet, persist, solanaWallet.wallet?.adapter?.name]);

  // ── Auto-reconnect on mount ────────────────────────────────────────────
  // Silent reconnect for Solana wallets if saved in localStorage

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedType = getLastUsedWallet() as WalletType;
    const isSolanaWallet = ['phantom', 'backpack', 'solflare', 'magiceden', 'metamask-solana', 'trustwallet', 'jupiter'].includes(savedType || '');

    if (savedType && isSolanaWallet && !wallet && solanaWallet.wallets) {
      // Wallet adapter will auto-reconnect based on localStorage
      console.log('[Wallet] Auto-reconnect: waiting for wallet adapter...');
    }
  }, []);

  // ── Disconnect listener ────────────────────────────────────────────────

  useEffect(() => {
    const handleDisconnect = () => {
      console.log('[Wallet] Wallet disconnected externally');
      clear();
    };

    if (walletType && ['phantom', 'backpack', 'solflare', 'magiceden', 'metamask-solana', 'trustwallet', 'jupiter'].includes(walletType)) {
      // Wallet adapter handles disconnect internally
      // We listen for publicKey changes to null
      if (!solanaPublicKey && wallet) {
        handleDisconnect();
      }
    }

    return () => {};
  }, [solanaPublicKey, wallet, walletType, clear]);

  // ── Auto-sync on wallet connect ────────────────────────────────────────

  const prevWalletRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (wallet && wallet !== prevWalletRef.current) {
      prevWalletRef.current = wallet;
      if (walletChain === 'solana') {
        triggerWalletSync(wallet);
        // Sprint 2.3 (Option C): SILENT probabilistic stitch — no signature prompt.
        // This is attribution-only. A future "Verify wallet" CTA at high-intent
        // moments (Join Airdrop, Claim, etc.) can call verifyWalletStitch() to
        // upgrade the link to deterministic confidence.
        import('@/lib/tracking').then(({ trackWalletConnect }) =>
          trackWalletConnect({ wallet })
            .then(r => console.log('[Stitch]', r))
            .catch(err => console.warn('[Stitch] failed', err))
        );
      }
    }
    if (!wallet) {
      prevWalletRef.current = null;
    }
  }, [wallet, walletChain]);

  // ── Solana Wallet Adapters (auto-handled by @solana/wallet-adapter-react) ─

  const connectPhantom = useCallback(async () => {
    console.log('[Wallet] Connecting Phantom via adapter...');
    setConnecting(true);
    // Wallet adapter handles connection internally
    // Just set connecting state
    setConnecting(false);
  }, []);

  const connectBackpack = useCallback(async () => {
    console.log('[Wallet] Connecting Backpack via adapter...');
    setConnecting(true);
    setConnecting(false);
  }, []);

  const connectSolflare = useCallback(async () => {
    console.log('[Wallet] Connecting Solflare via adapter...');
    setConnecting(true);
    setConnecting(false);
  }, []);

  const connectMagicEden = useCallback(async () => {
    console.log('[Wallet] Connecting Magic Eden via adapter...');
    setConnecting(true);
    setConnecting(false);
  }, []);

  const connectJupiter = useCallback(async () => {
    console.log('[Wallet] Connecting Jupiter via adapter...');
    setConnecting(true);
    setConnecting(false);
  }, []);

  const connectTrustWallet = useCallback(async () => {
    console.log('[Wallet] Connecting Trust Wallet via adapter...');
    setConnecting(true);
    setConnecting(false);
  }, []);

  // ── MetaMask (EVM) – Manual connection ──────────────────────────────────

  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.ethereum) {
      console.log('[Wallet] MetaMask not installed');
      window.open('https://metamask.io/', '_blank');
      return;
    }

    setConnecting(true);
    try {
      const accounts = (await window.ethereum!.request!({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        console.log('[Wallet] MetaMask: no accounts returned');
        setConnecting(false);
        return;
      }

      const addr = accounts[0];
      console.log('[Wallet] MetaMask (EVM) connected:', addr.slice(0, 8) + '...');
      persist(addr, 'metamask');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log('[Wallet] MetaMask connection rejected:', msg);
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── MetaMask Solana (Wallet Standard) ──────────────────────────────────

  const connectMetaMaskSolana = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (typeof window.getWallets !== 'function') {
      console.log('[Wallet] Wallet Standard not found');
      window.open('https://metamask.io/', '_blank');
      return;
    }

    const wallets = window.getWallets().get();
    const mm = wallets.find(
      (w: { name: string; chains: string[] }) =>
        w.name === 'MetaMask' && w.chains.some((c: string) => c.startsWith('solana:'))
    );

    if (!mm) {
      console.log('[Wallet] MetaMask Solana not detected');
      window.open('https://metamask.io/', '_blank');
      return;
    }

    const connectFeature = mm.features['standard:connect'];
    if (!connectFeature) {
      console.log('[Wallet] MetaMask: standard:connect feature missing');
      return;
    }

    setConnecting(true);
    try {
      const result = await (connectFeature as any).connect();
      if (!result.accounts || result.accounts.length === 0) {
        console.log('[Wallet] MetaMask Solana: no accounts returned');
        return;
      }
      const addr = result.accounts[0].address;
      console.log('[Wallet] MetaMask Solana connected:', addr.slice(0, 8) + '...');
      persist(addr, 'metamask-solana');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log('[Wallet] MetaMask Solana connection rejected:', msg);
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Disconnect ───────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (walletChain === 'solana') {
      try {
        await disconnectSolana();
      } catch (err) {
        console.warn('[Wallet] Solana disconnect failed:', err);
      }
    }

    clear();
  }, [walletChain, disconnectSolana, clear]);

  // ── Helper function ──────────────────────────────────────────────────

  const shortWallet = (addr: string) => {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletType,
        walletChain,
        connecting: connecting || solanaConnecting,
        connectPhantom,
        connectBackpack,
        connectSolflare,
        connectMagicEden,
        connectMetaMask,
        connectMetaMaskSolana,
        connectTrustWallet,
        connectJupiter,
        disconnect,
        shortWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
