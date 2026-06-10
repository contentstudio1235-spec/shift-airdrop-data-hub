"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { ChartFrame } from '../primitives/ChartFrame';
import type { FunnelStep } from './AnimatedFunnel';

export interface PerStepDrillDownProps {
  step: FunnelStep;
  stepIndex: number;
  prevStep?: FunnelStep;
  benchmark?: { red: number; yellow: number; green: number };
  insight?: string;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        color: TOKENS.textFaint,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontSize: 16,
        color: TOKENS.textPrimary,
        fontWeight: 700,
        marginTop: 4,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  );
}

export function PerStepDrillDown({ step, stepIndex, prevStep, benchmark, insight }: PerStepDrillDownProps) {
  const dropPct = prevStep ? 100 - step.conversionFromPrev : 0;
  const dropAbs = prevStep ? Math.max(0, prevStep.count - step.count) : 0;

  return (
    <ChartFrame title={`Step ${stepIndex + 1}: ${step.name}`} padding={20}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        marginBottom: 16,
      }}>
        <Stat label="Count" value={step.count.toLocaleString()} />
        <Stat label="From previous" value={`${step.conversionFromPrev.toFixed(1)}%`} />
        <Stat label="From first" value={`${step.conversionFromFirst.toFixed(1)}%`} />
        {prevStep && <Stat label="Dropped" value={`${dropAbs.toLocaleString()} (${dropPct.toFixed(1)}%)`} />}
        {step.vs7dDelta !== undefined && step.vs7dDelta !== 0 && (
          <Stat label="vs 7d delta" value={`${step.vs7dDelta > 0 ? '+' : ''}${step.vs7dDelta.toFixed(1)}%`} />
        )}
        {benchmark && (
          <Stat label="Benchmark" value={`green ≥ ${benchmark.green}%`} />
        )}
      </div>
      {insight && (
        <div style={{
          padding: 12,
          background: 'rgba(0,200,150,0.05)',
          border: `1px solid ${TOKENS.accentBorder}`,
          borderRadius: 8,
          fontSize: 12,
          color: TOKENS.textPrimary,
          lineHeight: 1.5,
        }}>
          {insight}
        </div>
      )}
      <div style={{
        marginTop: 16,
        fontSize: 11,
        color: TOKENS.textFaint,
        fontStyle: 'italic',
      }}>
        Wallet-cohort drill-down (50 rows, paginated) lands in Sprint 3.
      </div>
    </ChartFrame>
  );
}
