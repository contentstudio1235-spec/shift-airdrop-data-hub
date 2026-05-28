'use client';

import { useEffect, useState } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWallet } from './WalletContext';
import { hasMetaMask, getLastUsedWallet, WALLET_METADATA } from '@/lib/walletConfig';

interface ConnectWalletModalProps {
  onClose: () => void;
}

// ── Wallet SVG Icons (matching official brands) ───────────────────────────

function PhantomIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="url(#ph-bg)"/>
      <defs>
        <linearGradient id="ph-bg" x1="0" y1="0" x2="100" y2="100">
          <stop stopColor="#534BB1"/>
          <stop offset="1" stopColor="#551BF9"/>
        </linearGradient>
      </defs>
      <path d="M78 50c0-15.5-12.5-28-28-28S22 34.5 22 50v24.5c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5v-6c0-1.7 1.3-3 3-3s3 1.3 3 3v6c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5v-6c0-1.7 1.3-3 3-3s3 1.3 3 3v6c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5V50h7z" fill="white"/>
      <ellipse cx="40" cy="48" rx="5" ry="6.5" fill="#534BB1"/>
      <ellipse cx="60" cy="48" rx="5" ry="6.5" fill="#534BB1"/>
      <circle cx="42" cy="46" r="1.8" fill="white"/>
      <circle cx="62" cy="46" r="1.8" fill="white"/>
    </svg>
  );
}

function SolflareIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="url(#sf-bg)"/>
      <defs>
        <linearGradient id="sf-bg" x1="0" y1="0" x2="100" y2="100">
          <stop stopColor="#FFA500"/>
          <stop offset="1" stopColor="#FF5500"/>
        </linearGradient>
      </defs>
      <path d="M50 14L78 50L50 86L22 50Z" fill="white" fillOpacity="0.95"/>
      <path d="M50 30L66 50L50 70L34 50Z" fill="#FF6600"/>
      <circle cx="50" cy="50" r="8" fill="white"/>
    </svg>
  );
}

function BackpackIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#111111"/>
      <path d="M38 32V26c0-1.7 1.3-3 3-3h18c1.7 0 3 1.3 3 3v6" stroke="#E33E3F" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <rect x="26" y="32" width="48" height="44" rx="8" fill="#E33E3F"/>
      <rect x="34" y="50" width="32" height="18" rx="5" fill="rgba(0,0,0,0.3)"/>
      <line x1="34" y1="59" x2="66" y2="59" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    </svg>
  );
}

function MagicEdenIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#000000"/>
      <defs>
        <linearGradient id="me-g" x1="20" y1="20" x2="80" y2="80">
          <stop stopColor="#E42575"/>
          <stop offset="1" stopColor="#FF6DC6"/>
        </linearGradient>
      </defs>
      <path d="M50 16L80 50L50 84L20 50Z" fill="url(#me-g)"/>
      <path d="M37 43v14l5-7 5 7 5-7 5 7V43" stroke="white" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function JupiterIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#00D4AA"/>
      <path d="M28 28h44v12H40v44H28V28Z" fill="white"/>
    </svg>
  );
}

function TrustWalletIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="url(#tw-bg)"/>
      <defs>
        <linearGradient id="tw-bg" x1="0" y1="0" x2="100" y2="100">
          <stop stopColor="#0500FF"/>
          <stop offset="1" stopColor="#1CE4FF"/>
        </linearGradient>
      </defs>
      <path d="M50 16L22 28V52C22 67 35 80 50 85C65 80 78 67 78 52V28L50 16Z" fill="white" fillOpacity="0.95"/>
      <path d="M38 46h24M38 52h24M38 58h18" stroke="url(#tw-bg)" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#FFFFFF"/>
      <polygon points="16,14 38,45 28,22" fill="#E17726"/>
      <polygon points="84,14 72,22 62,45" fill="#E17726"/>
      <path d="M38 45L50 55L62 45L72 22L28 22Z" fill="#E17726"/>
      <path d="M28 60L35 78L50 73L65 78L72 60L62 45L50 55L38 45Z" fill="#E17726"/>
      <path d="M38 67h24l-3 11-9 3-9-3z" fill="#D5621A"/>
      <path d="M44 53h12l-6 6z" fill="#C45F18"/>
      <ellipse cx="38" cy="49" rx="4" ry="5" fill="#1C1C1C"/>
      <ellipse cx="62" cy="49" rx="4" ry="5" fill="#1C1C1C"/>
      <circle cx="40" cy="47" r="1.5" fill="white"/>
      <circle cx="64" cy="47" r="1.5" fill="white"/>
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#3B99FC"/>
      <path d="M29 43c11.7-11.4 30.6-11.4 42.4 0l1.4 1.4c.6.6.6 1.5 0 2.1L67 52.3c-.3.3-.8.3-1.1 0l-1.9-1.9c-8.1-7.9-21.3-7.9-29.4 0l-2 2c-.3.3-.8.3-1.1 0l-5.7-5.7c-.6-.6-.6-1.5 0-2.1L29 43z" fill="white"/>
      <path d="M50 54.5l4.8 4.7c.3.3.8.3 1.1 0l9.6-9.4c.3-.3.8-.3 1.1 0l5.7 5.6c.6.6.6 1.5 0 2.1L60.6 69c-.6.6-1.5.6-2.1 0L50 60.8l-8.5 8.3c-.6.6-1.5.6-2.1 0L27.7 57.5c-.6-.6-.6-1.5 0-2.1l5.7-5.6c.3-.3.8-.3 1.1 0l9.6 9.4c.3.3.8.3 1.1 0L50 54.5z" fill="white"/>
    </svg>
  );
}

