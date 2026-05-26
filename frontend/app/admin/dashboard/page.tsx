'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

export default function AdminDashboardPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === 'ShiftRwa2026@@$$Key') {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Invalid admin passcode');
      setAuthenticated(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadStats();
    }
  }, [authenticated]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Placeholder for stats loading
      setStats({
        totalUsers: 0,
        activeBadges: 31,
        badgesAwarded: 0,
        certificatesEarned: 0,
        hallOfFameCount: 0,
        recentActivity: [],
      });
    } catch (err) {
      setError('Failed to load stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Admin Dashboard</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Admin Passcode"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text)',
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 16px',
              background: 'var(--mint)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Authenticate
          </button>
        </form>
        {error && <p style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-mute)', marginBottom: 24 }}>System overview and quick actions</p>

        {/* Key Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: 32,
          }}
        >
          <MetricCard label="Total Users" value="—" loading={loading} />
          <MetricCard label="Active Badges" value="31" loading={loading} />
          <MetricCard label="Badges Awarded" value="—" loading={loading} />
          <MetricCard label="Hall of Fame" value="—" loading={loading} />
        </div>

        {/* Quick Actions */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Quick Actions</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <QuickActionButton label="Manage Badges" href="/admin/badges" />
            <QuickActionButton label="Update Configuration" href="/admin/configuration" />
            <QuickActionButton label="View Audit Log" href="/admin/audit" />
            <QuickActionButton label="Manage Events" href="/admin/events" />
          </div>
        </div>

        {/* System Status */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>System Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 14, color: 'var(--text-mute)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Badge Template System</span>
              <span style={{ color: 'var(--mint)' }}>✓ Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Launch Configuration</span>
              <span style={{ color: 'var(--mint)' }}>✓ Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Admin Audit Logging</span>
              <span style={{ color: 'var(--mint)' }}>✓ Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SNAG Sync Queue</span>
              <span style={{ color: 'var(--mint)' }}>✓ Ready</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function MetricCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
      }}
    >
      <p style={{ color: 'var(--text-mute)', fontSize: 12, margin: '0 0 8px 0' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: loading ? 'var(--text-mute)' : 'var(--mint)' }}>
        {loading ? '...' : value}
      </p>
    </div>
  );
}

function QuickActionButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        padding: '12px 16px',
        background: 'rgba(38, 200, 184, 0.1)',
        border: '1px solid var(--mint)',
        borderRadius: 8,
        color: 'var(--mint)',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: 14,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(38, 200, 184, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(38, 200, 184, 0.1)';
      }}
    >
      {label} →
    </a>
  );
}
