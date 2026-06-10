'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

// Season 1 launch: 26 May 2026 15:00 UTC
const SEASON1_LAUNCH = new Date('2026-05-26T15:00:00Z');

interface ReferredUser {
  wallet: string;
  source: 'shift' | 'snag' | 'unknown';
  isActive: boolean;
  isPreReg: boolean;             // referred before Season 1 launch
  activatedAt: string | null;
  referredAt: string | null;
  shiftHoldingUsd: number;
  openPositions: number;
  totalVolume: number;
  totalXp: number;
  snagPoints: number;
  commissionTier: string;
  commissionEarned: number;
  monthlyEarned: number;
  nudgeEligible: boolean;
  nudgeReason: string | null;
}

interface ApiResponse {
  wallet: string;
  total: number;
  activeCount: number;
  inactiveCount: number;
  nudgeCount: number;
  fromShift: number;
  fromSnag: number;
  preRegCount: number;
  season1Count: number;
  referred: ReferredUser[];
}

type SortKey = 'xp' | 'volume' | 'holding' | 'commission';
type FilterKey = 'all' | 'season1' | 'prereg';

const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const formatUSD = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};
const formatSince = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

// Determine isPreReg from referredAt if the backend field is missing (old data)
const getIsPreReg = (user: ReferredUser): boolean => {
  if (user.isPreReg !== undefined) return user.isPreReg;
  if (!user.referredAt) return false;
  return new Date(user.referredAt) < SEASON1_LAUNCH;
};

