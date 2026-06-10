"use client";
import React, { useMemo, useState } from 'react';
import { Link, Copy, Check } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { DialogShell } from '../users/DialogShell';
import {
  useCampaigns,
  type CampaignInput,
} from '@/hooks/useCampaigns';

// ──────────────────────────────────────────────────────────────────────────────
// CampaignBuilderDialog — Operator-facing form to mint a fully-tagged campaign
// URL and persist it to the campaigns log.
//
// Design constraints (see docs/design/2026-06-05-utm-attribution-a-to-z.md §F):
//   - Required dropdowns for utm_source and utm_medium are populated from the
//     approved-values list — no free text.
//   - utm_campaign is free text but live-validated against /^[a-z0-9-]+$/ to
//     enforce the naming convention.
//   - Live preview at the bottom updates on every keystroke.
//   - Templates row pre-fills source + medium for the three most common
//     SHIFT marketing patterns (Paid Twitter, Sponsored Content, KOL Post).
// ──────────────────────────────────────────────────────────────────────────────

const CAMPAIGN_NAME_RE = /^[a-z0-9-]+$/;
const DESIGN_DOC_PATH = 'docs/design/2026-06-05-utm-attribution-a-to-z.md';

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: TOKENS.textPrimary,
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  color: TOKENS.textFaint,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: TOKENS.textFaint,
  marginTop: 4,
};

const errorHintStyle: React.CSSProperties = {
  ...hintStyle,
  color: TOKENS.threshold.yellow,
};

export interface CampaignBuilderDialogProps {
  sources: string[];
  mediums: string[];
  approvedLoading: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  displayName: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  notes: string;
  budgetUsd: string;
  expectedReach: string;
}

const INITIAL_STATE: FormState = {
  displayName: '',
  destinationUrl: 'https://shiftrwa.xyz/register',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  notes: '',
  budgetUsd: '',
  expectedReach: '',
};

interface Template {
  id: string;
  label: string;
  source?: string;
  medium: string;
}

const TEMPLATES: Template[] = [
  { id: 'paid-twitter', label: 'Paid Twitter Ad', source: 'twitter', medium: 'paid-social' },
  { id: 'sponsored', label: 'Sponsored Content', medium: 'referral' },
  { id: 'kol', label: 'KOL Post', medium: 'kol' },
];

function buildPreview(state: FormState): string {
  const dest = state.destinationUrl || '';
  if (!dest) return '';
  const params: string[] = [];
  if (state.utmSource) params.push(`utm_source=${encodeURIComponent(state.utmSource)}`);
  if (state.utmMedium) params.push(`utm_medium=${encodeURIComponent(state.utmMedium)}`);
  if (state.utmCampaign) params.push(`utm_campaign=${encodeURIComponent(state.utmCampaign)}`);
  if (state.utmContent) params.push(`utm_content=${encodeURIComponent(state.utmContent)}`);
  if (state.utmTerm) params.push(`utm_term=${encodeURIComponent(state.utmTerm)}`);
  return params.length === 0 ? dest : `${dest}${dest.includes('?') ? '&' : '?'}${params.join('&')}`;
}

