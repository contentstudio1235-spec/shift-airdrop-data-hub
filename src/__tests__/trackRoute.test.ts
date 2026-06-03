import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import trackRouter from '../routes/track';
import * as svc from '../services/identityService';
import * as walletSig from '../lib/walletSignature';

vi.mock('../services/identityService');
vi.mock('../db/pool', () => ({
  execute: vi.fn().mockResolvedValue(1),
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  pool: {} as any,
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/track', trackRouter);
  return app;
}

describe('POST /api/track/landing', () => {
  beforeEach(() => vi.resetAllMocks());

  it('records a landing event', async () => {
    vi.spyOn(svc, 'recordEvent').mockResolvedValueOnce({ eventId: 1 });
    const res = await request(makeApp())
      .post('/api/track/landing')
      .send({
        client_id: 'cid-abc',
        session_id: 'sid-xyz',
        utm_source: 'twitter',
        landing_path: '/',
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(svc.recordEvent).toHaveBeenCalled();
  });

  it('rejects payload without client_id', async () => {
    const res = await request(makeApp()).post('/api/track/landing').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/track/wallet_connect', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects invalid signature', async () => {
    vi.spyOn(walletSig, 'isSignatureFresh').mockReturnValue(true);
    vi.spyOn(walletSig, 'verifyWalletSignature').mockReturnValue(false);
    const res = await request(makeApp())
      .post('/api/track/wallet_connect')
      .send({
        wallet: 'fake', signature: 'fake', message: 'shift-connect:1717410000',
        client_id: 'cid-abc', session_id: 'sid-xyz',
      });
    expect(res.status).toBe(401);
  });

  it('stitches on valid signature', async () => {
    vi.spyOn(walletSig, 'verifyWalletSignature').mockReturnValue(true);
    vi.spyOn(walletSig, 'isSignatureFresh').mockReturnValue(true);
    vi.spyOn(svc, 'findOrCreateProfile').mockResolvedValueOnce({
      profileId: 'p-new', primaryWallet: 'AbCd', displayName: null,
      firstSeenAt: '2026-06-03T00:00:00Z', lastSeenAt: '2026-06-03T00:00:00Z',
      firstUtmSource: null, firstUtmMedium: null, firstUtmCampaign: null,
      firstUtmContent: null, firstUtmTerm: null, firstReferrer: null,
      firstLandingPath: null, attributionLockedAt: null,
      lastUtmSource: null, lastUtmMedium: null, lastUtmCampaign: null,
      walletType: null, countryCode: null, mergedIntoProfileId: null, mergedAt: null,
      createdAt: '2026-06-03T00:00:00Z', updatedAt: '2026-06-03T00:00:00Z',
    });
    vi.spyOn(svc, 'linkIdentity').mockResolvedValueOnce({} as any);
    vi.spyOn(svc, 'recordEvent').mockResolvedValueOnce({ eventId: 1 });

    const res = await request(makeApp())
      .post('/api/track/wallet_connect')
      .send({
        wallet: 'AbCd', signature: 'sig', message: 'shift-connect:1717410000',
        client_id: 'cid-abc', session_id: 'sid-xyz',
      });

    expect(res.status).toBe(200);
    expect(res.body.profileId).toBe('p-new');
    expect(res.body.stitched).toBe(true);
    expect(res.body.confidence).toBe('deterministic');
  });

  it('SILENT mode: stitches with probabilistic confidence when signature absent (Option C)', async () => {
    const verifySpy = vi.spyOn(walletSig, 'verifyWalletSignature');
    const freshSpy = vi.spyOn(walletSig, 'isSignatureFresh');
    vi.spyOn(svc, 'findOrCreateProfile').mockResolvedValueOnce({
      profileId: 'p-silent', primaryWallet: 'AbCd', displayName: null,
      firstSeenAt: '2026-06-03T00:00:00Z', lastSeenAt: '2026-06-03T00:00:00Z',
      firstUtmSource: null, firstUtmMedium: null, firstUtmCampaign: null,
      firstUtmContent: null, firstUtmTerm: null, firstReferrer: null,
      firstLandingPath: null, attributionLockedAt: null,
      lastUtmSource: null, lastUtmMedium: null, lastUtmCampaign: null,
      walletType: null, countryCode: null, mergedIntoProfileId: null, mergedAt: null,
      createdAt: '2026-06-03T00:00:00Z', updatedAt: '2026-06-03T00:00:00Z',
    });
    const linkSpy = vi.spyOn(svc, 'linkIdentity').mockResolvedValueOnce({} as any);
    vi.spyOn(svc, 'recordEvent').mockResolvedValueOnce({ eventId: 1 });

    const res = await request(makeApp())
      .post('/api/track/wallet_connect')
      .send({ wallet: 'AbCd', client_id: 'cid-abc' });

    expect(res.status).toBe(200);
    expect(res.body.stitched).toBe(true);
    expect(res.body.confidence).toBe('probabilistic');
    // Signature verification was NOT called in silent mode
    expect(verifySpy).not.toHaveBeenCalled();
    expect(freshSpy).not.toHaveBeenCalled();
    // linkIdentity received 'probabilistic' confidence
    expect(linkSpy).toHaveBeenCalledWith(
      'p-silent', 'ga_client_id', 'cid-abc', 'probabilistic', expect.anything(),
    );
  });

  it('still rejects when wallet or client_id missing', async () => {
    const res = await request(makeApp())
      .post('/api/track/wallet_connect')
      .send({ wallet: 'AbCd' }); // no client_id
    expect(res.status).toBe(400);
  });
});
