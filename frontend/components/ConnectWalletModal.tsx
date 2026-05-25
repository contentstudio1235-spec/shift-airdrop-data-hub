'use client';

import { useEffect, useState } from 'react';
import { useWallet } from './WalletContext';

interface ConnectWalletModalProps {
  onClose: () => void;
}

// ── Official brand-accurate wallet icons ──────────────────────────────────

function PhantomIcon() {
  // Official Phantom: purple gradient bg, white ghost face with eye cutouts
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="phantomBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#534BB1" />
          <stop offset="100%" stopColor="#551BF9" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="26" fill="url(#phantomBg)" />
      {/* Ghost body */}
      <path
        d="M110 64C110 40.8 91.2 22 68 22C44.8 22 26 40.8 26 64V98C26 99.1 26.9 100 28 100H37C38.1 100 39 99.1 39 98V90C39 87.8 40.8 86 43 86C45.2 86 47 87.8 47 90V98C47 99.1 47.9 100 49 100H58C59.1 100 60 99.1 60 98V90C60 87.8 61.8 86 64 86C66.2 86 68 87.8 68 90V98C68 99.1 68.9 100 70 100H79C80.1 100 81 99.1 81 98V90C81 87.8 82.8 86 85 86C87.2 86 89 87.8 89 90V98C89 99.1 89.9 100 91 100H100C101.1 100 102 99.1 102 98V64H110Z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Left eye */}
      <ellipse cx="50" cy="62" rx="7" ry="9" fill="#534BB1" />
      {/* Right eye */}
      <ellipse cx="78" cy="62" rx="7" ry="9" fill="#534BB1" />
      {/* Eye shine left */}
      <circle cx="53" cy="59" r="2.5" fill="white" />
      {/* Eye shine right */}
      <circle cx="81" cy="59" r="2.5" fill="white" />
    </svg>
  );
}

function BackpackIcon() {
  // Official Backpack: black bg with stylized xNFT backpack logo in red/orange
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#111111" />
      {/* Backpack shape */}
      <path
        d="M84 38H44C39.6 38 36 41.6 36 46V90C36 94.4 39.6 98 44 98H84C88.4 98 92 94.4 92 90V46C92 41.6 88.4 38 84 38Z"
        fill="#E33E3F"
      />
      {/* Straps top */}
      <path d="M52 38V30C52 27.8 53.8 26 56 26H72C74.2 26 76 27.8 76 30V38" stroke="#E33E3F" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Front pocket */}
      <rect x="48" y="62" width="32" height="20" rx="4" fill="#111111" fillOpacity="0.35" />
      {/* Pocket zipper line */}
      <line x1="48" y1="72" x2="80" y2="72" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
      {/* Handle */}
      <rect x="56" y="30" width="16" height="5" rx="2.5" fill="#C42F2F" />
    </svg>
  );
}

function SolflareIcon() {
  // Official Solflare: gradient orange-yellow bg, white flame/sunburst diamond
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="solflareBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA93E" />
          <stop offset="100%" stopColor="#FC6B00" />
        </linearGradient>
        <linearGradient id="solflareFlame" x1="64" y1="20" x2="64" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="26" fill="url(#solflareBg)" />
      {/* Outer diamond / flame */}
      <path d="M64 16L100 64L64 112L28 64Z" fill="url(#solflareFlame)" />
      {/* Inner diamond cutout */}
      <path d="M64 36L88 64L64 92L40 64Z" fill="#FC6B00" />
      {/* Center circle */}
      <circle cx="64" cy="64" r="10" fill="white" />
    </svg>
  );
}

function MagicEdenIcon() {
  // Official Magic Eden Wallet: dark bg, pink-magenta "ME" mark
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#0D0D0D" />
      {/* ME diamond / magic eden logo */}
      <defs>
        <linearGradient id="meGrad" x1="26" y1="26" x2="102" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E42575" />
          <stop offset="100%" stopColor="#FF6FBF" />
        </linearGradient>
      </defs>
      {/* Diamond shape */}
      <path d="M64 20L102 64L64 108L26 64Z" fill="url(#meGrad)" />
      {/* ME letters */}
      <text x="64" y="72" textAnchor="middle" fill="white" fontSize="28" fontWeight="800" fontFamily="Arial, sans-serif">ME</text>
    </svg>
  );
}