// ── Wallet Row Component ───────────────────────────────────────────────

interface WalletRowProps {
  icon: React.ReactNode;
  name: string;
  hint?: string;
  tag?: 'recommended' | 'installed' | 'last-used';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function WalletRow({ icon, name, hint, tag, onClick, disabled, loading }: WalletRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '11px 14px',
        background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: '1px solid',
        borderColor: hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        color: 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.12s',
        width: '100%',
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      <span style={{ flexShrink: 0, lineHeight: 0, borderRadius: 8, overflow: 'hidden' }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-space)', display: 'block' }}>
          {name}
        </span>
        {hint && (
          <span style={{ fontSize: 11, color: 'var(--text-mute)', display: 'block', marginTop: 1 }}>
            {hint}
          </span>
        )}
      </div>

      {loading ? (
        <span style={{ fontSize: 11, color: 'var(--mint)', whiteSpace: 'nowrap' }}>Connecting…</span>
      ) : tag === 'recommended' ? (
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 6px',
          borderRadius: 4, background: 'rgba(38,200,184,0.15)', color: 'var(--mint)',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>Recommended</span>
      ) : tag === 'installed' ? (
        <span style={{ fontSize: 11, color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }}/>
          Installed
        </span>
      ) : tag === 'last-used' ? (
        <span style={{ fontSize: 11, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA', display: 'inline-block' }}/>
          Last used
        </span>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>Install ↗</span>
      )}
    </button>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────

export default function ConnectWalletModal({ onClose }: ConnectWalletModalProps) {
  const solanaWallet = useSolanaWallet();
  const { select: selectWallet, wallets: availableWallets } = solanaWallet;
  const { connecting, connectMetaMask, connectMetaMaskSolana } = useWallet();

  const [walletStates, setWalletStates] = useState<Record<string, boolean>>({});

  // Detect installed wallets
  useEffect(() => {
    setWalletStates({
      phantom: availableWallets.some(w => w.adapter.name === 'Phantom'),
      solflare: availableWallets.some(w => w.adapter.name === 'Solflare'),
      trustwallet: availableWallets.some(w => w.adapter.name === 'Trust Wallet'),
      metamask: hasMetaMask(),
    });
  }, [availableWallets]);

  const lastUsed = getLastUsedWallet();

  const tagFor = (id: string, installed: boolean) => {
    if (lastUsed === id) return 'last-used' as const;
    if (id === 'phantom' && !lastUsed && installed) return 'recommended' as const;
    if (installed) return 'installed' as const;
    return undefined;
  };

  // Solana wallet connection handler
  const handleSolanaWallet = (adapterName: string) => {
    const wallet = availableWallets.find(w => w.adapter.name === adapterName);
    if (wallet) {
      selectWallet(wallet.adapter.name);
      setTimeout(onClose, 500); // Wait for connection to happen
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal fade-in"
        style={{
          maxWidth: 420,
          padding: '24px',
          background: '#0e1117',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
        }}
      >
        {/* Close */}
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          style={{ top: 16, right: 16 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Header */}
        <h2 style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          marginBottom: 6,
          marginTop: 0,
        }}>
          Connect Wallet
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 20, lineHeight: 1.5 }}>
          SHIFT trades on Solana via Jupiter. Connect a Solana wallet to track XP, positions, and badges.
        </p>

        {/* Wallet List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Phantom */}
          <WalletRow
            icon={<PhantomIcon />}
            name="Phantom"
            hint="Most popular Solana wallet"
            tag={tagFor('phantom', walletStates.phantom)}
            onClick={() => handleSolanaWallet('Phantom')}
            disabled={connecting}
            loading={connecting && solanaWallet.wallet?.adapter.name === 'Phantom'}
          />

          {/* Solflare */}
          <WalletRow
            icon={<SolflareIcon />}
            name="Solflare"
            hint="Native Solana wallet"
            tag={tagFor('solflare', walletStates.solflare)}
            onClick={() => handleSolanaWallet('Solflare')}
            disabled={connecting}
            loading={connecting && solanaWallet.wallet?.adapter.name === 'Solflare'}
          />

          {/* MetaMask */}
          <WalletRow
            icon={<MetaMaskIcon />}
            name="MetaMask"
            hint="Ethereum & EVM · Solana optional"
            tag={tagFor('metamask', walletStates.metamask)}
            onClick={connectMetaMask}
            disabled={connecting}
            loading={connecting}
          />

          {/* Trust Wallet */}
          <WalletRow
            icon={<TrustWalletIcon />}
            name="Trust Wallet"
            hint="Multi-chain mobile wallet"
            tag={tagFor('trustwallet', walletStates.trustwallet)}
            onClick={() => handleSolanaWallet('Trust Wallet')}
            disabled={connecting}
            loading={connecting && solanaWallet.wallet?.adapter.name === 'Trust Wallet'}
          />

          {/* WalletConnect */}
          <WalletRow
            icon={<WalletConnectIcon />}
            name="WalletConnect"
            hint="Connect via QR code · 400+ wallets"
            tag={undefined}
            onClick={() => window.open('https://walletconnect.com', '_blank')}
            disabled={connecting}
          />

        </div>

        {/* Footer */}
        <p style={{
          fontSize: 11,
          color: 'var(--text-mute)',
          textAlign: 'center',
          marginTop: 18,
          lineHeight: 1.5,
        }}>
          Read-only access · public address only · no transactions required
        </p>
      </div>
    </div>
  );
}