export default function ReferredUsersTable({ wallet }: { wallet: string }) {
  const [data, setData]         = useState<ApiResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [sorting, setSorting]   = useState<SortKey>('xp');
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/referral/${wallet}/referred`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
      setLastFetch(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referred users');
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="section-title">Referred Users</div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Referred Users</div>
        <div style={{ padding: '10px 14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, fontSize: 12, color: '#ff6060', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={14} color="#ff6060" />
          {error}
          <button onClick={fetchData} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mint)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data || data.referred.length === 0) {
    return (
      <div className="card" style={{ padding: '28px 20px', textAlign: 'center' }}>
        <Icon name="refer" size={28} color="var(--text-mute)" />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', marginTop: 10 }}>No Referrals Yet</div>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>Share your link to start earning commission SP</div>
      </div>
    );
  }

  // Derive pre-reg counts from actual data (fallback if API doesn't return counts yet)
  const preRegCount  = data.preRegCount  ?? data.referred.filter(u => getIsPreReg(u)).length;
  const season1Count = data.season1Count ?? data.referred.filter(u => !getIsPreReg(u)).length;

  const filtered = data.referred.filter(u => {
    if (filter === 'season1') return !getIsPreReg(u);
    if (filter === 'prereg')  return getIsPreReg(u);
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sorting === 'xp')         return b.totalXp - a.totalXp;
    if (sorting === 'volume')     return b.totalVolume - a.totalVolume;
    if (sorting === 'holding')    return b.shiftHoldingUsd - a.shiftHoldingUsd;
    if (sorting === 'commission') return b.commissionEarned - a.commissionEarned;
    return 0;
  });

  const filterBtnStyle = (key: FilterKey) => ({
    padding: '4px 9px', fontSize: 10, fontWeight: 600, borderRadius: 5, cursor: 'pointer', border: '1px solid',
    borderColor: filter === key ? 'rgba(38,200,184,0.4)' : 'var(--border)',
    background:  filter === key ? 'var(--mint-soft)' : 'transparent',
    color:       filter === key ? 'var(--mint)' : 'var(--text-mute)',
  });

  const sortBtnStyle = (key: SortKey) => ({
    padding: '4px 8px', fontSize: 10, fontWeight: 600, borderRadius: 5, cursor: 'pointer', border: '1px solid',
    borderColor: sorting === key ? 'rgba(247,162,59,0.4)' : 'var(--border)',
    background:  sorting === key ? 'var(--amber-soft)' : 'transparent',
    color:       sorting === key ? 'var(--amber)' : 'var(--text-mute)',
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="section-title" style={{ margin: 0 }}>Referred Users</div>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)' }}>
              {data.total}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 3 }}>
            <span style={{ color: 'var(--green)' }}>{data.activeCount} active</span>
            <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>
            <span>{data.inactiveCount} pending</span>
            <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>
            <span style={{ color: 'var(--mint)' }}>{season1Count} S1</span>
            <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>
            <span style={{ color: 'var(--text-mute)' }}>{preRegCount} pre-reg</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Filter tabs */}
          <button style={filterBtnStyle('all')}     onClick={() => setFilter('all')}>All</button>
          <button style={filterBtnStyle('season1')} onClick={() => setFilter('season1')}>Season 1</button>
          <button style={filterBtnStyle('prereg')}  onClick={() => setFilter('prereg')}>Pre-Reg</button>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
          {/* Sort buttons */}
          {(['xp', 'volume', 'holding', 'commission'] as SortKey[]).map(k => (
            <button key={k} style={sortBtnStyle(k)} onClick={() => setSorting(k)}>
              {k === 'xp' ? 'XP' : k === 'volume' ? 'Volume' : k === 'holding' ? 'Holding' : 'Commission'}
            </button>
          ))}
          <button onClick={fetchData} title="Refresh" style={{ padding: '4px 7px', fontSize: 11, borderRadius: 5, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mute)', display: 'flex', alignItems: 'center' }}>
            <Icon name="refresh" size={12} />
          </button>
        </div>
      </div>

      {lastFetch && (
        <div style={{ padding: '4px 16px 10px', fontSize: 10, color: 'var(--text-mute)' }}>
          Live data · last fetched {lastFetch.toLocaleTimeString()}
          {filter !== 'all' && <span style={{ marginLeft: 8, color: 'var(--mint)' }}>· showing {sorted.length} of {data.total}</span>}
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: filter === 'all' ? 'Total Referrals' : filter === 'season1' ? 'Season 1' : 'Pre-Reg',
            value: sorted.length.toString(), color: 'var(--text)' },
          { label: 'Total Volume',  value: formatUSD(sorted.reduce((s, u) => s + u.totalVolume, 0)),     color: 'var(--mint)'  },
          { label: 'Total Holding', value: formatUSD(sorted.reduce((s, u) => s + u.shiftHoldingUsd, 0)), color: 'var(--green)' },
          { label: 'Open Positions',value: sorted.reduce((s, u) => s + u.openPositions, 0).toString(),   color: 'var(--amber)' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '10px 14px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-space)', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Wallet', 'Season', 'Status', 'Holding', 'Open Pos', 'Total Vol', 'XP', 'Commission', 'Monthly', 'Since'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Wallet' || h === 'Since' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: 'var(--text-mute)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((user) => {
              const preReg = getIsPreReg(user);
              return (
                <tr
                  key={user.wallet}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {/* Wallet */}
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {formatAddr(user.wallet)}
                      {user.source === 'snag' && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(157,108,245,0.12)', color: 'var(--purple)', fontWeight: 600 }}>SNAG</span>
                      )}
                    </div>
                  </td>

                  {/* Season badge */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {preReg ? (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: 'var(--text-mute)', border: '1px solid var(--border)', fontWeight: 600 }}>
                        PRE-REG
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(38,200,184,0.1)', color: 'var(--mint)', border: '1px solid rgba(38,200,184,0.2)', fontWeight: 600 }}>
                        SEASON 1
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: user.isActive ? 'rgba(38,200,184,0.1)' : 'rgba(255,255,255,0.05)',
                      color: user.isActive ? 'var(--mint)' : 'var(--text-mute)',
                      border: `1px solid ${user.isActive ? 'rgba(38,200,184,0.25)' : 'var(--border)'}`,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: user.isActive ? 'var(--mint)' : 'var(--text-mute)', flexShrink: 0 }} />
                      {user.isActive ? 'Active' : 'Pending'}
                    </span>
                  </td>

                  {/* Current SHIFT holding */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    <span style={{ color: user.shiftHoldingUsd >= 5 ? 'var(--green)' : user.shiftHoldingUsd > 0 ? 'var(--amber)' : 'var(--text-mute)' }}>
                      {formatUSD(user.shiftHoldingUsd)}
                    </span>
                    {!user.isActive && user.shiftHoldingUsd > 0 && user.shiftHoldingUsd < 5 && (
                      <div style={{ fontSize: 9, color: 'var(--amber)', marginTop: 1 }}>
                        +{formatUSD(5 - user.shiftHoldingUsd)} needed
                      </div>
                    )}
                  </td>

                  {/* Open positions count */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: user.openPositions > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                    {user.openPositions}
                  </td>

                  {/* Total historical volume */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    {formatUSD(user.totalVolume)}
                  </td>

                  {/* Position XP */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--mint)', fontWeight: 600 }}>
                    {Math.floor(user.totalXp).toLocaleString()}
                  </td>

                  {/* Total commission earned */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>
                    {Math.floor(user.commissionEarned).toLocaleString()} SP
                  </td>

                  {/* Monthly cap progress */}
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: user.monthlyEarned >= 500 ? 'var(--text-mute)' : 'var(--text-dim)' }}>
                      {Math.floor(user.monthlyEarned)}
                      <span style={{ opacity: 0.45 }}>/500</span>
                    </span>
                  </td>

                  {/* Referred since */}
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>
                    {formatSince(user.referredAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
