'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ShiftIdCard from '@/components/ShiftIdCard';
import ProgressBar from '@/components/ProgressBar';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { useToast } from '@/components/ToastContext';
import { fetchSnagTasks } from '@/lib/api';

// ── API Configuration ──
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

// ── Task definitions ──
// social: true → verified via OAuth popup (not just a click-through)
const TASK_TEMPLATES = [
  { id: 'x_follow',    icon: '𝕏',  label: 'Follow @ShiftRWA on X',   pts: 100, cta: 'Follow', social: true  },
  { id: 'discord',     icon: '💬', label: 'Join the SHIFT Discord',   pts: 150, cta: 'Join',   social: true  },
  { id: 'telegram',    icon: '✈️', label: 'Join SHIFT Telegram',      pts: 100, cta: 'Join',   social: true  },
  { id: 'wallet',      icon: '👛', label: 'Connect your wallet',      pts: 200, cta: 'Connect',social: false },
  { id: 'first_trade', icon: '⚡', label: 'Complete your first trade', pts: 300, cta: 'Trade',  social: false,
    href: 'https://app.shiftrwa.xyz/coming-soon' },
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

export default function RegisterContent() {
  const { wallet } = useWallet();
  const toast = useToast();
  const searchParams = useSearchParams();

  // Real-time state
  const [userData, setUserData] = useState<AirdropUser | null>(null);
  const [tasks, setTasks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [launchBonus, setLaunchBonus] = useState<{
    active: boolean;
    multiplier: number;
    daysRemaining: number;
    label: string;
  } | null>(null);

  // Social verification state: which task is currently verifying
  const [verifying, setVerifying] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Referral state
  const [refCode, setRefCode] = useState<string | null>(null);
  const [refBonus, setRefBonus] = useState<ReferralBonusInfo | null>(null);
  const [refLoading, setRefLoading] = useState(false);

  // ── Calculate launch bonus on mount ──
  useEffect(() => {
    const launchStartStr = process.env.NEXT_PUBLIC_LAUNCH_START_DATE || '2026-05-25T00:00:00Z';
    const launchStart = new Date(launchStartStr);
    const now = new Date();
    const diffMs = now.getTime() - launchStart.getTime();
    const daysIntoLaunch = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysIntoLaunch < 7) {
      setLaunchBonus({ active: true, multiplier: 3.0, daysRemaining: 7 - daysIntoLaunch, label: '🚀 LAUNCH WEEK' });
    } else if (daysIntoLaunch < 14) {
      setLaunchBonus({ active: true, multiplier: 2.0, daysRemaining: 14 - daysIntoLaunch, label: '🔥 MOMENTUM WEEK' });
    } else {
      setLaunchBonus({ active: false, multiplier: 1.0, daysRemaining: 0, label: '⭐ STEADY STATE' });
    }
  }, []);

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
      const res = await fetch(`${API_URL}/api/airdrop/ref/${code}`);
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
        let res = await fetch(`${API_URL}/api/airdrop/user/${wallet}`);

        // If user doesn't exist, register them first
        if (res.status === 404) {
          const registerRes = await fetch(`${API_URL}/api/airdrop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet,
              refCode: refCode || undefined,
            }),
          });
          if (!registerRes.ok) throw new Error('Failed to register');
          // Continue to fetch user data
          res = await fetch(`${API_URL}/api/airdrop/user/${wallet}`);
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

  // ── Poll backend to confirm task completion ──
  const pollTaskStatus = useCallback(
    (taskId: string) => {
      if (!wallet) return;
      let attempts = 0;
      const maxAttempts = 20; // poll for up to ~20s

      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(
            `${API_URL}/api/auth/status?wallet=${wallet}&task=${taskId}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.completed) {
              clearInterval(pollRef.current!);
              setVerifying(null);
              setTasks((prev) => ({ ...prev, [taskId]: true }));
              const task = TASK_TEMPLATES.find((t) => t.id === taskId);
              if (task) toast(`+${task.pts} PTS — Task verified!`);
            }
          }
        } catch {
          // silent — keep polling
        }
        if (attempts >= maxAttempts) {
          clearInterval(pollRef.current!);
          setVerifying(null);
        }
      }, 1000);
    },
    [wallet, toast]
  );

  // ── Listen for OAuth popup postMessage ──
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, status, task } = event.data ?? {};
      if (type !== 'SHIFT_SOCIAL_VERIFY') return;

      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }

      if (status === 'success') {
        // Backend confirmed — start polling to pick up DB write
        pollTaskStatus(task);
      } else if (status === 'not_member') {
        setVerifying(null);
        toast('You need to join first, then verify again.');
      } else {
        setVerifying(null);
        toast('Verification failed — please try again.');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [pollTaskStatus, toast]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Handlers ──
  const handleTask = (taskId: string) => {
    if (taskId === 'wallet') {
      setShowWalletModal(true);
      return;
    }

    const taskDef = TASK_TEMPLATES.find((t) => t.id === taskId);

    // Non-social tasks — simple navigation
    if (!taskDef?.social) {
      if (taskDef?.href) window.open(taskDef.href, '_blank');
      return;
    }

    // Social tasks — OAuth popup
    if (!wallet) return;
    if (verifying === taskId) return; // already in progress

    // Map task ID to the backend auth endpoint
    const authPath: Record<string, string> = {
      x_follow: 'twitter',
      discord:  'discord',
    };
    const endpoint = authPath[taskId];

    if (endpoint) {
      // Discord / Twitter — OAuth redirect popup
      const popupUrl = `${API_URL}/api/auth/${endpoint}?wallet=${wallet}`;
      const popup = window.open(
        popupUrl,
        'shift_social_verify',
        'width=520,height=640,menubar=no,toolbar=no,location=no,status=no'
      );
      if (!popup) {
        toast('Allow pop-ups in your browser for social verification.');
        return;
      }
      popupRef.current = popup;
      setVerifying(taskId);

      // Fallback: if popup closes without postMessage, stop spinner
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setVerifying((v) => (v === taskId ? null : v));
        }
      }, 800);
    } else if (taskId === 'telegram') {
      // Telegram uses the Login Widget — open instructions modal
      // The Telegram widget will call our API directly
      toast('Use the Telegram button below to verify your membership.');
    }
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
        {launchBonus && launchBonus.active && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--mint)' }}>
              {launchBonus.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Get <span style={{ color: 'var(--mint)', fontSize: 18 }}>{launchBonus.multiplier.toFixed(1)}x</span> XP for {launchBonus.daysRemaining} more days
            </div>
          </div>
        )}
        <p style={{ fontSize: 16, color: 'var(--text-mute)', marginBottom: 24, lineHeight: 1.5 }}>
          Connect your Solana wallet to start earning XP and move up the queue for the SHIFT airdrop.
          <br />
          <span style={{ fontSize: 14, display: 'block', marginTop: 8, color: 'var(--mint)', fontWeight: 600 }}>
            Limited-time bonus multipliers active →
          </span>
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
        {/* Launch Bonus Banner */}
        {launchBonus && launchBonus.active && (
          <div
            style={{
              background: launchBonus.multiplier >= 2
                ? 'linear-gradient(135deg, rgba(38,200,184,0.15), rgba(34,197,94,0.1))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(251,146,60,0.08))',
              border: `1px solid ${launchBonus.multiplier >= 2 ? 'rgba(38,200,184,0.4)' : 'rgba(251,146,60,0.3)'}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, color: launchBonus.multiplier >= 2 ? 'var(--mint)' : '#FB923C', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
              {launchBonus.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: launchBonus.multiplier >= 2 ? 'var(--mint)' : '#FB923C' }}>
              {launchBonus.multiplier.toFixed(1)}x XP Bonus Active
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {launchBonus.daysRemaining} days remaining — move up the queue faster!
            </div>
          </div>
        )}

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
              const done        = tasks[task.id] ?? false;
              const isPending   = verifying === task.id;
              const isTelegram  = task.id === 'telegram';

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    flexDirection: (isTelegram && !done ? 'column' : 'row') as React.CSSProperties['flexDirection'],
                    alignItems: isTelegram && !done ? 'flex-start' : 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--panel)',
                    border: `1px solid ${done ? 'rgba(38,200,184,0.2)' : 'var(--border)'}`,
                    borderRadius: 10,
                    opacity: done ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{task.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-space)' }}>{task.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 700 }}>+{task.pts} PTS</div>
                    </div>

                    {done ? (
                      <span className="badge mint sm" style={{ fontSize: 11 }}>Done ✓</span>
                    ) : isPending ? (
                      <button className="btn sm primary" disabled style={{ opacity: 0.7, cursor: 'default' }}>
                        Verifying…
                      </button>
                    ) : task.id === 'wallet' ? (
                      <button className="btn sm primary" onClick={() => handleTask(task.id)}>
                        {task.cta}
                      </button>
                    ) : task.id === 'first_trade' ? (
                      <Link href={task.href!} className="btn sm primary" target="_blank" rel="noopener">
                        {task.cta}
                      </Link>
                    ) : isTelegram ? (
                      /* Telegram — handled by the widget row below */
                      <button className="btn sm ghost" disabled style={{ opacity: 0.5, cursor: 'default', fontSize: 11 }}>
                        Use widget ↓
                      </button>
                    ) : (
                      /* Discord / Twitter — OAuth popup */
                      <button className="btn sm primary" onClick={() => handleTask(task.id)}>
                        {task.cta}
                      </button>
                    )}
                  </div>

                  {/* Telegram Login Widget row */}
                  {isTelegram && !done && (
                    <TelegramWidget wallet={wallet!} onVerified={() => {
                      setTasks((prev) => ({ ...prev, telegram: true }));
                      toast(`+${task.pts} PTS — Telegram verified!`);
                    }} />
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

      {/* Wallet modal */}
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

// ── Telegram Login Widget ────────────────────────────────────────────────────
// Renders the official Telegram Login Widget button.
// On successful login, sends the signed data to our backend for HMAC verification.

interface TelegramWidgetProps {
  wallet: string;
  onVerified: () => void;
}

function TelegramWidget({ wallet, onVerified }: TelegramWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    // Attach global callback that the Telegram widget script will call
    (window as any).onTelegramLogin = async (data: Record<string, string>) => {
      try {
        const res = await fetch(`${API_URL}/api/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet, telegramData: data }),
        });
        const result = await res.json();
        if (result.verified) {
          onVerified();
        } else if (result.reason === 'not_member') {
          toast('You need to join the SHIFT Telegram group first.');
        } else {
          toast('Telegram verification failed — try again.');
        }
      } catch {
        toast('Could not reach server — please retry.');
      }
    };

    // Inject Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'ShiftRWABot');
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-onauth', 'onTelegramLogin(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramLogin;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [wallet, onVerified, toast]);

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--border)',
        width: '100%',
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
      }}
    />
  );
}
