/**
 * Solana Wallet Adapter Configuration
 * Supports: Phantom, Solflare, Backpack, Magic Eden, Jupiter, Trust Wallet, etc.
 * For EVM (MetaMask): Uses window.ethereum directly
 */

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust';
import { clusterApiUrl } from '@solana/web3.js';

// Network configuration
export const NETWORK = WalletAdapterNetwork.Mainnet;
export const RPC_ENDPOINT = clusterApiUrl(NETWORK);

/**
 * Wallet adapters array - includes supported Solana wallets
 * Using official @solana/wallet-adapter-* packages
 */
export const getWalletAdapters = () => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network: NETWORK }),
  new TrustWalletAdapter(),
];

/**
 * MetaMask EVM detection
 * Returns true if MetaMask is installed
 */
export function hasMetaMask(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.ethereum?.isMetaMask && !window.ethereum?.isPhantom);
}

/**
 * MetaMask Solana detection (if MetaMask has Solana enabled)
 * MetaMask supports Solana via Wallet Standard
 */
export function hasMetaMaskSolana(): boolean {
  if (typeof window === 'undefined') return false;

  if (typeof window.getWallets !== 'function') {
    return false;
  }

  try {
    const wallets = window.getWallets().get();
    return !!wallets.find(
      (w: { name: string; chains: string[] }) =>
        w.name === 'MetaMask' && w.chains?.some((c: string) => c.startsWith('solana:'))
    );
  } catch {
    return false;
  }
}

/**
 * Trust Wallet Solana detection
 */
export function hasTrustWalletSolana(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.trustwallet?.solana);
}

/**
 * Get last used wallet from localStorage
 */
export function getLastUsedWallet(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('shift_wallet_type');
}

/**
 * Save last used wallet
 */
export function setLastUsedWallet(walletName: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('shift_wallet_type', walletName);
}

/**
 * Clear wallet from localStorage
 */
export function clearWalletStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('shift_wallet');
  localStorage.removeItem('shift_wallet_type');
}

/**
 * Wallet metadata for UI display
 */
export const WALLET_METADATA: Record<
  string,
  { name: string; icon: string; hint: string }
> = {
  'Phantom': {
    name: 'Phantom',
    icon: 'phantom',
    hint: 'Most popular Solana wallet'
  },
  'Solflare': {
    name: 'Solflare',
    icon: 'solflare',
    hint: 'Native Solana wallet'
  },
  'Backpack': {
    name: 'Backpack',
    icon: 'backpack',
    hint: 'Multi-chain · xNFT wallet'
  },
  'Magic Eden': {
    name: 'Magic Eden',
    icon: 'magiceden',
    hint: 'Multi-chain wallet by ME'
  },
  'Jupiter': {
    name: 'Jupiter',
    icon: 'jupiter',
    hint: 'Solana native wallet'
  },
  'Trust Wallet': {
    name: 'Trust Wallet',
    icon: 'trustwallet',
    hint: 'Multi-chain mobile wallet'
  },
  'MetaMask': {
    name: 'MetaMask',
    icon: 'metamask',
    hint: 'Ethereum & EVM'
  },
  'MetaMask Solana': {
    name: 'MetaMask',
    icon: 'metamask',
    hint: 'MetaMask · Solana & EVM'
  },
  'WalletConnect': {
    name: 'WalletConnect',
    icon: 'walletconnect',
    hint: 'Connect via QR code · 400+ wallets'
  },
};

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isPhantom?: boolean;
      isTrust?: boolean;
      request?: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    trustwallet?: {
      solana?: {
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
        off: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    };
    getWallets?: () => {
      get: () => Array<{
        name: string;
        icon: string;
        chains: string[];
        features: Record<string, unknown>;
        accounts: Array<{ address: string; publicKey: Uint8Array }>;
      }>;
      on: (event: 'register', handler: (wallets: unknown[]) => void) => () => void;
    };
  }
}
