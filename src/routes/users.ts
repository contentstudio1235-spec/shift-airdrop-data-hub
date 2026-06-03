// src/routes/users.ts
import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import {
  searchProfiles, getProfile, getTimeline,
  linkIdentity, unlinkIdentity, mergeProfiles,
} from '../services/identityService';
import {
  IdentityConflictError, ProfileNotFoundError, MergeWithoutEvidenceError,
  type IdentityType, type Confidence,
} from '../types/identity';
import { query } from '../db/pool';

const router = Router();

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

const VALID_IDENTITY_TYPES: IdentityType[] = [
  'wallet', 'ga_client_id', 'snag_user_id', 'x_handle', 'discord_id', 'telegram_id', 'email',
];
const VALID_CONFIDENCE: Confidence[] = ['deterministic', 'probabilistic', 'manual'];

// GET /api/users — paginated list
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await searchProfiles({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      source: typeof req.query.source === 'string' ? req.query.source : undefined,
      stitchPctMin: req.query.stitchPctMin ? Number(req.query.stitchPctMin) : undefined,
      walletSizeMin: req.query.walletSizeMin ? Number(req.query.walletSizeMin) : undefined,
      activitySince: typeof req.query.activitySince === 'string' ? req.query.activitySince : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('[users/search]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/users/search — quick free-text alias
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (q.length < 2) return res.json({ rows: [] });
    const result = await searchProfiles({ q, page: 1, pageSize: 25 });
    res.json({ rows: result.rows });
  } catch (err) {
    console.error('[users/search]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/users/:profileId
router.get('/:profileId', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const profile = await getProfile(profileId);
    if (!profile) return res.status(404).json({ error: 'profile_not_found' });
    res.json(profile);
  } catch (err) {
    console.error('[users/get]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/users/:profileId/timeline
router.get('/:profileId/timeline', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const entries = await getTimeline(profileId, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      before: typeof req.query.before === 'string' ? req.query.before : undefined,
    });
    res.json({ entries });
  } catch (err) {
    console.error('[users/timeline]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/users/:profileId/positions
router.get('/:profileId/positions', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const statusFilter = req.query.status === 'open' ? "AND p.status = 'open'"
      : req.query.status === 'closed' ? "AND p.status = 'closed'"
      : '';
    const rows = await query(
      `
      SELECT p.id, p.wallet, p.asset, p.position_size_usd, p.opened_at, p.closed_at, p.status
      FROM positions p
      INNER JOIN identity_links il ON il.identity_value = p.wallet
        AND il.identity_type = 'wallet' AND il.unlinked_at IS NULL
      WHERE il.profile_id = $1 ${statusFilter}
      ORDER BY p.opened_at DESC
      LIMIT 200
      `,
      [profileId],
    );
    res.json({ positions: rows });
  } catch (err) {
    console.error('[users/positions]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/users/:profileId/links
router.post('/:profileId/links', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const { type, value, confidence, evidence } = req.body ?? {};
    if (!VALID_IDENTITY_TYPES.includes(type)) {
      return res.status(400).json({ error: `invalid identity_type: ${type}` });
    }
    if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
      return res.status(400).json({ error: 'invalid identity_value' });
    }
    const conf: Confidence = VALID_CONFIDENCE.includes(confidence) ? confidence : 'manual';
    const link = await linkIdentity(profileId, type, value, conf, {
      byActor: 'admin',
      eventId: evidence?.eventId,
    });
    res.status(201).json(link);
  } catch (err) {
    if (err instanceof IdentityConflictError) {
      return res.status(409).json({
        error: 'identity_conflict',
        existingProfileId: err.existingProfileId,
        suggestion: 'merge',
      });
    }
    console.error('[users/link]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// DELETE /api/users/:profileId/links/:linkId
router.delete('/:profileId/links/:linkId', async (req: Request, res: Response) => {
  try {
    const linkId = Number(String(req.params.linkId));
    if (!Number.isFinite(linkId)) return res.status(400).json({ error: 'invalid link id' });
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'no reason';
    await unlinkIdentity(linkId, reason, 'admin');
    res.json({ unlinkedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[users/unlink]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/users/:profileId/merge
router.post('/:profileId/merge', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const { loserProfileId, reason } = req.body ?? {};
    if (typeof loserProfileId !== 'string' || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'missing loserProfileId or reason' });
    }
    const winner = await mergeProfiles(profileId, loserProfileId, {
      byActor: 'admin',
      reason,
    });
    res.json(winner);
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      return res.status(404).json({ error: 'profile_not_found', profileId: err.profileId });
    }
    if (err instanceof MergeWithoutEvidenceError) {
      return res.status(400).json({ error: 'merge_requires_reason' });
    }
    console.error('[users/merge]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// PATCH /api/users/:profileId/primary-wallet
router.patch('/:profileId/primary-wallet', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const { wallet } = req.body ?? {};
    if (typeof wallet !== 'string' || wallet.length < 32 || wallet.length > 64) {
      return res.status(400).json({ error: 'invalid wallet' });
    }
    const linked = await query<{ identity_value: string }>(
      `
      SELECT identity_value FROM identity_links
      WHERE profile_id = $1 AND identity_type = 'wallet' AND identity_value = $2 AND unlinked_at IS NULL
      `,
      [profileId, wallet],
    );
    if (linked.length === 0) {
      return res.status(400).json({ error: 'wallet not linked to this profile' });
    }
    await query(
      `UPDATE user_profiles SET primary_wallet = $1, updated_at = NOW() WHERE profile_id = $2`,
      [wallet, profileId],
    );
    const profile = await getProfile(profileId);
    res.json(profile);
  } catch (err) {
    console.error('[users/primary-wallet]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/users/:profileId/forget (GDPR soft-delete)
router.post('/:profileId/forget', async (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.profileId);
    const { reason } = req.body ?? {};
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'reason required' });
    }
    await query(
      `
      UPDATE user_profiles
      SET display_name = NULL, country_code = NULL, wallet_type = NULL,
          first_referrer = NULL, first_landing_path = NULL,
          updated_at = NOW()
      WHERE profile_id = $1
      `,
      [profileId],
    );
    await query(
      `
      UPDATE identity_links
      SET unlinked_at = NOW(), unlinked_by = 'admin', unlink_reason = $2
      WHERE profile_id = $1 AND unlinked_at IS NULL
      `,
      [profileId, `gdpr_forget: ${reason}`],
    );
    res.json({ forgottenAt: new Date().toISOString() });
  } catch (err) {
    console.error('[users/forget]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
