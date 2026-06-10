'use client';
import type { LeaderboardEntry } from '@/lib/types';

const TIER_MAP: Record<string, { label: string; key: string }> = {
  basis: { label: 'BASIS', key: 'basis' },
  stock: { label: 'STOCK TRADER', key: 'stock' },
  defi: { label: 'DEFI LP', key: 'defi' },
  rwa: { label: 'RWA NATIVE', key: 'rwa' },
  degen: { label: 'WALL ST DEGEN', key: 'degen' },
};

function getTier(xp: number): { label: string; key: string } {
  if (xp >= 50000) return TIER_MAP.degen;
  if (xp >= 20000) return TIER_MAP.rwa;
  if (xp >= 5000) return TIER_MAP.defi;
  if (xp >= 1000) return TIER_MAP.stock;
  return TIER_MAP.basis;
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  mode?: 'Points' | 'Multiplier';
  isCurrentUser?: boolean;
}

export default function LeaderboardRow({ entry, mode = 'Points', isCurrentUser }: LeaderboardRowProps) {
  const wallet = entry.wallet ?? '';
  const initials = wallet.slice(0, 2).toUpperCase();
  const shortAddr = wallet.length > 12 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet;
  // Use combined SP (totalSp) for tier — matches ranking criteria
  const displaySp = entry.totalSp ?? entry.totalXP ?? 0;
  const tier = getTier(displaySp);

  const rankColors: Record<number, string> = {
    1: '#f7a23b',
    2: '#cbd5e1',
    3: '#c97c3a',
  };
  const rankColor = rankColors[entry.rank] ?? 'var(--text-dim)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 120px 120px',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: isCurrentUser
          ? 'linear-gradient(90deg, rgba(38,200,184,0.07), transparent)'
          : 'transparent',
        borderLeft: isCurrentUser ? '2px solid rgba(38,200,184,0.4)' : '2px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Rank */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: rankColor,
          textAlign: 'center',
        }}
      >
        #{entry.rank}
      </div>

      {/* Wallet / Handle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--bg-3)',
            border: `1px solid ${isCurrentUser ? 'rgba(38,200,184,0.35)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-space)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: isCurrentUser ? 'var(--mint)' : 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shortAddr}
          </div>
          {/* Pre-Reg / Season 1 referral chips */}
          {((entry.preRegCount ?? 0) > 0 || (entry.season1Count ?? 0) > 0 || (entry.referredCount ?? 0) > 0) && (
            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              {(entry.season1Count ?? 0) > 0 && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(38,200,184,0.1)', color: 'var(--mint)', border: '1px solid rgba(38,200,184,0.2)', fontWeight: 700, letterSpacing: '0.03em' }}>
                  S1: {entry.season1Count}
                </span>
              )}
              {(entry.preRegCount ?? 0) > 0 && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: 'var(--text-mute)', border: '1px solid var(--border)', fontWeight: 700, letterSpacing: '0.03em' }}>
                  Pre-Reg: {entry.preRegCount}
                </span>
              )}
              {(entry.season1Count == null && entry.preRegCount == null && (entry.referredCount ?? 0) > 0) && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(107,125,255,0.1)', color: '#6B7DFF', border: '1px solid rgba(107,125,255,0.2)', fontWeight: 700 }}>
                  {entry.referredCount} refs
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* XP or Multiplier */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text)',
          textAlign: 'right',
        }}
      >
        {mode === 'Multiplier'
          ? `${(entry.multiplier ?? 1).toFixed(2)}x`
          : Math.round(displaySp).toLocaleString()}
      </div>

      {/* Tier */}
      <div style={{ textAlign: 'right' }}>
        <span className={`tier-pill ${tier.key}`}>{tier.label}</span>
      </div>
    </div>
  );
}
