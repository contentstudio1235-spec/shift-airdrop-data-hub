// ============================================================
// launchThisWeekService — unit tests
// ============================================================
// Tests the confidence-gate logic and the in-memory cache. Does
// NOT cover the SQL itself — those queries hit live tables that
// the existing reconciliation suite already validates end-to-end.
// MR !31 follow-up to MR !30 Code Reviewer nit #6.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  _passesConfidenceGate,
  _clearLaunchThisWeekCache,
} from '../launchThisWeekService';

describe('_passesConfidenceGate', () => {
  describe('paid mediums (cpc, paid-social, display) — gate on signups ≥ 50', () => {
    it('passes when signups exactly hit the threshold', () => {
      const result = _passesConfidenceGate({ medium: 'cpc', signups: 50, holders: 0 });
      expect(result.pass).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('fails one short, with a precise remaining-count reason', () => {
      const result = _passesConfidenceGate({ medium: 'paid-social', signups: 49, holders: 0 });
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('needs 1 more signups (49/50)');
    });

    it('display medium also gates on signups, ignoring holders', () => {
      const result = _passesConfidenceGate({ medium: 'display', signups: 30, holders: 100 });
      expect(result.pass).toBe(false);
      // Holders=100 must NOT short-circuit a paid-medium signup gate
      expect(result.reason).toContain('signups');
    });
  });

  describe('KOL / affiliate mediums — gate on holders ≥ 20', () => {
    it('passes a small-but-converting KOL row at exactly 20 holders', () => {
      const result = _passesConfidenceGate({ medium: 'kol', signups: 30, holders: 20 });
      expect(result.pass).toBe(true);
    });

    it('fails when KOL has volume but no holders', () => {
      const result = _passesConfidenceGate({ medium: 'kol', signups: 500, holders: 5 });
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('needs 15 more holders (5/20)');
    });

    it('affiliate uses the same holder gate as KOL', () => {
      const result = _passesConfidenceGate({ medium: 'affiliate', signups: 100, holders: 19 });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('holders');
    });
  });

  describe('other mediums (organic, referral, email, social) — gate on signups ≥ 30', () => {
    it('passes referral at exactly 30 signups', () => {
      const result = _passesConfidenceGate({ medium: 'referral', signups: 30, holders: 0 });
      expect(result.pass).toBe(true);
    });

    it('email row fails one short', () => {
      const result = _passesConfidenceGate({ medium: 'email', signups: 29, holders: 0 });
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('needs 1 more signups (29/30)');
    });

    it('null medium falls into the OTHER bucket (signups ≥ 30)', () => {
      // Defensive: a campaign with no utm_medium shouldn't bypass gates entirely.
      const result = _passesConfidenceGate({ medium: null, signups: 29, holders: 200 });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('signups');
    });

    it('null medium passes at the OTHER threshold', () => {
      const result = _passesConfidenceGate({ medium: null, signups: 30, holders: 0 });
      expect(result.pass).toBe(true);
    });
  });

  describe('regression pins for medium-specific selection', () => {
    it('cpc is paid (signups gate), NOT other (would also be 30 — different number)', () => {
      // cpc with 30 signups should FAIL (paid gate is 50), not pass (other gate is 30)
      const result = _passesConfidenceGate({ medium: 'cpc', signups: 30, holders: 0 });
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('needs 20 more signups (30/50)');
    });

    it('kol with high signups but no holders does NOT short-circuit via signups', () => {
      const result = _passesConfidenceGate({ medium: 'kol', signups: 1000, holders: 0 });
      expect(result.pass).toBe(false);
      // KOL must gate on holders, even when signups are huge
      expect(result.reason).toContain('holders');
    });
  });
});

describe('_clearLaunchThisWeekCache', () => {
  beforeEach(() => {
    _clearLaunchThisWeekCache();
  });

  it('is callable without arguments and does not throw', () => {
    // Pure side-effect; just verify it's a callable export so the
    // utm.ts campaign-create handler can invalidate after writes.
    expect(() => _clearLaunchThisWeekCache()).not.toThrow();
  });
});
