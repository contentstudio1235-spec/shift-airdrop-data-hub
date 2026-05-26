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

/** Wallet Standard account shape (MetaMask Solana / any Wallet Standard wallet) */
interface WalletStandardAccount {
  address: string;
  publicKey: Uint8Array;
}

/** Minimal Wallet Standard interface used for MetaMask Solana detection */
interface WalletStandardWallet {
  name: string;
  icon: string;
  chains: string[];
  features: {
    'standard:connect'?: {
      connect: (opts?: { silent?: boolean }) => Promise<{ accounts: WalletStandardAccount[] }>;
    };
    'standard:disconnect'?: { disconnect: () => Promise<void> };
    'standard:events'?: {
      on: (event: 'change', handler: (args: { accounts?: WalletStandardAccount[] }) => void) => () => void;
    };
  };
  accounts: WalletStandardAccount[];
}

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
    // Magic Eden
    magicEden?: {
      isMagicEden?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      off: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    // Jupiter (Solana wallet)
    jupiter?: {
      solana?: {
        connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
        off: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    };
    // MetaMask / EVM (eth_requestAccounts)
    ethereum?: {
      isMetaMask?: boolean;
      isTrust?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    // Trust Wallet
    trustwallet?: {
      isTrustWallet?: boolean;
      solana?: {
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
        off: (event: string, handler: (...args: unknown[]) => void) => void;
      };
      ethereum?: {
        request: (args: { method: string }) => Promise<string[]>;
      };
    };
    // Wallet Standard registry — MetaMask Solana registers here
    getWallets?: () => {
      get: () => WalletStandardWallet[];
      on: (event: 'register', handler: (wallets: WalletStandardWallet[]) => void) => () => void;
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
  connectMagicEden: async () => {},
  connectMetaMaskSolana: async () => {},
  connectMetaMask: async () => {},
  connectTrustWallet: async () => {},
  connectJupiter: async () => {},
  disconnect: () => {},
  shortWallet: (a) => a,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function chainFor(type: WalletType): WalletChain {
  if (type === 'metamask') return 'evm';
  if (type === 'phantom' || type === 'backpack' || type === 'solflare' || type === 'magiceden' || type === 'metamask-solana' || type === 'trustwallet' || type === 'jupiter') return 'solana';
  return null;
}

// ── API URL ──────────────────────────────────────────────────────────────────
const API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'https://shift-airdrop-backend.onrender.com';

/**
 * Fire-and-forget: register + sync SHIFT holdings for a wallet.
 * Called automatically after any wallet connects. Non-blocking.
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
    // Non-critical — swallow silently, webhook will catch future txs
    console.warn('[Wallet] Sync call failed (non-critical):', err);
  }
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
        } else if (savedType === 'magiceden' && window.magicEden?.isMagicEden) {
          const resp = await window.magicEden.connect({ onlyIfTrusted: true });
          const addr = resp.publicKey.toString();
          setWallet(addr);
          setWalletType('magiceden');
          persist(addr, 'magiceden');
        } else if (savedType === 'metamask-solana' && typeof window.getWallets === 'function') {
          // MetaMask Solana reconnect via Wallet Standard (silent — no popup if already approved)
          const wallets = window.getWallets().get();
          const mm = wallets.find(w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('solana:')));
          if (mm?.accounts.length) {
            const addr = mm.accounts[0].address;
            setWallet(addr);
            setWalletType('metamask-solana');
            persist(addr, 'metamask-solana');
          }
        }
        // MetaMask auto-reconnect: EVM accounts are already exposed if user
        // previously approved the site — check silently via eth_accounts (no popup).
        else if (savedType === 'metamask' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) {
            setWallet(accounts[0]);
            setWalletType('metamask');
            persist(accounts[0], 'metamask');
          }
        } else if (savedType === 'jupiter' && window.jupiter?.solana) {
          const resp = await window.jupiter.solana.connect({ onlyIfTrusted: true });
          const addr = resp.publicKey.toString();
          setWallet(addr);
          setWalletType('jupiter');
          persist(addr, 'jupiter');
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
    if (walletType === 'magiceden' && window.magicEden) {
      window.magicEden.on('disconnect', handleAccountChanged);
      return () => window.magicEden!.off('disconnect', handleAccountChanged);
    }
    if (walletType === 'metamask-solana' && typeof window.getWallets === 'function') {
      const wallets = window.getWallets().get();
      const mm = wallets.find(w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('solana:')));
      const eventsFeature = mm?.features['standard:events'];
      if (eventsFeature) {
        const unsub = eventsFeature.on('change', ({ accounts }) => {
          if (!accounts || accounts.length === 0) handleAccountChanged();
          else {
            setWallet(accounts[0].address);
            persist(accounts[0].address, 'metamask-solana');
          }
        });
        return unsub;
      }
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
    if (walletType === 'jupiter' && window.jupiter?.solana) {
      window.jupiter.solana.on('disconnect', handleAccountChanged);
      return () => window.jupiter!.solana!.off('disconnect', handleAccountChanged);
    }
  }, [walletType, clear, persist]);

  // ── Auto-sync on wallet connect ───────────────────────────────────────────
  // Fires once whenever wallet goes from null → an address.
  // Registers the user and backfills any SHIFT token holdings / missed txs.

  const prevWalletRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (wallet && wallet !== prevWalletRef.current) {
      prevWalletRef.current = wallet;
      // Only trigger for Solana wallets (EVM wallets don't hold SHIFT tokens)
      if (walletChain === 'solana') {
        triggerWalletSync(wallet);
      }
    }
    if (!wallet) {
      prevWalletRef.current = null;
    }
  }, [wallet, walletChain]);

  // ── Connect: Phantom ───────────────────────────────────────────────────────

  const connectPhantom = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // Support both new (window.phantom.solana) and legacy (window.solana) Phantom API
    const provider = window.phantom?.solana ?? window.solana;
    if (!provider?.isPhantom) {
      console.log('[Wallet] Phantom not installed, opening phantom.app');
      window.open('https://phantom.app/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();
      console.log('[Wallet] Phantom connected:', addr.slice(0, 8) + '...');
      setWallet(addr);
      setWalletType('phantom');
      persist(addr, 'phantom');
    } catch (err) {
      console.log('[Wallet] Phantom connection rejected or failed');
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

  // ── Connect: Magic Eden ───────────────────────────────────────────────────

  const connectMagicEden = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.magicEden?.isMagicEden) {
      window.open('https://www.magiceden.io/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await window.magicEden.connect();
      const addr = resp.publicKey.toString();
      console.log('[Wallet] Magic Eden connected:', addr.slice(0, 8) + '...');
      setWallet(addr);
      setWalletType('magiceden');
      persist(addr, 'magiceden');
    } catch {
      console.log('[Wallet] Magic Eden connection rejected or failed');
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: Jupiter ──────────────────────────────────────────────────────

  const connectJupiter = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.jupiter?.solana) {
      window.open('https://jup.ag/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const resp = await window.jupiter.solana.connect();
      const addr = resp.publicKey.toString();
      console.log('[Wallet] Jupiter connected:', addr.slice(0, 8) + '...');
      setWallet(addr);
      setWalletType('jupiter');
      persist(addr, 'jupiter');
    } catch {
      console.log('[Wallet] Jupiter connection rejected or failed');
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: MetaMask Solana (Wallet Standard) ───────────────────────────
  // MetaMask supports Solana via the Wallet Standard protocol.
  // It registers itself with window.getWallets() — no Phantom-style window injection.
  // Docs: https://docs.metamask.io/metamask-connect/solana

  const connectMetaMaskSolana = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Check Wallet Standard registry
    if (typeof window.getWallets !== 'function') {
      console.log('[Wallet] Wallet Standard not found — MetaMask Solana unavailable');
      window.open('https://metamask.io/', '_blank');
      return;
    }

    const wallets = window.getWallets().get();
    const mm = wallets.find(
      w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('solana:'))
    );

    if (!mm) {
      console.log('[Wallet] MetaMask Solana not detected — ensure MetaMask extension is installed and Solana is enabled');
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
      const result = await connectFeature.connect();
      if (!result.accounts || result.accounts.length === 0) {
        console.log('[Wallet] MetaMask Solana: no accounts returned');
        return;
      }
      const addr = result.accounts[0].address;
      console.log('[Wallet] MetaMask Solana connected:', addr.slice(0, 8) + '...');
      setWallet(addr);
      setWalletType('metamask-solana');
      persist(addr, 'metamask-solana');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log('[Wallet] MetaMask Solana connection rejected or failed:', msg);
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: MetaMask (EVM) ────────────────────────────────────────────────

  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.ethereum) {
      console.log('[Wallet] MetaMask not installed, opening metamask.io');
      window.open('https://metamask.io/', '_blank');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        console.log('[Wallet] MetaMask: no accounts returned from eth_requestAccounts');
        setConnecting(false);
        return;
      }
      const addr = accounts[0];
      console.log('[Wallet] MetaMask connected:', addr.slice(0, 8) + '...');
      setWallet(addr);
      setWalletType('metamask');
      persist(addr, 'metamask');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.log('[Wallet] MetaMask connection rejected or failed:', errorMsg);
    } finally {
      setConnecting(false);
    }
  }, [persist]);

  // ── Connect: Trust Wallet ─────────────────────────────────────────────────
  // Trust Wallet injects window.trustwallet.solana on mobile/extension.
  // Falls back to window.ethereum.isTrust for EVM-only installs.

  const connectTrustWallet = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Prefer Solana (SHIFT is Solana-based)
    if (window.trustwallet?.solana) {
      setConnecting(true);
      try {
        const resp = await window.trustwallet.solana.connect();
        const addr = resp.publicKey.toString();
        console.log('[Wallet] Trust Wallet (Solana) connected:', addr.slice(0, 8) + '...');
        setWallet(addr);
        setWalletType('trustwallet');
        persist(addr, 'trustwallet');
      } catch {
        console.log('[Wallet] Trust Wallet connection rejected');
      } finally {
        setConnecting(false);
      }
      return;
    }

    // Fallback: Trust Wallet EVM (window.ethereum.isTrust)
    if (window.ethereum?.isTrust || (window.ethereum as any)?.isTrustWallet) {
      setConnecting(true);
      try {
        const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[];
        if (accounts?.length) {
          const addr = accounts[0];
          console.log('[Wallet] Trust Wallet (EVM) connected:', addr.slice(0, 8) + '...');
          setWallet(addr);
          setWalletType('metamask'); // treat as EVM wallet
          persist(addr, 'metamask');
        }
      } catch {
        console.log('[Wallet] Trust Wallet EVM rejected');
      } finally {
        setConnecting(false);
      }
      return;
    }

    // Not installed — open download page
    window.open('https://trustwallet.com/download', '_blank');
  }, [persist]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Disconnect the wallet before clearing state (capture walletType first)
    const currentType = walletType;
    console.log('[Wallet] Disconnecting wallet type:', currentType);

    if (currentType === 'phantom') {
      const provider = window.phantom?.solana ?? window.solana;
      provider?.disconnect().catch(() => {});
    } else if (currentType === 'backpack' && window.backpack?.solana) {
      window.backpack.solana.disconnect().catch(() => {});
    } else if (currentType === 'solflare' && window.solflare) {
      window.solflare.disconnect().catch(() => {});
    } else if (currentType === 'magiceden' && window.magicEden) {
      window.magicEden.disconnect().catch(() => {});
    } else if (currentType === 'trustwallet' && window.trustwallet?.solana) {
      window.trustwallet.solana.disconnect().catch(() => {});
    } else if (currentType === 'metamask-solana' && typeof window.getWallets === 'function') {
      const wallets = window.getWallets().get();
      const mm = wallets.find(w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('solana:')));
      const disconnectFeature = mm?.features['standard:disconnect'];
      if (disconnectFeature) disconnectFeature.disconnect().catch(() => {});
      console.log('[Wallet] MetaMask Solana disconnected');
    } else if (currentType === 'metamask' && window.ethereum) {
      // MetaMask doesn't have a disconnect method; the state clearing below is sufficient.
      // The wallet session persists in MetaMask but our app forgets it.
      console.log('[Wallet] MetaMask disconnected (session cleared locally)');
    } else if (currentType === 'jupiter' && window.jupiter?.solana) {
      window.jupiter.solana.disconnect().catch(() => {});
    }

    // Clear local state and storage
    setWallet(null);
    setWalletType(null);
    clear();
    console.log('[Wallet] Wallet state cleared from localStorage');
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
        connectMagicEden,
        connectMetaMaskSolana,
        connectMetaMask,
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

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
