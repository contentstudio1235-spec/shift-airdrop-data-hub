'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastContext';
import Icon from '@/components/Icon';

// ── API Configuration ──
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
const AIRDROP_URL = process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz';

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

interface KolReferralStats {
  wallet: string;
  customCode: string;
  displayName: string | null;
  multiplierBonus: number;
  multiplierType: string;
  stats: {
    totalReferrals: number;
    bonusApplied: number;
    pendingBonus: number;
  };
  referrals: Array<{
    id: string;
    refereeWallet: string;
    refereeXp: number;
    codeUsed: string;
    bonusMultiplier: number;
    bonusType: string;
    bonusApplied: boolean;
    referredAt: string;
  }>;
}

export default function AdminKolPage() {
  const toast = useToast();

  const [kols, setKols] = useState<KolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Detailed view state
  const [selectedKol, setSelectedKol] = useState<KolReferralStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showReferralConfig, setShowReferralConfig] = useState(false);

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

  // ── Load KOL Details and Referrals ─────────────────────────────────────────

  const loadKolDetails = async (wallet: string) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`${API_URL}/api/admin/kol/${wallet}/referrals`, {
        headers: { 'x-admin-key': adminPasscode },
      });
      if (!res.ok) {
        toast('Failed to load KOL details');
        return;
      }
      const data = await res.json();
      setSelectedKol(data);
    } catch (error) {
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ── Toggle active status ────────────────────────────────────────────────────

  const handleToggleActive = async (wallet: string, isActive: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/kol/${wallet}`, {
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
      if (selectedKol?.wallet === wallet) {
        loadKolDetails(wallet);
      }
    } catch (error) {
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // ── Copy referral link ──────────────────────────────────────────────────

  const copyReferralLink = (code: string) => {
    const link = `${AIRDROP_URL}/r/${code}`;
    navigator.clipboard.writeText(link);
    toast('Referral link copied!');
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

            {/* Referral Link Preview */}
            {formData.customCode && formData.customCode.length >= 4 && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--panel)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', marginBottom: 8 }}>
                  Referral Link Preview
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={`${AIRDROP_URL}/r/${formData.customCode}`}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-mute)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => copyReferralLink(formData.customCode)}
                  >
                    <Icon name="copy" size={12} /> Copy
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add KOL'}
            </button>
          </form>
        </div>
      )}

      {/* Detailed KOL View */}
      {selectedKol && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2>{selectedKol.displayName || selectedKol.customCode}</h2>
            <button className="btn ghost sm" onClick={() => setSelectedKol(null)}>
              <Icon name="x" size={14} />
            </button>
          </div>

          {/* Referral Link Section */}
          <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel)', borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Referral Link</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                readOnly
                value={`${AIRDROP_URL}/r/${selectedKol.customCode}`}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-mute)',
                }}
              />
              <button
                className="btn secondary sm"
                onClick={() => copyReferralLink(selectedKol.customCode)}
              >
                <Icon name="copy" size={12} /> Copy
              </button>
              <button
                className="btn secondary sm"
                onClick={() => window.open(`${AIRDROP_URL}/r/${selectedKol.customCode}`, '_blank')}
              >
                Open
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>
              Share this link with your community. New users registering via this link will receive a {selectedKol.multiplierBonus.toFixed(2)}x {selectedKol.multiplierType} multiplier.
            </p>
          </div>

          {/* Statistics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>Total Referrals</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--mint)' }}>
                {selectedKol.stats.totalReferrals}
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>Bonus Applied</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--mint)' }}>
                {selectedKol.stats.bonusApplied}
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>Pending Bonus</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--amber)' }}>
                {selectedKol.stats.pendingBonus}
              </div>
            </div>
          </div>

          {/* KOL Configuration */}
          <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel)', borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
              <div>
                <div style={{ color: 'var(--text-mute)', marginBottom: 4 }}>Custom Code</div>
                <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{selectedKol.customCode}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-mute)', marginBottom: 4 }}>Multiplier Bonus</div>
                <div style={{ fontWeight: 600, color: 'var(--mint)' }}>{selectedKol.multiplierBonus.toFixed(2)}x</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-mute)', marginBottom: 4 }}>Multiplier Type</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedKol.multiplierType === 'dynamic' ? 'Dynamic (Forward-only)' : 'Permanent (Retroactive)'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-mute)', marginBottom: 4 }}>Status</div>
                <button
                  className={`badge ${selectedKol.wallet ? 'mint' : 'gray'}`}
                  onClick={() => handleToggleActive(selectedKol.wallet, !!selectedKol.wallet)}
                  style={{ cursor: 'pointer', fontSize: 11 }}
                >
                  Active
                </button>
              </div>
            </div>
          </div>

          {/* Recent Referrals */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Referrals</h3>
            {loadingDetails ? (
              <p style={{ color: 'var(--text-mute)' }}>Loading referrals...</p>
            ) : selectedKol.referrals.length === 0 ? (
              <p style={{ color: 'var(--text-mute)', fontSize: 12 }}>No referrals yet</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>Referee Wallet</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 600 }}>Referee XP</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 600 }}>Bonus</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 600 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedKol.referrals.slice(0, 10).map((ref) => (
                      <tr key={ref.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {ref.refereeWallet.slice(0, 8)}...{ref.refereeWallet.slice(-4)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {ref.refereeXp.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {ref.bonusMultiplier.toFixed(2)}x {ref.bonusType}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: ref.bonusApplied ? 'rgba(38,200,184,0.1)' : 'rgba(251,146,60,0.1)', color: ref.bonusApplied ? 'var(--mint)' : 'var(--amber)' }}>
                            {ref.bonusApplied ? 'Applied' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-mute)', fontSize: 11 }}>
                          {new Date(ref.referredAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {kols.map((kol) => (
                  <tr key={kol.wallet} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => loadKolDetails(kol.wallet)}>
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
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn ghost sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyReferralLink(kol.customCode);
                          }}
                          title="Copy referral link"
                        >
                          <Icon name="copy" size={12} />
                        </button>
                        <button
                          className={`badge ${kol.isActive ? 'mint' : 'gray'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(kol.wallet, kol.isActive);
                          }}
                          style={{ cursor: 'pointer', fontSize: 11 }}
                        >
                          {kol.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
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
