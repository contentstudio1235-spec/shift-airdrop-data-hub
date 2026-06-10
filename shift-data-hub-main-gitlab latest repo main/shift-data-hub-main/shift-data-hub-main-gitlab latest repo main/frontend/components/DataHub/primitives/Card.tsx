"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
}

export function Card({ children, padding = 20 }: CardProps) {
  return (
    <div style={{
      background: TOKENS.panel,
      border: `1px solid ${TOKENS.accentBorder}`,
      borderRadius: 16,
      backdropFilter: `blur(${TOKENS.glassBlur})`,
      WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
      padding,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}>
      {children}
    </div>
  );
}
