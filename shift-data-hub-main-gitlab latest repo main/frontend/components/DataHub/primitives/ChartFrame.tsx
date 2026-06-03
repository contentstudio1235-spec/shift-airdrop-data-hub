"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { Card } from './Card';
import { ThresholdPill } from './ThresholdPill';

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  thresholdColor?: string;
  children: React.ReactNode;
  rightActions?: React.ReactNode;
  padding?: number;
}

export function ChartFrame({
  title, subtitle, thresholdColor, children, rightActions, padding,
}: ChartFrameProps) {
  return (
    <Card padding={padding}>
      {thresholdColor && <ThresholdPill color={thresholdColor} />}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: TOKENS.textFaint,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {rightActions}
      </div>
      <div>{children}</div>
    </Card>
  );
}
