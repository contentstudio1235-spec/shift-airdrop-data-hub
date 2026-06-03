import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGAClientId, trackLanding } from '../tracking';

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
