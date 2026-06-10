import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiPost, apiPatch, apiDelete, ApiError } from '../api';

describe('apiPost', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('sends x-admin-key header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await apiPost('/api/users/p-1/links', { type: 'wallet', value: 'AbCd' });
    const [_url, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ 'x-admin-key': expect.any(String) });
  });
});

describe('apiPatch', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('serializes body as JSON', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await apiPatch('/api/users/p-1/primary-wallet', { wallet: 'XyZ1' });
    const [_url, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).body).toBe(JSON.stringify({ wallet: 'XyZ1' }));
    expect((init as RequestInit).method).toBe('PATCH');
  });
});

describe('apiDelete', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws ApiError with status and parsed body on non-2xx', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'identity_conflict', existingProfileId: 'p-other', suggestion: 'merge' }),
      { status: 409 }
    ));
    vi.stubGlobal('fetch', fetchSpy);
    let caught: any = null;
    try {
      await apiDelete('/api/users/p-1/links/42', { reason: 'test' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
    expect((caught as ApiError).body.error).toBe('identity_conflict');
  });

  it('ApiError.body.existingProfileId is accessible for conflict handling', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'identity_conflict', existingProfileId: 'p-other', suggestion: 'merge' }),
      { status: 409 }
    ));
    vi.stubGlobal('fetch', fetchSpy);
    let err: ApiError | null = null;
    try {
      await apiDelete('/api/users/p-1/links/42', { reason: 'test' });
    } catch (e) {
      err = e as ApiError;
    }
    expect(err?.body.existingProfileId).toBe('p-other');
  });
});
