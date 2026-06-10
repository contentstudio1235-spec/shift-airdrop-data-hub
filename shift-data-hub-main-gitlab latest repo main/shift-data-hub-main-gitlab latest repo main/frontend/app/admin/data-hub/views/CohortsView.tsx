"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function CohortsView() {
  return (
    <div style={{ background: panel, border: `1px solid ${accentBorder}`, borderRadius: 16, backdropFilter: 'blur(12px)', padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🐋</div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Trader Cohorts — Sprint 3</div>
      <div style={{ color: '#3a7060', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
        Whale Watch live ticker, retention heatmap, behavior segments, churn risk — all land in Sprint 3.
      </div>
    </div>
  );
}
