'use client';

import { useState, useEffect, useMemo } from 'react';
import LeaderboardRow from '@/components/LeaderboardRow';
import LivePill from '@/components/LivePill';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { fetchLeaderboard } from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/types';

type Mode = 'Final SP' | 'Multiplier';
type Timeframe = 'All Time' | 'Monthly' | 'Weekly';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['#f7a23b', '#cbd5e1', '#c97c3a'];

// ── Weighted SP formula (mirrors backend) ─────────────────────────────────
// Final SP = (Position SP × 2) + (Social SP × 1) + (Referral SP × 1)
// The API returns `totalSp` which is already the weighted final value.
// We surface the formula here so users understand how their rank is calculated.

export default function LeaderboardPage() {
  const { wallet, shortWallet } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('Final SP');
  const [timeframe, setTimeframe] = useState<Timeframe>('All Time');
  const [query, setQuery] = useState('');
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    fetchLeaderboard(50)
      .then((res) => { if (res?.leaderboard) setLeaderboard(res.leaderboard); })
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const data = [...leaderboard];
    if (mode === 'Multiplier') {
      data.sort((a, b) => (b.multiplier ?? 0) - (a.multiplier ?? 0));
    } else {
      // Sort by Final SP (weighted): totalSp from API is already the final weighted value.
      // Falls back to legacy totalXP for backwards compat.
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
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  const getDisplayValue = (entry: LeaderboardEntry) => {
    if (mode === 'Multiplier') return `${(entry.multiplier ?? 1).toFixed(2)}x`;
    return Math.round((entry as any).totalSp ?? entry.totalXP ?? 0).toLocaleString();
  };

  return (
    <div className="page fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Leaderboard</h1>
            <span className="badge mint">Season 1</span>
            <LivePill live={!loading} />
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Top traders ranked by <strong style={{ color: 'var(--text)' }}>Final SP</strong> — weighted across Position, Social, and Referral categories
          </p>
        </div>
      </div>

      {/* ── SP Weightage formula banner ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 11, padding: '12px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Final SP =</span>
            {[
              { label: 'Position SP', weight: '×2.0', color: 'var(--mint)'       },
              { label: 'Social SP',   weight: '×1.0', color: 'var(--tier-stock)' },
              { label: 'Referral SP', weight: '×1.0', color: 'var(--amber)'      },
            ].map((p, i, arr) => (
              <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.color }}>
                  {p.label} <span style={{ opacity: 0.65 }}>{p.weight}</span>
                </span>
                {i < arr.length - 1 && <span style={{ color: 'var(--text-mute)', fontSize: 11 }}>+</span>}
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowFormula(!showFormula)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-mute)', fontFamily: 'var(--font-space)', fontWeight: 600, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Icon name="info" size={12} /> {showFormula ? 'Hide' : 'Learn more'}
          </button>
        </div>
        {showFormula && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            {[
              { title: 'Position SP  ×2.0', desc: 'Earned from trading volume, holding duration, and badge ownership. The primary SP driver — weighted twice.', color: 'var(--mint)' },
              { title: 'Social SP  ×1.0',   desc: 'Earned from SNAG loyalty quests, community tasks, and referral activity. Weighted at face value.', color: 'var(--tier-stock)' },
              { title: 'Referral SP  ×1.0', desc: 'Commission SP earned when referred traders hold SHIFT positions. Quality-gated — each referred wallet\'s XP tier determines your rate (10–15%).', color: 'var(--amber)' },
            ].map((item) => (
              <div key={item.title} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-space)', color: item.color, marginBottom: 5 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="pill-tabs" style={{ width: 'auto' }}>
          {(['All Time', 'Monthly', 'Weekly'] as Timeframe[]).map((t) => (
            <button key={t} className={timeframe === t ? 'active' : ''} onClick={() => setTimeframe(t)}>{t}</button>
          ))}
        </div>
        <div className="pill-tabs" style={{ width: 'auto' }}>
          {(['Final SP', 'Multiplier'] as Mode[]).map((m) => (
            <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <input className="input" placeholder="Search wallet…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 32 }} />
          <Icon name="search" size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }} />
        </div>
      </div>

      {/* ── Current user card ── */}
      {wallet && userEntry && (
        <div style={{ background: 'linear-gradient(90deg,rgba(38,200,184,0.08),rgba(38,200,184,0.02))', border: '1px solid rgba(38,200,184,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--mint)', fontFamily: 'var(--font-mono)', minWidth: 40 }}>#{userEntry.rank}</span>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--mint-soft)', border: '1px solid rgba(38,200,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--mint)' }}>
            {wallet.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--mint)' }}>You · {shortWallet(wallet)}</div>
            {mode === 'Final SP' && (
              <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                Final SP = (Pos×2) + (Social×1) + (Ref×1)
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--mint)' }}>
            {getDisplayValue(userEntry)} {mode === 'Final SP' ? 'SP' : ''}
          </div>
          <span className="badge mint" style={{ fontSize: 10 }}>You</span>
        </div>
      )}

      {/* ── Loading / empty ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Icon name="trophy" size={40} color="var(--text-mute)" />
          <p>No data yet — check back soon</p>
          <p className="hint">Trade SHIFT tokens to appear on the leaderboard</p>
        </div>
      ) : (
        <>
          {/* ── Podium ── */}
          {top3.length === 3 && !query && (
            <div className="podium" style={{ marginBottom: 24 }}>
              {podiumOrder.map((entry, i) => {
                const isFirst = entry.rank === 1;
                const colIdx = [1, 0, 2][i];
                const color = PODIUM_COLORS[colIdx];
                return (
                  <div key={entry.wallet} className={`podium-card ${isFirst ? 'first' : entry.rank === 2 ? 'second' : 'third'}`}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{MEDALS[entry.rank - 1]}</div>
                    <div className="podium-avatar" style={{ borderColor: `${color}50` }}>
                      {entry.wallet?.slice(0, 2).toUpperCase() ?? '--'}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.wallet ? `${entry.wallet.slice(0, 4)}…${entry.wallet.slice(-4)}` : '—'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-space)', color }}>{getDisplayValue(entry)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>
                      {mode === 'Multiplier' ? 'multiplier' : 'Final SP'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Table ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 140px 120px', gap: 12, padding: '10px 16px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
              {['Rank', 'Wallet', mode === 'Multiplier' ? 'Multiplier' : 'Final SP', 'Tier'].map((h, i) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 2 ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: i >= 2 ? 'flex-end' : 'flex-start', gap: 4 }}>
                  {h}
                  {h === 'Final SP' && (
                    <span style={{ fontSize: 9, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)', fontWeight: 400, opacity: 0.7 }}>(Pos×2+Soc×1+Ref×1)</span>
                  )}
                </div>
              ))}
            </div>
            {(query ? filtered : rest).map((entry) => (
              <LeaderboardRow
                key={entry.wallet}
                entry={entry}
                mode={mode === 'Final SP' ? 'Points' : 'Multiplier'}
                isCurrentUser={!!wallet && entry.wallet?.toLowerCase() === wallet.toLowerCase()}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
