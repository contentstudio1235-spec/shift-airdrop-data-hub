'use client';

import { useEffect, useState } from 'react';
import { useWallet } from './WalletContext';

interface ConnectWalletModalProps {
  onClose: () => void;
}

// ── Small inline SVG icons ─────────────────────────────────────────────────

function PhantomIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#AB9FF2" />
      <path
        d="M109.8 64c0 25.4-20.6 46-46 46S17.8 89.4 17.8 64s20.6-46 46-46 46 20.6 46 46z"
        fill="#fff"
      />
      <path
        d="M82.4 55.2c-1.4-7.6-8-13.2-15.8-13.2-8.8 0-16 7.2-16 16v8.4c0 1.6 1.2 2.8 2.8 2.8h2c5.6 0 10.4-3.6 12-8.8.8-2.8 3.2-4.8 6-4.8 3.4 0 6.2 2.8 6.2 6.2 0 3.8-2.8 6.8-6.4 7.2-2 .2-3.4 2-3.4 4v.8c0 3.2 3.6 5 6.2 3.2 7.2-4.8 11-13.8 6.4-21.8z"
        fill="#AB9FF2"
      />
      <circle cx="54.8" cy="69.6" r="3.6" fill="#AB9FF2" />
      <circle cx="67.6" cy="69.6" r="3.6" fill="#AB9FF2" />
    </svg>
  );
}

function BackpackIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#E33E3F" />
      <path
        d="M44 44h40a8 8 0 0 1 8 8v32a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8V52a8 8 0 0 1 8-8z"
        fill="#fff"
      />
      <path d="M56 44v-6a8 8 0 0 1 16 0v6" stroke="#E33E3F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="58" y="60" width="12" height="10" rx="2" fill="#E33E3F" />
      <path d="M58 65h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SolflareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#FC6B00" />
      <path
        d="M64 20 L108 64 L64 108 L20 64 Z"
        fill="none" stroke="#fff" strokeWidth="6"
      />
      <path d="M64 36 L92 64 L64 92 L36 64 Z" fill="#fff" opacity="0.7" />
      <circle cx="64" cy="64" r="10" fill="#fff" />
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26" fill="#F6851B" />
      <path d="M96 24 L66 47 L71 35 Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5" />
      <path d="M32 24 L61.6 47.2 L57.2 35 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M85.6 76.4 L77.6 89.2 L94 93.6 L98.4 76.8 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M29.6 76.8 L34 93.6 L50.4 89.2 L42.4 76.4 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M49.6 55.6 L45.2 62.4 L61.2 63.2 L60.8 46 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M78.4 55.6 L67.2 45.6 L66.8 63.2 L82.8 62.4 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M50.4 89.2 L60.4 84.4 L51.6 77.2 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
      <path d="M67.6 84.4 L77.6 89.2 L76.4 77.2 Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
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
  const { connectPhantom, connectBackpack, connectSolflare, connectMetaMask, connecting } = useWallet();

  // Detect wallet extensions after mount (window not available during SSR)
  const [hasPhantom, setHasPhantom] = useState(false);
  const [hasBackpack, setHasBackpack] = useState(false);
  const [hasSolflare, setHasSolflare] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    // Check both new (window.phantom.solana) and legacy (window.solana) APIs
    setHasPhantom(!!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom));
    setHasBackpack(!!window.backpack?.solana);
    setHasSolflare(!!window.solflare?.isSolflare);
    setHasMetaMask(!!window.ethereum?.isMetaMask);
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
