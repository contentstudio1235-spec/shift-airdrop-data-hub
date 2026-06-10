'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ShiftIdCard from '@/components/ShiftIdCard';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { useToast } from '@/components/ToastContext';

// ── API ───────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
const dashboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────
interface AirdropUser {
  wallet: string;
  queuePosition: number;
  totalMembers: number;
  totalXp: number;
  loyaltyPoints: number;
  permanentMultiplier: number;
  dynamicMultiplier: number;
  referralLink: string;
  referralCode: string;
  registeredAt: string;
  rank?: number;
}

interface ReferralBonusInfo {
  code: string;
  displayName: string | null;
  isKol: boolean;
  multiplierBonus: number;
  multiplierType: 'dynamic' | 'permanent' | 'none';
}

// ── Feature card data ─────────────────────────────────────────────────────
const FEATURES = [
  { id: 'airdrop',     title: 'Airdrop',    icon: 'bolt',    desc: 'SP breakdown, positions, badges',              href: '/airdrop',     color: '#26C8B8', bg: 'rgba(38,200,184,0.07)',   border: 'rgba(38,200,184,0.18)'   },
  { id: 'leaderboard', title: 'Leaderboard',icon: 'trophy',  desc: 'Compete for the biggest allocation',           href: '/leaderboard', color: '#f7a23b', bg: 'rgba(247,162,59,0.07)',  border: 'rgba(247,162,59,0.18)'  },
  { id: 'loyalty',     title: 'SNAG Quests',icon: 'badge',   desc: 'Complete quests for bonus Social SP',          href: '/loyalty',     color: '#9d6cf5', bg: 'rgba(157,108,245,0.07)', border: 'rgba(157,108,245,0.18)' },
  { id: 'referral',    title: 'Referrals',  icon: 'refer',   desc: 'Commission tiers, referred traders, rank',     href: '/referral',    color: '#f7a23b', bg: 'rgba(247,162,59,0.07)',  border: 'rgba(247,162,59,0.18)'  },
];

// ── Sub-components ────────────────────────────────────────────────────────
function FeatureCard({ f }: { f: typeof FEATURES[0] }) {
  return (
    <Link href={f.href} style={{ display: 'block', background: f.bg, border: `1px solid ${f.border}`, borderRadius: 14, padding: '18px 16px 16px', textDecoration: 'none', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.borderColor = f.color; el.style.boxShadow = `0 12px 32px ${f.color}1A`; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.borderColor = f.border; el.style.boxShadow = ''; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${f.color}, transparent 70%)` }} />
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${f.color}1A`, border: `1px solid ${f.color}2E`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon name={f.icon} size={14} color={f.color} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-space)', marginBottom: 4 }}>{f.title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.5, marginBottom: 10 }}>{f.desc}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: f.color }}>
        Open <Icon name="chevronRight" size={11} color={f.color} />
      </div>
    </Link>
  );
}

