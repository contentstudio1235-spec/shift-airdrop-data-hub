'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ShiftIdCard from '@/components/ShiftIdCard';
import ProgressBar from '@/components/ProgressBar';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { useToast } from '@/components/ToastContext';
import { fetchSnagTasks, fetchSnagPoints } from '@/lib/api';

// ── Task definitions (dynamic but template) ──
const TASK_TEMPLATES = [
  { id: 'x_follow', icon: '𝕏', label: 'Follow @ShiftRWA on X', pts: 100, cta: 'Follow', href: 'https://twitter.com/ShiftRWA' },
  { id: 'discord', icon: '💬', label: 'Join the SHIFT Discord', pts: 150, cta: 'Join', href: 'https://discord.gg/shiftrwa' },
  { id: 'telegram', icon: '✈️', label: 'Join SHIFT Telegram', pts: 100, cta: 'Join', href: 'https://t.me/shiftrwa' },
  { id: 'wallet', icon: '👛', label: 'Connect your wallet', pts: 200, cta: 'Connect' },
  { id: 'first_trade', icon: '⚡', label: 'Complete your first trade', pts: 300, cta: 'Trade', href: 'https://app.shiftrwa.xyz/coming-soon' },
];

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
}

interface ReferralBonusInfo {
  code: string;
  displayName: string | null;
  isKol: boolean;
  multiplierBonus: number;
  multiplierType: 'dynamic' | 'permanent' | 'none';
}

