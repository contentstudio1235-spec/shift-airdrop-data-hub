'use client';

import { useWallet } from './WalletContext';

interface ConnectWalletModalProps {
  onClose: () => void;
}

export default function ConnectWalletModal({ onClose }: ConnectWalletModalProps) {
  const { connectPhantom, connectMetaMask, connecting } = useWallet();

  const handlePhantom = async () => {
    await connectPhantom();
    onClose();
  };

  const handleMetaMask = async () => {
    await connectMetaMask();
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal fade-in">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="modal-title">Connect Wallet</h2>

        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.5 }}>
          Connect your Solana wallet to view your XP, positions, and badges. Read-only — no transactions required.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Phantom */}
          <button
            onClick={handlePhantom}
            disabled={connecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: 'rgba(171, 159, 242, 0.08)',
              border: '1px solid rgba(171,159,242,0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 28 }}>👻</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-space)' }}>Phantom</div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Solana wallet (recommended)</div>
            </div>
            {connecting && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-mute)' }}>
                Connecting…
              </span>
            )}
          </button>

          {/* MetaMask */}
          <button
            onClick={handleMetaMask}
            disabled={connecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: 'rgba(247, 162, 59, 0.06)',
              border: '1px solid rgba(247,162,59,0.15)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 28 }}>🦊</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-space)' }}>MetaMask</div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>EVM wallet</div>
            </div>
          </button>
        </div>

        <p
          style={{
            fontSize: 11,
            color: 'var(--text-mute)',
            textAlign: 'center',
            marginTop: 20,
            lineHeight: 1.5,
          }}
        >
          We only read your public address. No private keys, no transactions.
        </p>
      </div>
    </div>
  );
}
