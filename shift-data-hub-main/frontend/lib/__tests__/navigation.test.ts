import { describe, it, expect } from 'vitest';
import { linkToProfile, linkToProfileByWallet } from '../navigation';

// The data-hub router reads `?view=` to select tabs. Earlier link builders
// wrote `?tab=` which silently fell back to Pulse and dropped downstream
// params (profileId, wallet). These tests pin the canonical `view=` contract
// so the WhaleWatch → IdentityCard drill chain stays intact.

describe('navigation links use view= (the router contract), not tab=', () => {
  it('linkToProfile produces ?view=users&profileId=...', () => {
    const url = linkToProfile('profile-abc');
    expect(url).not.toBeNull();
    expect(url!).toContain('view=users');
    expect(url!).not.toContain('tab=users');
    expect(url!).toContain('profileId=profile-abc');
  });

  it('linkToProfile returns null for empty profileId', () => {
    expect(linkToProfile(null)).toBeNull();
    expect(linkToProfile(undefined)).toBeNull();
    expect(linkToProfile('')).toBeNull();
  });

  it('linkToProfileByWallet produces ?view=users&wallet=...', () => {
    const url = linkToProfileByWallet('11111111111111111111111111111111');
    expect(url).toContain('view=users');
    expect(url).not.toContain('tab=users');
    expect(url).toContain('wallet=11111111111111111111111111111111');
  });

  it('linkToProfileByWallet URL-encodes the wallet', () => {
    const url = linkToProfileByWallet('weird/wallet?value');
    expect(url).toContain('wallet=weird%2Fwallet%3Fvalue');
  });
});