function PointsBreakdown({ positionSp, socialSp, referralSp, finalSp }: {
  positionSp: number; socialSp: number; referralSp: number; finalSp: number;
}) {
  const rows = [
    { label: 'Position SP', raw: positionSp, mult: '×2.0', weighted: Math.round(positionSp * 2),     color: 'var(--mint)',       sub: 'Trading · holds · badges'     },
    { label: 'Social SP',   raw: socialSp,   mult: '×1.0', weighted: socialSp,                        color: 'var(--tier-stock)', sub: 'SNAG quests · community'       },
    { label: 'Referral SP', raw: referralSp, mult: '×1.0', weighted: Math.round(referralSp * 1.0),   color: 'var(--amber)',      sub: 'Commission from referrals'     },
  ];
  const maxW = Math.max(...rows.map(r => r.weighted), 1);
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 1 }}>Points Breakdown</div>
          <div style={{ fontSize: 10, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>(Pos×2) + (Social×1) + (Ref×1)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Final SP</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)' }}>{finalSp.toLocaleString()}</div>
        </div>
      </div>
      <div className="hr" style={{ margin: '12px 0' }} />
      {rows.map(r => (
        <div key={r.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{r.raw.toLocaleString()} {r.mult}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-space)', color: r.color }}>{r.weighted.toLocaleString()}</span>
          </div>
          <div className="progress">
            <span style={{ width: `${(r.weighted / maxW) * 100}%`, background: r.color, boxShadow: 'none' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{r.sub}</div>
        </div>
      ))}
      <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Final SP Total</span>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)' }}>{finalSp.toLocaleString()}</span>
      </div>
      <Link href="/referral" className="btn amber sm block" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        <Icon name="refer" size={12} /> View Referral Dashboard →
      </Link>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function RegisterContent() {
  const { wallet } = useWallet();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [userData, setUserData]       = useState<AirdropUser | null>(null);
  const [loading, setLoading]         = useState(true);
  const [referralXpEarned, setRefXp]  = useState(0);
  const [refCode, setRefCode]         = useState<string | null>(null);
  const [refBonus, setRefBonus]       = useState<ReferralBonusInfo | null>(null);
  const [refLoading, setRefLoading]   = useState(false);
  const [launchBonus, setLaunchBonus] = useState<{
    active: boolean; multiplier: number; daysRemaining: number; label: string;
  } | null>(null);

  // Launch bonus
  useEffect(() => {
    const start = new Date(process.env.NEXT_PUBLIC_LAUNCH_START_DATE || '2026-05-25T00:00:00Z');
    const days  = Math.floor((Date.now() - start.getTime()) / 86400000);
    if      (days < 7)  setLaunchBonus({ active: true,  multiplier: 3.0, daysRemaining: 7  - days, label: '🚀 LAUNCH WEEK'   });
    else if (days < 14) setLaunchBonus({ active: true,  multiplier: 2.0, daysRemaining: 14 - days, label: '🔥 MOMENTUM WEEK' });
    else                setLaunchBonus({ active: false, multiplier: 1.0, daysRemaining: 0,          label: '⭐ STEADY STATE'  });
  }, []);

  // Referral code from URL
  const resolveRefCode = useCallback(async (code: string) => {
    const norm = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(norm)) return;
    try {
      setRefLoading(true);
      const res = await fetch(`${API_URL}/api/airdrop/ref/${encodeURIComponent(norm)}`);
      if (res.ok) setRefBonus(await res.json());
    } catch { /* non-critical */ }
    finally { setRefLoading(false); }
  }, []);

  useEffect(() => {
    const code = searchParams?.get('ref');
    if (code) { setRefCode(code); resolveRefCode(code); }
  }, [searchParams, resolveRefCode]);

  // User data + non-blocking rank + referral xp
  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    const run = async () => {
      try {
        setLoading(true);
        let res = await fetch(`${API_URL}/api/airdrop/user/${wallet}`);
        if (res.status === 404) {
          const reg = await fetch(`${API_URL}/api/airdrop/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet, refCode: refCode || undefined }),
          });
          if (!reg.ok) throw new Error('Failed to register');
          res = await fetch(`${API_URL}/api/airdrop/user/${wallet}`);
        }
        if (!res.ok) throw new Error('Failed to fetch user data');
        const data: AirdropUser = await res.json();
        setUserData({ ...data, rank: data.queuePosition });

        // Non-blocking: rank from dashboard
        (async () => {
          try {
            const cached = dashboardCache.get(wallet);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
              setUserData(p => p ? { ...p, rank: cached.data.rank } : null); return;
            }
            const d = await fetch(`${API_URL}/api/dashboard/${wallet}`);
            if (!d.ok) return;
            const dd = await d.json();
            dashboardCache.set(wallet, { data: dd, timestamp: Date.now() });
            setUserData(p => p ? { ...p, rank: dd.rank } : null);
          } catch { /* fallback to queue position */ }
        })();

        // Non-blocking: referral xp for breakdown
        (async () => {
          try {
            const r = await fetch(`${API_URL}/api/dashboard/${wallet}/referrals/stats`);
            if (r.ok) { const d = await r.json(); setRefXp(d?.myStats?.totalXpEarned || 0); }
          } catch { /* optional */ }
        })();
      } catch {
        toast('Failed to load airdrop data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [wallet, refCode, toast]);

  const handleCopy = useCallback(() => {
    if (!userData) return;
    navigator.clipboard.writeText(userData.referralLink);
    toast('Referral link copied!');
  }, [userData, toast]);

  const handleShareX = useCallback(() => {
    if (!userData) return;
    const t = encodeURIComponent(`I just joined the @ShiftRWA airdrop — queue #${userData.queuePosition}! 🚀\nTrade RWA tokens on Solana, earn SP:`);
    window.open(`https://twitter.com/intent/tweet?text=${t}&url=${encodeURIComponent(userData.referralLink)}`, '_blank');
  }, [userData]);

  // Computed
  const positionSp    = userData?.totalXp        ?? 0;
  const socialSp      = userData?.loyaltyPoints   ?? 0;
  const referralSp    = referralXpEarned;
  const finalSp       = Math.round(positionSp * 2 + socialSp + referralSp * 1.0);
  const claimMult     = (userData?.permanentMultiplier ?? 1) * (userData?.dynamicMultiplier ?? 1);
  const commRate      = positionSp >= 10000 ? 15 : positionSp >= 1000 ? 12 : positionSp > 0 ? 10 : 0;
  const rank          = userData?.rank ?? userData?.queuePosition ?? 0;
  const steps = [
    { label: 'Connect wallet',        done: true,              href: null,                         ext: false },
    { label: 'Register for airdrop',  done: true,              href: null,                         ext: false },
    { label: 'Make your first trade', done: positionSp > 0,    href: 'https://app.shiftrwa.xyz',   ext: true  },
    { label: 'Complete a SNAG quest', done: socialSp > 0,      href: '/loyalty',                  ext: false },
    { label: 'Refer a friend',        done: referralSp > 0,    href: '/referral',                 ext: false },
    { label: 'Reach 50,000 Final SP', done: finalSp >= 50000,  href: '/airdrop',                  ext: false },
  ];
  const stepsDone = steps.filter(s => s.done).length;

  // ── No wallet ─────────────────────────────────────────────────────────
  if (!wallet) {
    return (
      <div className="fade-in">
        <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px 56px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(38,200,184,0.08), transparent 70%)', pointerEvents: 'none' }} />
          {launchBonus?.active && (
            <div className="badge mint" style={{ marginBottom: 20, padding: '5px 14px', fontSize: 11, display: 'inline-flex', gap: 7 }}>
              <span className="live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
              {launchBonus.label} · {launchBonus.multiplier.toFixed(1)}× · {launchBonus.daysRemaining}d left
            </div>
          )}
          <h1 style={{ fontSize: 52, fontWeight: 700, fontFamily: 'var(--font-space)', lineHeight: 1.08, marginBottom: 18, maxWidth: 620 }}>
            Trade RWA. <span className="gradient-text">Earn Points.</span> Win SHIFT.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-dim)', maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            Join thousands of traders competing for the SHIFT airdrop. Hold tokens on Jupiter, earn weighted Shift Points, climb the queue.
          </p>
          <div style={{ display: 'flex', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 40 }}>
            {[{ val: '2,847+', label: 'Registered', color: 'var(--mint)' }, { val: '1×', label: 'Base Multiplier', color: 'var(--mint)' }].map((s, i, a) => (
              <div key={i} style={{ padding: '16px 28px', borderRight: i < a.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-space)', color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Connect your Solana wallet above to register ↑</p>
        </div>

        <div className="page" style={{ paddingTop: 0 }}>
          <div className="section-title" style={{ textAlign: 'center', marginBottom: 20 }}>Everything you need to earn</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 48 }}>
            {FEATURES.map(f => <FeatureCard key={f.id} f={f} />)}
          </div>
          <div className="section-title" style={{ textAlign: 'center', marginBottom: 20 }}>Three steps to earn</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {[
              { n: '01', title: 'Connect & Register', desc: 'Link your Solana wallet to lock in your Founding Member status and queue position.',                            color: 'var(--mint)'   },
              { n: '02', title: 'Trade & Hold',        desc: 'Buy SHIFT tokens on Jupiter. Position SP is weighted ×2 — the biggest driver of your Final SP.',              color: 'var(--amber)'  },
              { n: '03', title: 'Refer & Complete',    desc: 'Share your link and finish SNAG quests. Earn Social SP (×1) and Referral SP (×1.0 quality-gated).',           color: 'var(--purple)' },
            ].map(s => (
              <div key={s.n} className="card card-hover" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -8, right: 14, fontSize: 56, fontWeight: 800, fontFamily: 'var(--font-space)', color: s.color, opacity: 0.06, lineHeight: 1, userSelect: 'none' }}>{s.n}</div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}1A`, border: `1px solid ${s.color}2E`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)', color: s.color }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-space)', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (loading || !userData) {
    return (
      <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 180, borderRadius: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18 }}>
          <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  // ── Registered ────────────────────────────────────────────────────
  return (
    <div className="page fade-in">

      {/* Banners */}
      {launchBonus?.active && (
        <div style={{ background: 'linear-gradient(135deg,rgba(38,200,184,0.1),rgba(38,200,184,0.03))', border: '1px solid rgba(38,200,184,0.28)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mint)', fontFamily: 'var(--font-space)' }}>{launchBonus.label} ACTIVE</span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Earn {launchBonus.multiplier.toFixed(1)}× more SP — {launchBonus.daysRemaining} days remaining</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)', flexShrink: 0 }}>{launchBonus.multiplier.toFixed(1)}×</span>
        </div>
      )}
      {refBonus && refBonus.multiplierType !== 'none' && (
        <div style={{ background: 'linear-gradient(135deg,rgba(56,211,159,0.08),transparent)', border: '1px solid rgba(56,211,159,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 700, fontFamily: 'var(--font-space)' }}>✨ SPECIAL INVITE</span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{refBonus.displayName || 'A KOL'} invited you · +{Math.round((refBonus.multiplierBonus - 1) * 100)}% {refBonus.multiplierType} multiplier</span>
        </div>
      )}

      {/* Queue Hero */}
      <div style={{ background: 'linear-gradient(135deg,var(--bg-2),var(--bg-3))', border: '1px solid rgba(38,200,184,0.22)', borderRadius: 20, padding: '28px 32px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '22%', top: '50%', width: 260, height: 260, background: 'radial-gradient(circle,rgba(38,200,184,0.1),transparent 70%)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1px 1fr 1px auto', gap: '0 28px', alignItems: 'center', position: 'relative' }}>

          {/* Position */}
          <div>
            <div className="section-title" style={{ marginBottom: 6 }}>Queue Position</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontSize: 18, color: 'rgba(38,200,184,0.55)', fontFamily: 'var(--font-space)', fontWeight: 700, marginTop: 8 }}>#</span>
              <span style={{ fontSize: 70, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)', lineHeight: 0.95, letterSpacing: -2 }}>
                {userData.queuePosition.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="badge mint">✦ FOUNDING MEMBER</span>
              <span className="badge green">● SEASON 1</span>
            </div>
          </div>

          <div style={{ background: 'var(--border)', height: 100, width: 1, flexShrink: 0 }} />

          {/* Final SP */}
          <div>
            <div className="section-title" style={{ marginBottom: 6 }}>Final SP (Weighted)</div>
            <div style={{ fontSize: 42, fontWeight: 700, fontFamily: 'var(--font-space)', lineHeight: 1, letterSpacing: -1, marginBottom: 6 }}>
              {finalSp.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 10 }}>{userData.totalMembers.toLocaleString()} total members</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ textAlign: 'center', padding: '6px 12px', background: 'var(--amber-soft)', border: '1px solid rgba(247,162,59,0.2)', borderRadius: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--amber)' }}>{claimMult.toFixed(2)}x</div>
                <div style={{ fontSize: 9, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>Mult</div>
              </div>
              {rank > 0 && (
                <div style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(93,164,255,0.08)', border: '1px solid rgba(93,164,255,0.18)', borderRadius: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-space)', color: '#5da4ff' }}>#{rank.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>Rank</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--border)', height: 100, width: 1, flexShrink: 0 }} />

          {/* Quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 176 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>Quick Actions</div>
            <button className="btn primary sm" onClick={handleCopy} style={{ justifyContent: 'flex-start' }}>
              <Icon name="share" size={12} /> Share Referral Link
            </button>
            <Link href="/airdrop" className="btn ghost sm" style={{ justifyContent: 'flex-start' }}>
              <Icon name="bolt" size={12} /> View Dashboard
            </Link>
            <Link href="/leaderboard" className="btn ghost sm" style={{ justifyContent: 'flex-start' }}>
              <Icon name="trophy" size={12} /> Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Position SP',      value: positionSp.toLocaleString(), color: 'var(--mint)',       sub: 'Weighted ×2.0 driver' },
          { label: 'Social SP',        value: socialSp.toLocaleString(),   color: 'var(--tier-stock)', sub: 'SNAG · weighted ×1.0'  },
          { label: 'Claim Multiplier', value: `${claimMult.toFixed(2)}x`,  color: 'var(--amber)',      sub: 'Applied at TGE'        },
          { label: 'Leaderboard Rank', value: rank > 0 ? `#${rank.toLocaleString()}` : '—', color: 'var(--text)', sub: `of ${userData.totalMembers.toLocaleString()} members` },
        ].map(s => (
          <div key={s.label} className="stat card-hover">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18, marginBottom: 14 }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ShiftIdCard
              handle={userData.wallet.slice(0, 8).toUpperCase()}
              ticker="SHIFT"
              rank={rank || userData.queuePosition}
              points={finalSp}
              status="FOUNDING MEMBER"
            />
          </div>
          <PointsBreakdown positionSp={positionSp} socialSp={socialSp} referralSp={referralSp} finalSp={finalSp} />
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Referral teaser — full dashboard lives at /referral */}
          <div className="card" style={{ background: 'linear-gradient(135deg,rgba(247,162,59,0.06),rgba(247,162,59,0.02))', border: '1px solid rgba(247,162,59,0.2)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,var(--amber),transparent 70%)', borderRadius: '14px 14px 0 0' }} />

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div className="section-title" style={{ marginBottom: 1 }}>Referral Program</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Earn commission SP from traders you refer</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                {commRate > 0 && (
                  <div style={{ padding: '5px 9px', background: 'var(--amber-soft)', border: '1px solid rgba(247,162,59,0.25)', borderRadius: 7, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>COMMISSION</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--amber)', marginTop: 1 }}>{commRate}%</div>
                  </div>
                )}
                <div style={{ padding: '5px 9px', background: 'var(--mint-soft)', border: '1px solid rgba(38,200,184,0.2)', borderRadius: 7, textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: 'var(--mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>YOUR CODE</div>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--mint)', marginTop: 1 }}>{userData.referralCode}</div>
                </div>
              </div>
            </div>

            {/* SP earned from referrals */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Referral SP Earned</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--amber)' }}>{referralSp > 0 ? referralSp.toLocaleString() : '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>weighted ×1.0 in Final SP</div>
              </div>
              <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Your Tier</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-space)', color: commRate > 0 ? 'var(--amber)' : 'var(--text-mute)' }}>
                  {commRate > 0 ? `${commRate}%` : 'None'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>
                  {commRate === 15 ? 'Elite · > 10k SP' : commRate === 12 ? 'Trader · 1k–10k SP' : commRate === 10 ? 'Starter · < 1k SP' : 'Hold SHIFT to unlock'}
                </div>
              </div>
            </div>

            {/* Quick copy + CTA */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input readOnly value={userData.referralLink} className="input" style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }} />
              <button className="btn ghost" onClick={handleCopy} style={{ flexShrink: 0 }}>
                <Icon name="copy" size={13} />
              </button>
            </div>

            <Link href="/referral" className="btn amber block" style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '11px' }}>
              <Icon name="refer" size={14} />
              Open Referral Dashboard →
            </Link>
          </div>

          {/* Next steps */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="section-title" style={{ margin: 0 }}>Your Journey</div>
              <span style={{ fontSize: 11, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>{stepsDone}/{steps.length}</span>
            </div>
            <div className="progress" style={{ marginBottom: 12 }}>
              <span style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
            </div>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: s.done ? 'rgba(38,200,184,0.05)' : 'transparent', border: `1px solid ${s.done ? 'rgba(38,200,184,0.12)' : 'transparent'}`, marginBottom: 4 }}>
                <div style={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, background: s.done ? 'var(--mint)' : 'transparent', border: `2px solid ${s.done ? 'var(--mint)' : 'rgba(255,255,255,0.14)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.done && <Icon name="check" size={9} color="var(--bg)" />}
                </div>
                <span style={{ flex: 1, fontSize: 12, color: s.done ? 'var(--text-mute)' : 'var(--text)', fontWeight: s.done ? 400 : 500, textDecoration: s.done ? 'line-through' : 'none', textDecorationColor: 'var(--text-mute)' }}>
                  {s.label}
                </span>
                {!s.done && s.href && (
                  <Link href={s.href} target={s.ext ? '_blank' : undefined} style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 600, fontFamily: 'var(--font-space)', whiteSpace: 'nowrap' }}>
                    Go →
                  </Link>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Feature nav */}
      <div className="section-title" style={{ marginBottom: 12 }}>Explore the Platform</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
        {FEATURES.map(f => <FeatureCard key={f.id} f={f} />)}
      </div>
    </div>
  );
}
