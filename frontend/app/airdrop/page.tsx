'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BadgeCard from '@/components/BadgeCard';
import EventCard from '@/components/EventCard';
import PositionRow from '@/components/PositionRow';
import LivePill from '@/components/LivePill';
import MultRing from '@/components/MultRing';
import ProgressBar from '@/components/ProgressBar';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { useToast } from '@/components/ToastContext';
import { fetchDashboard, fetchPositions, fetchBadges, fetchEvents, fetchReferralLinks, setCustomReferralCode } from '@/lib/api';
import { mergeBadges } from '@/lib/badges';
import type { DashboardResponse, Position, ShiftEvent } from '@/lib/types';

type MainTab = 'Holdings' | 'Badges' | 'Events';
type BadgeSub = 'Activity' | 'Events';

const FAQ = [
  { q: 'How is XP calculated?', a: 'XP = log₁₀(position_size_usd) × 100 × multiplier, prorated hourly. Larger positions and longer holds earn more.' },
  { q: 'What is the Claim Multiplier?', a: 'Your macro airdrop multiplier (1.0–5.0x). Increases with weekly activity, badges earned, and time on platform.' },
  { q: 'How do badges work?', a: 'Badges are earned by hitting milestones (volume, hold duration) or trading during special events (FOMC, earnings). Each grants bonus XP.' },
  { q: 'What happens at TGE?', a: 'At Token Generation Event, your XP is converted to a SHIFT token allocation based on your rank and Claim Multiplier.' },
  { q: 'Can I lose XP?', a: 'No. XP is cumulative and never decreases. However, positions shorter than 24h or flagged as wash trades are not counted.' },
];