function MetaMaskIcon() {
  // Official MetaMask: white/light bg, the iconic fox with orange gradient
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#FFFFFF" />
      {/* MetaMask fox - simplified but brand-accurate shapes */}
      {/* Outer fox shape */}
      <path d="M112 18L71 47L78 29Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5" />
      <path d="M16 18L56.6 47.3L50 29Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M96 85L84 102L109 109L116 85.4Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M12 85.4L19 109L44 102L32 85Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M42.6 57L35 68.7L60 69.8L59 43Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M85.4 57L69 42.5L68.5 69.8L93 68.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M44 102L58 94.5L46 85.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M70 94.5L84 102L82 85.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      {/* Face */}
      <path d="M70 94.5L58 94.5L60 107L68 107Z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.5" />
      <path d="M58.5 69.8L67.5 69.8L67 79L61 79Z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.5" />
      <path d="M60 79L67 79L70 94.5L58 94.5Z" fill="#E4751F" stroke="#E4751F" strokeWidth="0.5" />
      {/* Eyes */}
      <ellipse cx="48" cy="65" rx="5" ry="6" fill="#763D16" />
      <ellipse cx="80" cy="65" rx="5" ry="6" fill="#763D16" />
    </svg>
  );
}

function MetaMaskSolanaIcon() {
  // MetaMask fox on a Solana-purple tinted background to distinguish the Solana variant
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#F8F0FF" />
      {/* Same fox as MetaMask, but with a small Solana "◎" badge overlay */}
      <path d="M112 18L71 47L78 29Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5" />
      <path d="M16 18L56.6 47.3L50 29Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M96 85L84 102L109 109L116 85.4Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M12 85.4L19 109L44 102L32 85Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M42.6 57L35 68.7L60 69.8L59 43Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M85.4 57L69 42.5L68.5 69.8L93 68.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M44 102L58 94.5L46 85.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M70 94.5L84 102L82 85.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M70 94.5L58 94.5L60 107L68 107Z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.5" />
      <path d="M58.5 69.8L67.5 69.8L67 79L61 79Z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.5" />
      <path d="M60 79L67 79L70 94.5L58 94.5Z" fill="#E4751F" stroke="#E4751F" strokeWidth="0.5" />
      <ellipse cx="48" cy="65" rx="5" ry="6" fill="#763D16" />
      <ellipse cx="80" cy="65" rx="5" ry="6" fill="#763D16" />
      {/* Solana badge bottom-right */}
      <circle cx="96" cy="96" r="18" fill="#9945FF" />
      <text x="96" y="102" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Arial, sans-serif">◎</text>
    </svg>
  );
}

// ── Wallet button ──────────────────────────────────────────────────────────

interface WalletBtnProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  recommended?: boolean;
  borderColor: string;
  bgColor: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  installed?: boolean;
}

