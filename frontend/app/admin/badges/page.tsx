'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Badge {
  template_key: string;
  category: string;
  display_name: string;
  description: string;
  multiplier_value: number;
  duration_type: string;
  is_hall_of_fame: boolean;
  dynamic_duration_days?: number;
}

interface BadgeTemplate {
  key: string;
  name: string;
  multiplier: number;
  duration: string;
}

interface BadgeCategory {
  [key: string]: BadgeTemplate[];
}

export default function AdminBadgesPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [templates, setTemplates] = useState<BadgeCategory>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [awardWallet, setAwardWallet] = useState('');
  const [awardTemplate, setAwardTemplate] = useState('');
  const [awardReason, setAwardReason] = useState('');

  // Authenticate admin
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

  // Fetch badges and templates
  useEffect(() => {
    if (authenticated) {
      loadBadges();
    }
  }, [authenticated]);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const [badgesRes, templatesRes] = await Promise.all([
        fetch('/api/admin/badges', {
          headers: { 'x-admin-key': adminKey },
        }),
        fetch('/api/admin/badges/templates', {
          headers: { 'x-admin-key': adminKey },
        }),
      ]);

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data.badges);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.categories);
        // Set first category as selected
        const firstCategory = Object.keys(data.categories)[0];
        setSelectedCategory(firstCategory);
      }
    } catch (err) {
      setError('Failed to load badges');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAwardBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardWallet || !awardTemplate) {
      setError('Wallet and template are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/badges/${awardWallet}`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_key: awardTemplate,
          reason: awardReason,
        }),
      });

      if (res.ok) {
        setSuccess(`Badge awarded successfully`);
        setShowAwardForm(false);
        setAwardWallet('');
        setAwardTemplate('');
        setAwardReason('');
        await loadBadges();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to award badge');
      }
    } catch (err) {
      setError('Error awarding badge');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Admin: Badge Management</h1>
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
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Badge Management</h1>
        <p style={{ color: 'var(--text-mute)', marginBottom: 24 }}>
          Manage 31 badges across 8 categories with multiplier stacking (+ 2.0x cap, Hall of Fame bypass)
        </p>

        {/* Status Messages */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid #ff6b6b',
              borderRadius: 8,
              color: '#ff6b6b',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e',
              borderRadius: 8,
              color: '#22c55e',
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

        {/* Award Badge Form */}
        {showAwardForm && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Award Badge Manually</h2>
            <form onSubmit={handleAwardBadge} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="Wallet address"
                value={awardWallet}
                onChange={(e) => setAwardWallet(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                }}
              />
              <select
                value={awardTemplate}
                onChange={(e) => setAwardTemplate(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                }}
              >
                <option value="">Select badge template</option>
                {Object.entries(templates).map(([category, categoryBadges]) => (
                  <optgroup key={category} label={category}>
                    {categoryBadges.map((badge) => (
                      <option key={badge.key} value={badge.key}>
                        {badge.name} ({badge.multiplier}x)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input
                type="text"
                placeholder="Reason (optional)"
                value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'var(--mint)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Awarding...' : 'Award Badge'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAwardForm(false)}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!showAwardForm && (
          <button
            onClick={() => setShowAwardForm(true)}
            style={{
              marginBottom: 24,
              padding: '10px 16px',
              background: 'var(--mint)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Award Badge
          </button>
        )}

        {/* Badges Table */}
        {loading && !badges.length ? (
          <p>Loading badges...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Multiplier</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Hall of Fame</th>
                </tr>
              </thead>
              <tbody>
                {badges.map((badge) => (
                  <tr key={badge.template_key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{badge.display_name}</td>
                    <td style={{ padding: '12px', color: 'var(--text-mute)', fontSize: 12 }}>{badge.category}</td>
                    <td style={{ padding: '12px', color: 'var(--text-mute)', fontSize: 13 }}>
                      {badge.description?.substring(0, 50)}...
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: 'rgba(38, 200, 184, 0.2)', padding: '4px 8px', borderRadius: 4 }}>
                        {badge.multiplier_value}x
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: 12 }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: badge.duration_type === 'permanent' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: badge.duration_type === 'permanent' ? '#22c55e' : '#eab308',
                        }}
                      >
                        {badge.duration_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {badge.is_hall_of_fame ? (
                        <span style={{ color: 'var(--mint)', fontWeight: 600 }}>✓ HOF</span>
                      ) : (
                        <span style={{ color: 'var(--text-mute)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Badge Summary */}
        <div
          style={{
            marginTop: 32,
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Summary</h3>
          <p style={{ color: 'var(--text-mute)', fontSize: 13 }}>
            <strong>{badges.length}</strong> total badges across{' '}
            <strong>{Object.keys(templates).length}</strong> categories
          </p>
          <p style={{ color: 'var(--text-mute)', fontSize: 13, marginTop: 8 }}>
            <strong>Stacking Rules:</strong> Top 3 badges count at full value, rest at half value. Capped at +2.0x.
            Hall of Fame badges bypass cap with +0.10x premium.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
