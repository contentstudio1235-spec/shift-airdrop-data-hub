'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

export default function ConfigurationPage() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || {});
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Configuration</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
          Manage system-wide settings without code changes
        </p>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Current Settings</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(config).map(([key, value]) => (
              <div
                key={key}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mint)', marginBottom: 4 }}>
                  {key.toUpperCase().replace(/_/g, ' ')}
                </div>
                <pre
                  style={{
                    fontSize: 11,
                    color: 'var(--text-mute)',
                    margin: 0,
                    overflow: 'auto',
                    maxHeight: 150,
                  }}
                >
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              padding: '16px',
              borderRadius: 8,
              backgroundColor: 'rgba(76,175,80,0.1)',
              borderLeft: '4px solid var(--mint)',
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
              ✅ Configuration management ready. Use /api/admin/config endpoints to update settings. All changes logged with audit trail.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