export default function RegisterPage() {
  const { wallet } = useWallet();
  const toast = useToast();
  const searchParams = useSearchParams();

  // Real-time state
  const [userData, setUserData] = useState<AirdropUser | null>(null);
  const [tasks, setTasks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Referral state
  const [refCode, setRefCode] = useState<string | null>(null);
  const [refBonus, setRefBonus] = useState<ReferralBonusInfo | null>(null);
  const [refLoading, setRefLoading] = useState(false);

  // ── Resolve referral code from URL on mount ──
  useEffect(() => {
    const code = searchParams?.get('ref');
    if (code) {
      setRefCode(code);
      resolveRefCode(code);
    }
  }, [searchParams]);

  // ── Resolve referral code via API ──
  const resolveRefCode = async (code: string) => {
    if (!code || code.length < 4) {
      setRefBonus(null);
      return;
    }

    try {
      setRefLoading(true);
      const res = await fetch(`/api/airdrop/ref/${code}`);
      if (!res.ok) {
        setRefBonus(null);
        return;
      }
      const data: ReferralBonusInfo = await res.json();
      setRefBonus(data);
    } catch (error) {
      console.error('[Register] Failed to resolve ref code:', error);
      setRefBonus(null);
    } finally {
      setRefLoading(false);
    }
  };

  // ── Fetch user airdrop data ──
  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        let res = await fetch(`/api/airdrop/user/${wallet}`);

        // If user doesn't exist, register them first
        if (res.status === 404) {
          const registerRes = await fetch('/api/airdrop/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet,
              refCode: refCode || undefined,
            }),
          });
          if (!registerRes.ok) throw new Error('Failed to register');
          // Continue to fetch user data
          res = await fetch(`/api/airdrop/user/${wallet}`);
        }

        if (!res.ok) throw new Error('Failed to fetch user data');
        const data: AirdropUser = await res.json();
        setUserData(data);

        // Auto-check wallet task
        setTasks((prev) => ({ ...prev, wallet: true }));

        // Fetch SNAG completed tasks
        const snagTaskIds = await fetchSnagTasks(wallet);
        if (snagTaskIds && snagTaskIds.length > 0) {
          const updates: Record<string, boolean> = {};
          for (const id of snagTaskIds) {
            if (TASK_TEMPLATES.find((t) => t.id === id)) {
              updates[id] = true;
            }
          }
          if (Object.keys(updates).length > 0) {
            setTasks((prev) => ({ ...prev, ...updates }));
          }
        }
      } catch (error) {
        console.error('[Register] Failed to fetch user data:', error);
        toast('Failed to load airdrop data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [wallet, refCode, toast]);

  // ── Calculate totals ──
  const totalPts = Object.entries(tasks)
    .filter(([, done]) => done)
    .reduce((sum, [id]) => {
      const task = TASK_TEMPLATES.find((t) => t.id === id);
      return sum + (task?.pts ?? 0);
    }, 0);

  // ── Progress to tier 2 ──
  const progressPct = userData ? Math.round((userData.queuePosition / userData.totalMembers) * 100) : 0;
  const placesToTier2 = userData ? Math.max(0, Math.round(userData.totalMembers * 0.05) - userData.queuePosition) : 0;

  // ── Handlers ──
  const handleTask = (taskId: string, href?: string) => {
    if (taskId === 'wallet') {
      setShowWalletModal(true);
      return;
    }
    if (href && href.startsWith('http')) {
      window.open(href, '_blank');
    }
    setTasks((prev) => ({ ...prev, [taskId]: true }));
    const task = TASK_TEMPLATES.find((t) => t.id === taskId);
    if (task) toast(`+${task.pts} PTS — Task completed!`);
  };

  const handleCopy = () => {
    if (!userData) return;
    navigator.clipboard.writeText(userData.referralLink);
    toast('Referral link copied!');
  };

  const handleShareX = () => {
    if (!userData) return;
    const text = encodeURIComponent(
      `I just joined the @ShiftRWA airdrop — queue position #${userData.queuePosition}! 🚀\n\nTrade RWA tokens on Solana and earn XP. Join via my link:`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(userData.referralLink)}`,
      '_blank'
    );
  };

  // ── Render ──
  if (!wallet) {
    return (
      <div className="page fade-in" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <p style={{ fontSize: 16, color: 'var(--text-mute)', marginBottom: 24 }}>
          Connect your Solana wallet to join the SHIFT airdrop
        </p>
      </div>
    );
  }

  if (loading || !userData) {
    return (
      <div className="page fade-in" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <p style={{ fontSize: 14, color: 'var(--text-mute)' }}>Loading your airdrop data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Referral Bonus Banner */}
        {refBonus && refBonus.multiplierType !== 'none' && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>
              ✨ SPECIAL INVITE
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {refBonus.displayName || 'A KOL'} invited you!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginBottom: 8 }}>
              Get a {Math.round((refBonus.multiplierBonus - 1) * 100)}% bonus multiplier on {refBonus.multiplierType === 'permanent' ? 'all' : 'new'} XP
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
              Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{refBonus.code}</span>
            </div>
          </div>
        )}

        {/* Queue Hero */}
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px 32px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Your queue position
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              fontFamily: 'var(--font-space)',
              color: 'var(--mint)',
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            #{userData.queuePosition.toLocaleString()}
          </div>
          <span className="badge mint" style={{ fontSize: 11, marginBottom: 16 }}>
            ✦ FOUNDING MEMBER
          </span>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--text)', marginTop: 12 }}>
            {totalPts.toLocaleString()} PTS earned
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>
            Out of {userData.totalMembers.toLocaleString()} registered members
          </div>

          {/* Multiplier indicators */}
          {(userData.permanentMultiplier > 1 || userData.dynamicMultiplier > 1) && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12 }}>
                {userData.permanentMultiplier > 1 && (
                  <div>
                    <div style={{ color: 'var(--text-mute)' }}>Permanent</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mint)' }}>{userData.permanentMultiplier.toFixed(2)}x</div>
                  </div>
                )}
                {userData.dynamicMultiplier > 1 && (
                  <div>
                    <div style={{ color: 'var(--text-mute)' }}>Dynamic</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cyan)' }}>{userData.dynamicMultiplier.toFixed(2)}x</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SHIFT ID Card */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <ShiftIdCard
            handle={userData.wallet.slice(0, 6).toUpperCase()}
            ticker="SHIFT"
            rank={userData.queuePosition}
            points={totalPts}
            status="FOUNDING MEMBER"
          />
        </div>

        {/* Copy ID */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <button className="btn ghost sm" onClick={handleCopy}>
            <Icon name="copy" size={13} />
            Copy ID
          </button>
          <button className="btn ghost sm" onClick={handleShareX}>
            <Icon name="twitter" size={13} />
            Share on X
          </button>
        </div>

        {/* Progress milestone */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(90deg, rgba(38,200,184,0.06), rgba(7,99,140,0.04))',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-space)' }}>
                {placesToTier2.toLocaleString()} places to Tier 2
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
                Refer friends to move up the queue
              </div>
            </div>
            <span className="badge blue">Tier 1</span>
          </div>
          <ProgressBar value={progressPct} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>#{userData.queuePosition}</span>
            <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{progressPct}%</span>
          </div>
        </div>

        {/* Referral section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Refer to Move Up</div>

          {/* Referral link */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              readOnly
              value={userData.referralLink}
              className="input"
              style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }}
            />
            <button className="btn ghost" onClick={handleCopy} style={{ flexShrink: 0 }}>
              <Icon name="copy" size={13} />
            </button>
          </div>

          {/* Share buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            <button className="btn ghost sm" onClick={handleShareX}>
              <Icon name="twitter" size={13} />
              Share on X
            </button>
            <button
              className="btn ghost sm"
              onClick={() =>
                window.open(`https://t.me/share/url?url=${encodeURIComponent(userData.referralLink)}&text=Join+SHIFT+Airdrop`, '_blank')
              }
            >
              <Icon name="telegram" size={13} />
              Telegram
            </button>
            <button
              className="btn ghost sm"
              onClick={() =>
                window.open(`https://wa.me/?text=${encodeURIComponent('Join SHIFT Airdrop: ' + userData.referralLink)}`, '_blank')
              }
            >
              <span style={{ fontSize: 13 }}>🟢</span>
              WhatsApp
            </button>
            <button className="btn ghost sm" onClick={handleCopy}>
              <Icon name="copy" size={13} />
              Copy Link
            </button>
          </div>

          {/* Referral list */}
          <div className="section-title" style={{ marginBottom: 10 }}>
            Your Referrals (0)
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', padding: '16px', textAlign: 'center', background: 'var(--panel)', borderRadius: 8 }}>
            Refer friends to earn bonus XP and climb the queue
          </div>
        </div>

        {/* Tasks Ladder */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Complete Tasks to Earn PTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TASK_TEMPLATES.map((task) => {
              const done = tasks[task.id] ?? false;
              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--panel)',
                    border: `1px solid ${done ? 'rgba(38,200,184,0.2)' : 'var(--border)'}`,
                    borderRadius: 10,
                    opacity: done ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{task.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-space)' }}>{task.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 700 }}>+{task.pts} PTS</div>
                  </div>
                  {done ? (
                    <span className="badge mint sm" style={{ fontSize: 11 }}>Done ✓</span>
                  ) : task.href && !task.href.startsWith('http') ? (
                    <Link href={task.href} className="btn sm primary" onClick={() => setTasks((p) => ({ ...p, [task.id]: true }))}>
                      {task.cta}
                    </Link>
                  ) : (
                    <button
                      className="btn sm primary"
                      onClick={() => handleTask(task.id, task.href)}
                    >
                      {task.cta}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
          <Link href="/airdrop" className="btn primary lg">
            View Your Airdrop Dashboard →
          </Link>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 10 }}>
            {userData.totalMembers.toLocaleString()} members registered
          </div>
        </div>
      </div>

      {/* Wallet modal (if needed) */}
      {showWalletModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowWalletModal(false)}
        >
          <div className="modal fade-in">
            <button className="modal-close" onClick={() => setShowWalletModal(false)}>
              <Icon name="x" size={16} />
            </button>
            <h2 className="modal-title">Connect Wallet</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.5 }}>
              Connect to track your XP, positions, and badge progress.
            </p>
            <Link href="/airdrop" className="btn primary block lg" onClick={() => setShowWalletModal(false)}>
              Go to Airdrop Page →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
