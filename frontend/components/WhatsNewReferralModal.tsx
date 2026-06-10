'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';

export default function WhatsNewReferralModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen this modal before (localStorage)
    const hasSeenModal = localStorage.getItem('whatsNew_referral_system_v2');
    if (!hasSeenModal) {
      setIsOpen(true);
      localStorage.setItem('whatsNew_referral_system_v2', 'true');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '32px',
          maxWidth: 520,
          maxHeight: '85vh',
          overflow: 'auto',
          zIndex: 1000,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge amber">NEW</span>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Referral System Update</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
              Enhanced commission structure with better rewards for quality referrals
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={20} color="var(--text-mute)" />
          </button>
        </div>

        <div className="hr" style={{ margin: '20px 0' }} />

        {/* Changes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {[
            {
              icon: 'trending-up',
              title: '📈 Referral SP Gets Bigger',
              desc: 'Your referral rewards now count MORE toward your ranking! They\'re weighted the same as your Social SP, so every referral you make boosts you higher on the leaderboard.',
              color: 'var(--amber)',
            },
            {
              icon: 'layers',
              title: '💰 Better Rewards for Good Referrals',
              desc: 'Earn 10–15% commission on your referred traders\' earnings. The stronger they perform, the more you earn. Everyone wins when your referrals succeed!',
              color: 'var(--mint)',
            },
            {
              icon: 'shield-check',
              title: '✅ Real Traders Only',
              desc: 'Your referrals need to hold at least $5 in SHIFT assets to count. This keeps everyone honest and rewards you for bringing in real traders.',
              color: 'var(--green)',
            },
            {
              icon: 'zap',
              title: '🎁 Claim Your Legacy Rewards',
              desc: 'If you referred people before, check your Referral Dashboard! Once they reach $5, you can claim your pending rewards from those old referrals.',
              color: 'var(--purple)',
            },
          ].map((item) => (
            <div key={item.title} style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={item.icon as any} size={18} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div style={{
          background: 'rgba(247,162,59,0.08)',
          border: '1px solid rgba(247,162,59,0.2)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 20,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <Icon name="info" size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            <strong>Pro tip:</strong> Visit the Referral Dashboard to view your tier, monitor referred traders, and track monthly commission progress.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              flex: 1,
              padding: '11px 16px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-dim)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            Got it
          </button>
          <button
            onClick={() => (window.location.href = '/referral')}
            style={{
              flex: 1,
              padding: '11px 16px',
              background: 'var(--amber)',
              border: 'none',
              borderRadius: 8,
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            Go to Referral Dashboard <Icon name="arrow-right" size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
