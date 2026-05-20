'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useWallet } from './WalletContext';
import ConnectWalletModal from './ConnectWalletModal';
import LivePill from './LivePill';
import Icon from './Icon';

const NAV_ITEMS = [
  { label: 'Register', href: '/register', soon: false },
  { label: 'Trade', href: '/trade', soon: false },
  { label: 'Airdrop', href: '/airdrop', soon: false },
  { label: 'Leaderboard', href: '/leaderboard', soon: false },
  { label: 'Equities Score', href: '/equities', soon: true },
  { label: 'Certificates', href: '/certificates', soon: true },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { wallet, shortWallet, disconnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const activeHref = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.href ?? '/register';

  return (
    <>
      <header className="nav-root">
        {/* Logo */}
        <Link href="/register" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image
            src="/shift-logo.svg"
            alt="SHIFT"
            width={120}
            height={27}
            priority
            style={{ height: 'auto', width: 'auto', maxWidth: 120, maxHeight: 27 }}
          />
          <span style={{ color: 'var(--text-mute)', fontWeight: 400, fontSize: 12 }}>airdrop</span>
        </Link>

        {/* Desktop nav tabs */}
        <nav className="nav-tabs">
          {NAV_ITEMS.map((item) =>
            item.soon ? (
              <span
                key={item.href}
                className="nav-tab"
                style={{ opacity: 0.55, cursor: 'default', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                {item.label}
                <span className="badge amber" style={{ fontSize: 9, padding: '2px 5px' }}>SOON</span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-tab ${pathname.startsWith(item.href) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Mobile dropdown */}
        <select
          className="nav-mobile-select input"
          value={activeHref}
          onChange={(e) => {
            const item = NAV_ITEMS.find((n) => n.href === e.target.value);
            if (item && !item.soon) router.push(item.href);
          }}
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.href} value={item.href} disabled={item.soon}>
              {item.label}{item.soon ? ' (Soon)' : ''}
            </option>
          ))}
        </select>

        {/* Right side */}
        <div className="nav-right">
          <LivePill live={true} />

          {/* Bell */}
          <button className="nav-icon-btn" aria-label="Notifications">
            <Icon name="bell" size={16} />
          </button>

          {/* Settings */}
          <button className="nav-icon-btn" aria-label="Settings">
            <Icon name="settings" size={16} />
          </button>

          {/* Wallet */}
          {wallet ? (
            <div style={{ position: 'relative' }}>
              <button
                className="wallet-chip"
                onClick={() => setShowWalletMenu(!showWalletMenu)}
              >
                <span className="wallet-dot connected" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {shortWallet(wallet)}
                </span>
                <Icon name="chevron" size={12} color="var(--text-mute)" />
              </button>
              {showWalletMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px',
                    minWidth: 160,
                    zIndex: 200,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(wallet);
                      setShowWalletMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--text-dim)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-space)',
                    }}
                  >
                    <Icon name="copy" size={13} />
                    Copy address
                  </button>
                  <button
                    onClick={() => {
                      disconnect();
                      setShowWalletMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--red)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-space)',
                    }}
                  >
                    <Icon name="x" size={13} />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn primary sm"
              onClick={() => setShowWalletModal(true)}
            >
              <Icon name="wallet" size={13} />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {showWalletModal && <ConnectWalletModal onClose={() => setShowWalletModal(false)} />}

      {/* Close wallet menu on outside click */}
      {showWalletMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          onClick={() => setShowWalletMenu(false)}
        />
      )}
    </>
  );
}
