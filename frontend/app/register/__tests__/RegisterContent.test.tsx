import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// ── Mocks (must be registered before importing the component) ──

const UTM_STORAGE_KEY = 'shift_landing_utm';
const TEST_WALLET = 'Ab3fXYZ12345678901234567890123456789012345';

// Helper: build a searchParams-like mock from a record
function makeSearchParams(record: Record<string, string | null>) {
  return {
    get: (key: string) => (record[key] ?? null),
  };
}

// We swap this between tests
let currentSearchParams: ReturnType<typeof makeSearchParams> = makeSearchParams({});

vi.mock('next/navigation', () => ({
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/components/WalletContext', () => ({
  useWallet: () => ({ wallet: TEST_WALLET }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => () => {},
}));

vi.mock('@/components/ShiftIdCard', () => ({
  default: () => null,
}));

vi.mock('@/components/Icon', () => ({
  default: () => null,
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// Capture fetch calls so we can inspect the register POST body
const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
const stubFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
  const u = typeof url === 'string' ? url : url.toString();
  fetchCalls.push({ url: u, init });

  // /api/airdrop/user/<wallet> → 404 the first time so register fires,
  // 200 on follow-up after register succeeds.
  if (u.includes('/api/airdrop/user/')) {
    const priorCalls = fetchCalls.filter((c) => c.url.includes('/api/airdrop/user/')).length;
    if (priorCalls === 1) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }
    return new Response(
      JSON.stringify({
        wallet: TEST_WALLET,
        queuePosition: 42,
        totalMembers: 1000,
        totalXp: 0,
        loyaltyPoints: 0,
        permanentMultiplier: 1,
        dynamicMultiplier: 1,
        referralLink: 'https://airdrop.shiftrwa.xyz/r/AB3FXY',
        referralCode: 'AB3FXY',
        registeredAt: new Date().toISOString(),
      }),
      { status: 200 }
    );
  }

  if (u.includes('/api/airdrop/register')) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (u.includes('/api/dashboard/')) {
    return new Response(JSON.stringify({ rank: 42 }), { status: 200 });
  }

  // /api/airdrop/ref/<code> — return 404 so refBonus stays null
  return new Response(JSON.stringify({}), { status: 404 });
});

beforeEach(() => {
  fetchCalls.length = 0;
  stubFetch.mockClear();
  vi.stubGlobal('fetch', stubFetch);
  // Clean storage between runs
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Import after mocks are registered
import RegisterContent from '../RegisterContent';

// Helper: pull JSON body off a captured fetch call to /api/airdrop/register
function getRegisterBody(): Record<string, unknown> | null {
  const call = fetchCalls.find((c) => c.url.includes('/api/airdrop/register'));
  if (!call?.init?.body) return null;
  return JSON.parse(call.init.body as string);
}

describe('RegisterContent — landing-URL UTM propagation (BLOCKER 4)', () => {
  it('persists landing-URL UTMs to localStorage on mount', async () => {
    currentSearchParams = makeSearchParams({
      utm_source: 'twitter',
      utm_medium: 'kol',
      utm_campaign: 'test-2026q2',
      utm_content: 'thread-a',
      utm_term: 'rwa',
    });

    render(<RegisterContent />);

    await waitFor(() => {
      const raw = localStorage.getItem(UTM_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string);
      expect(parsed.utm_source).toBe('twitter');
      expect(parsed.utm_medium).toBe('kol');
      expect(parsed.utm_campaign).toBe('test-2026q2');
      expect(parsed.utm_content).toBe('thread-a');
      expect(parsed.utm_term).toBe('rwa');
      expect(typeof parsed.capturedAt).toBe('string');
    });
  });

  it('falls back to localStorage UTMs when current URL has none, and clears storage after successful register', async () => {
    // Pre-seed storage as if the user landed earlier and navigated away
    localStorage.setItem(
      UTM_STORAGE_KEY,
      JSON.stringify({
        utm_source: 'discord',
        utm_medium: 'organic',
        utm_campaign: 'spring-push',
        capturedAt: new Date().toISOString(),
      })
    );

    // Now they hit /register with no UTMs in the URL
    currentSearchParams = makeSearchParams({});

    render(<RegisterContent />);

    await waitFor(() => {
      const body = getRegisterBody();
      expect(body).not.toBeNull();
      expect(body?.wallet).toBe(TEST_WALLET);
      expect(body?.utm_source).toBe('discord');
      expect(body?.utm_medium).toBe('organic');
      expect(body?.utm_campaign).toBe('spring-push');
      expect(body?.utm_content).toBeUndefined();
      expect(body?.utm_term).toBeUndefined();
    });

    // After successful registration, stored UTMs should be cleared so a
    // subsequent re-register on this browser doesn't re-attribute.
    await waitFor(() => {
      expect(localStorage.getItem(UTM_STORAGE_KEY)).toBeNull();
    });
  });

  it('posts a clean body (no utm_* fields) when no UTMs are present anywhere', async () => {
    currentSearchParams = makeSearchParams({});
    // storage already cleared in beforeEach

    render(<RegisterContent />);

    await waitFor(() => {
      const body = getRegisterBody();
      expect(body).not.toBeNull();
      expect(body?.wallet).toBe(TEST_WALLET);
      // No UTM keys should leak into the request body
      expect(body).not.toHaveProperty('utm_source');
      expect(body).not.toHaveProperty('utm_medium');
      expect(body).not.toHaveProperty('utm_campaign');
      expect(body).not.toHaveProperty('utm_content');
      expect(body).not.toHaveProperty('utm_term');
    });
  });

  it('drops stale (>7 days old) localStorage UTMs and posts a clean body', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      UTM_STORAGE_KEY,
      JSON.stringify({
        utm_source: 'stale-source',
        utm_campaign: 'old-campaign',
        capturedAt: eightDaysAgo,
      })
    );

    currentSearchParams = makeSearchParams({});

    render(<RegisterContent />);

    await waitFor(() => {
      const body = getRegisterBody();
      expect(body).not.toBeNull();
      // Stale UTMs must NOT appear in the POST body
      expect(body).not.toHaveProperty('utm_source');
      expect(body).not.toHaveProperty('utm_campaign');
    });
  });

  it('URL UTMs take precedence over localStorage UTMs', async () => {
    localStorage.setItem(
      UTM_STORAGE_KEY,
      JSON.stringify({
        utm_source: 'stored-source',
        utm_campaign: 'stored-campaign',
        capturedAt: new Date().toISOString(),
      })
    );

    currentSearchParams = makeSearchParams({
      utm_source: 'fresh-source',
      utm_campaign: 'fresh-campaign',
    });

    render(<RegisterContent />);

    await waitFor(() => {
      const body = getRegisterBody();
      expect(body?.utm_source).toBe('fresh-source');
      expect(body?.utm_campaign).toBe('fresh-campaign');
    });
  });
});
