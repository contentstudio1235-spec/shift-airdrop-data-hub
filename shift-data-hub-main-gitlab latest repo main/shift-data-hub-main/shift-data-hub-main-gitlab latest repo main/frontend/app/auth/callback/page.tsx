'use client';

// ============================================================
// /auth/callback — OAuth popup landing page
// Backend redirects here after verifying Discord / Twitter.
// We read the result from query params, postMessage to the
// opener window, then close the popup.
// ============================================================

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Verifying…');

  useEffect(() => {
    const status = searchParams.get('status') as 'success' | 'error' | 'not_member' | null;
    const task   = searchParams.get('task') ?? '';
    const detail = searchParams.get('detail') ?? '';

    if (status === 'success') {
      setMessage('✅ Verified! Closing…');
    } else if (status === 'not_member') {
      setMessage('⚠️ Not a member yet. Join first, then try again.');
    } else {
      setMessage('❌ Verification failed. Please try again.');
    }

    // Send result to the parent window that opened this popup
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'SHIFT_SOCIAL_VERIFY', status, task, detail },
        window.location.origin
      );
    }

    // Auto-close after a short delay so the user can see the message
    const timer = setTimeout(() => {
      window.close();
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0f',
        color: '#fff',
        fontFamily: 'var(--font-space-grotesk, sans-serif)',
        gap: '12px',
      }}
    >
      <p style={{ fontSize: '1.1rem', margin: 0 }}>{message}</p>
      <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
        This window will close automatically.
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0a0f',
            color: '#fff',
          }}
        >
          <p>Verifying…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
