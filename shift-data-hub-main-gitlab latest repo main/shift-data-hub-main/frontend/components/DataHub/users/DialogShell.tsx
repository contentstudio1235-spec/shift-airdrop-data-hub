"use client";
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TOKENS } from '@/lib/chartTokens';

export interface DialogShellProps {
  title: string;
  subtitle?: string;
  width: number;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  destructiveBorder?: boolean;
  children: React.ReactNode;
}

export function DialogShell({ title, subtitle, width, onClose, closeOnBackdrop = true, destructiveBorder = false, children }: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const content = (
    <div
      onClick={() => { if (closeOnBackdrop) onClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'dialog-backdrop-fade 200ms ease-out',
      }}
      role="presentation"
    >
      <style>{`
        @keyframes dialog-backdrop-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dialog-panel-in { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
      `}</style>
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={{
          width, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
          background: TOKENS.panel, backdropFilter: 'blur(12px)',
          border: `1px solid ${destructiveBorder ? TOKENS.threshold.red : TOKENS.accentBorder}`,
          borderRadius: 16, padding: 24,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          animation: 'dialog-panel-in 400ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <h2 id="dialog-title" style={{
          fontSize: 18, fontWeight: 800, color: TOKENS.textPrimary,
          letterSpacing: '-0.02em', margin: 0, marginBottom: subtitle ? 4 : 16,
        }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: 11, color: TOKENS.textMuted, margin: 0, marginBottom: 16 }}>{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
  return createPortal(content, document.body);
}
