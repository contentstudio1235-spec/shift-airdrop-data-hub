import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifyWalletSignature, isSignatureFresh } from '../lib/walletSignature';

function buildSignedEnvelope(message: string) {
  const keypair = nacl.sign.keyPair();
  const wallet = bs58.encode(keypair.publicKey);
  const signature = bs58.encode(
    nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey),
  );
  return { wallet, message, signature };
}

describe('verifyWalletSignature', () => {
  it('accepts a valid signature', () => {
    const env = buildSignedEnvelope('shift-connect:1717410000');
    expect(verifyWalletSignature(env)).toBe(true);
  });

  it('rejects a tampered message', () => {
    const env = buildSignedEnvelope('shift-connect:1717410000');
    const tampered = { ...env, message: 'shift-connect:1717410001' };
    expect(verifyWalletSignature(tampered)).toBe(false);
  });

  it('rejects an empty signature', () => {
    expect(verifyWalletSignature({ wallet: 'AbCd', message: 'm', signature: '' })).toBe(false);
  });

  it('rejects malformed bs58 wallet', () => {
    expect(verifyWalletSignature({ wallet: '0OIL!', message: 'm', signature: 'x' })).toBe(false);
  });
});

describe('isSignatureFresh', () => {
  it('accepts a recent message', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(isSignatureFresh(`shift-connect:${ts}`, 300)).toBe(true);
  });

  it('rejects a stale message', () => {
    const ts = Math.floor(Date.now() / 1000) - 1000;
    expect(isSignatureFresh(`shift-connect:${ts}`, 300)).toBe(false);
  });

  it('rejects a malformed message', () => {
    expect(isSignatureFresh('not-a-shift-message', 300)).toBe(false);
  });
});
