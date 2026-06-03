"use client";
import React from 'react';
import { Target, MagnifyingGlass, Waves, ChartBar } from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { FilterBar } from '@/components/DataHub/shared/FilterBar';

const accent = "#00c896";
const accentDim = "rgba(0,200,150,0.15)";
const accentBorder = "rgba(0,200,150,0.2)";
const bg = "#030d0a";

export type TopView = 'funnels' | 'attribution' | 'cohorts' | 'raw';

const TABS: Array<{ id: TopView; label: string; Icon: PhosphorIcon }> = [
  { id: 'funnels',     label: 'Funnels',            Icon: Target },
  { id: 'attribution', label: 'Source Attribution', Icon: MagnifyingGlass },
  { id: 'cohorts',     label: 'Trader Cohorts',     Icon: Waves },
  { id: 'raw',         label: 'Raw Data',           Icon: ChartBar },
];

export function LayoutShell({
  activeView, onChangeView, children,
}: { activeView: TopView; onChangeView: (v: TopView) => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>SHIFT RWA — Data Hub</div>
          <div style={{ color: '#3a7060', fontSize: 12, marginTop: 2 }}>Funnel & Attribution Platform</div>
        </div>
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
      </header>
      <div style={{ marginBottom: 16 }}>
        <FilterBar />
      </div>
      <main>{children}</main>
    </div>
  );
}
