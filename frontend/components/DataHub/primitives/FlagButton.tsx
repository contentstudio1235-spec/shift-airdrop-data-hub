"use client";
// ============================================================
// FlagButton — Workflow 1 NODE 1 (the discovery edge)
//
// The whole trust-floor sequence collapses if the marketer who notices a
// wrong number has nowhere to put that signal in <30s. This is that place.
//
// Visual contract:
//   - Phosphor Flag icon, regular weight, 10px, color textFaint
//   - Position: absolute, top:-4, right:-12 of parent — sits in negative space
//   - Opacity 0 by default; opacity 1 on parent :hover
//   - Click → inline dialog (NOT a modal) with read-only context + textarea
//   - "Flag for review" → POST /api/hub-trust/flags (fire-and-forget)
//   - Closes inline + 3s toast "Flagged — triage owner notified"
//
// The PARENT must be `position: relative` for the absolute positioning to
// anchor correctly. Wrap any numeric cell in a relative container.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flag } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { useHubSession } from '@/hooks/useHubSession';

/**
 * FLAG_AFFORDANCE_HOST_CLASS — apply to the parent element that should reveal
 * the FlagButton on hover. Parent must also be `position: relative`.
 * Example:
 *   <div className={FLAG_AFFORDANCE_HOST_CLASS} style={{ position: 'relative' }}>
 *     ...value...
 *     <FlagButton tab="..." metricId="..." displayedValue={...} />
 *   </div>
 */
export const FLAG_AFFORDANCE_HOST_CLASS = 'flag-affordance-host';

/**
 * FlagAffordanceStyles — injects the hover rule once. Mount near the Hub root
 * (the data-hub page) so that every host on the page reveals its flag button
 * on parent hover. Idempotent; safe to mount multiple times.
 */