function WalletBtn({
  icon, name, description, recommended, borderColor, bgColor,
  onClick, disabled, loading, installed,
}: WalletBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 16px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        width: '100%',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ flexShrink: 0, lineHeight: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-space)' }}>{name}</span>
          {recommended && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '2px 5px',
                borderRadius: 4,
                background: 'rgba(38,200,184,0.15)',
                color: 'var(--mint)',
                textTransform: 'uppercase',
              }}
            >
              Recommended
            </span>
          )}
          {!installed && (
            <span style={{ fontSize: 10, color: 'var(--text-mute)', marginLeft: 'auto' }}>
              Install ↗
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 1 }}>{description}</div>
      </div>
      {loading && (
        <span style={{ fontSize: 12, color: 'var(--mint)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          Connecting…
        </span>
      )}
    </button>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export default function ConnectWalletModal({ onClose }: ConnectWalletModalProps) {
  const { connectPhantom, connectBackpack, connectSolflare, connectMagicEden, connectMetaMask, connectMetaMaskSolana, connecting } = useWallet();

  // Detect wallet extensions after mount (window not available during SSR)
  const [hasPhantom, setHasPhantom] = useState(false);
  const [hasBackpack, setHasBackpack] = useState(false);
  const [hasSolflare, setHasSolflare] = useState(false);
  const [hasMagicEden, setHasMagicEden] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [hasMetaMaskSolana, setHasMetaMaskSolana] = useState(false);

  useEffect(() => {
    // Check both new (window.phantom.solana) and legacy (window.solana) APIs
    setHasPhantom(!!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom));
    setHasBackpack(!!window.backpack?.solana);
    setHasSolflare(!!window.solflare?.isSolflare);
    setHasMagicEden(!!window.magicEden?.isMagicEden);
    setHasMetaMask(!!window.ethereum?.isMetaMask);
    // MetaMask Solana — detected via Wallet Standard
    if (typeof window.getWallets === 'function') {
      const wallets = window.getWallets().get();
      const mm = wallets.find(
        (w: { name: string; chains: string[] }) =>
          w.name === 'MetaMask' && w.chains.some((c: string) => c.startsWith('solana:'))
      );
      setHasMetaMaskSolana(!!mm);
    }
  }, []);

  const wrap = (fn: () => Promise<void>) => async () => {
    await fn();
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal fade-in" style={{ maxWidth: 400 }}>
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="modal-title" style={{ marginBottom: 6 }}>Connect Wallet</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.5 }}>
          SHIFT tokens trade on Solana via Jupiter. Connect a Solana wallet to track XP, positions, and badges.
        </p>

        {/* ── Solana section ──────────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--mint)',
                textTransform: 'uppercase',
              }}
            >
              ◎ Solana
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: 'rgba(38,200,184,0.15)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <WalletBtn
              icon={<PhantomIcon />}
              name="Phantom"
              description="Most popular Solana wallet"
              recommended
              installed={hasPhantom}
              bgColor="rgba(171,159,242,0.07)"
              borderColor={hasPhantom ? 'rgba(171,159,242,0.3)' : 'var(--border)'}
              onClick={wrap(connectPhantom)}
              disabled={connecting}
              loading={connecting}
            />
            <WalletBtn
              icon={<BackpackIcon />}
              name="Backpack"
              description="Multi-chain Solana wallet"
              installed={hasBackpack}
              bgColor="rgba(227,62,63,0.06)"
              borderColor={hasBackpack ? 'rgba(227,62,63,0.25)' : 'var(--border)'}
              onClick={wrap(connectBackpack)}
              disabled={connecting}
            />
            <WalletBtn
              icon={<SolflareIcon />}
              name="Solflare"
              description="Native Solana wallet"
              installed={hasSolflare}
              bgColor="rgba(252,107,0,0.06)"
              borderColor={hasSolflare ? 'rgba(252,107,0,0.25)' : 'var(--border)'}
              onClick={wrap(connectSolflare)}
              disabled={connecting}
            />
            <WalletBtn
              icon={<MagicEdenIcon />}
              name="Magic Eden"
              description="Multi-chain wallet by ME"
              installed={hasMagicEden}
              bgColor="rgba(228,37,117,0.06)"
              borderColor={hasMagicEden ? 'rgba(228,37,117,0.25)' : 'var(--border)'}
              onClick={wrap(connectMagicEden)}
              disabled={connecting}
            />
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '16px 0 8px',
          }}
        >
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>or</span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* ── EVM section ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-mute)',
                textTransform: 'uppercase',
              }}
            >
              EVM
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: 'var(--border)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <WalletBtn
              icon={<MetaMaskIcon />}
              name="MetaMask"
              description="Ethereum & EVM chains"
              installed={hasMetaMask}
              bgColor="rgba(247,162,59,0.06)"
              borderColor={hasMetaMask ? 'rgba(247,162,59,0.2)' : 'var(--border)'}
              onClick={wrap(connectMetaMask)}
              disabled={connecting}
            />
            <WalletBtn
              icon={<MetaMaskSolanaIcon />}
              name="MetaMask (Solana)"
              description="MetaMask via Wallet Standard"
              installed={hasMetaMaskSolana}
              bgColor="rgba(247,162,59,0.04)"
              borderColor={hasMetaMaskSolana ? 'rgba(247,162,59,0.2)' : 'var(--border)'}
              onClick={wrap(connectMetaMaskSolana)}
              disabled={connecting}
            />
          </div>
        </div>

        {/* ── Footer note ──────────────────────────────────────────── */}
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-mute)',
            textAlign: 'center',
            marginTop: 18,
            lineHeight: 1.5,
          }}
        >
          Read-only access · public address only · no transactions required
        </p>
      </div>
    </div>
  );
}
