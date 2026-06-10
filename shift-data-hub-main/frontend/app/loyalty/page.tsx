'use client';

import { useEffect } from 'react';

export default function LoyaltyPage() {
  useEffect(() => {
    window.location.href = 'https://loyalty.shiftrwa.xyz/loyalty';
  }, []);

  return (
    <div className="page fade-in" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <p style={{ fontSize: 15, color: 'var(--text-mute)' }}>
        Redirecting to Loyalty & Rewards...
      </p>
    </div>
  );
}
