"use client";
import React from 'react';
import { FUNNEL_DISPLAY, getStepBenchmark, type FunnelId } from '@/lib/funnelTaxonomy';
import { thresholdColor } from '@/lib/chartTokens';
import { FunnelStepBar } from './FunnelStepBar';
import { DropoffArrow } from './DropoffArrow';

export interface FunnelStep {
  id: string;
  name: string;
  count: number;
  uniqueWallets?: number;
  conversionFromPrev: number;
  conversionFromFirst: number;
  vs7dDelta?: number;
  benchmark?: number;
}

export interface AnimatedFunnelProps {
  funnelId: FunnelId;
  steps: FunnelStep[];
  activeStepId?: string;
  onStepClick?: (stepId: string) => void;
}

export function AnimatedFunnel({ funnelId, steps, activeStepId, onStepClick }: AnimatedFunnelProps) {
  if (!steps || steps.length === 0) return null;
  const firstCount = steps[0]?.count ?? 1;
  const display = FUNNEL_DISPLAY[funnelId];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => {
        const widthPct = firstCount > 0 ? Math.max(0, Math.min(100, (step.count / firstCount) * 100)) : 0;
        const benchmark = getStepBenchmark(funnelId, i);
        const tColor = i > 0 && benchmark
          ? thresholdColor(step.conversionFromPrev, benchmark)
          : undefined;

        const previousCount = i > 0 ? steps[i - 1].count : null;
        const dropAbs = previousCount !== null ? Math.max(0, previousCount - step.count) : 0;
        const displayName = display.steps[i]?.name ?? step.name;

        return (
          <React.Fragment key={step.id}>
            <FunnelStepBar
              name={displayName}
              count={step.count}
              widthPct={widthPct}
              stepIndex={i}
              conversionFromPrev={i > 0 ? step.conversionFromPrev : undefined}
              thresholdColor={tColor}
              active={activeStepId === step.id}
              onClick={onStepClick ? () => onStepClick(step.id) : undefined}
            />
            {i < steps.length - 1 && previousCount !== null && (
              <DropoffArrow
                dropPct={100 - steps[i + 1].conversionFromPrev}
                dropAbsolute={Math.max(0, step.count - steps[i + 1].count)}
                thresholdColor={
                  getStepBenchmark(funnelId, i + 1)
                    ? thresholdColor(steps[i + 1].conversionFromPrev, getStepBenchmark(funnelId, i + 1)!)
                    : undefined
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
