import { describe, it, expect } from 'vitest';
import { TOKENS, MOTION, thresholdColor } from '../chartTokens';

describe('TOKENS', () => {
  it('exposes the single accent color', () => {
    expect(TOKENS.accent).toBe('#00c896');
  });
  it('has red/yellow/green threshold colors', () => {
    expect(TOKENS.threshold.green).toBe('#5ee0a8');
    expect(TOKENS.threshold.yellow).toBe('#ff9a3c');
    expect(TOKENS.threshold.red).toBe('#ff5a5a');
  });
});

describe('MOTION', () => {
  it('exposes fast/medium/slow easing tokens', () => {
    expect(MOTION.fast).toBe('120ms ease-out');
    expect(MOTION.medium).toContain('400ms');
    expect(MOTION.slow).toContain('1200ms');
  });
});

describe('thresholdColor', () => {
  it('returns green when value >= green threshold', () => {
    expect(thresholdColor(20, { red: -10, yellow: -5, green: 10 })).toBe(TOKENS.threshold.green);
  });
  it('returns yellow when in yellow band', () => {
    expect(thresholdColor(0, { red: -10, yellow: -5, green: 10 })).toBe(TOKENS.threshold.yellow);
  });
  it('returns red when below red threshold', () => {
    expect(thresholdColor(-20, { red: -10, yellow: -5, green: 10 })).toBe(TOKENS.threshold.red);
  });
});
