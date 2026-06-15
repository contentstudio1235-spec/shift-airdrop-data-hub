'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BadgeCard from '@/components/BadgeCard';
import EventCard from '@/components/EventCard';
import PositionRow from '@/components/PositionRow';
import LivePill from '@/components/LivePill';
import MultRing from '@/components/MultRing';
import ProgressBar from '@/components/ProgressBar';
import Icon from '@/components/Icon';
import ConnectWalletModal from '@/components/ConnectWalletModal';
import { PnLBadge } from '@/components/PnLBadge';
import { PnLInfoTooltip } from '@/components/PnLInfoTooltip';
import { useWallet } from '@/components/WalletContext';
import { TokenLogo } from '@/components/TokenLogo';
import { useToast } from '@/components/ToastContext';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';
import { fetchDashboard, fetchPositions, fetchPositionHistory, fetchBadges, fetchEvents, fetchReferralLinks, setCustomReferralCode } from '@/lib/api';
import { mergeBadges } from '@/lib/badges';
import type { DashboardResponse, Position, HistoryPosition, ShiftEvent } from '@/lib/types';

type MainTab = 'Holdings' | 'History' | 'Badges' | 'Events' | 'Loyalty';
type BadgeSub = 'Activity' | 'Events';

const FAQ = [
  { q: 'How are Shift Points calculated?', a: 'Shift Points = log₁₀(position_size_usd) × 100 × launch_bonus × claim_multiplier, prorated hourly. Larger positions and longer holds earn exponentially more.' },
  { q: 'What are the Launch Bonuses?', a: 'Week 1 (3.0x), Week 2 (2.0x), then baseline (1.0x). Limited-time multipliers reward early participation — earn 3x more Shift Points in the first week!' },
  { q: 'What is the Claim Multiplier?', a: 'Your personal airdrop multiplier (1.0–5.0x). Increases with weekly activity, badges earned, referrals, and time on platform.' },
  { q: 'How do badges work?', a: 'Badges are earned by hitting milestones (volume, hold duration) or trading during special events (FOMC, earnings). Each grants bonus Shift Points multiplier.' },
  { q: 'What happens at TGE?', a: 'At Token Generation Event, your total Shift Points are converted to a SHIFT token allocation based on your rank and Claim Multiplier. Higher rank = bigger airdrop.' },
  { q: 'Can I lose Shift Points?', a: 'Shift Points start accruing the moment you buy. If you sell within 24h of buying, those points are forfeited. Hold beyond 24h and you keep all earned points permanently.' },
];

