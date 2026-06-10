'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/WalletContext';
import { useToast } from '@/components/ToastContext';
import Icon from '@/components/Icon';
import PendingBalanceCard from '@/components/PendingBalanceCard';
import ReferredUsersTable from '@/components/ReferredUsersTable';
import LeaderboardTabs from '@/components/LeaderboardTabs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

// ── Types ─────────────────────────────────────────────────────────────────
interface ReferralStats {
  total: number;
  active: number;
  inactive: number;
  fromShift: number;
  fromSnag: number;
}

interface MyStats {
  totalReferred: number;
  totalXpEarned: number;
  activeReferrals: number;
  bonusXpAvailable: number;
}

interface PendingBalance {
  pending: number;
  claimed: boolean;
}

// ── Commission tier helpers ───────────────────────────────────────────────
const TIERS = [
  { label: 'No Position', range: 'No SHIFT held',     rate: 0,  min: null, max: 0     },
  { label: 'Starter',     range: '< 1,000 SP',        rate: 10, min: 1,    max: 999   },
  { label: 'Trader',      range: '1,000 – 10,000 SP', rate: 12, min: 1000, max: 10000 },
  { label: 'Elite',       range: '> 10,000 SP',       rate: 15, min: 10001,max: null  },
];
const getRate    = (sp: number) => sp >= 10001 ? 15 : sp >= 1000 ? 12 : sp >= 1 ? 10 : 0;
const getTierIdx = (sp: number) => sp >= 10001 ? 3  : sp >= 1000 ? 2  : sp >= 1 ? 1  : 0;

// ── Formula Banner ────────────────────────────────────────────────────────
function FormulaBanner() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, fontFamily: 'var(--font-mono)', marginRight: 2 }}>Final SP =</span>
      {[
        { label: 'Position SP', weight: '×2.0', color: 'var(--mint)',       active: false },
        { label: 'Social SP',   weight: '×1.0', color: 'var(--tier-stock)', active: false },
        { label: 'Referral SP', weight: '×1.0', color: 'var(--amber)',      active: true  },
      ].map((p, i, arr) => (
        <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: p.active ? 'var(--amber-soft)' : 'rgba(255,255,255,0.04)', border: `1px solid ${p.active ? 'rgba(247,162,59,0.28)' : 'var(--border)'}`, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.color }}>
            ({p.label} <span style={{ opacity: 0.65 }}>{p.weight}</span>)
          </span>
          {i < arr.length - 1 && <span style={{ color: 'var(--text-mute)', fontSize: 11 }}>+</span>}
        </span>
      ))}
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Referral SP weighted at 1.0×
      </span>
    </div>
  );
}

