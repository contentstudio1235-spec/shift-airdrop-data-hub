'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/components/WalletContext';
import ReferralHero from '@/components/ReferralHero';
import PendingBalanceCard from '@/components/PendingBalanceCard';
import ReferredUsersTable from '@/components/ReferredUsersTable';
import LeaderboardTabs from '@/components/LeaderboardTabs';
import Icon from '@/components/Icon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

interface ReferralStats {
  referralCount: number;
  totalVolume: number;
  totalHolding: number;
}

interface PendingBalance {
  pending: number;
  claimed: boolean;
}

export default function ReferralContent() {
  const { wallet, walletChain } = useWallet();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [pending, setPending] = useState<PendingBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch referral stats
  useEffect(() => {
    if (!wallet || walletChain !== 'solana') {
      setLoading(false);
      setError('Please connect your Solana wallet');
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/referral/${wallet}`);
        if (!res.ok) throw new Error('Failed to fetch referral stats');
        const data = await res.json();
        setStats(data.stats);
        setPending(data.legacy);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load referral data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [wallet, walletChain]);

  if (!wallet) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>Connect Wallet to View Referrals</h2>
        <p style={{ color: 'var(--text-dim)' }}>
          Connect your Solana wallet to see your referral stats and earnings
        </p>
      </div>
    );
  }

  if (walletChain !== 'solana') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>⚠️ Please use Solana Wallet</h2>
        <p style={{ color: 'var(--text-dim)' }}>
          This dashboard is for Solana wallets only
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Referral Dashboard
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
          Earn Position SP from referred users. Track your network, commissions, and leaderboard rank.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            background: 'rgba(255, 59, 48, 0.1)',
            border: '1px solid rgb(255, 59, 48)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Icon name="alert-circle" size={16} color="rgb(255, 59, 48)" />
          <span style={{ color: 'rgb(255, 59, 48)', fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '2px solid var(--border)',
              borderTopColor: 'var(--text-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p style={{ marginTop: '16px', color: 'var(--text-dim)' }}>Loading referral data...</p>
        </div>
      ) : stats ? (
        <>
          {/* Hero stats section */}
          <ReferralHero stats={stats} />

          {/* Pending legacy balance card */}
          {pending && <PendingBalanceCard pending={pending} />}

          {/* Referred users table */}
          <ReferredUsersTable wallet={wallet} />

          {/* Leaderboard tabs */}
          <LeaderboardTabs />
        </>
      ) : null}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
