'use client';

import { useEffect, useState } from 'react';
import { fetchTopLeaderboard, fetchUserRank } from '@/lib/api';
import type { LeaderboardEntry, UserRankInfo } from '@/lib/gamification';
import { formatWalletShort, formatXp } from '@/lib/gamification';

interface Props {
  wallet?: string;
  limit?: number;
}

export function LeaderboardTable({ wallet, limit = 100 }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRankInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const [leaderboard, rank] = await Promise.all([
          fetchTopLeaderboard(limit),
          wallet ? fetchUserRank(wallet) : Promise.resolve(null),
        ]);

        if (leaderboard?.entries) {
          setEntries(leaderboard.entries);
        }

        if (rank) {
          setUserRank(rank);
        }
      } catch (error) {
        console.error('[Leaderboard] Error fetching data:', error);
      }

      setLoading(false);
    }

    fetchData();
  }, [wallet, limit]);

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      {userRank && (
        <div className="user-rank-banner">
          <div className="rank-badge">#{userRank.rank}</div>
          <div className="rank-info">
            <span className="rank-wallet">{formatWalletShort(wallet || '')}</span>
            <span className="rank-percentile">Top {userRank.percentile}%</span>
          </div>
          <div className="rank-xp">{formatXp(userRank.userEntry.totalXp)} XP</div>
        </div>
      )}

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="col-rank">Rank</div>
          <div className="col-wallet">Wallet</div>
          <div className="col-level">Level</div>
          <div className="col-xp">XP</div>
          <div className="col-streak">Streak</div>
        </div>

        <div className="table-body">
          {entries.map((entry, idx) => (
            <div
              key={`${entry.wallet}-${idx}`}
              className={`table-row ${wallet === entry.wallet ? 'current-user' : ''}`}
            >
              <div className="col-rank">
                <span className="rank-number">
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                </span>
              </div>

              <div className="col-wallet">
                <span className="wallet-text">{formatWalletShort(entry.wallet)}</span>
              </div>

              <div className="col-level">
                <div className="level-badge">
                  <span className="level-icon">{entry.currentLevel?.icon || '🌱'}</span>
                  <span className="level-name">{entry.levelName}</span>
                </div>
              </div>

              <div className="col-xp">
                <span className="xp-value">{formatXp(entry.totalXp)}</span>
              </div>

              <div className="col-streak">
                {entry.currentStreak > 0 ? (
                  <span className="streak-badge">
                    🔥 {entry.currentStreak}
                  </span>
                ) : (
                  <span className="no-streak">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .leaderboard-container {
          background: #0f172a;
          border-radius: 12px;
          overflow: hidden;
        }

        .loading {
          padding: 32px;
          text-align: center;
          color: #94a3b8;
        }

        .user-rank-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-bottom: 1px solid #334155;
        }

        .rank-badge {
          font-size: 1.4em;
          font-weight: 700;
          color: #fff;
          min-width: 50px;
        }

        .rank-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .rank-wallet {
          font-weight: 600;
          color: #f1f5f9;
        }

        .rank-percentile {
          font-size: 0.85em;
          color: rgba(241, 245, 249, 0.7);
        }

        .rank-xp {
          font-weight: 700;
          color: #f1f5f9;
          font-size: 1.1em;
        }

        .leaderboard-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 60px 1fr 140px 100px 100px;
          gap: 16px;
          padding: 12px 16px;
          background: rgba(51, 65, 85, 0.5);
          border-bottom: 1px solid #334155;
          font-weight: 600;
          font-size: 0.85em;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: sticky;
          top: 0;
        }

        .table-body {
          max-height: 600px;
          overflow-y: auto;
        }

        .table-body::-webkit-scrollbar {
          width: 6px;
        }

        .table-body::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.2);
        }

        .table-body::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }

        .table-body::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }

        .table-row {
          display: grid;
          grid-template-columns: 60px 1fr 140px 100px 100px;
          gap: 16px;
          padding: 12px 16px;
          align-items: center;
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
          transition: background 0.2s;
        }

        .table-row:hover {
          background: rgba(59, 130, 246, 0.05);
        }

        .table-row.current-user {
          background: rgba(16, 185, 129, 0.1);
          border-left: 3px solid #10b981;
        }

        .col-rank {
          text-align: center;
        }

        .rank-number {
          font-weight: 700;
          font-size: 1.1em;
          color: #f1f5f9;
        }

        .col-wallet {
          color: #cbd5e1;
          font-family: 'Monaco', 'Courier', monospace;
          font-size: 0.85em;
        }

        .wallet-text {
          word-break: break-all;
        }

        .col-level {
          text-align: center;
        }

        .level-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .level-icon {
          font-size: 1.3em;
        }

        .level-name {
          font-size: 0.8em;
          color: #cbd5e1;
        }

        .col-xp {
          text-align: right;
        }

        .xp-value {
          font-weight: 600;
          color: #fbbf24;
          font-size: 0.95em;
        }

        .col-streak {
          text-align: center;
        }

        .streak-badge {
          display: inline-block;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 6px;
          padding: 4px 8px;
          font-weight: 600;
          font-size: 0.85em;
          color: #fca5a5;
        }

        .no-streak {
          color: #64748b;
        }

        @media (max-width: 768px) {
          .table-header,
          .table-row {
            grid-template-columns: 40px 1fr 80px 80px;
            gap: 8px;
            padding: 10px 12px;
          }

          .col-level,
          .col-streak {
            display: none;
          }

          .rank-badge {
            font-size: 1.1em;
            min-width: 35px;
          }

          .wallet-text {
            font-size: 0.75em;
          }
        }
      `}</style>
    </div>
  );
}