export default function AirdropPage() {
  const { wallet } = useWallet();
  const toast = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<MainTab>('Holdings');
  const [badgeSub, setBadgeSub] = useState<BadgeSub>('Activity');
  const [badgeSearch, setBadgeSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
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

  // Fetch referral links when wallet connects
  useEffect(() => {
    if (!wallet) {
      setReferralLinks(null);
      return;
    }

    (async () => {
      try {
        const links = await fetchReferralLinks(wallet);
        if (links) {
          setReferralLinks(links);
        }
      } catch (error) {
        console.error('Failed to fetch referral links:', error);
      }
    })();
  }, [wallet]);

  // Fetch user data when wallet changes
  const loadUserData = useCallback(
    async (isRefresh = false) => {
      if (!wallet) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [dash, pos, bdg] = await Promise.all([
          fetchDashboard(wallet),
          fetchPositions(wallet),
          fetchBadges(wallet),
        ]);
        if (dash) setDashboard(dash);
        if (pos?.positions) setPositions(pos.positions);
        if (bdg?.badges) setEarnedBadges(bdg.badges as never[]);
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

  const totalWeeklyXP = positions.reduce((s, p) => s + (p.xpPerWeek ?? 0), 0);

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
              <h1 style={{ fontSize: 28, fontWeight: 700 }}>Earn XP</h1>
              <span className="badge mint">SEASON 1 · ACTIVE</span>
              <LivePill live={true} />
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              Trade SHIFT RWA tokens on Jupiter, hold positions, earn badges.
            </p>
          </div>
          <button className="btn ghost sm" onClick={() => setShowHelp(true)}>
            <Icon name="question" size={13} />
            FAQ
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Total XP', value: dashboard ? dashboard.totalXp.toLocaleString(undefined, { maximumFractionDigits: 0 }) : (wallet ? '—' : '0'), color: 'var(--mint)' },
            { label: 'Your Rank', value: dashboard ? `#${dashboard.rank}` : '—', color: 'var(--text)' },
            { label: 'Claim Multiplier', value: dashboard ? `${dashboard.claimMultiplier.toFixed(2)}x` : '—', color: 'var(--amber)' },
            { label: 'Weekly XP', value: totalWeeklyXP > 0 ? `+${totalWeeklyXP.toLocaleString()}` : '—', color: 'var(--mint)' },
          ].map((stat) => (
            <div className="stat" key={stat.label}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              {loading && <div className="skeleton" style={{ height: 4, marginTop: 8, width: '60%' }} />}
            </div>
          ))}
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
                {(['Holdings', 'Badges', 'Events'] as MainTab[]).map((t) => (
                  <button
                    key={t}
                    className={tab === t ? 'active' : ''}
                    onClick={() => setTab(t)}
                  >
                    {t}
                    {t === 'Holdings' && positions.length > 0 && (
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
                        {positions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {tab === 'Holdings' && wallet && (
                <button
                  className="btn ghost sm"
                  onClick={() => loadUserData(true)}
                  disabled={refreshing}
                >
                  <Icon name="refresh" size={13} className={refreshing ? 'spin' : ''} />
                  Refresh
                </button>
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
                  {['Asset', 'Weeks', 'Mult', 'XP/wk', 'Progress'].map((h) => (
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
                ) : positions.length === 0 ? (
                  <div className="empty-state">
                    <Icon name="bolt" size={32} color="var(--text-mute)" />
                    <p>No active positions yet</p>
                    <p className="hint">Trade SHIFT tokens on Jupiter to start earning XP</p>
                    <button className="btn primary sm" onClick={() => window.open('https://app.shiftrwa.xyz/coming-soon', '_blank')}>
                      Go to Trade →
                    </button>
                  </div>
                ) : (
                  <>
                    {positions.map((p) => (
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
                      <span>{positions.length} open position{positions.length !== 1 ? 's' : ''}</span>
                      <span style={{ color: 'var(--mint)', fontWeight: 700 }}>+{totalWeeklyXP.toLocaleString()} XP/week total</span>
                    </div>
                  </>
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
                {dashboard ? Math.round(dashboard.totalXp).toLocaleString() : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Total PTS</div>

              {/* Breakdown */}
              <div className="hr" style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="kv" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="k">On-chain XP</span>
                  <span className="v mint">{dashboard ? Math.round(dashboard.totalXp * 0.7).toLocaleString() : '—'}</span>
                </div>
                <div className="kv" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="k">Referral XP</span>
                  <span className="v" style={{ color: 'var(--amber)' }}>900</span>
                </div>
                <div className="kv" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="k">Pending unlock</span>
                  <span className="v" style={{ color: 'var(--text-dim)' }}>—</span>
                </div>
                {dashboard?.loyaltyPoints != null && dashboard.loyaltyPoints > 0 && (
                  <div className="kv" style={{ padding: '5px 0', borderBottom: 'none' }}>
                    <span className="k">SNAG Loyalty PTS</span>
                    <span className="v" style={{ color: 'var(--amber)' }}>
                      {dashboard.loyaltyPoints.toLocaleString()}
                    </span>
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
                  {/* Default SNAG Referral Link */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 6, fontWeight: 600 }}>
                      Your SNAG Referral Link
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        readOnly
                        value={referralLinks.defaultLink}
                        className="input"
                        style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }}
                      />
                      <button
                        className="btn ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(referralLinks.defaultLink);
                          toast('Referral link copied!');
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
                        const text = encodeURIComponent(
                          `I just joined the @ShiftRWA airdrop! 🚀\n\nTrade RWA tokens on Solana and earn XP. Join via my link:`
                        );
                        window.open(
                          `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLinks.defaultLink)}`,
                          '_blank'
                        );
                      }}
                    >
                      <Icon name="twitter" size={13} />
                      Share on X
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() =>
                        window.open(
                          `https://t.me/share/url?url=${encodeURIComponent(referralLinks.defaultLink)}&text=Join+SHIFT+Airdrop`,
                          '_blank'
                        )
                      }
                    >
                      <Icon name="telegram" size={13} />
                      Telegram
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() =>
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent('Join SHIFT Airdrop: ' + referralLinks.defaultLink)}`,
                          '_blank'
                        )
                      }
                    >
                      <span style={{ fontSize: 13 }}>🟢</span>
                      WhatsApp
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        navigator.clipboard.writeText(referralLinks.defaultLink);
                        toast('Referral link copied!');
                      }}
                    >
                      <Icon name="copy" size={13} />
                      Copy Link
                    </button>
                  </div>

                  {/* Info */}
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', padding: '12px 14px', background: 'var(--panel)', borderRadius: 8, textAlign: 'center' }}>
                    Each referral earns you rewards through SNAG Loyalty
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

      {/* Connect prompt modal */}
      {showConnectPrompt && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowConnectPrompt(false)}>
          <div className="modal fade-in">
            <button className="modal-close" onClick={() => setShowConnectPrompt(false)}>
              <Icon name="x" size={16} />
            </button>
            <h2 className="modal-title">Connect Wallet</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.5 }}>
              Connect your Solana wallet (Phantom) to view your XP, positions, and badges.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn primary block lg"
                onClick={() => {
                  setShowConnectPrompt(false);
                  // NavBar wallet button handles the actual connect flow
                  toast('Click "Connect Wallet" in the nav bar');
                }}
              >
                <Icon name="wallet" size={14} />
                Connect via Nav Bar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
