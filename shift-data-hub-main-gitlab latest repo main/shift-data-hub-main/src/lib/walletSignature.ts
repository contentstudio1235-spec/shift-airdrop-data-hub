// src/lib/walletSignature.ts
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface SignedEnvelope {
  wallet: string;       // base58 Solana pubkey
  message: string;      // the signed text
  signature: string;    // base58-encoded ed25519 signature
}

export function verifyWalletSignature(env: SignedEnvelope): boolean {
  if (!env.wallet || !env.message || !env.signature) return false;

  let pubkey: Uint8Array;
  let sig: Uint8Array;
  try {
    pubkey = bs58.decode(env.wallet);
    sig = bs58.decode(env.signature);
  } catch {
    return false;
  }
  if (pubkey.length !== 32) return false;
  if (sig.length !== 64) return false;

  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(env.message),
      sig,
      pubkey,
    );
  } catch {
    return false;
  }
}

// Helper: parses message of form "shift-connect:<unix_ts>" and rejects if older than maxAgeSeconds.
// Accepts both seconds (10 digits) and milliseconds (13 digits) timestamps.
export function isSignatureFresh(message: string, maxAgeSeconds = 300): boolean {
  const match = /^shift-connect:(\d{10,13})$/.exec(message);
  if (!match) return false;
  const ts = Number(match[1]);
  const tsSeconds = ts > 1e12 ? Math.floor(ts / 1000) : ts;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(nowSeconds - tsSeconds) <= maxAgeSeconds;
}
