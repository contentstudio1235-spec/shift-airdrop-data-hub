'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuditViewer from '@/components/AuditViewer';

export default function AdminAuditPage() {
  const router = useRouter();
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuth = () => {
    if (!adminPasscode) {
      alert('Please enter admin passcode');
      return;
    }
    setAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAdminPasscode('');
  };

  if (!authenticated) {
    return (
      <div
        className="page fade-in"
        style={{
          maxWidth: 400,
          margin: '0 auto',
          padding: '60px 24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: 32 }}>Admin Audit Logs</h1>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Enter admin passcode"
            value={adminPasscode}
            onChange={e => setAdminPasscode(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAuth()}
            className="input"
            style={{ width: '100%', marginBottom: 12 }}
            autoFocus
          />
          <button className="btn primary" style={{ width: '100%' }} onClick={handleAuth}>
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1>Admin Audit Trail</h1>
        <button className="btn secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--text-mute)', fontSize: 14 }}>
          Comprehensive audit log of all admin panel actions. Every change is tracked with timestamp, admin wallet,
          resource details, and reason. Use filters below to search specific actions or exports.
        </p>
      </div>

      <AuditViewer adminPasscode={adminPasscode} />
    </div>
  );
}
