'use client';

import { useEffect, useState } from 'react';

export default function LoyaltyPage() {
  const [iframeHeight, setIframeHeight] = useState('100vh');

  // Dynamically adjust iframe height to fit content
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from same origin (proxy) or original loyalty domain
      const allowedOrigins = [window.location.origin, 'https://loyalty.shiftrwa.xyz'];
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data.type === 'resize') {
        setIframeHeight(`${event.data.height}px`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="page fade-in" style={{ padding: 0, maxWidth: '100%', margin: 0 }}>
      {/* Header */}
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
      </div>

      {/* Embedded Loyalty Page */}
      <div style={{
        width: '100%',
        border: 'none',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--card)',
        marginBottom: 48,
      }}>
        <iframe
          src="/api/loyalty"
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            borderRadius: 12,
            display: 'block',
          }}
          title="SHIFT Loyalty & Rewards"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          allow="geolocation; microphone; camera"
        />
      </div>
    </div>
  );
}
