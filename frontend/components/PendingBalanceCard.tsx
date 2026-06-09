'use client';

import { useState } from 'react';
import { useWallet } from './WalletContext';
import Icon from './Icon';

interface PendingBalanceCardProps {
  pending: {
    pending: number;
    claimed: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

export default function PendingBalanceCard({ pending }: PendingBalanceCardProps) {
  const { wallet } = useWallet();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(pending.claimed);
  const [claimedAmount, setClaimedAmount] = useState(0);

  const handleClaim = async () => {
    if (!wallet) return;

    setClaiming(true);
    try {
      const res = await fetch(`${API_URL}/api/referral/${wallet}/claim-legacy`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to claim');
      const data = await res.json();
      setClaimedAmount(data.claimedAmount);
      setClaimed(true);
    } catch (err) {
      console.error('Claim failed:', err);
      alert('Failed to claim legacy balance');
    } finally {
      setClaiming(false);
    }
  };

  // Don't show if no pending balance or already claimed
  if (pending.pending === 0 && claimed) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(107, 125, 255, 0.1), rgba(0, 208, 132, 0.05))',
        border: '1px solid rgba(107, 125, 255, 0.3)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Icon name="gift" size={16} color="#6B7DFF" />
          <span style={{ color: '#6B7DFF', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            Pending Legacy Balance
          </span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {claimed ? `${claimedAmount} SP Claimed ✓` : `${pending.pending} Position SP`}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
          {claimed
            ? 'Your legacy balance has been added to your total XP'
            : 'Earned from referrals before the commission system launched'}
        </p>
      </div>

      {!claimed && pending.pending > 0 && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          style={{
            background: 'linear-gradient(135deg, #6B7DFF, #00D084)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: claiming ? 'not-allowed' : 'pointer',
            opacity: claiming ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          {claiming ? (
            <>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Claiming...
            </>
          ) : (
            <>
              <Icon name="check" size={14} />
              Claim Now
            </>
          )}
        </button>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
