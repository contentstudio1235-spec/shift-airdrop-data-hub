// ============================================================
// SHIFT Airdrop — Frontend Tracking (Sprint 2.3, Option C — Hybrid)
// Bridges GA4 client_id ↔ wallet to backend identity layer
//
// trackLanding()       — fire-and-forget on every page load
// trackWalletConnect() — SILENT stitch on every wallet connect.
//                        Backend stores confidence='probabilistic'.
//                        Zero UX friction — no signature, no popup.
// verifyWalletStitch() — OPT-IN signature flow for high-intent CTAs
//                        (e.g., "Join Airdrop", admin "Verify wallet").
//                        Backend upgrades to confidence='deterministic'.
// ============================================================

const API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'https://shift-airdrop-backend.onrender.com';

/**
 * Read the GA4 client_id from the `_ga` cookie.
 * Format: `GA1.2.1234567890.1234567890` — we return the last two segments joined.
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
 * which will later be backfilled to a profile when the user connects a wallet.
 */
export async function trackLanding(pathname: string): Promise<void> {
  const client_id = getGAClientId();
  if (!client_id) return;

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
    // Analytics tracking must never break the page
  }
}

/**
 * SILENT wallet stitch — no signature, no popup. Fires automatically on every
 * wallet_connect event detected by WalletContext. Backend stores the link with
 * confidence='probabilistic'. localStorage gate prevents duplicate POSTs per
 * (browser, wallet) within a session.
 */
export async function trackWalletConnect(args: { wallet: string }): Promise<{ stitched: boolean; reason?: string; confidence?: string }> {
  const { wallet } = args;
  const client_id = getGAClientId();
  if (!client_id) return { stitched: false, reason: 'no_ga_client_id' };

  const gateKey = `shift_stitch_silent_${wallet}_${client_id}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(gateKey)) {
    return { stitched: false, reason: 'already_stitched_this_session' };
  }

  try {
    const res = await fetch(`${API_URL}/api/track/wallet_connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, client_id }),
      keepalive: true,
    });
    if (!res.ok) return { stitched: false, reason: `http_${res.status}` };
    const data = await res.json().catch(() => ({}));
    if (typeof localStorage !== 'undefined') localStorage.setItem(gateKey, String(Date.now()));
    return { stitched: true, confidence: data?.confidence };
  } catch {
    return { stitched: false, reason: 'network_error' };
  }
}

/**
 * OPT-IN wallet verification — call this from a high-intent CTA (e.g., "Join Airdrop"
 * button handler, admin "Verify wallet" action). Prompts the user to sign a message,
 * then POSTs to backend which upgrades the link to confidence='deterministic'.
 *
 * Caller MUST tie this to an explicit user action with contextual copy so the
 * signature prompt makes sense.
 */
export async function verifyWalletStitch(args: {
  wallet: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<{ verified: boolean; reason?: string }> {
  const { wallet, signMessage } = args;
  const client_id = getGAClientId();
  if (!client_id) return { verified: false, reason: 'no_ga_client_id' };

  const timestamp = Date.now();
  const message = [
    `SHIFT RWA — Verify Wallet`,
    ``,
    `Wallet: ${wallet}`,
    `Timestamp: ${timestamp}`,
    `Session: ${client_id}`,
    ``,
    `Sign to verify this wallet for your airdrop entry.`,
    `This signature does not authorize any transaction.`,
  ].join('\n');

  let signatureB58: string;
  try {
    const messageBytes = new TextEncoder().encode(message);
    const sigBytes = await signMessage(messageBytes);
    const bs58 = (await import('bs58')).default;
    signatureB58 = bs58.encode(sigBytes);
  } catch {
    return { verified: false, reason: 'signature_rejected' };
  }

  try {
    const res = await fetch(`${API_URL}/api/track/wallet_connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, signature: signatureB58, message, client_id }),
    });
    if (!res.ok) return { verified: false, reason: `http_${res.status}` };
    return { verified: true };
  } catch {
    return { verified: false, reason: 'network_error' };
  }
}
