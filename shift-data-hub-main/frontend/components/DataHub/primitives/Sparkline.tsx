"use client";
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TOKENS } from '@/lib/chartTokens';

export interface SparklineProps {
  data: Array<{ date: string; value: number }>;
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = TOKENS.accent, height = 40 }: SparklineProps) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
