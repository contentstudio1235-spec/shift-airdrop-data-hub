'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { WalletContextValue, WalletType } from '@/lib/types';

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  walletType: null,
  connecting: false,
  connectPhantom: async () => {},
  connectMetaMask: async () => {},
  disconnect: () => {},
  shortWallet: (a) => a,
});

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
    };
    ethereum?: {
      request: (args: { method: string }) => Promise<string[]>;
    };
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads from localStorage on first render (client only)
  const [wallet, setWallet] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('shift_wallet');
  });
  const [walletType, setWalletType] = useState<WalletType>(() => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem('shift_wallet_type') as WalletType) || null;
  });
  const [connecting, setConnecting] = useState(false);

  const persist = (addr: string, type: WalletType) => {
    localStorage.setItem('shift_wallet', addr);
    localStorage.setItem('shift_wallet_type', type || '');
  };

  const connectPhantom = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.solana?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      setWallet(addr);
      setWalletType('phantom');
      persist(addr, 'phantom');
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.ethereum) {
      window.open('https://metamask.io/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0];
      if (addr) {
        setWallet(addr);
        setWalletType('metamask');
        persist(addr, 'metamask');
      }
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setWalletType(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shift_wallet');
      localStorage.removeItem('shift_wallet_type');
    }
    if (walletType === 'phantom' && typeof window !== 'undefined' && window.solana) {
      window.solana.disconnect().catch(() => {});
    }
  }, [walletType]);

  const shortWallet = useCallback((addr: string) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  }, []);

  return (
    <WalletContext.Provider
      value={{ wallet, walletType, connecting, connectPhantom, connectMetaMask, disconnect, shortWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
