"use client";
import React, { useEffect, useRef } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface ThresholdPillProps {
  color: string;
  size?: number;
}

export function ThresholdPill({ color, size = 8 }: ThresholdPillProps) {
  const prevColor = useRef(color);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prevColor.current !== color && ref.current) {
      ref.current.animate(
        [
          { transform: 'scale(1)',   boxShadow: `0 0 ${size}px ${color}` },
          { transform: 'scale(1.6)', boxShadow: `0 0 ${size * 2}px ${color}` },
          { transform: 'scale(1)',   boxShadow: `0 0 ${size}px ${color}` },
        ],
        { duration: 600, easing: 'cubic-bezier(0.4,0,0.2,1)' },
      );
      prevColor.current = color;
    }
  }, [color, size]);

  return (
    <span
      ref={ref}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size}px ${color}`,
        position: 'absolute',
        top: 14,
        right: 14,
        transition: `background ${MOTION.fast}`,
      }}
      aria-hidden
    />
  );
}
