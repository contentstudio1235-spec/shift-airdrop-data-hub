'use client';

import { useEffect, useState } from 'react';
import { formatWalletShort, formatXp } from '@/lib/gamification';

interface ReferralStats {
  myStats: {
    totalReferred: number;
    totalXpEarned: number;
    activeReferrals: number;
    bonusXpAvailable: number;
  };
  referredUsers: Array<{
    referredWallet: string;
    referrerWallet: string;
    codeUsed: string;
    referredAt: string;
    xpAwarded: number;
    bonusMultiplier: number;
    bonusType: string;
  }>;
  myReferrer: {
    referrerWallet: string;
    code: string;
    xpFromReferral: number;
  } | null;
  networkXp: {
    myXp: number;
    networkXp: number;
    referralXp: number;
  };
  leaderboard: Array<{
    wallet: string;
    referralCount: number;
    xpEarned: number;
  }>;
}

interface Props {
  wallet: string;
}

export function ReferralDashboard({ wallet }: Props) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/${wallet}/referrals/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('[ReferralDash] Error:', error);
      }
      setLoading(false);
    }

    if (wallet) {
      fetchStats();
    }
  }, [wallet]);

  if (loading || !stats) {
    return <div className="referral-loading">Loading referral data...</div>;
  }

  const myStats = stats.myStats;
  const networkXp = stats.networkXp;
  const referralLeaderboard = stats.leaderboard.slice(0, 10);

  return (
    <div className="referral-dashboard">
      {/* My Referrer */}
      {stats.myReferrer && (
        <div className="my-referrer-card">
          <h3>👤 My Referrer</h3>
          <div className="referrer-info">
            <span className="referrer-wallet">{formatWalletShort(stats.myReferrer.referrerWallet)}</span>
            <span className="referrer-code">Code: {stats.myReferrer.code}</span>
            <span className="referrer-xp">+{formatXp(stats.myReferrer.xpFromReferral)} XP</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{myStats.totalReferred}</div>
          <div className="stat-label">Total Referred</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myStats.activeReferrals}</div>
          <div className="stat-label">Active Referrals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatXp(myStats.totalXpEarned)}</div>
          <div className="stat-label">Referral XP</div>
        </div>
        <div className="stat-card highlighted">
          <div className="stat-value">{formatXp(myStats.bonusXpAvailable)}</div>
          <div className="stat-label">Bonus XP Available</div>
        </div>
      </div>

      {/* Network XP */}
      <div className="network-xp-card">
        <h3>🌐 Your Network</h3>
        <div className="network-breakdown">
          <div className="network-item">
            <span>Your XP</span>
            <strong>{formatXp(networkXp.myXp)}</strong>
          </div>
          <div className="plus-sign">+</div>
          <div className="network-item">
            <span>Referrals' XP</span>
            <strong>{formatXp(networkXp.referralXp)}</strong>
          </div>
          <div className="equals-sign">=</div>
          <div className="network-item total">
            <span>Network XP</span>
            <strong>{formatXp(networkXp.networkXp)}</strong>
          </div>
        </div>
      </div>

      {/* Referred Users */}
      {stats.referredUsers.length > 0 && (
        <div className="referred-users-card">
          <h3>👥 Your Referrals</h3>
          <div className="referred-list">
            {stats.referredUsers.map(ref => (
              <div key={ref.referredWallet} className="referred-item">
                <div className="referred-info">
                  <span className="referred-wallet">{formatWalletShort(ref.referredWallet)}</span>
                  <span className="referred-date">
                    {new Date(ref.referredAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="referred-xp">
                  +{formatXp(ref.xpAwarded)} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="leaderboard-card">
        <h3>🏆 Referral Kings</h3>
        <div className="leaderboard-list">
          {referralLeaderboard.map((entry, idx) => (
            <div
              key={entry.wallet}
              className={`leaderboard-item ${wallet === entry.wallet ? 'you' : ''}`}
            >
              <span className="leaderboard-rank">
                {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
              </span>
              <span className="leaderboard-wallet">{formatWalletShort(entry.wallet)}</span>
              <span className="leaderboard-count">{entry.referralCount} referred</span>
              <span className="leaderboard-xp">{formatXp(entry.xpEarned)} XP</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .referral-dashboard {
          background: #0f172a;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .referral-loading {
          padding: 32px;
          text-align: center;
          color: #94a3b8;
        }

        .my-referrer-card {
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid #a855f7;
          border-radius: 10px;
          padding: 16px;
        }

        .my-referrer-card h3 {
          margin: 0 0 12px 0;
          color: #d8b4fe;
        }

        .referrer-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .referrer-wallet,
        .referrer-code,
        .referrer-xp {
          font-size: 0.9em;
          color: #cbd5e1;
        }

        .referrer-xp {
          font-weight: 600;
          color: #fbbf24;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .stat-card {
          background: rgba(51, 65, 85, 0.5);
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }

        .stat-card.highlighted {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1));
          border-color: #3b82f6;
        }

        .stat-value {
          font-size: 1.8em;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.8em;
          color: #94a3b8;
        }

        .network-xp-card,
        .referred-users-card,
        .leaderboard-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 16px;
        }

        .network-xp-card h3,
        .referred-users-card h3,
        .leaderboard-card h3 {
          margin: 0 0 12px 0;
          color: #f1f5f9;
        }

        .network-breakdown {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .network-item {
          background: rgba(51, 65, 85, 0.3);
          padding: 12px;
          border-radius: 6px;
          text-align: center;
        }

        .network-item span {
          display: block;
          font-size: 0.8em;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .network-item strong {
          display: block;
          font-size: 1.2em;
          color: #fbbf24;
        }

        .network-item.total {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2));
          border: 1px solid #10b981;
        }

        .network-item.total strong {
          color: #10b981;
        }

        .plus-sign,
        .equals-sign {
          color: #64748b;
          font-weight: 700;
        }

        .referred-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .referred-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(51, 65, 85, 0.2);
          border-radius: 6px;
        }

        .referred-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .referred-wallet {
          color: #cbd5e1;
          font-family: 'Monaco', monospace;
          font-size: 0.85em;
        }

        .referred-date {
          color: #64748b;
          font-size: 0.75em;
        }

        .referred-xp {
          color: #10b981;
          font-weight: 600;
          font-size: 0.9em;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leaderboard-item {
          display: grid;
          grid-template-columns: 40px 1fr 100px 80px;
          gap: 12px;
          align-items: center;
          padding: 10px;
          background: rgba(51, 65, 85, 0.2);
          border-radius: 6px;
          border: 1px solid transparent;
          transition: all 0.2s;
        }

        .leaderboard-item.you {
          background: rgba(16, 185, 129, 0.1);
          border-color: #10b981;
        }

        .leaderboard-item:hover {
          background: rgba(51, 65, 85, 0.4);
        }

        .leaderboard-rank {
          text-align: center;
          font-weight: 700;
        }

        .leaderboard-wallet {
          color: #cbd5e1;
          font-family: 'Monaco', monospace;
          font-size: 0.85em;
        }

        .leaderboard-count {
          color: #94a3b8;
          font-size: 0.85em;
          text-align: right;
        }

        .leaderboard-xp {
          color: #fbbf24;
          font-weight: 600;
          text-align: right;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .network-breakdown {
            flex-direction: column;
          }

          .plus-sign,
          .equals-sign {
            display: none;
          }

          .leaderboard-item {
            grid-template-columns: 30px 1fr 60px;
            gap: 8px;
          }

          .leaderboard-count {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
