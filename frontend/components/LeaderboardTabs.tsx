'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';
import LeaderboardRowChips from './LeaderboardRowChips';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

type SortType = 'final_points' | 'referral_count' | 'season1_refs' | 'prereg_refs';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score?: number;
  totalSp?: number;
  referredCount?: number;
  preRegCount?: number;
  season1Count?: number;
  referredVolume?: number;
  referredHolding?: number;
}

const TABS: { type: SortType; label: string; icon: string; description: string; color?: string }[] = [
  {
    type: 'final_points',
    label: 'Final SP',
    icon: 'award',
    description: '(Position×2.0) + (Social×1.0) + (Referral×1.0)',
  },
  {
    type: 'referral_count',
    label: 'Total Refs',
    icon: 'users',
    description: 'All referrals (Season 1 + Pre-Reg)',
  },
  {
    type: 'season1_refs',
    label: 'Season 1 Refs',
    icon: 'star',
    description: 'Referrals made on/after 26 May 2026 — count toward Season 1 Final SP',
    color: 'var(--mint)',
  },
  {
    type: 'prereg_refs',
    label: 'Pre-Reg Refs',
    icon: 'clock',
    description: 'Referrals made before Season 1 launch (26 May 2026 15:00 UTC)',
    color: 'var(--text-mute)',
  },
];

export default function LeaderboardTabs() {
  const [activeTab, setActiveTab] = useState<SortType>('final_points');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/leaderboard?sort=${activeTab}&limit=100`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.type === activeTab);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Leaderboards</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.type;
            const accent = tab.color ?? 'var(--amber)';
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: `2px solid ${isActive ? accent : 'var(--border)'}`,
                  background: isActive ? `${accent}10` : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon name={tab.icon} size={14} color={isActive ? accent : 'var(--text-mute)'} />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: isActive ? accent : 'var(--text)' }}>{tab.label}</span>
                  {tab.type === 'season1_refs' && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(38,200,184,0.15)', color: 'var(--mint)', fontWeight: 700, marginLeft: 2 }}>S1</span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>{tab.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard table */}
      {loading ? (
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
      ) : leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-2)', borderRadius: '12px' }}>
          <Icon name="activity" size={32} color="var(--text-dim)" />
          <p style={{ marginTop: '16px', color: 'var(--text-dim)' }}>No leaderboard data yet</p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-2)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', width: '40px' }}>
                  Rank
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Wallet
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: currentTab?.color ?? 'var(--text-dim)' }}>
                  {currentTab?.label || 'Final SP'}
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Total Refs
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#26C8B8' }}>
                  Season 1
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-mute)' }}>
                  Pre-Reg
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.wallet}
                  style={{
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: entry.rank <= 3 ? '#FFB700' : 'var(--text-primary)',
                    }}
                  >
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    {Math.floor(entry.totalSp ?? entry.score ?? 0).toLocaleString()}
                  </td>
                  <LeaderboardRowChips entry={entry} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
