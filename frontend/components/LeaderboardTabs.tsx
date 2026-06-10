'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';
import LeaderboardRowChips from './LeaderboardRowChips';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

type SortType = 'final_points' | 'referral_count' | 'referred_volume' | 'referred_holding';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  referredCount: number;
  referredVolume: number;
  referredHolding: number;
}

const TABS: { type: SortType; label: string; icon: string; description: string }[] = [
  {
    type: 'final_points',
    label: 'Final Points',
    icon: 'award',
    description: '(Position×2.0) + (Social×1.0) + (Referral×1.0)',
  },
  {
    type: 'referral_count',
    label: 'Referral Count',
    icon: 'users',
    description: 'Number of referred users',
  },
  {
    type: 'referred_volume',
    label: 'Referred Volume',
    icon: 'trending-up',
    description: 'Total trading volume of referred users',
  },
  {
    type: 'referred_holding',
    label: 'Referred Holding',
    icon: 'briefcase',
    description: 'Current holdings of referred users',
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
          {TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: `2px solid ${activeTab === tab.type ? 'var(--text-primary)' : 'var(--border)'}`,
                background: activeTab === tab.type ? 'var(--bg-3)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Icon name={tab.icon} size={16} />
                <span style={{ fontWeight: 600 }}>{tab.label}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{tab.description}</p>
            </button>
          ))}
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
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  {currentTab?.label || 'Score'}
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Referred Count
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Referred Volume
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Referred Holding
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
                    {Math.floor(entry.score).toLocaleString()}
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
