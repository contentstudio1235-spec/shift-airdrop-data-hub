'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ShiftIdCard from '@/components/ShiftIdCard';
import ProgressBar from '@/components/ProgressBar';
import Icon from '@/components/Icon';
import { useWallet } from '@/components/WalletContext';
import { useToast } from '@/components/ToastContext';

// ── API Configuration ──
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

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

  const [userData, setUserData] = useState<AirdropUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchBonus, setLaunchBonus] = useState<{
    active: boolean;
    multiplier: number;
    daysRemaining: number;
    label: string;
  } | null>(null);

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
    if (!code || code.length < 4 || code.length > 32) {
      setRefBonus(null);
      return;
    }

    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(normalized)) {
      setRefBonus(null);
      return;
    }

    try {
      setRefLoading(true);
      const res = await fetch(`${API_URL}/api/airdrop/ref/${encodeURIComponent(normalized)}`);
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
          res = await fetch(`${API_URL}/api/airdrop/user/${wallet}`);
        }

        if (!res.ok) throw new Error('Failed to fetch user data');
        const data: AirdropUser = await res.json();
        setUserData(data);
      } catch (error) {
        console.error('[Register] Failed to fetch user data:', error);
        toast('Failed to load airdrop data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [wallet, refCode, toast]);

  // ── Progress to tier 2 ──
  const progressPct = userData ? Math.round((userData.queuePosition / userData.totalMembers) * 100) : 0;
  const placesToTier2 = userData ? Math.max(0, Math.round(userData.totalMembers * 0.05) - userData.queuePosition) : 0;

  // ── Handlers ──
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
              Get <span style={{ color: 'var(--mint)', fontSize: 18 }}>{Number(launchBonus.multiplier).toFixed(1)}x</span> XP for {launchBonus.daysRemaining} more days
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
              {Number(launchBonus.multiplier).toFixed(1)}x XP Bonus Active
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {launchBonus.daysRemaining} days remaining — move up the queue faster!
            </div>
          </div>
        )}

        {/* Referral Bonus Banner */}
        {refBonus && refBonus.multiplierType !== 'none' && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 12,
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
            <button
              className="btn secondary sm"
              onClick={() => {
                window.open(process.env.NEXT_PUBLIC_SNAG_LOYALTY_URL || 'https://loyalty.shiftrwa.xyz', '_blank');
              }}
              style={{ width: '100%' }}
            >
              View All Quests on SNAG
            </button>
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
            {userData.totalXp.toLocaleString()} XP earned
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
            points={userData.totalXp}
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
    </>
  );
}
