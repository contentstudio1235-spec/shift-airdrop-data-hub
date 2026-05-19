'use client';

import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '@/lib/api';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard()
      .then(data => {
        setLeaderboard(data.leaderboard || []);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Top Traders</h2>
        <p className="text-slate-400">Compete and earn XP rewards</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center text-slate-400">No data yet</div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 border-b border-slate-800 bg-slate-800 p-4 font-semibold">
            <div>Rank</div>
            <div>Wallet</div>
            <div>Total XP</div>
            <div>Badges</div>
          </div>
          <div className="divide-y divide-slate-800">
            {leaderboard.map((entry: any, idx: number) => (
              <div key={entry.wallet} className="grid grid-cols-4 gap-4 p-4 text-sm">
                <div className="font-semibold">#{entry.rank || idx + 1}</div>
                <div className="truncate text-slate-300">{entry.wallet.substring(0, 10)}...</div>
                <div className="font-semibold">{entry.totalXP?.toFixed(2) || '0'}</div>
                <div>{entry.badgeCount || '0'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