// ── Commission Tier Card ──────────────────────────────────────────────────
function CommissionTierCard({ positionSp }: { positionSp: number }) {
  const currentIdx = getTierIdx(positionSp);
  const nextTier   = TIERS[currentIdx + 1];
  const nextMin    = nextTier?.min ?? 0;
  const progress   = nextMin > 0 ? Math.min((positionSp / nextMin) * 100, 100) : 100;
  const needed     = nextMin > 0 ? Math.max(0, nextMin - positionSp) : 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-title" style={{ margin: 0 }}>Commission Tier</div>
        <span className="badge amber" style={{ fontSize: 13, padding: '4px 12px' }}>{getRate(positionSp)}%</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {TIERS.map((tier, i) => {
          const isActive = i === currentIdx;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: isActive ? 'var(--amber-soft)' : 'transparent', border: `1px solid ${isActive ? 'rgba(247,162,59,0.25)' : 'transparent'}`, transition: 'all 0.15s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--amber)' : 'transparent', border: `2px solid ${isActive ? 'var(--amber)' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isActive && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--bg)' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: isActive ? 'var(--text)' : 'var(--text-dim)', fontWeight: isActive ? 600 : 400 }}>{tier.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-mute)', marginLeft: 6 }}>{tier.range}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {isActive && <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, background: 'rgba(247,162,59,0.15)', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>CURRENT</span>}
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-space)', color: isActive ? 'var(--amber)' : 'var(--text-mute)' }}>{tier.rate}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {nextTier && needed > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-mute)', marginBottom: 5 }}>
            <span>Progress to {nextTier.rate}% tier</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{positionSp.toLocaleString()} / {nextMin.toLocaleString()} SP</span>
          </div>
          <div className="progress" style={{ marginBottom: 7 }}>
            <span style={{ width: `${progress}%`, background: 'linear-gradient(90deg,rgba(247,162,59,0.65),var(--amber))', boxShadow: 'none' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
            Earn <span style={{ color: 'var(--amber)', fontWeight: 600 }}>+{needed.toLocaleString()} Position SP</span> to unlock {nextTier.rate}% commission
          </div>
        </>
      )}
      <Link href="/airdrop" className="btn ghost sm block" style={{ display: 'flex', justifyContent: 'center', marginTop: 12, gap: 5 }}>
        <Icon name="bolt" size={12} /> Earn more Position SP →
      </Link>
    </div>
  );
}

// ── Share Hub ─────────────────────────────────────────────────────────────
function ShareHub({ referralLink, referralCode, commissionRate }: {
  referralLink: string; referralCode: string; commissionRate: number;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    toast('Referral link copied!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink, toast]);

  const shareActions = [
    { label: 'Share on X', icon: 'twitter',  action: () => { const t = encodeURIComponent(`Trade RWA tokens on @ShiftRWA and earn SP. Join via my referral link:`); window.open(`https://twitter.com/intent/tweet?text=${t}&url=${encodeURIComponent(referralLink)}`, '_blank'); } },
    { label: 'Telegram',   icon: 'telegram', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join+SHIFT+Airdrop`, '_blank') },
    { label: 'WhatsApp',   icon: null,        action: () => window.open(`https://wa.me/?text=${encodeURIComponent('Join SHIFT Airdrop: ' + referralLink)}`, '_blank') },
    { label: 'Copy Link',  icon: 'copy',      action: handleCopy },
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 1 }}>Share Your Link</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Rate scales with each referred trader's Position SP tier</div>
        </div>
        {referralCode && (
          <div style={{ padding: '5px 10px', background: 'var(--mint-soft)', border: '1px solid rgba(38,200,184,0.2)', borderRadius: 7, textAlign: 'center', flexShrink: 0, marginLeft: 10 }}>
            <div style={{ fontSize: 8, color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>YOUR CODE</div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--mint)', marginTop: 1 }}>{referralCode}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input readOnly value={referralLink} className="input" style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }} />
        <button className={`btn ${copied ? 'mint' : 'ghost'} sm`} onClick={handleCopy} style={{ flexShrink: 0, gap: 5 }}>
          <Icon name={copied ? 'check' : 'copy'} size={12} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
        {shareActions.map(btn => (
          <button key={btn.label} className="btn ghost sm" onClick={btn.action}
            style={{ flexDirection: 'column', gap: 4, padding: '9px 6px', fontSize: 10 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(247,162,59,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.color = ''; }}>
            {btn.icon ? <Icon name={btn.icon} size={14} /> : <span>🟢</span>}
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Quality Gate ──────────────────────────────────────────────────────
function QualityGateCard({ inactiveCount }: { inactiveCount: number }) {
  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 12 }}>Activation Requirements</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { text: 'Referred wallet must hold ≥ $5 in SHIFT assets', ok: true  },
          { text: 'They must have an active open position',           ok: true  },
          { text: 'Commission applies to their Position SP only',     ok: true  },
          { text: 'Referral SP weighted at 1.0× in Final SP formula', ok: null  },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: r.ok === null ? 'var(--text-mute)' : 'var(--text-dim)' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: r.ok ? 'var(--green-soft)' : 'rgba(255,255,255,0.04)', border: `1px solid ${r.ok ? 'rgba(56,211,159,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.ok && <Icon name="check" size={8} color="var(--green)" />}
              {r.ok === null && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-mute)' }} />}
            </div>
            {r.text}
          </div>
        ))}
      </div>
      {inactiveCount > 0 && (
        <div style={{ marginTop: 12, padding: '9px 12px', background: 'var(--amber-soft)', border: '1px solid rgba(247,162,59,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--amber)' }}>
          {inactiveCount} referral{inactiveCount > 1 ? 's' : ''} haven't activated yet — nudge them to make a trade!
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function ReferralContent() {
  const { wallet, walletChain } = useWallet() as any;

  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState<ReferralStats | null>(null);
  const [myStats, setMyStats]           = useState<MyStats | null>(null);
  const [pending, setPending]           = useState<PendingBalance | null>(null);
  const [positionSp, setPositionSp]     = useState(0);
  const [commissionSp, setCommissionSp] = useState(0);
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    if (walletChain && walletChain !== 'solana') { setLoading(false); return; }

    const run = async () => {
      setLoading(true);
      try {
        const [refRes, userRes, dashRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/referral/${wallet}`),
          fetch(`${API_URL}/api/airdrop/user/${wallet}`),
          fetch(`${API_URL}/api/dashboard/${wallet}/referrals/stats`),
        ]);
        if (refRes.status === 'fulfilled' && refRes.value.ok) {
          const d = await refRes.value.json();
          // backend returns d.referrals (not d.stats)
          setStats(d.referrals ?? null);
          setCommissionSp(d.commission?.positionReferralSp ?? 0);
          setPending(d.legacy ?? null);
        }
        if (userRes.status === 'fulfilled' && userRes.value.ok) {
          const u = await userRes.value.json();
          setPositionSp(u.totalXp || 0);
          setReferralLink(u.referralLink || '');
          setReferralCode(u.referralCode || '');
        }
        if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
          const d = await dashRes.value.json();
          setMyStats(d.myStats ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load referral data');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [wallet, walletChain]);

  // ── No wallet ──
  if (!wallet) {
    return (
      <div className="page fade-in">
        <div style={{ minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px 56px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(247,162,59,0.08), transparent 70%)', pointerEvents: 'none' }} />
          <span className="badge amber" style={{ marginBottom: 20, padding: '5px 14px', fontSize: 11, display: 'inline-flex', gap: 6 }}>
            <span className="live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
            Referral Dashboard
          </span>
          <h2 style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-space)', marginBottom: 12 }}>
            Earn <span style={{ color: 'var(--amber)' }}>10–15%</span> commission SP
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 420, lineHeight: 1.65, marginBottom: 28 }}>
            Refer traders to SHIFT. Earn commission SP from their Position SP — tier-based, quality-gated, no farming.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Connect your Solana wallet above to see your referrals ↑</p>
        </div>
        <LeaderboardTabs />
      </div>
    );
  }

  if (walletChain && walletChain !== 'solana') {
    return (
      <div className="page fade-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <h2>⚠️ Please use a Solana Wallet</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>This dashboard is for Solana wallets only.</p>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 170, borderRadius: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="skeleton" style={{ height: 170, borderRadius: 14 }} />
            <div className="skeleton" style={{ height: 260, borderRadius: 14 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="skeleton" style={{ height: 230, borderRadius: 14 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          </div>
        </div>
      </div>
    );
  }

  const commRate       = getRate(positionSp);
  // prefer data from the new referrals table (holds >= $5 definition of active)
  const totalReferred  = stats?.total   ?? myStats?.totalReferred  ?? 0;
  const activeRefs     = stats?.active  ?? myStats?.activeReferrals ?? 0;
  const inactiveCount  = stats?.inactive ?? Math.max(0, totalReferred - activeRefs);
  // commission SP from the 10-15% engine (not old invite-XP)
  const commEarned     = commissionSp || myStats?.totalXpEarned || 0;

  return (
    <div className="page fade-in">

      {/* Back link */}
      <div style={{ marginBottom: 14 }}>
        <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, fontFamily: 'var(--font-space)', transition: 'color 0.15s' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}>
          <Icon name="chevronLeft" size={13} /> Back to Register
        </Link>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,var(--bg-2),var(--bg-3))', border: '1px solid rgba(247,162,59,0.22)', borderRadius: 20, padding: '28px 32px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '8%', top: '50%', width: 220, height: 220, background: 'radial-gradient(circle,rgba(247,162,59,0.09),transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Referral Dashboard</h1>
              <span className="badge amber">
                <span className="live-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} /> SEASON 1
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 480 }}>
              Earn commission SP from your referred traders' positions — quality-gated, tier-based
            </p>
          </div>
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            {referralCode && (
              <div style={{ padding: '7px 11px', background: 'var(--mint-soft)', border: '1px solid rgba(38,200,184,0.2)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>YOUR CODE</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--mint)', marginTop: 2 }}>{referralCode}</div>
              </div>
            )}
            <div style={{ padding: '7px 11px', background: 'var(--amber-soft)', border: '1px solid rgba(247,162,59,0.2)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>COMMISSION</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--amber)', marginTop: 2 }}>{commRate}%</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, position: 'relative' }}>
          {[
            { label: 'Total Referrals',   value: totalReferred.toString(),        color: 'var(--text)',     sub: 'users invited'             },
            { label: 'Active Traders',    value: activeRefs.toString(),            color: 'var(--green)',    sub: 'holding ≥ $5 SHIFT'        },
            { label: 'Commission Earned', value: `${commEarned.toLocaleString()} SP`, color: 'var(--amber)', sub: 'Ref SP (×1.0 weight)'      },
            { label: 'Pending Balance',   value: `${pending?.pending ?? 0} SP`,   color: 'var(--text-dim)', sub: 'awaiting activation'        },
          ].map(s => (
            <div key={s.label} className="stat" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula banner */}
      <FormulaBanner />

      {/* Error */}
      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={14} color="var(--red)" />
          <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
        </div>
      )}

      {/* Main 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {referralLink && (
            <ShareHub referralLink={referralLink} referralCode={referralCode} commissionRate={commRate} />
          )}
          {pending && pending.pending > 0 && <PendingBalanceCard pending={pending} />}
          <ReferredUsersTable wallet={wallet} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CommissionTierCard positionSp={positionSp} />
          <QualityGateCard inactiveCount={inactiveCount} />
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardTabs />
    </div>
  );
}