export default function AirdropPage() {
  const { wallet } = useWallet();
  const toast = useToast();
  const router = useRouter();

  // Real-time launch config
  const { phase: launchPhase } = useLaunchConfig();

  const [tab, setTab] = useState<MainTab>('Holdings');
  const [badgeSub, setBadgeSub] = useState<BadgeSub>('Activity');
  const [badgeSearch, setBadgeSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionHistory, setPositionHistory] = useState<HistoryPosition[]>([]);
  const [events, setEvents] = useState<ShiftEvent[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<{ id?: string; name?: string; badge_name?: string; earned_at?: string }[]>([]);

  // Referral links from SNAG
  const [referralLinks, setReferralLinks] = useState<{
    defaultLink: string;
    customLink: string | null;
  } | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [savingCustomCode, setSavingCustomCode] = useState(false);

  const { activity: activityBadges, events: eventBadges } = mergeBadges(earnedBadges);

  // Fetch events once on mount
  useEffect(() => {
    fetchEvents().then((res) => {
      if (res?.events) setEvents(res.events);
    });
  }, []);

  // Launch phase is now fetched via useLaunchConfig hook with real-time polling
  // No need for manual calculation — admin panel updates are reflected within 10 seconds

  // Fetch user data AND referral links together when wallet changes (CRITICAL FIX: Prevent race condition)
  const loadUserData = useCallback(
    async (isRefresh = false) => {
      if (!wallet) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [dash, pos, history, bdg, links] = await Promise.all([
          fetchDashboard(wallet),
          fetchPositions(wallet),
          fetchPositionHistory(wallet),
          fetchBadges(wallet),
          fetchReferralLinks(wallet), // Fetch referral links together to prevent race condition
        ]);
        if (dash) setDashboard(dash);
        if (pos?.positions) setPositions(pos.positions);
        if (history?.positions) setPositionHistory(history.positions);
        if (bdg?.badges) setEarnedBadges(bdg.badges as never[]);
        if (links) setReferralLinks(links); // Set referral links atomically with dashboard data
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [wallet]
  );

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Auto-refresh every 60 seconds when wallet is connected (keeps SP live)
  useEffect(() => {
    if (!wallet) return;
    autoRefreshRef.current = setInterval(() => {
      loadUserData(true);
    }, 60_000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [wallet, loadUserData]);

  // Active positions come from /active endpoint (always open status)
  const activePositions = positions;
  // Closed positions come from /history endpoint (always closed status)
  const closedPositions = positionHistory;
  const totalWeeklyXP = activePositions.reduce((s, p) => s + (p.xpPerWeek ?? 0), 0);

  const filteredActivity = activityBadges.filter(
    (b) => !badgeSearch || b.name.toLowerCase().includes(badgeSearch.toLowerCase())
  );
  const filteredEventBadges = eventBadges.filter(
    (b) => !badgeSearch || b.name.toLowerCase().includes(badgeSearch.toLowerCase())
  );

  // Handle save custom referral code
  const handleSaveCustomCode = async () => {
    if (!wallet || !customCode || customCode.length < 4) {
      toast('Code must be at least 4 characters');
      return;
    }

    setSavingCustomCode(true);
    try {
      const result = await setCustomReferralCode(wallet, customCode);
      if (result?.success) {
        setReferralLinks((prev) =>
          prev ? { ...prev, customLink: customCode } : null
        );
        toast('Custom code saved!');
        setShowCustomModal(false);
        setCustomCode('');
      } else {
        toast('Failed to save custom code');
      }
    } finally {
      setSavingCustomCode(false);
    }
  };

  return (
    <>
      <div className="page fade-in">
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700 }}>Earn Shift Points & Compete for SHIFT</h1>
              <span className="badge mint">SEASON 1 · ACTIVE</span>
              <LivePill live={true} />
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.4 }}>
              Trade SHIFT RWA tokens on Jupiter. Hold longer for bigger multipliers. Compete for the airdrop with limited-time bonus Shift Points.
            </p>
          </div>
          <button className="btn ghost sm" onClick={() => setShowHelp(true)}>
            <Icon name="question" size={13} />
            FAQ
          </button>
        </div>

        {/* ── Bonus Booster Banner ── */}
        {launchPhase && launchPhase.phase !== 'none' && (
          <div
            style={{
              background: launchPhase.phase === 'phase1'
                ? 'linear-gradient(135deg, rgba(38,200,184,0.15), rgba(34,197,94,0.1))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,146,60,0.1))',
              border: `1px solid ${launchPhase.phase === 'phase1' ? 'rgba(38,200,184,0.4)' : 'rgba(251,146,60,0.4)'}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: launchPhase.phase === 'phase1' ? 'var(--mint)' : '#FB923C', marginBottom: 6 }}>
                {launchPhase.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Launch bonus: <span style={{ fontWeight: 700, color: launchPhase.phase === 'phase1' ? 'var(--mint)' : '#FB923C' }}>
                  {Number(launchPhase.multiplier).toFixed(1)}x
                </span> (applied to all multipliers)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: launchPhase.phase === 'phase1' ? 'var(--mint)' : '#FB923C', marginBottom: 4 }}>
                {Number(launchPhase.multiplier).toFixed(1)}x
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>
                {launchPhase.timeRemaining || 'Ended'}
              </div>
            </div>
          </div>
        )}

        {/* ── Bonus Ended Banner ── */}
        {launchPhase && launchPhase.phase === 'none' && (
          <div
            style={{
              background: 'rgba(107,114,128,0.1)',
              border: '1px solid rgba(107,114,128,0.3)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 24,
              fontSize: 12,
              color: 'var(--text-mute)',
              textAlign: 'center',
            }}
          >
            Launch bonus period has ended. Using base multipliers only.
          </div>
        )}

        {/* ── Stats strip ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: dashboard?.totalPnLUsd ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Total SP', value: dashboard ? (dashboard.totalSp ?? dashboard.totalXp).toLocaleString(undefined, { maximumFractionDigits: 0 }) : (wallet ? '—' : '0'), color: 'var(--mint)' },
            { label: 'Your Rank', value: dashboard ? `#${dashboard.rank}` : '—', color: 'var(--text)' },
            { label: 'Claim Multiplier', value: dashboard ? `${dashboard.claimMultiplier.toFixed(2)}x` : '—', color: 'var(--amber)' },
            { label: 'Weekly SP', value: totalWeeklyXP > 0 ? `+${totalWeeklyXP.toLocaleString()}` : '—', color: 'var(--mint)' },
          ].map((stat) => (
            <div className="stat" key={stat.label}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              {loading && <div className="skeleton" style={{ height: 4, marginTop: 8, width: '60%' }} />}
            </div>
          ))}
          {/* P&L Summary Stat with Info Tooltip */}
          {dashboard?.totalPnLUsd !== undefined && (
            <div className="stat">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                Portfolio P&L
                <PnLInfoTooltip variant="dashboard" showIcon={true} />
              </div>
              <div style={{ marginTop: 6 }}>
                <PnLBadge pnlUsd={dashboard.totalPnLUsd} pnlPct={dashboard.totalPnLPct} size="md" />
              </div>
              {loading && <div className="skeleton" style={{ height: 4, marginTop: 8, width: '60%' }} />}
            </div>
          )}
        </div>

        {/* ── Main grid ── */}
        <div
          className="page-grid"
          style={{ gridTemplateColumns: '1fr 280px' }}
        >
          {/* Main content */}
          <div>
            {/* Tab bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="text-tabs">
                {(['Holdings', 'History', 'Badges', 'Events', 'Loyalty'] as MainTab[]).map((t) => (
                  <button
                    key={t}
                    className={tab === t ? 'active' : ''}
                    onClick={() => setTab(t)}
                  >
                    {t}
                    {t === 'Holdings' && activePositions.length > 0 && (
                      <span
                        style={{
                          marginLeft: 6,
                          background: 'var(--mint-soft)',
                          color: 'var(--mint)',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 999,
                        }}
                      >
                        {activePositions.length}
                      </span>
                    )}
                    {t === 'History' && closedPositions.length > 0 && (
                      <span
                        style={{
                          marginLeft: 6,
                          background: 'rgba(107,114,128,0.2)',
                          color: 'var(--text-mute)',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 999,
                        }}
                      >
                        {closedPositions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {wallet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {lastUpdated && (
                    <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    className="btn ghost sm"
                    onClick={() => loadUserData(true)}
                    disabled={refreshing}
                  >
                    <Icon name="refresh" size={13} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Updating…' : 'Refresh'}
                  </button>
                </div>
              )}
            </div>

            {/* Holdings tab */}
            {tab === 'Holdings' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Table header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 80px 80px 80px 1fr',
                    gap: 12,
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--panel)',
                  }}
                >
                  {['Asset', 'Weeks', 'Mult', 'SP/wk', 'Progress'].map((h) => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </div>
                  ))}
                </div>

                {!wallet ? (
                  <div className="empty-state">
                    <Icon name="wallet" size={32} color="var(--text-mute)" />
                    <p>Connect your wallet to view your positions</p>
                    <button className="btn primary" onClick={() => setShowConnectPrompt(true)}>
                      Connect Wallet
                    </button>
                  </div>
                ) : loading ? (
                  <div style={{ padding: 24 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 1fr', gap: 12, padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div className="skeleton" style={{ height: 14, width: '70%' }} />
                        <div className="skeleton" style={{ height: 14 }} />
                        <div className="skeleton" style={{ height: 14 }} />
                        <div className="skeleton" style={{ height: 14 }} />
                        <div className="skeleton" style={{ height: 14 }} />
                      </div>
                    ))}
                  </div>
                ) : activePositions.length === 0 ? (
                  <div className="empty-state">
                    <Icon name="bolt" size={32} color="var(--text-mute)" />
                    <p>No active positions yet</p>
                    <p className="hint">Trade SHIFT tokens on Jupiter to start earning Shift Points</p>
                    <button className="btn primary sm" onClick={() => window.open('https://app.shiftrwa.xyz', '_blank')}>
                      Go to Trade →
                    </button>
                  </div>
                ) : (
                  <>
                    {activePositions.map((p) => (
                      <PositionRow key={p.id} position={p} />
                    ))}
                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'var(--panel)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'var(--text-dim)',
                      }}
                    >
                      <span>{activePositions.length} open position{activePositions.length !== 1 ? 's' : ''}</span>
                      <span style={{ color: 'var(--mint)', fontWeight: 700 }}>+{totalWeeklyXP.toLocaleString()} SP/week total</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* History tab */}
            {tab === 'History' && (
              <div>
                {!wallet ? (
                  <div className="card empty-state">
                    <Icon name="wallet" size={32} color="var(--text-mute)" />
                    <p>Connect your wallet to view position history</p>
                    <button className="btn primary" onClick={() => setShowConnectPrompt(true)}>Connect Wallet</button>
                  </div>
                ) : loading ? (
                  <div className="card" style={{ padding: 24 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ height: 80, marginBottom: 12 }}>
                        <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 12, width: '70%' }} />
                      </div>
                    ))}
                  </div>
                ) : closedPositions.length === 0 && activePositions.length === 0 ? (
                  <div className="card empty-state">
                    <Icon name="history" size={32} color="var(--text-mute)" />
                    <p>No position history yet</p>
                    <p className="hint">Buy and sell SHIFT tokens to see your SP history here</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Active positions shown in history with live SP */}
                    {activePositions.map((p) => {
                      const daysHeld = p.daysHeld ?? 0;
                      const holdingOk = daysHeld >= 1;
                      return (
                        <div key={p.id} className="card" style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <TokenLogo symbol={p.asset} size={24} />
                                <span style={{ fontSize: 14, fontWeight: 700 }}>{p.asset}</span>
                                <span style={{
                                  padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                  background: 'rgba(38,200,184,0.15)', color: 'var(--mint)',
                                }}>▶ OPEN</span>
                                {!holdingOk && (
                                  <span style={{
                                    padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                  }}>⚠ SELL = FORFEIT</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                                ${p.positionSizeUsd?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'} · Opened {new Date(p.openedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--mint)' }}>
                                +{(p.xpPerWeek ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} SP/wk
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{p.currentMultiplier?.toFixed(2)}x mult</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-mute)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                            <span>📅 <strong>{daysHeld}</strong> days held</span>
                            <span>📈 <strong style={{ color: 'var(--mint)' }}>{p.progressionHook}</strong></span>
                            {holdingOk
                              ? <span style={{ color: '#22c55e' }}>✅ Safe to sell — points locked</span>
                              : <span style={{ color: '#ef4444' }}>⏳ Hold {Math.ceil(1 - (daysHeld / 1))}+ more day to keep SP</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Closed positions */}
                    {closedPositions.map((p) => {
                      const kept = (p.totalSpEarned ?? 0) > 0;
                      const daysHeld = p.weeksHeld != null ? (p.weeksHeld * 7) : null;
                      return (
                        <div key={p.id} className="card" style={{ padding: '14px 16px', opacity: 0.9 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <TokenLogo symbol={p.asset} size={24} />
                                <span style={{ fontSize: 14, fontWeight: 700 }}>{p.asset}</span>
                                <span style={{
                                  padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                  background: 'rgba(107,114,128,0.2)', color: 'var(--text-mute)',
                                }}>■ SOLD</span>
                                {kept
                                  ? <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>✅ SP KEPT</span>
                                  : <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>❌ SP FORFEITED</span>
                                }
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                                ${p.positionSizeUsd?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'}
                                {p.openedAt && ` · Bought ${new Date(p.openedAt).toLocaleDateString()}`}
                                {p.closedAt && ` → Sold ${new Date(p.closedAt).toLocaleDateString()}`}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: kept ? 'var(--mint)' : '#ef4444' }}>
                                {kept ? `+${p.totalSpEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0'} SP
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{p.finalMultiplier?.toFixed(2)}x final mult</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-mute)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                            {daysHeld != null && <span>📅 Held <strong>{Math.round(daysHeld)}</strong> days</span>}
                            <span>🔢 <strong>{p.weeksHeld}w</strong> position</span>
                            {!kept && <span style={{ color: '#ef4444' }}>Sold &lt;24h after buy — all SP forfeited</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Summary footer */}
                    <div className="card" style={{ padding: '12px 16px', background: 'var(--panel)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-mute)' }}>
                          {activePositions.length} open · {closedPositions.length} closed
                        </span>
                        <span style={{ color: 'var(--mint)', fontWeight: 700 }}>
                          Total kept: {closedPositions.reduce((s, p) => s + (p.totalSpEarned || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} SP
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Badges tab */}
            {tab === 'Badges' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="pill-tabs">
                    {(['Activity', 'Events'] as BadgeSub[]).map((s) => (
                      <button
                        key={s}
                        className={badgeSub === s ? 'active' : ''}
                        onClick={() => setBadgeSub(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      placeholder="Search badges…"
                      value={badgeSearch}
                      onChange={(e) => setBadgeSearch(e.target.value)}
                      style={{ padding: '6px 10px 6px 28px', fontSize: 12, width: 160 }}
                    />
                    <Icon
                      name="search"
                      size={12}
                      style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
                    />
                  </div>
                </div>

                <div className="badge-grid">
                  {(badgeSub === 'Activity' ? filteredActivity : filteredEventBadges).map((b) => (
                    <BadgeCard key={b.id} badge={b} />
                  ))}
                </div>

                {!wallet && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '16px',
                      marginTop: 16,
                      background: 'var(--mint-soft)',
                      border: '1px solid rgba(38,200,184,0.2)',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--mint)' }}>
                      Connect wallet to see which badges you&apos;ve earned
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Events tab */}
            {tab === 'Events' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>Public Events Feed</h3>
                  <LivePill live={events.some((e) => e.is_active)} />
                </div>

                {events.length === 0 ? (
                  <div className="empty-state">
                    <Icon name="bolt" size={32} color="var(--text-mute)" />
                    <p>No active events right now</p>
                    <p className="hint">Check back during FOMC meetings, earnings windows, and macro events</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {events.map((ev) => (
                      <EventCard key={ev.id} event={ev} onTrade={() => window.open('https://app.shiftrwa.xyz/coming-soon', '_blank')} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loyalty tab — embedded iframe to loyalty dashboard */}
            {tab === 'Loyalty' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '600px' }}>
                <iframe
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com'}/api/airdrop/loyalty-proxy`}
                  style={{
                    width: '100%',
                    height: '800px',
                    border: 'none',
                    borderRadius: '10px',
                  }}
                  title="Loyalty & Rewards Dashboard"
                  onError={(e) => {
                    console.error('[Airdrop] Loyalty iframe load error:', e);
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* PTS card */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Your Points
              </div>

              {/* MultRing */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <MultRing value={dashboard?.claimMultiplier ?? 1.0} max={3.0} size={120} />
              </div>

              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  fontFamily: 'var(--font-space)',
                  lineHeight: 1,
                  marginBottom: 4,
                  color: 'var(--mint)',
                }}
              >
                {dashboard ? Math.round(dashboard.totalSp ?? dashboard.totalXp).toLocaleString() : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Total Shift Points</div>

              {/* SP Breakdown */}
              <div className="hr" style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="kv" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="k">📈 Position SP</span>
                  <span className="v mint">
                    {dashboard ? Math.round(dashboard.positionSp ?? dashboard.totalXp).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="kv" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="k">🎯 Social & Referral SP</span>
                  <span className="v" style={{ color: 'var(--amber)' }}>
                    {dashboard ? Math.round(dashboard.socialSp ?? 0).toLocaleString() : '—'}
                  </span>
                </div>
                {/* SNAG account nudge — shown when wallet has no SNAG tasks done */}
                {dashboard && !dashboard.hasSnagAccount && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    background: 'rgba(255,179,0,0.08)',
                    border: '1px solid var(--amber)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--amber)',
                    lineHeight: 1.5,
                  }}>
                    🔗 Complete quests on the Loyalty page to earn bonus SP
                    <a
                      href="https://app.shiftrwa.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: 4,
                        color: 'var(--amber)',
                        fontWeight: 700,
                        textDecoration: 'underline',
                      }}
                    >
                      Visit Loyalty Page →
                    </a>
                  </div>
                )}
              </div>

              {/* Multiplier bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>Claim multiplier</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>
                    {(dashboard?.claimMultiplier ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <ProgressBar
                  value={((dashboard?.claimMultiplier ?? 1.0) - 1.0) / (3.0 - 1.0) * 100}
                  height={5}
                />
                <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 4, textAlign: 'right' }}>
                  max 3.0x
                </div>
              </div>

              {!wallet && (
                <button className="btn primary block mt-4" onClick={() => setShowConnectPrompt(true)}>
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Referral card */}
            <div className="card">
              <div className="section-title">Refer to Move Up</div>

              {!wallet ? (
                <div style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '20px' }}>
                  <p style={{ fontSize: 13, marginBottom: 12 }}>Connect your wallet to get your referral link</p>
                  <button
                    className="btn primary sm"
                    onClick={() => setShowConnectPrompt(true)}
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : referralLinks?.defaultLink ? (
                <>
                  {/* Branded SHIFT Referral Link (using /r/[code] route) */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 6, fontWeight: 600 }}>
                      Your Branded Referral Link
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        readOnly
                        value={`${process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz'}/r/${referralLinks.customLink || referralLinks.defaultLink.split('/').pop() || 'ref'}`}
                        className="input"
                        style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }}
                      />
                      <button
                        className="btn ghost"
                        onClick={() => {
                          const brandedLink = `${process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz'}/r/${referralLinks.customLink || referralLinks.defaultLink.split('/').pop() || 'ref'}`;
                          navigator.clipboard.writeText(brandedLink);
                          toast('Branded referral link copied!');
                        }}
                        style={{ flexShrink: 0 }}
                      >
                        <Icon name="copy" size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Custom Code Display */}
                  {referralLinks.customLink && (
                    <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--mint-soft)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 600, marginBottom: 4 }}>
                        Your Custom Code
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)' }}>
                        {referralLinks.customLink}
                      </div>
                    </div>
                  )}

                  {/* Custom Code Button */}
                  <button
                    className="btn ghost sm"
                    onClick={() => setShowCustomModal(true)}
                    style={{ marginBottom: 16, width: '100%' }}
                  >
                    {referralLinks.customLink ? 'Edit Custom Code' : 'Create Custom Code'}
                  </button>

                  {/* Share buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        const brandedLink = `${process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz'}/r/${referralLinks.customLink || referralLinks.defaultLink.split('/').pop() || 'ref'}`;
                        const text = encodeURIComponent(
                          `I just joined the @ShiftRWA airdrop! 🚀\n\nTrade RWA tokens on Solana and earn Shift Points. Join via my link:`
                        );
                        window.open(
                          `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(brandedLink)}`,
                          '_blank'
                        );
                      }}
                    >
                      <Icon name="twitter" size={13} />
                      Share on X
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        const brandedLink = `${process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz'}/r/${referralLinks.customLink || referralLinks.defaultLink.split('/').pop() || 'ref'}`;
                        window.open(
                          `https://t.me/share/url?url=${encodeURIComponent(brandedLink)}&text=Join+SHIFT+Airdrop`,
                          '_blank'
                        );
                      }}
                    >
                      <Icon name="telegram" size={13} />
                      Telegram
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        const brandedLink = `${process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz'}/r/${referralLinks.customLink || referralLinks.defaultLink.split('/').pop() || 'ref'}`;
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent('Join SHIFT Airdrop: ' + brandedLink)}`,
                          '_blank'
                        );
                      }}
                    >
                      <span style={{ fontSize: 13 }}>🟢</span>
                      WhatsApp
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        const brandedLink = `${process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz'}/r/${referralLinks.customLink || referralLinks.defaultLink.split('/').pop() || 'ref'}`;
                        navigator.clipboard.writeText(brandedLink);
                        toast('Branded referral link copied!');
                      }}
                    >
                      <Icon name="copy" size={13} />
                      Copy Link
                    </button>
                  </div>

                  {/* Go to Quests Button */}
                  <button
                    className="btn primary sm"
                    onClick={() => {
                      window.open(process.env.NEXT_PUBLIC_SNAG_LOYALTY_URL || 'https://loyalty.shiftrwa.xyz', '_blank');
                    }}
                    style={{ marginBottom: 16, width: '100%' }}
                  >
                    Go to Quests
                  </button>

                  {/* Info */}
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', padding: '12px 14px', background: 'var(--panel)', borderRadius: 8, textAlign: 'center' }}>
                    Share your branded link to earn referral rewards. Complete quests on SNAG for bonus Shift Points!
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '20px' }}>
                  <p style={{ fontSize: 12 }}>Loading referral link...</p>
                </div>
              )}
            </div>

            {/* Custom Code Modal */}
            {showCustomModal && (
              <div
                className="modal-backdrop"
                onClick={() => setShowCustomModal(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 300 }}
              >
                <div
                  className="card fade-in"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    maxWidth: 420,
                    zIndex: 301,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                      {referralLinks?.customLink ? 'Edit Custom Code' : 'Create Custom Code'}
                    </h3>
                    <button
                      onClick={() => setShowCustomModal(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 20,
                        cursor: 'pointer',
                        color: 'var(--text-mute)',
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mute)', display: 'block', marginBottom: 6 }}>
                      Custom Code (4-64 characters, uppercase)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., GOGO or SHIFT-AXEL"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      className="input"
                      style={{ marginBottom: 12, fontSize: 14 }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      Characters: {customCode.length}/64
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button
                      className="btn ghost"
                      onClick={() => setShowCustomModal(false)}
                      disabled={savingCustomCode}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn primary"
                      onClick={async () => {
                        if (!customCode || customCode.length < 4) {
                          toast('Code must be at least 4 characters');
                          return;
                        }

                        setSavingCustomCode(true);
                        try {
                          const result = await setCustomReferralCode(wallet!, customCode);
                          if (result?.success) {
                            setReferralLinks((prev) =>
                              prev ? { ...prev, customLink: customCode } : null
                            );
                            toast('Custom code saved!');
                            setShowCustomModal(false);
                            setCustomCode('');
                          } else {
                            toast('Failed to save custom code');
                          }
                        } finally {
                          setSavingCustomCode(false);
                        }
                      }}
                      disabled={savingCustomCode || customCode.length < 4}
                    >
                      {savingCustomCode ? 'Saving...' : 'Save Code'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowHelp(false)}>
          <div className="modal fade-in" style={{ maxWidth: 520 }}>
            <button className="modal-close" onClick={() => setShowHelp(false)}>
              <Icon name="x" size={16} />
            </button>
            <h2 className="modal-title">Airdrop FAQ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FAQ.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 0',
                    borderBottom: i < FAQ.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-space)', marginBottom: 5 }}>
                    {item.q}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connect wallet modal — use ConnectWalletModal for direct wallet connection */}
      {showConnectPrompt && <ConnectWalletModal onClose={() => setShowConnectPrompt(false)} />}
    </>
  );
}
