'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

interface ReferredUser {
  wallet: string;
  // API returns isActive (boolean) + shiftHoldingUsd, openPositions
  isActive?: boolean;
  status?: 'active' | 'inactive';
  openPositions?: number;
  positionsOpen?: number;
  shiftHoldingUsd?: number;
  totalVolume?: number;
  currentHolding?: number;
  totalXp: number;
  commissionTier: string;
  commissionEarned: number;
  monthlyEarned: number;
}

interface ReferredUsersTableProps {
  wallet: string;
}

export default function ReferredUsersTable({ wallet }: ReferredUsersTableProps) {
  const [referred, setReferred] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<'xp' | 'volume' | 'holding'>('xp');

  useEffect(() => {
    const fetchReferred = async () => {
      try {
        const res = await fetch(`${API_URL}/api/referral/${wallet}/referred`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setReferred(data.referred || []);
      } catch (err) {
        console.error('Failed to fetch referred users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferred();
  }, [wallet]);

  const sortedReferred = [...referred].sort((a, b) => {
    if (sorting === 'xp')      return (b.totalXp ?? 0) - (a.totalXp ?? 0);
    if (sorting === 'volume')  return getVolume(b) - getVolume(a);
    if (sorting === 'holding') return getHolding(b) - getHolding(a);
    return 0;
  });

  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatUSD = (n: number | undefined) => {
    const val = Number(n ?? 0);
    return val >= 1000 ? `$${(val / 1000).toFixed(1)}K` : `$${val.toFixed(2)}`;
  };
  // Normalise API field names — backend returns isActive/shiftHoldingUsd/openPositions
  const getActive  = (u: ReferredUser) => u.isActive ?? u.status === 'active';
  const getHolding = (u: ReferredUser) => u.shiftHoldingUsd ?? u.currentHolding ?? 0;
  const getVolume  = (u: ReferredUser) => u.totalVolume ?? 0;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--text-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}
        />
      </div>
    );
  }

  if (referred.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-2)', borderRadius: '12px' }}>
        <Icon name="users" size={32} color="var(--text-dim)" />
        <h3 style={{ marginTop: '16px', color: 'var(--text-dim)' }}>No Referrals Yet</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-mute)', marginTop: '8px' }}>
          Share your referral link to start earning Position SP from referred users
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Referred Users ({referred.length})</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['xp', 'volume', 'holding'].map((sort) => (
            <button
              key={sort}
              onClick={() => setSorting(sort as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${sorting === sort ? 'var(--text-primary)' : 'var(--border)'}`,
                background: sorting === sort ? 'var(--bg-3)' : 'transparent',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {sort === 'xp' ? 'XP' : sort === 'volume' ? 'Volume' : 'Holding'}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          overflowX: 'auto',
          background: 'var(--bg-2)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Wallet
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                XP
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Volume
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Holding
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Commission
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Monthly
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedReferred.map((user) => (
              <tr
                key={user.wallet}
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                  {formatAddr(user.wallet)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>
                  {Math.floor(user.totalXp ?? 0).toLocaleString()}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>
                  {formatUSD(getVolume(user))}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>
                  {formatUSD(getHolding(user))}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px' }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                    background: getActive(user) ? 'rgba(0,208,132,0.1)' : 'rgba(200,200,200,0.1)',
                    color: getActive(user) ? '#00D084' : 'var(--text-dim)', fontWeight: 500,
                  }}>
                    {getActive(user) ? '🟢 Active' : '⚪ Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6B7DFF' }}>
                  {Math.floor(user.commissionEarned ?? 0)} SP
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#FF9F43' }}>
                  {Math.floor(user.monthlyEarned ?? 0)} / 500
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
