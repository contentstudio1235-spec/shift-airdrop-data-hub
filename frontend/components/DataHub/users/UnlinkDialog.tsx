"use client";
import React, { useState } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { DialogShell } from './DialogShell';
import { useIdentityActions } from '@/hooks/useIdentityActions';
import type { IdentityLink } from '@/hooks/useUserProfile';

export function UnlinkDialog({ profileId, link, onClose, onSuccess }: { profileId: string; link: IdentityLink; onClose: () => void; onSuccess: () => void }) {
  const actions = useIdentityActions();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonValid = reason.trim().length >= 10;

  async function submit() {
    setSubmitting(true);
    setError(null);
    const r = await actions.unlinkIdentity(profileId, link.linkId, reason);
    setSubmitting(false);
    if (r.ok) onSuccess();
    else setError(r.error.message);
  }

  return (
    <DialogShell title="Unlink Identity" width={320} onClose={onClose}>
      <p style={{ fontSize: 12, color: TOKENS.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
        You're about to unlink:
      </p>
      <div style={{
        padding: 10, background: 'rgba(0,0,0,0.3)',
        border: `1px solid ${TOKENS.chartGrid}`, borderRadius: 8, marginBottom: 16,
        fontSize: 12, color: TOKENS.textPrimary, fontFamily: 'monospace', wordBreak: 'break-all',
      }}>
        {link.type}: {link.value}
      </div>
      <p style={{ fontSize: 11, color: TOKENS.textFaint, marginBottom: 16, lineHeight: 1.5 }}>
        This soft-deletes the link. The audit log is preserved.
      </p>
      <div>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Reason (min 10 chars)
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why unlink?"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.4)', border: `1px solid ${TOKENS.accentBorder}`,
            borderRadius: 8, padding: '10px 12px', color: TOKENS.textPrimary,
            fontSize: 12, fontFamily: 'inherit', outline: 'none', minHeight: 60, resize: 'vertical',
          }}
        />
        <div style={{ fontSize: 11, color: reasonValid ? TOKENS.accent : TOKENS.threshold.red, marginTop: 4 }}>
          {reason.trim().length} / minimum 10 characters
        </div>
      </div>
      {error && (
        <div style={{ padding: 10, background: 'rgba(255,90,90,0.08)', border: `1px solid rgba(255,90,90,0.3)`, borderRadius: 8, fontSize: 11, color: TOKENS.threshold.red, marginTop: 12 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <button onClick={onClose} style={{ background: 'transparent', color: TOKENS.textMuted, border: 'none', padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        <button
          onClick={submit}
          disabled={!reasonValid || submitting}
          style={{
            background: 'transparent', color: TOKENS.threshold.red,
            border: `1px solid ${TOKENS.threshold.red}`, borderRadius: 8,
            padding: '10px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
            cursor: (reasonValid && !submitting) ? 'pointer' : 'not-allowed',
            opacity: (reasonValid && !submitting) ? 1 : 0.4,
            transition: `all ${MOTION.fast}`, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Unlinking…' : 'Unlink'}
        </button>
      </div>
    </DialogShell>
  );
}
