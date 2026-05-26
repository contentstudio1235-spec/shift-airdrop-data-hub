'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

export default function LoyaltyPage() {
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from same origin (proxy) or original loyalty domain
      const allowedOrigins = [window.location.origin, 'https://loyalty.shiftrwa.xyz'];
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data.type === 'resize') {
        // Modal iframe height adjustment if needed
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="page fade-in">
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px' }}>
        <h1 style={{
          fontSize: 44,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12,
          lineHeight: 1.1,
        }}>
          Loyalty & Rewards
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Complete social tasks and earn XP. Connect your socials to unlock multiplier bonuses and climb the leaderboard.
        </p>
        {!showModal && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              marginTop: 20,
              padding: '12px 32px',
              background: 'var(--mint)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1.05)';
              (e.target as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,212,170,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1)';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          >
            💎 Open Loyalty Program
          </button>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
              cursor: 'pointer',
            }}
          />

          {/* Modal Container */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pointerEvents: 'auto',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Loyalty & Rewards Program</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-mute)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-mute)')}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                pointerEvents: 'auto',
                background: 'var(--bg-2)',
              }}
            >
              <iframe
                src="/api/loyalty"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
                title="SHIFT Loyalty & Rewards"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
                allow="geolocation; microphone; camera"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
