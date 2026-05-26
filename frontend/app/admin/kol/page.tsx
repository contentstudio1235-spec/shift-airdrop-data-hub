'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastContext';
import Icon from '@/components/Icon';

// ── API Configuration ──
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

interface KolEntry {
  wallet: string;
  customCode: string;
  displayName?: string;
  multiplierBonus: number;
  multiplierType: 'dynamic' | 'permanent';
  isActive: boolean;
  notes?: string;
  createdAt: string;
  referralCount: number;
  inviteXpGiven: number;
}

export default function AdminKolPage() {
  const toast = useToast();

  const [kols, setKols] = useState<KolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    wallet: '',
    customCode: '',
    displayName: '',
    multiplierBonus: 1.5,
    multiplierType: 'dynamic' as 'dynamic' | 'permanent',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // ── Auth ────────────────────────────────────────────────────────────────────

  const handleAuth = () => {
    if (!adminPasscode) {
      toast('Please enter admin passcode');
      return;
    }
    setAuthenticated(true);
    loadKols();
  };

  // ── Fetch KOLs ──────────────────────────────────────────────────────────────

  const loadKols = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/kol`, {
        headers: { 'x-admin-key': adminPasscode },
      });
      if (!res.ok) {
        toast(`Failed to load KOLs: ${res.statusText}`);
        return;
      }
      const data = await res.json();
      setKols(data.kols || []);
    } catch (error) {
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadKols();
    }
  }, [authenticated]);

  // ── Add KOL ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.wallet || formData.wallet.length < 32) {
      toast('Invalid wallet address');
      return;
    }
    if (!formData.customCode || formData.customCode.length < 4) {
      toast('Custom code must be at least 4 characters');
      return;
    }
    if (formData.multiplierBonus < 1.0 || formData.multiplierBonus > 2.0) {
      toast('Multiplier bonus must be between 1.0 and 2.0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/kol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminPasscode,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(`Error: ${err.error || 'Failed to add KOL'}`);
        return;
      }

      toast('KOL added successfully!');
      setFormData({
        wallet: '',
        customCode: '',
        displayName: '',
        multiplierBonus: 1.5,
        multiplierType: 'dynamic',
        notes: '',
      });
      setShowForm(false);
      loadKols();
    } catch (error) {
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active status ────────────────────────────────────────────────────

  const handleToggleActive = async (wallet: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/kol/${wallet}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminPasscode,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) {
        toast('Failed to update KOL');
        return;
      }

      toast(isActive ? 'KOL deactivated' : 'KOL activated');
      loadKols();
    } catch (error) {
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // ── Not authenticated ───────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <div className="page fade-in" style={{ maxWidth: 400, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 32 }}>Admin Panel — KOL Management</h1>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Enter admin passcode"
            value={adminPasscode}
            onChange={(e) => setAdminPasscode(e.target.value)}
            className="input"
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button className="btn primary" style={{ width: '100%' }} onClick={handleAuth}>
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <div className="page fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1>KOL Whitelist Management</h1>
        <button
          className="btn primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add KOL'}
        </button>
      </div>

      {/* Add KOL Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
          <h2 style={{ marginBottom: 16 }}>Add New KOL</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="Solana wallet (44 chars)"
                  value={formData.wallet}
                  onChange={(e) => setFormData({ ...formData, wallet: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Custom Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SHIFT-AXEL-VIP"
                  value={formData.customCode}
                  onChange={(e) => setFormData({ ...formData, customCode: e.target.value.toUpperCase() })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Axel (shown on register)"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Multiplier Bonus
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={formData.multiplierBonus}
                  onChange={(e) => setFormData({ ...formData, multiplierBonus: parseFloat(e.target.value) })}
                  className="input"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Multiplier Type
                </label>
                <select
                  value={formData.multiplierType}
                  onChange={(e) => setFormData({ ...formData, multiplierType: e.target.value as 'dynamic' | 'permanent' })}
                  className="input"
                >
                  <option value="dynamic">Dynamic (Forward-only)</option>
                  <option value="permanent">Permanent (Retroactive)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Internal notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add KOL'}
            </button>
          </form>
        </div>
      )}

      {/* KOL List */}
      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-mute)' }}>Loading KOLs...</p>
        ) : kols.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-mute)' }}>No KOLs yet. Add one to get started.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Display Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Multiplier</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Referrals</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Invite XP</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {kols.map((kol) => (
                  <tr key={kol.wallet} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                      {kol.customCode}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 12 }}>
                      {kol.displayName || '—'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 12 }}>
                      {kol.multiplierBonus.toFixed(2)}x {' '}
                      <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                        ({kol.multiplierType})
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12 }}>
                      {kol.referralCount}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12 }}>
                      {Math.round(kol.inviteXpGiven).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        className={`badge ${kol.isActive ? 'mint' : 'gray'}`}
                        onClick={() => handleToggleActive(kol.wallet, kol.isActive)}
                        style={{ cursor: 'pointer', fontSize: 11 }}
                      >
                        {kol.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