export function FlagAffordanceStyles() {
  return (
    <style>{`
      .${FLAG_AFFORDANCE_HOST_CLASS} .flag-button { opacity: 0; }
      .${FLAG_AFFORDANCE_HOST_CLASS}:hover .flag-button,
      .${FLAG_AFFORDANCE_HOST_CLASS} .flag-button:focus { opacity: 1; }
      .${FLAG_AFFORDANCE_HOST_CLASS} .flag-button.flag-button--open { opacity: 1; }
    `}</style>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'ShiftRwa2026@@$$Key';

export interface FlagButtonProps {
  /** Canonical tab identifier — see HUB_TABS. */
  tab: string;
  /** Stable metric ID — see HUB_METRIC_IDS. */
  metricId: string;
  /** The exact value the user is seeing (already formatted). */
  displayedValue: string | number;
  /** Freshness timestamp the user is seeing, if known. */
  asOf?: string | null;
  /** Optional override of the hub role label, defaults to context. */
  hubRole?: string;
}

/**
 * FlagButton — the in-Hub discovery affordance from Workflow 1 NODE 1.
 *
 * Renders a hidden flag icon in the parent's top-right negative space.
 * Parent must be `position: relative`. CSS-driven hover reveal:
 * `.flag-button-container:has-parent-hover { opacity: 1 }`. We can't use the
 * native `:has()` selector for backwards compat with older Safari, so the
 * project convention is to style `.flag-affordance-host:hover .flag-button`.
 *
 * For the hover affordance to work, the parent should have the class
 * `flag-affordance-host`. The CSS is injected once globally below.
 */
export function FlagButton({
  tab,
  metricId,
  displayedValue,
  asOf,
  hubRole,
}: FlagButtonProps) {
  const { sessionId, recordEvent } = useHubSession();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [toast, setToast] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close-on-outside-click + ESC-to-close for the inline dialog
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Cleanup toast timer
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const submit = useCallback(() => {
    // Fire-and-forget POST. Optimistic toast — show immediately.
    try {
      void fetch(`${API_BASE}/api/hub-trust/flags`, {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId ?? null,
          hubRole: hubRole ?? null,
          tab,
          metricId,
          displayedValue: String(displayedValue),
          asOf: asOf ?? null,
          comment: comment.trim() || null,
        }),
        keepalive: true,
      }).catch(() => {
        /* swallow — best-effort */
      });
    } catch {
      /* swallow */
    }

    // Telemetry breadcrumb
    recordEvent('flag_filed', { tab, metadata: { metricId } });

    // Close + toast
    setOpen(false);
    setComment('');
    setToast(true);
    toastTimerRef.current = setTimeout(() => setToast(false), 3000);
  }, [sessionId, hubRole, tab, metricId, displayedValue, asOf, comment, recordEvent]);

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    top: -4,
    right: -12,
    width: 18,
    height: 18,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    // CSS-driven hover reveal handles the opacity in non-test environments via
    // FLAG_AFFORDANCE_HOST_CLASS. The inline `opacity: 0` here is the
    // fallback for hosts that forget the class (and for jsdom tests, which
    // don't compute :hover). When the dialog is open, force visible.
    opacity: open ? 1 : 0,
    transition: 'opacity 120ms ease-out',
    fontFamily: 'inherit',
  };

  return (
    <>
      <button
        type="button"
        className={`flag-button${open ? ' flag-button--open' : ''}`}
        aria-label={`Flag ${metricId} for review`}
        style={buttonStyle}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
      >
        <Flag size={10} weight="regular" color={TOKENS.textFaint} aria-hidden />
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Flag metric for review"
          className="flag-dialog"
          style={dialogStyle}
          onClick={e => e.stopPropagation()}
        >
          <div style={dialogHeaderStyle}>Flag this number</div>
          <div style={contextRowStyle}>
            <span style={contextLabelStyle}>Tab</span>
            <span style={contextValueStyle}>{tab}</span>
          </div>
          <div style={contextRowStyle}>
            <span style={contextLabelStyle}>Metric</span>
            <span style={contextValueStyle}>{metricId}</span>
          </div>
          <div style={contextRowStyle}>
            <span style={contextLabelStyle}>Value</span>
            <span style={contextValueStyle}>{String(displayedValue)}</span>
          </div>
          {asOf && (
            <div style={contextRowStyle}>
              <span style={contextLabelStyle}>As of</span>
              <span style={contextValueStyle}>{asOf}</span>
            </div>
          )}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Why does this look wrong? (optional)"
            rows={3}
            style={textareaStyle}
            aria-label="Why does this look wrong?"
          />
          <div style={actionRowStyle}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
            <button type="button" onClick={submit} style={submitButtonStyle}>
              Flag for review
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" style={toastStyle}>
          Flagged — triage owner notified
        </div>
      )}
    </>
  );
}

// ── Styles ───────────────────────────────────────────────

const dialogStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: -12,
  zIndex: 50,
  width: 280,
  padding: 12,
  background: TOKENS.panelDeep,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontFamily: 'inherit',
};

const dialogHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: TOKENS.textFaint,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 2,
};

const contextRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
};

const contextLabelStyle: React.CSSProperties = {
  color: TOKENS.textFaint,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const contextValueStyle: React.CSSProperties = {
  color: TOKENS.textPrimary,
  fontWeight: 600,
  textAlign: 'right',
  maxWidth: 180,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 4,
  padding: 8,
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 6,
  color: TOKENS.textPrimary,
  fontSize: 12,
  fontFamily: 'inherit',
  resize: 'vertical',
  outline: 'none',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 4,
};

const cancelButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: TOKENS.textMuted,
  border: 'none',
  padding: '6px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const submitButtonStyle: React.CSSProperties = {
  background: TOKENS.accentDim,
  color: TOKENS.accent,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 200,
  padding: '10px 14px',
  background: TOKENS.panelDeep,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8,
  color: TOKENS.accent,
  fontSize: 12,
  fontWeight: 700,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  fontFamily: 'inherit',
};
