"use client";
import React, { useState } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { Warning } from '@phosphor-icons/react';
import { DialogShell } from './DialogShell';
import { useIdentityActions } from '@/hooks/useIdentityActions';
import { ApiError } from '@/lib/api';

type IdentityType = 'wallet' | 'ga_client_id' | 'snag_user_id' | 'x_handle' | 'discord_id' | 'telegram_id' | 'email';
type Confidence = 'deterministic' | 'probabilistic' | 'manual';

const TYPE_OPTIONS: { value: IdentityType; label: string; placeholder: string; hint: string }[] = [
  { value: 'wallet',       label: 'Wallet',          placeholder: '5xCFv...',                  hint: 'Solana base58 address (32-44 chars, case-sensitive)' },
  { value: 'ga_client_id', label: 'GA Client ID',    placeholder: 'GA1.2.1234567890',         hint: 'Google Analytics 4 client ID' },
  { value: 'snag_user_id', label: 'Snag User ID',    placeholder: 'snag_abc_...',             hint: 'Snag platform user identifier' },
  { value: 'x_handle',     label: 'X (Twitter)',     placeholder: '@username',                 hint: 'X (Twitter) handle without @' },
  { value: 'discord_id',   label: 'Discord',         placeholder: 'user#1234 or 18-digit ID', hint: 'Discord username or snowflake ID' },
  { value: 'telegram_id',  label: 'Telegram',        placeholder: '@username or chat_id',     hint: 'Telegram handle or numeric chat ID' },
  { value: 'email',        label: 'Email',           placeholder: 'user@example.com',         hint: 'Email address (lowercase)' },
];

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

const hintStyle: React.CSSProperties = {
  fontSize: 11, color: TOKENS.textFaint, marginTop: 4,
};

export function AddLinkDialog({ profileId, onClose, onSuccess }: { profileId: string; onClose: () => void; onSuccess: () => void }) {
  const actions = useIdentityActions();
  const [type, setType] = useState<IdentityType>('wallet');
  const [value, setValue] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('manual');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<{ existingProfileId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeMeta = TYPE_OPTIONS.find(t => t.value === type)!;
  const evidenceRequired = confidence === 'manual';
  const canSubmit = value.length > 0 && (!evidenceRequired || evidence.trim().length >= 10);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const r = await actions.addLink(profileId, { type, value, confidence, evidence });
    setSubmitting(false);
    if (r.ok) {
      onSuccess();
    } else if (r.error instanceof ApiError && r.error.status === 409 && r.error.body?.existingProfileId) {
      setConflict({ existingProfileId: r.error.body.existingProfileId });
    } else {
      setError(r.error.message);
    }
  }

  if (conflict) {
    return (
      <DialogShell title="Conflict — identity already linked" width={480} onClose={onClose}>
        <div style={{
          padding: 12, background: 'rgba(255,154,60,0.08)',
          border: `1px solid rgba(255,154,60,0.3)`, borderRadius: 8,
          fontSize: 12, color: TOKENS.threshold.yellow, marginBottom: 16,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <Warning size={16} weight="regular" />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>This identity is already linked to another profile.</div>
            <div style={{ fontSize: 11, color: TOKENS.textMuted }}>
              Type: {type}<br />
              Value: {value}<br />
              Existing profile: {conflict.existingProfileId}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: TOKENS.textMuted, lineHeight: 1.5 }}>
          You can cancel and review, or merge this profile into the existing one. Merge is a separate destructive action — close this dialog and use the Merge button on the IdentityCard if you want to proceed.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: TOKENS.textMuted, border: 'none', padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      title="Add Identity Link"
      subtitle="Link this profile to an external identity"
      width={480}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as IdentityType)} style={inputStyle}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Value</label>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={typeMeta.placeholder}
            style={inputStyle}
          />
          <div style={hintStyle}>{typeMeta.hint}</div>
        </div>
        <div>
          <label style={labelStyle}>Confidence</label>
          <select value={confidence} onChange={e => setConfidence(e.target.value as Confidence)} style={inputStyle}>
            <option value="manual">Manual — admin-asserted</option>
            <option value="deterministic">Deterministic — verifiable event</option>
            <option value="probabilistic">Probabilistic — IP/session correlation</option>
          </select>
        </div>
        {evidenceRequired && (
          <div>
            <label style={labelStyle}>Evidence (required for manual)</label>
            <textarea
              value={evidence}
              onChange={e => setEvidence(e.target.value)}
              placeholder="Why are you asserting this link? (e.g., 'User confirmed in DM screenshot 2026-06-03')"
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            />
            <div style={hintStyle}>{evidence.trim().length} / minimum 10 characters. Logged in admin audit trail.</div>
          </div>
        )}
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
            background: TOKENS.accent, color: TOKENS.bg, border: 'none', borderRadius: 8,
            padding: '10px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
            cursor: (canSubmit && !submitting) ? 'pointer' : 'not-allowed',
            opacity: (canSubmit && !submitting) ? 1 : 0.4,
            transition: `all ${MOTION.fast}`, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Adding…' : 'Add Link'}
        </button>
      </div>
    </DialogShell>
  );
}
