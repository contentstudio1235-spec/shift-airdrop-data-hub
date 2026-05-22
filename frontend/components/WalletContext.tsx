'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { WalletChain, WalletContextValue, WalletType } from '@/lib/types';

// ── Window augmentation ──────────────────────────────────────────────────────

declare global {
  interface Window {
    // Phantom — new API (window.phantom.solana) + legacy (window.solana)
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
        off: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    };
    solana?: {
      isPhantom?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      off: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    // Backpack (Solana + EVM)
    backpack?: {
      isBackpack?: boolean;
      solana?: {
        connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
        off: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    };
    // Solflare
    solflare?: {
      isSolflare?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      off: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    // MetaMask / EVM
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

// ── Context default ──────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  walletType: null,
  walletChain: null,
  connecting: false,
  connectPhantom: async () => {},
  connectBackpack: async () => {},
  connectSolflare: async () => {},
  connectMetaMask: async () => {},
  disconnect: () => {},
  shortWallet: (a) => a,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function chainFor(type: WalletType): WalletChain {
  if (type === 'metamask') return 'evm';
  if (type === 'phantom' || type === 'backpack' || type === 'solflare') return 'solana';
  return null;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
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

  // ── Persist helpers ────────────────────────────────────────────────────────

  const persist = useCallback((addr: string, type: WalletType) => {
    localStorage.setItem('shift_wallet', addr);
    localStorage.setItem('shift_wallet_type', type || '');
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem('shift_wallet');
    localStorage.removeItem('shift_wallet_type');
  }, []);

  // ── Auto-reconnect on mount (Solana primary) ───────────────────────────────
  // Attempt silent reconnect for whichever Solana wallet was last used.
  // Uses { onlyIfTrusted: true } so the user is NEVER shown a popup on load.

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedType = localStorage.getItem('shift_wallet_type') as WalletType;
    if (!savedType || wallet) return; // already loaded from localStorage or nothing to reconnect

    (async () => {
      try {
        if (savedType === 'phantom') {
          const provider = window.phantom?.solana ?? window.solana;
          if (!provider?.isPhantom) return;
          const resp = await provider.connect({ onlyIfTrusted: true });
          const addr = resp.publicKey.toString();
          setWallet(addr);
          setWalletType('phantom');
          persist(addr, 'phantom');
        } else if (savedType === 'backpack' && window.backpack?.solana) {
          const resp = await window.backpack.solana.connect({ onlyIfTrusted: true });
          const addr = resp.publicKey.toString();
          setWallet(addr);
          setWalletType('backpack');
          persist(addr, 'backpack');
        } else if (savedType === 'solflare' && window.solflare?.isSolflare) {
          const resp = await window.solflare.connect({ onlyIfTrusted: true });
          const addr = resp.publicKey.toString();
          setWallet(addr);
          setWalletType('solflare');
          persist(addr, 'solflare');
        }
        // MetaMask auto-reconnect: EVM accounts are already exposed if user
        // previously approved the site — check silently via eth_accounts (no popup).
        else if (savedType === 'metamask' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          if (accounts[0]) {
            setWallet(accounts[0]);
            setWalletType('metamask');
            persist(accounts[0], 'metamask');
          }
        }
      } catch {
        // Wallet not available or user revoked permission — silently ignore
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // ── Account-change listeners ───────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAccountChanged = () => {
      // Wallet disconnected externally — clear session
      setWallet(null);
      setWalletType(null);
      clear();
    };

    if (walletType === 'phantom') {
      const provider = window.phantom?.solana ?? window.solana;
      if (provider) {
        provider.on('disconnect', handleAccountChanged);
        return () => provider.off('disconnect', handleAccountChanged);
      }
    }
    if (walletType === 'backpack' && window.backpack?.solana) {
      window.backpack.solana.on('disconnect', handleAccountChanged);
      return () => window.backpack!.solana!.off('disconnect', handleAccountChanged);
    }
    if (walletType === 'solflare' && window.solflare) {
      window.solflare.on('disconnect', handleAccountChanged);
      return () => window.solflare!.off('disconnect', handleAccountChanged);
    }
    if (walletType === 'metamask' && window.ethereum) {
      const handleAccounts = (accounts: unknown) => {
        if (!Array.isArray(accounts) || accounts.length === 0) handleAccountChanged();
        else {
          setWallet(accounts[0] as string);
          persist(accounts[0] as string, 'metamask');
        }
      };
      window.ethereum.on('accountsChanged', handleAccounts);
      return () => window.ethereum!.removeListener('accountsChanged', handleAccounts);
    }
  }, [walletType, clear, persist]);

  // ── Connect: Phantom ───────────────────────────────────────────────────────

  const connectPhantom = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // Support both new (window.phantom.solana) and legacy (window.solana) Phantom API
    const provider = window.phantom?.solana ?? window.solana;
    if (!provider?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();
      setWallet(addr);
      setWalletType('phantom');
      persist(addr, 'phantom');
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: Backpack ─────────────────────────────────────────────────────

  const connectBackpack = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.backpack?.solana) {
      window.open('https://www.backpack.app/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await window.backpack.solana.connect();
      const addr = resp.publicKey.toString();
      setWallet(addr);
      setWalletType('backpack');
      persist(addr, 'backpack');
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: Solflare ─────────────────────────────────────────────────────

  const connectSolflare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.solflare?.isSolflare) {
      window.open('https://solflare.com/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await window.solflare.connect();
      const addr = resp.publicKey.toString();
      setWallet(addr);
      setWalletType('solflare');
      persist(addr, 'solflare');
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: MetaMask (EVM) ────────────────────────────────────────────────

  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.ethereum) {
      window.open('https://metamask.io/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
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
  }, [persist]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Disconnect the wallet before clearing state (capture walletType first)
    const currentType = walletType;

    if (currentType === 'phantom') {
      const provider = window.phantom?.solana ?? window.solana;
      provider?.disconnect().catch(() => {});
    } else if (currentType === 'backpack' && window.backpack?.solana) {
      window.backpack.solana.disconnect().catch(() => {});
    } else if (currentType === 'solflare' && window.solflare) {
      window.solflare.disconnect().catch(() => {});
    } else if (currentType === 'metamask' && window.ethereum) {
      // MetaMask doesn't have a disconnect method; the state clearing below is sufficient.
      // The wallet session persists in MetaMask but our app forgets it.
    }

    // Clear local state and storage
    setWallet(null);
    setWalletType(null);
    clear();
  }, [walletType, clear]);

  // ── Utility ───────────────────────────────────────────────────────────────

  const shortWallet = useCallback((addr: string) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletType,
        walletChain,
        connecting,
        connectPhantom,
        connectBackpack,
        connectSolflare,
        connectMetaMask,
        disconnect,
        shortWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
