"use client";
import React from 'react';
import { Pulse, Target, MagnifyingGlass, Waves, UserCircle, Gear } from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { FilterBar } from '@/components/DataHub/shared/FilterBar';

const accent = "#00c896";
const accentDim = "rgba(0,200,150,0.15)";
const accentBorder = "rgba(0,200,150,0.2)";
const bg = "#030d0a";

// Single source of truth for top-level Data Hub views. Both the TypeScript
// union type and the runtime validation guard derive from this one array, so
// adding a new view here automatically updates the union, the guard, the
// URL-param validation in `useTopViewFromUrl`, and the initialView IIFE in
// `data-hub/page.tsx`. Closes MR !28 Fix 2.
export const TOP_VIEWS = ['pulse', 'funnels', 'attribution', 'cohorts', 'users', 'raw'] as const;
export type TopView = (typeof TOP_VIEWS)[number];

export function isValidTopView(v: string | null | undefined): v is TopView {
  return !!v && (TOP_VIEWS as readonly string[]).includes(v);
}

// Main outer-tab nav (Sprint 1+ views). Raw Data is intentionally NOT here —
// it has been demoted to a quiet "Engineering" gear toggle in the top-right.
// Pulse is the leftmost default tab — the "what changed since yesterday" overview.
// See docs/design/2026-06-05-data-hub-ia-redesign.md.
const TABS: Array<{ id: TopView; label: string; Icon: PhosphorIcon }> = [
  { id: 'pulse',       label: 'Pulse',              Icon: Pulse },
  { id: 'funnels',     label: 'Funnels',            Icon: Target },
  { id: 'attribution', label: 'Source Attribution', Icon: MagnifyingGlass },
  { id: 'cohorts',     label: 'Trader Cohorts',     Icon: Waves },
  { id: 'users',       label: 'Users',              Icon: UserCircle },
];

export function LayoutShell({
  activeView, onChangeView, children,
}: { activeView: TopView; onChangeView: (v: TopView) => void; children: React.ReactNode }) {
  const engineeringActive = activeView === 'raw';
  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>SHIFT RWA — Data Hub</div>
          <div style={{ color: '#3a7060', fontSize: 12, marginTop: 2 }}>Funnel & Attribution Platform</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <nav style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, border: `1px solid ${accentBorder}` }}>
            {TABS.map(t => {
              const active = activeView === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onChangeView(t.id)}
                  style={{
                    background: active ? accentDim : 'transparent',
                    color: active ? accent : '#5a9070',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    fontFamily: 'inherit',
                    transition: 'all 120ms ease-out',
                  }}
                >
                  <t.Icon weight="regular" size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
          {/* Vertical divider separating main tabs from Engineering toggle */}
          <div
            aria-hidden="true"
            style={{ width: 1, height: 22, background: accentBorder }}
          />
          {/* Engineering gear — quiet secondary action. Opens legacy Raw Data 6-tab view. */}
          <button
            type="button"
            onClick={() => onChangeView('raw')}
            aria-pressed={engineeringActive}
            title="Engineering — legacy Raw Data dashboard"
            style={{
              background: engineeringActive ? accentDim : 'transparent',
              color: engineeringActive ? accent : '#5a9070',
              border: '1px solid transparent',
              borderBottom: engineeringActive ? `1px solid ${accent}` : '1px solid transparent',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
              fontFamily: 'inherit',
              transition: 'all 120ms ease-out',
            }}
            onMouseEnter={(e) => {
              if (!engineeringActive) {
                e.currentTarget.style.borderBottom = `1px solid ${accent}`;
                e.currentTarget.style.color = accent;
              }
            }}
            onMouseLeave={(e) => {
              if (!engineeringActive) {
                e.currentTarget.style.borderBottom = '1px solid transparent';
                e.currentTarget.style.color = '#5a9070';
              }
            }}
          >
            <Gear weight="regular" size={14} />
            <span>Engineering</span>
          </button>
        </div>
      </header>
      <div style={{ marginBottom: 16 }}>
        <FilterBar />
      </div>
      <main>{children}</main>
    </div>
  );
}