export function CampaignBuilderDialog({
  sources,
  mediums,
  approvedLoading,
  onClose,
  onSuccess,
}: CampaignBuilderDialogProps) {
  const campaigns = useCampaigns();
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const applyTemplate = (tpl: Template) => {
    setState(prev => ({
      ...prev,
      utmSource: tpl.source ?? '',
      utmMedium: tpl.medium,
    }));
  };

  const previewUrl = useMemo(() => buildPreview(state), [state]);

  const campaignNameValid = state.utmCampaign.length === 0 || CAMPAIGN_NAME_RE.test(state.utmCampaign);
  const destinationValid = /^https?:\/\/.+/.test(state.destinationUrl);

  const canSubmit =
    !submitting &&
    state.displayName.trim().length > 0 &&
    destinationValid &&
    state.utmSource.length > 0 &&
    state.utmMedium.length > 0 &&
    state.utmCampaign.length > 0 &&
    campaignNameValid;

  async function submit() {
    setSubmitting(true);
    setError(null);
    const input: CampaignInput = {
      displayName: state.displayName.trim(),
      destinationUrl: state.destinationUrl.trim(),
      utmSource: state.utmSource,
      utmMedium: state.utmMedium,
      utmCampaign: state.utmCampaign.trim(),
      utmContent: state.utmContent.trim() || null,
      utmTerm: state.utmTerm.trim() || null,
      notes: state.notes.trim() || null,
      budgetUSD: state.budgetUsd ? Number(state.budgetUsd) : null,
      expectedReach: state.expectedReach ? Number(state.expectedReach) : null,
    };
    const result = await campaigns.create(input);
    setSubmitting(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error);
    }
  }

  async function copyPreview() {
    if (!previewUrl) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(previewUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard rejected — leave the icon as-is.
    }
  }

  return (
    <DialogShell title="Build Campaign URL" subtitle="Mint a fully-tagged URL and log it to the campaigns table." width={640} onClose={onClose}>
      {/* Templates row */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Templates</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              style={{
                background: 'transparent',
                border: `1px solid ${TOKENS.accentBorder}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: TOKENS.accent,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: `all ${MOTION.fast}`,
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Display name */}
        <div>
          <label style={labelStyle}>
            Display Name <span style={{ color: TOKENS.accent }}>*</span>
          </label>
          <input
            type="text"
            value={state.displayName}
            onChange={e => update('displayName', e.target.value)}
            placeholder="Cobie pinned tweet for TSL2L launch"
            style={inputStyle}
          />
        </div>

        {/* Destination URL */}
        <div>
          <label style={labelStyle}>
            Destination URL <span style={{ color: TOKENS.accent }}>*</span>
          </label>
          <input
            type="url"
            value={state.destinationUrl}
            onChange={e => update('destinationUrl', e.target.value)}
            placeholder="https://shiftrwa.xyz/register"
            style={inputStyle}
          />
          {!destinationValid && state.destinationUrl.length > 0 && (
            <div style={errorHintStyle}>Must start with http:// or https://</div>
          )}
        </div>

        {/* Source + Medium row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>
              utm_source <span style={{ color: TOKENS.accent }}>*</span>
            </label>
            <select
              value={state.utmSource}
              onChange={e => update('utmSource', e.target.value)}
              style={inputStyle}
              disabled={approvedLoading}
            >
              <option value="">{approvedLoading ? 'Loading…' : 'Select source'}</option>
              {sources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div style={hintStyle}>
              Need a new source?{' '}
              <a
                href={`/${DESIGN_DOC_PATH}`}
                style={{ color: TOKENS.accent, textDecoration: 'underline' }}
                target="_blank"
                rel="noreferrer"
              >
                Request via the exception process
              </a>
            </div>
          </div>
          <div>
            <label style={labelStyle}>
              utm_medium <span style={{ color: TOKENS.accent }}>*</span>
            </label>
            <select
              value={state.utmMedium}
              onChange={e => update('utmMedium', e.target.value)}
              style={inputStyle}
              disabled={approvedLoading}
            >
              <option value="">{approvedLoading ? 'Loading…' : 'Select medium'}</option>
              {mediums.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campaign name */}
        <div>
          <label style={labelStyle}>
            utm_campaign <span style={{ color: TOKENS.accent }}>*</span>
          </label>
          <input
            type="text"
            value={state.utmCampaign}
            onChange={e => update('utmCampaign', e.target.value.toLowerCase())}
            placeholder="tsl2l-launch-2026q2"
            style={{
              ...inputStyle,
              borderColor: campaignNameValid ? TOKENS.accentBorder : TOKENS.threshold.yellow,
            }}
          />
          <div style={campaignNameValid ? hintStyle : errorHintStyle}>
            Lowercase letters, digits, and hyphens only — see naming convention
          </div>
        </div>

        {/* Optional content + term */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>utm_content</label>
            <input
              type="text"
              value={state.utmContent}
              onChange={e => update('utmContent', e.target.value)}
              placeholder="pinned-tweet-v1"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>utm_term</label>
            <input
              type="text"
              value={state.utmTerm}
              onChange={e => update('utmTerm', e.target.value)}
              placeholder="(optional)"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={state.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Context, owner notes, A/B variant rationale…"
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          />
        </div>

        {/* Budget + Expected reach */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Budget (USD)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={state.budgetUsd}
              onChange={e => update('budgetUsd', e.target.value)}
              placeholder="2500"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Expected Reach</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={state.expectedReach}
              onChange={e => update('expectedReach', e.target.value)}
              placeholder="50000"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Live preview */}
        <div style={{ marginTop: 6 }}>
          <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link size={11} weight="bold" /> Live preview
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 8,
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <code
              data-testid="utm-preview"
              style={{
                flex: 1,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                color: previewUrl ? TOKENS.textPrimary : TOKENS.textFaint,
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}
            >
              {previewUrl || 'Fill in source, medium, and campaign to see the URL'}
            </code>
            <button
              type="button"
              onClick={copyPreview}
              disabled={!previewUrl}
              aria-label="Copy preview URL"
              style={{
                background: 'transparent',
                border: `1px solid ${TOKENS.accentBorder}`,
                borderRadius: 6,
                color: copied ? TOKENS.threshold.green : TOKENS.accent,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 700,
                cursor: previewUrl ? 'pointer' : 'not-allowed',
                opacity: previewUrl ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
                transition: `all ${MOTION.fast}`,
              }}
            >
              {copied ? <Check size={11} weight="bold" /> : <Copy size={11} weight="bold" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 10,
              background: 'rgba(255,90,90,0.08)',
              border: `1px solid rgba(255,90,90,0.3)`,
              borderRadius: 8,
              fontSize: 11,
              color: TOKENS.threshold.red,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        <button
          onClick={onClose}
          type="button"
          style={{
            background: 'transparent',
            color: TOKENS.textMuted,
            border: 'none',
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          type="button"
          data-testid="submit-campaign"
          style={{
            background: TOKENS.accent,
            color: TOKENS.bg,
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.02em',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.4,
            transition: `all ${MOTION.fast}`,
            fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Saving…' : 'Save Campaign'}
        </button>
      </div>
    </DialogShell>
  );
}
