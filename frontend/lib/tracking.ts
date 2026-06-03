// ============================================================
// SHIFT Airdrop — Frontend Tracking (Sprint 2.3)
// Bridges GA4 client_id ↔ wallet to backend identity layer
// ============================================================

const API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'https://shift-airdrop-backend.onrender.com';

/**
 * Read the GA4 client_id from the `_ga` cookie.
 * Format: `GA1.2.1234567890.1234567890` — we return the last two segments joined.
 * Returns null if cookie not present (GA not loaded yet, ad-blocker, etc.).
 */
export function getGAClientId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length < 4) return null;
  return parts.slice(-2).join('.');
}

function readUTMs(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
    utm_term: params.get('utm_term') ?? undefined,
  };
}

/**
 * Fire-and-forget landing event. Backend records into attribution_events,
 * which will later be backfilled to a profile when the user signs a wallet.
 */
export async function trackLanding(pathname: string): Promise<void> {
  const client_id = getGAClientId();
  if (!client_id) return; // GA not ready yet; the next page navigation will catch it

  try {
    const body = {
      client_id,
      session_id: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('shift_session_id') : undefined,
      ...readUTMs(),
      referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
      landing_path: pathname,
    };

    await fetch(`${API_URL}/api/track/landing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Non-critical — analytics tracking must never break the page
  }
}

/**
 * Sign-and-stitch on wallet connect. Idempotent per (browser, wallet) — the
 * localStorage gate prevents re-prompting for signature on every reconnect.
 */
export async function trackWalletConnect(args: {
  wallet: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<{ stitched: boolean; reason?: string }> {
  const { wallet, signMessage } = args;
  const client_id = getGAClientId();
  if (!client_id) return { stitched: false, reason: 'no_ga_client_id' };

  // Gate: only sign once per (browser, wallet)
  const gateKey = `shift_stitch_done_${wallet}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(gateKey)) {
    return { stitched: false, reason: 'already_stitched' };
  }

  // Build a fresh, timestamped, human-readable message
  const timestamp = Date.now();
  const message = [
    `SHIFT Airdrop — Identity Stitch`,
    ``,
    `Wallet: ${wallet}`,
    `Timestamp: ${timestamp}`,
    `Client: ${client_id}`,
    ``,
    `Sign to link this wallet to your browser session for attribution.`,
    `This signature does not authorize any transaction.`,
  ].join('\n');

  let signatureB58: string;
  try {
    const messageBytes = new TextEncoder().encode(message);
    const sigBytes = await signMessage(messageBytes);
    // bs58-encode the signature for backend verification (tweetnacl ed25519)
    const bs58 = (await import('bs58')).default;
    signatureB58 = bs58.encode(sigBytes);
  } catch (err) {
    // User rejected signature — don't gate, they may approve next time
    return { stitched: false, reason: 'signature_rejected' };
  }

  try {
    const res = await fetch(`${API_URL}/api/track/wallet_connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        signature: signatureB58,
        message,
        client_id,
        session_id: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('shift_session_id') : undefined,
      }),
    });
    if (!res.ok) {
      return { stitched: false, reason: `http_${res.status}` };
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem(gateKey, String(timestamp));
    return { stitched: true };
  } catch (err) {
    return { stitched: false, reason: 'network_error' };
  }
}
