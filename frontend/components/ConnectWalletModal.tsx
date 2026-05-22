'use client';

import { useEffect, useState } from 'react';
import { useWallet } from './WalletContext';

interface ConnectWalletModalProps {
  onClose: () => void;
}

// ── Small inline SVG icons ─────────────────────────────────────────────────

function PhantomIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="phantomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#AB9FF2', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#9B8FE0', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#phantomGrad)" />
      <path d="M50 25 C35 25, 25 35, 25 50 C25 65, 35 75, 50 75 C65 75, 75 65, 75 50 C75 35, 65 25, 50 25 Z" fill="white" opacity="0.9" />
      <path d="M40 45 L45 55 L55 45 M45 55 L45 65 M55 45 L55 65" stroke="#AB9FF2" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackpackIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#DC2F2F" />
      <g fill="white">
        {/* Backpack main body */}
        <path d="M 35 35 L 65 35 L 65 65 L 35 65 Z" />
        {/* Straps */}
        <rect x="42" y="25" width="5" height="10" rx="2" />
        <rect x="53" y="25" width="5" height="10" rx="2" />
        {/* Pocket */}
        <rect x="45" y="48" width="10" height="8" rx="1" fill="#DC2F2F" />
      </g>
    </svg>
  );
}

function SolflareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#FF8D4D" />
      {/* Diamond/Star shape - Solflare brand */}
      <g fill="white">
        <path d="M 50 20 L 70 50 L 50 80 L 30 50 Z" fillOpacity="1" />
        <path d="M 50 35 L 65 50 L 50 65 L 35 50 Z" fill="#FF8D4D" />
        <circle cx="50" cy="50" r="8" fill="white" />
      </g>
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#F6851B" />
      {/* Simplified Fox head silhouette - MetaMask brand */}
      <g fill="white" fillOpacity="0.95">
        {/* Left ear */}
        <path d="M 30 30 L 35 20 L 40 30 Z" />
        {/* Right ear */}
        <path d="M 60 30 L 65 20 L 70 30 Z" />
        {/* Face */}
        <ellipse cx="50" cy="55" rx="22" ry="25" />
        {/* Left eye */}
        <circle cx="40" cy="50" r="4" fill="#F6851B" />
        {/* Right eye */}
        <circle cx="60" cy="50" r="4" fill="#F6851B" />
        {/* Nose */}
        <polygon points="50,60 48,65 52,65" fill="#F6851B" />
      </g>
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
