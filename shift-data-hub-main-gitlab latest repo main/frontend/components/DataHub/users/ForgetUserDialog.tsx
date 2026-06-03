"use client";
import React, { useState } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { ShieldWarning } from '@phosphor-icons/react';
import { DialogShell } from './DialogShell';
import { useIdentityActions } from '@/hooks/useIdentityActions';

export function ForgetUserDialog({ profileId, primaryWallet, onClose, onSuccess }: { profileId: string; primaryWallet: string; onClose: () => void; onSuccess: () => void }) {
  const actions = useIdentityActions();
  const [walletInput, setWalletInput] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletMatches = walletInput === primaryWallet;
  const reasonValid = reason.trim().length >= 20;
  const canSubmit = walletMatches && reasonValid;

  async function submit() {
    setSubmitting(true);
    setError(null);
    const r = await actions.forgetUser(profileId, reason);
    setSubmitting(false);
    if (r.ok) onSuccess();
    else setError(r.error.message);
  }

  return (
    <DialogShell
      title="Forget User (GDPR)"
      width={480}
      onClose={onClose}
      closeOnBackdrop={false}
      destructiveBorder
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: 12, background: 'rgba(255,90,90,0.1)',
        border: `1px solid rgba(255,90,90,0.3)`, borderRadius: 8, marginBottom: 20,
      }}>
        <ShieldWarning size={20} weight="regular" color={TOKENS.threshold.red} />
        <div style={{ fontSize: 11, color: TOKENS.textPrimary, lineHeight: 1.5 }}>
          This nullifies identifiable columns (display_name, country_code, wallet_type, referrer, landing_path) and deletes all identity_links. The profile row and attribution_events are <strong>RETAINED in anonymized form</strong> for analytics continuity. This action is logged in admin_logs and is <strong>irreversible</strong>.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            Type the primary wallet to confirm
          </label>
          <input
            type="text"
            value={walletInput}
            onChange={e => setWalletInput(e.target.value)}
            placeholder={primaryWallet}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${walletInput.length === 0 ? TOKENS.accentBorder : walletMatches ? TOKENS.threshold.green : TOKENS.threshold.red}`,
              borderRadius: 8, padding: '10px 12px', color: TOKENS.textPrimary,
              fontSize: 12, fontFamily: 'monospace', outline: 'none',
            }}
          />
          {walletInput.length > 0 && !walletMatches && (
            <div style={{ fontSize: 11, color: TOKENS.threshold.red, marginTop: 4 }}>Wallet doesn&apos;t match</div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            Reason (min 20 chars)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why are you forgetting this user? (e.g., 'GDPR Article 17 request received 2026-06-03 from user@example.com')"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.4)', border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: 8, padding: '10px 12px', color: TOKENS.textPrimary,
              fontSize: 12, fontFamily: 'inherit', outline: 'none',
              minHeight: 80, resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11, color: reasonValid ? TOKENS.accent : TOKENS.threshold.red, marginTop: 4 }}>
            {reason.trim().length} / minimum 20 characters
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
          {submitting ? 'Forgetting…' : 'Forget user'}
        </button>
      </div>
    </DialogShell>
  );
}
