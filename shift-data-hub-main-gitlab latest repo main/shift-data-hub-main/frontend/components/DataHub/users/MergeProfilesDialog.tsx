"use client";
import React, { useState, useEffect } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { X, MagnifyingGlass } from '@phosphor-icons/react';
import { DialogShell } from './DialogShell';
import { useIdentityActions } from '@/hooks/useIdentityActions';
import { apiGet } from '@/lib/api';
import { fmtWallet, fmtUSD, fmtRelativeTime } from '@/lib/format';
import type { ProfileWithLinks } from '@/hooks/useUserProfile';
import type { ProfileSummary } from '@/hooks/useUsersList';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.4)', border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8, padding: '10px 12px', color: TOKENS.textPrimary,
  fontSize: 12, fontFamily: 'inherit', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 800,
  color: TOKENS.textFaint, letterSpacing: '0.12em',
  textTransform: 'uppercase', marginBottom: 6,
};

function ProfileChip({ profile, onRemove }: { profile: { primaryWallet: string; displayName?: string | null; lifetimeVolumeUSD?: number }; onRemove?: () => void }) {
  return (
    <div style={{
      padding: 12, background: 'rgba(0,200,150,0.06)',
      border: `1px solid ${TOKENS.accentBorder}`, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: TOKENS.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {fmtWallet(profile.primaryWallet, 8, 4)}
        </div>
        <div style={{ fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}>
          {profile.displayName || '—'}{profile.lifetimeVolumeUSD !== undefined ? ` • ${fmtUSD(profile.lifetimeVolumeUSD)} lifetime` : ''}
        </div>
      </div>
      {onRemove && (
        <button onClick={onRemove} aria-label="Clear selection" style={{ background: 'transparent', border: 'none', color: TOKENS.textFaint, cursor: 'pointer', padding: 4 }}>
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  );
}

export function MergeProfilesDialog({ winnerProfile, onClose, onSuccess }: { winnerProfile: ProfileWithLinks; onClose: () => void; onSuccess: () => void }) {
  const actions = useIdentityActions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [loser, setLoser] = useState<ProfileSummary | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (loser) return;
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiGet<{ rows: ProfileSummary[] }>('/api/users/search', { query: { q: query.trim() } });
        setResults(res.rows.filter(r => r.profileId !== winnerProfile.profileId));
      } catch { /* ignore */ } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, loser, winnerProfile.profileId]);

  const reasonValid = reason.trim().length >= 10;
  const canSubmit = !!loser && reasonValid;

  async function submit() {
    if (!loser) return;
    setSubmitting(true);
    setError(null);
    const r = await actions.mergeProfiles(winnerProfile.profileId, loser.profileId, reason);
    setSubmitting(false);
    if (r.ok) onSuccess();
    else setError(r.error.message);
  }

  return (
    <DialogShell
      title="Merge Profiles"
      subtitle="Combine two profiles into one. This is irreversible."
      width={560}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Winner (current)</label>
          <ProfileChip profile={{
            primaryWallet: winnerProfile.primaryWallet,
            displayName: winnerProfile.displayName,
            lifetimeVolumeUSD: winnerProfile.lifetimeStats?.volumeUSD,
          }} />
        </div>

        <div>
          <label style={labelStyle}>Loser (to merge in)</label>
          {loser ? (
            <ProfileChip profile={loser} onRemove={() => { setLoser(null); setQuery(''); setResults([]); }} />
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                <MagnifyingGlass size={14} weight="regular" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TOKENS.textFaint }} />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type wallet address to find profile..."
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
              </div>
              {searching && <div style={{ fontSize: 11, color: TOKENS.textFaint, marginTop: 6 }}>Searching…</div>}
              {results.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', border: `1px solid ${TOKENS.accentBorder}`, borderRadius: 8 }}>
                  {results.map(r => (
                    <div
                      key={r.profileId}
                      onClick={() => setLoser(r)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer',
                        borderBottom: `1px solid ${TOKENS.chartGrid}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        transition: `background ${MOTION.fast}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,150,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: TOKENS.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtWallet(r.primaryWallet, 8, 4)} {r.displayName ? `· ${r.displayName}` : ''}
                      </span>
                      <span style={{ fontSize: 11, color: TOKENS.textMuted }}>{fmtUSD(r.lifetimeVolumeUSD)}  · {fmtRelativeTime(r.lastSeenAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <label style={labelStyle}>Reason (min 10 chars)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why merge these profiles? (e.g., 'Same user; both wallets confirmed via signed message')"
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
          <div style={{ fontSize: 11, color: reasonValid ? TOKENS.accent : TOKENS.threshold.red, marginTop: 4 }}>
            {reason.trim().length} / minimum 10 characters
          </div>
        </div>

        {error && (
          <div style={{ padding: 10, background: 'rgba(255,90,90,0.08)', border: `1px solid rgba(255,90,90,0.3)`, borderRadius: 8, fontSize: 11, color: TOKENS.threshold.red }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <button onClick={onClose} style={{ background: 'transparent', color: TOKENS.textMuted, border: 'none', padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          style={{
            background: 'transparent', color: TOKENS.threshold.red,
            border: `1px solid ${TOKENS.threshold.red}`, borderRadius: 8,
            padding: '10px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
            cursor: (canSubmit && !submitting) ? 'pointer' : 'not-allowed',
            opacity: (canSubmit && !submitting) ? 1 : 0.4,
            transition: `all ${MOTION.fast}`, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Merging…' : 'Merge profiles'}
        </button>
      </div>
    </DialogShell>
  );
}
