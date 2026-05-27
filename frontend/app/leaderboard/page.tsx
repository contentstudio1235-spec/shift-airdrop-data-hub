'use client';

import { useState, useEffect, useMemo } from 'react';
import LeaderboardRow from '@/components/LeaderboardRow';
import LivePill from '@/components/LivePill';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { fetchLeaderboard } from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/types';

type Mode = 'Points' | 'Multiplier';
type Timeframe = 'All Time' | 'Monthly' | 'Weekly';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['#f7a23b', '#cbd5e1', '#c97c3a'];

export default function LeaderboardPage() {
  const { wallet, shortWallet } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('Points');
  const [timeframe, setTimeframe] = useState<Timeframe>('All Time');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchLeaderboard(50)
      .then((res) => {
        if (res?.leaderboard) {
          setLeaderboard(res.leaderboard);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const data = [...leaderboard];
    if (mode === 'Multiplier') {
      data.sort((a, b) => (b.multiplier ?? 0) - (a.multiplier ?? 0));
    } else {
      // Sort by total SP (totalXP is legacy field name for position SP)
      // Use totalSp if available, fallback to totalXP for backwards compat
      data.sort((a, b) => {
        const aScore = (a as any).totalSp ?? a.totalXP ?? 0;
        const bScore = (b as any).totalSp ?? b.totalXP ?? 0;
        return bScore - aScore;
      });
    }
    return data.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [leaderboard, mode]);

  const filtered = useMemo(() => {
    if (!query) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((e) => e.wallet?.toLowerCase().includes(q));
  }, [sorted, query]);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const userEntry = wallet ? sorted.find((e) => e.wallet?.toLowerCase() === wallet.toLowerCase()) : null;

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Leaderboard</h1>
            <span className="badge mint">Season 1</span>
            <LivePill live={!loading} />
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Top traders ranked by Shift Points (SP) earned</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Timeframe */}
        <div className="pill-tabs" style={{ width: 'auto' }}>
          {(['All Time', 'Monthly', 'Weekly'] as Timeframe[]).map((t) => (
            <button
              key={t}
              className={timeframe === t ? 'active' : ''}
              onClick={() => setTimeframe(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Mode */}
        <div className="pill-tabs" style={{ width: 'auto' }}>
          {(['Points', 'Multiplier'] as Mode[]).map((m) => (
            <button
              key={m}
              className={mode === m ? 'active' : ''}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <input
            className="input"
            placeholder="Search wallet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
          <Icon
            name="search"
            size={13}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
          />
        </div>
      </div>

      {/* Current user card */}
      {wallet && userEntry && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(38,200,184,0.1), rgba(38,200,184,0.02))',
            border: '1px solid rgba(38,200,184,0.25)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--mint)', fontFamily: 'var(--font-mono)', minWidth: 36 }}>
            #{userEntry.rank}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--mint-soft)',
              border: '1px solid rgba(38,200,184,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--mint)',
            }}
          >
            {wallet.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--mint)' }}>
              You · {shortWallet(wallet)}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>
            {mode === 'Multiplier' ? `${(userEntry.multiplier ?? 1).toFixed(2)}x` : (userEntry.totalXP ?? 0).toLocaleString()} {mode === 'Points' ? 'SP' : ''}
          </div>
          <span className="badge mint" style={{ fontSize: 10 }}>You</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 24px' }}>
          <Icon name="trophy" size={40} color="var(--text-mute)" />
          <p>No data yet — check back soon</p>
          <p className="hint">Trade SHIFT tokens to appear on the leaderboard</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length === 3 && !query && (
            <div className="podium" style={{ marginBottom: 24 }}>
              {podiumOrder.map((entry, i) => {
                const isFirst = entry.rank === 1;
                const colIdx = [1, 0, 2][i]; // 2nd=0, 1st=1, 3rd=2 → podium color index
                const color = PODIUM_COLORS[colIdx];
                return (
                  <div
                    key={entry.wallet}
                    className={`podium-card ${isFirst ? 'first' : entry.rank === 2 ? 'second' : 'third'}`}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{MEDALS[entry.rank - 1]}</div>
                    <div className="podium-avatar" style={{ borderColor: `${color}50` }}>
                      {entry.wallet?.slice(0, 2).toUpperCase() ?? '--'}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-dim)',
                        marginBottom: 6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.wallet ? `${entry.wallet.slice(0, 4)}…${entry.wallet.slice(-4)}` : '—'}
                    </div>
                    <div
                      style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-space)', color }}
                    >
                      {mode === 'Multiplier'
                        ? `${(entry.multiplier ?? 1).toFixed(2)}x`
                        : (entry.totalXP ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>
                      {mode === 'Multiplier' ? 'multiplier' : 'SP'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div
            className="card"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 120px 120px',
                gap: 12,
                padding: '10px 16px',
                background: 'var(--panel)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {['Rank', 'Wallet', mode === 'Multiplier' ? 'Multiplier' : 'Total SP', 'Tier'].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-mute)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    textAlign: h === 'Total SP' || h === 'Multiplier' ? 'right' : 'left',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows 4+ (rest) */}
            {(query ? filtered : rest).map((entry) => (
              <LeaderboardRow
                key={entry.wallet}
                entry={entry}
                mode={mode}
                isCurrentUser={!!wallet && entry.wallet?.toLowerCase() === wallet.toLowerCase()}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
