import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGAClientId, trackLanding, trackWalletConnect } from '../tracking';

describe('getGAClientId', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: '',
    });
  });

  it('returns null when no _ga cookie set', () => {
    document.cookie = 'other=value';
    expect(getGAClientId()).toBeNull();
  });

  it('returns the client_id from a standard GA1.2.X.Y cookie', () => {
    document.cookie = '_ga=GA1.2.1234567890.9876543210';
    expect(getGAClientId()).toBe('1234567890.9876543210');
  });

  it('parses _ga cookie alongside other cookies', () => {
    document.cookie = 'foo=bar; _ga=GA1.2.111.222; baz=qux';
    expect(getGAClientId()).toBe('111.222');
  });

  it('returns null when _ga has too few segments', () => {
    document.cookie = '_ga=GA1.2';
    expect(getGAClientId()).toBeNull();
  });

  it('handles _gat or _gid cookies without confusing them with _ga', () => {
    document.cookie = '_gat=1; _gid=GA1.2.999.888';
    expect(getGAClientId()).toBeNull();
  });
});

describe('trackLanding', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: '',
    });
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('skips fetch when GA client_id is unavailable', async () => {
    document.cookie = 'other=value';
    await trackLanding('/');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs to /api/track/landing with parsed client_id and pathname', async () => {
    document.cookie = '_ga=GA1.2.42.43';
    await trackLanding('/airdrop');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/track\/landing$/);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.client_id).toBe('42.43');
    expect(body.landing_path).toBe('/airdrop');
  });

  it('swallows network errors silently — analytics must not break the page', async () => {
    document.cookie = '_ga=GA1.2.1.2';
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    await expect(trackLanding('/')).resolves.toBeUndefined();
  });
});

describe('trackWalletConnect (silent, Option C)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: '',
    });
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ profileId: 'p1', stitched: true, confidence: 'probabilistic' }), { status: 200 }),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns no_ga_client_id when cookie missing — never POSTs', async () => {
    const r = await trackWalletConnect({ wallet: 'WAL1' });
    expect(r.stitched).toBe(false);
    expect(r.reason).toBe('no_ga_client_id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs wallet+client_id without signature on first call (silent mode)', async () => {
    document.cookie = '_ga=GA1.2.42.43';
    const r = await trackWalletConnect({ wallet: 'WAL1' });
    expect(r.stitched).toBe(true);
    expect(r.confidence).toBe('probabilistic');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ wallet: 'WAL1', client_id: '42.43' });
    expect(body.signature).toBeUndefined();
    expect(body.message).toBeUndefined();
  });

  it('localStorage gate prevents duplicate POSTs for same (wallet, client_id)', async () => {
    document.cookie = '_ga=GA1.2.42.43';
    await trackWalletConnect({ wallet: 'WAL1' });
    const r2 = await trackWalletConnect({ wallet: 'WAL1' });
    expect(r2.stitched).toBe(false);
    expect(r2.reason).toBe('already_stitched_this_session');
    expect(fetchSpy).toHaveBeenCalledOnce(); // still just 1 — the gate worked
  });

  it('different wallet on same client_id bypasses the gate', async () => {
    document.cookie = '_ga=GA1.2.42.43';
    await trackWalletConnect({ wallet: 'WAL1' });
    await trackWalletConnect({ wallet: 'WAL2' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not set the gate when fetch returns non-2xx', async () => {
    document.cookie = '_ga=GA1.2.42.43';
    fetchSpy.mockResolvedValueOnce(new Response('rate_limited', { status: 429 }));
    const r = await trackWalletConnect({ wallet: 'WAL1' });
    expect(r.stitched).toBe(false);
    expect(r.reason).toBe('http_429');
    // gate not set → next call should hit network
    await trackWalletConnect({ wallet: 'WAL1' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
