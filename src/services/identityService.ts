// src/services/identityService.ts
import { query, queryOne, execute } from '../db/pool';
import type {
  Profile,
  IdentitySeed,
  IdentityType,
  IdentityLink,
  Confidence,
  ProfileWithLinks,
  RecordEventInput,
  LifetimeStats,
  ProfileSummary,
  ProfileFilters,
  TimelineEntry,
} from '../types/identity';
import { IdentityConflictError } from '../types/identity';

// Identity value normalization rule:
// - 'wallet' stays case-sensitive (base58 is case-sensitive on Solana)
// - everything else gets lowercased to prevent Twitter/TWITTER pollution
function normalizeIdentityValue(type: IdentityType, value: string): string {
  return type === 'wallet' ? value : value.toLowerCase();
}

interface ProfileRow {
  profile_id: string;
  primary_wallet: string;
  display_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_content: string | null;
  first_utm_term: string | null;
  first_referrer: string | null;
  first_landing_path: string | null;
  attribution_locked_at: string | null;
  last_utm_source: string | null;
  last_utm_medium: string | null;
  last_utm_campaign: string | null;
  wallet_type: string | null;
  country_code: string | null;
  merged_into_profile_id: string | null;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(r: ProfileRow): Profile {
  return {
    profileId: r.profile_id,
    primaryWallet: r.primary_wallet,
    displayName: r.display_name,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    firstUtmSource: r.first_utm_source,
    firstUtmMedium: r.first_utm_medium,
    firstUtmCampaign: r.first_utm_campaign,
    firstUtmContent: r.first_utm_content,
    firstUtmTerm: r.first_utm_term,
    firstReferrer: r.first_referrer,
    firstLandingPath: r.first_landing_path,
    attributionLockedAt: r.attribution_locked_at,
    lastUtmSource: r.last_utm_source,
    lastUtmMedium: r.last_utm_medium,
    lastUtmCampaign: r.last_utm_campaign,
    walletType: r.wallet_type,
    countryCode: r.country_code,
    mergedIntoProfileId: r.merged_into_profile_id,
    mergedAt: r.merged_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function findOrCreateProfile(
  seed: IdentitySeed,
  byActor: string,
): Promise<Profile> {
  const normalizedValue = normalizeIdentityValue(seed.type, seed.value);

  // Step 1: try to find existing active link → profile
  const existing = await queryOne<ProfileRow>(
    `
    SELECT p.* FROM user_profiles p
    INNER JOIN identity_links l ON l.profile_id = p.profile_id
    WHERE l.identity_type = $1
      AND l.identity_value = $2
      AND l.unlinked_at IS NULL
      AND p.merged_into_profile_id IS NULL
    LIMIT 1
    `,
    [seed.type, normalizedValue],
  );

  if (existing) return rowToProfile(existing);

  // Step 2: create new profile. If the seed is a wallet, use it as primary_wallet;
  // otherwise empty primary_wallet (will be set on next wallet_connect).
  const primaryWallet = seed.type === 'wallet' ? seed.value : '';

  const created = await queryOne<ProfileRow>(
    `
    INSERT INTO user_profiles (primary_wallet, display_name)
    VALUES ($1, NULL)
    RETURNING *
    `,
    [primaryWallet],
  );

  if (!created) {
    throw new Error('failed to create user_profile');
  }

  // Step 3: insert the identity link
  await execute(
    `
    INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by)
    VALUES ($1, $2, $3, 'deterministic', $4)
    `,
    [created.profile_id, seed.type, normalizedValue, byActor],
  );

  return rowToProfile(created);
}

// ─── IdentityLink row shape ───────────────────────────────────────────────────

interface IdentityLinkRow {
  id: number;
  profile_id: string;
  identity_type: IdentityType;
  identity_value: string;
  confidence: Confidence;
  evidence_event_id: number | null;
  linked_at: string;
  linked_by: string | null;
  unlinked_at: string | null;
  unlinked_by: string | null;
  unlink_reason: string | null;
}

function rowToLink(r: IdentityLinkRow): IdentityLink {
  return {
    id: r.id,
    profileId: r.profile_id,
    identityType: r.identity_type,
    identityValue: r.identity_value,
    confidence: r.confidence,
    evidenceEventId: r.evidence_event_id,
    linkedAt: r.linked_at,
    linkedBy: r.linked_by,
    unlinkedAt: r.unlinked_at,
    unlinkedBy: r.unlinked_by,
    unlinkReason: r.unlink_reason,
  };
}

// ─── linkIdentity ─────────────────────────────────────────────────────────────

export async function linkIdentity(
  profileId: string,
  type: IdentityType,
  value: string,
  confidence: Confidence,
  evidence: { eventId?: number; byActor: string },
): Promise<IdentityLink> {
  const normalizedValue = normalizeIdentityValue(type, value);

  const existing = await queryOne<IdentityLinkRow>(
    `
    SELECT * FROM identity_links
    WHERE identity_type = $1 AND identity_value = $2 AND unlinked_at IS NULL
    LIMIT 1
    `,
    [type, normalizedValue],
  );

  if (existing) {
    if (existing.profile_id === profileId) {
      return rowToLink(existing);  // idempotent
    }
    throw new IdentityConflictError(existing.profile_id, type, normalizedValue);
  }

  const inserted = await queryOne<IdentityLinkRow>(
    `
    INSERT INTO identity_links
      (profile_id, identity_type, identity_value, confidence, evidence_event_id, linked_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [profileId, type, normalizedValue, confidence, evidence.eventId ?? null, evidence.byActor],
  );

  if (!inserted) throw new Error('failed to insert identity_link');
  return rowToLink(inserted);
}

// ─── unlinkIdentity ───────────────────────────────────────────────────────────

export async function unlinkIdentity(
  linkId: number,
  reason: string,
  byActor: string,
): Promise<void> {
  await execute(
    `
    UPDATE identity_links
    SET unlinked_at = NOW(), unlink_reason = $1, unlinked_by = $2
    WHERE id = $3 AND unlinked_at IS NULL
    `,
    [reason, byActor, linkId],
  );
}

// ─── recordEvent ──────────────────────────────────────────────────────────────

export async function recordEvent(input: RecordEventInput): Promise<{ eventId: number }> {
  const row = await queryOne<{ id: number }>(
    `
    INSERT INTO attribution_events (
      event_name, event_id, profile_id, wallet, ga_client_id, session_id,
      source, medium, campaign, content, term, referrer, landing_path,
      asset, value_usd, payload, occurred_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, COALESCE($16::jsonb, '{}'::jsonb), COALESCE($17::timestamptz, NOW())
    )
    ON CONFLICT (event_name, event_id) DO UPDATE
      SET ingested_at = attribution_events.ingested_at
    RETURNING id
    `,
    [
      input.event_name,
      input.event_id ?? null,
      input.profile_id ?? null,
      input.wallet ?? null,
      input.ga_client_id ?? null,
      input.session_id ?? null,
      input.source ?? null,
      input.medium ?? null,
      input.campaign ?? null,
      input.content ?? null,
      input.term ?? null,
      input.referrer ?? null,
      input.landing_path ?? null,
      input.asset ?? null,
      input.value_usd ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
      input.occurred_at ?? null,
    ],
  );

  if (!row) throw new Error('failed to record attribution_event');
  return { eventId: row.id };
}

// ─── getProfile ───────────────────────────────────────────────────────────────

export async function getProfile(profileId: string): Promise<ProfileWithLinks | null> {
  const row = await queryOne<ProfileRow>(
    `SELECT * FROM user_profiles WHERE profile_id = $1`,
    [profileId],
  );
  if (!row) return null;

  const links = await query<IdentityLinkRow>(
    `SELECT * FROM identity_links WHERE profile_id = $1 AND unlinked_at IS NULL ORDER BY linked_at ASC`,
    [profileId],
  );

  const stats = await queryOne<{ xp: string; volume_usd: string; positions: string; badges: string }>(
    `
    SELECT
      COALESCE(SUM(u.total_xp), 0)::text AS xp,
      COALESCE((SELECT SUM(position_size_usd) FROM positions p
        JOIN identity_links il ON il.identity_value = p.wallet AND il.identity_type = 'wallet'
        WHERE il.profile_id = $1 AND il.unlinked_at IS NULL), 0)::text AS volume_usd,
      COALESCE((SELECT COUNT(*) FROM positions p
        JOIN identity_links il ON il.identity_value = p.wallet AND il.identity_type = 'wallet'
        WHERE il.profile_id = $1 AND il.unlinked_at IS NULL), 0)::text AS positions,
      COALESCE((SELECT COUNT(*) FROM badges b
        JOIN identity_links il ON il.identity_value = b.wallet AND il.identity_type = 'wallet'
        WHERE il.profile_id = $1 AND il.unlinked_at IS NULL), 0)::text AS badges
    FROM users u WHERE u.user_profile_id = $1
    GROUP BY u.user_profile_id
    `,
    [profileId],
  );

  const lifetimeStats: LifetimeStats | undefined = stats
    ? { xp: Number(stats.xp), volumeUSD: Number(stats.volume_usd), positions: Number(stats.positions), badges: Number(stats.badges) }
    : undefined;

  return {
    ...rowToProfile(row),
    links: links.map(rowToLink),
    lifetimeStats,
  };
}

// ─── searchProfiles ───────────────────────────────────────────────────────────

export async function searchProfiles(
  filters: ProfileFilters,
): Promise<{ rows: ProfileSummary[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const where: string[] = ['p.merged_into_profile_id IS NULL'];
  const params: unknown[] = [];

  if (filters.source) {
    params.push(filters.source);
    where.push(`p.first_utm_source = $${params.length}`);
  }
  if (filters.activitySince) {
    params.push(filters.activitySince);
    where.push(`p.last_seen_at >= $${params.length}::timestamptz`);
  }
  if (filters.q) {
    params.push(`${filters.q.toLowerCase()}%`);
    const qIdx = params.length;
    where.push(`(
      LOWER(p.primary_wallet) LIKE $${qIdx}
      OR LOWER(COALESCE(p.display_name, '')) LIKE $${qIdx}
      OR EXISTS (
        SELECT 1 FROM identity_links il
        WHERE il.profile_id = p.profile_id
          AND il.unlinked_at IS NULL
          AND il.identity_value ILIKE $${qIdx}
      )
    )`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const walletSizeMinNum = filters.walletSizeMin !== undefined ? Number(filters.walletSizeMin) : null;
  const stitchPctMinNum = filters.stitchPctMin !== undefined ? Number(filters.stitchPctMin) : null;

  const havingClauses: string[] = [];
  if (walletSizeMinNum !== null && Number.isFinite(walletSizeMinNum) && walletSizeMinNum >= 0) {
    havingClauses.push(`COALESCE(SUM(pos.position_size_usd), 0) >= ${walletSizeMinNum}`);
  }
  if (stitchPctMinNum !== null && Number.isFinite(stitchPctMinNum) && stitchPctMinNum >= 0) {
    havingClauses.push(`(COUNT(DISTINCT il.identity_type) * 100.0 / 7.0) >= ${stitchPctMinNum}`);
  }
  const havingSql = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : '';

  const rowsQuery = `
    SELECT
      p.profile_id,
      p.primary_wallet,
      p.display_name,
      p.last_seen_at,
      p.first_utm_source,
      (COUNT(DISTINCT il.identity_type) * 100.0 / 7.0) AS stitched_pct,
      COALESCE(SUM(pos.position_size_usd), 0) AS lifetime_volume_usd
    FROM user_profiles p
    LEFT JOIN identity_links il ON il.profile_id = p.profile_id AND il.unlinked_at IS NULL
    LEFT JOIN identity_links wl ON wl.profile_id = p.profile_id AND wl.identity_type = 'wallet' AND wl.unlinked_at IS NULL
    LEFT JOIN positions pos ON pos.wallet = wl.identity_value
    ${whereSql}
    GROUP BY p.profile_id
    ${havingSql}
    ORDER BY p.last_seen_at DESC NULLS LAST
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const rows = await query<{
    profile_id: string;
    primary_wallet: string;
    display_name: string | null;
    last_seen_at: string;
    first_utm_source: string | null;
    stitched_pct: string;
    lifetime_volume_usd: string;
  }>(rowsQuery, params);

  const countQuery = `
    SELECT COUNT(*)::text AS total FROM (
      SELECT p.profile_id
      FROM user_profiles p
      LEFT JOIN identity_links il ON il.profile_id = p.profile_id AND il.unlinked_at IS NULL
      ${whereSql}
      GROUP BY p.profile_id
    ) t
  `;
  const totalRow = await queryOne<{ total: string }>(countQuery, params);

  return {
    rows: rows.map(r => ({
      profileId: r.profile_id,
      primaryWallet: r.primary_wallet,
      displayName: r.display_name,
      lastSeenAt: r.last_seen_at,
      firstUtmSource: r.first_utm_source,
      stitchedPct: Math.round(Number(r.stitched_pct) * 10) / 10,
      lifetimeVolumeUSD: Number(r.lifetime_volume_usd),
    })),
    total: Number(totalRow?.total ?? 0),
    page,
    pageSize,
  };
}

// ─── getTimeline ──────────────────────────────────────────────────────────────

export async function getTimeline(
  profileId: string,
  params: { limit?: number; before?: string } = {},
): Promise<TimelineEntry[]> {
  const limit = Math.min(200, Math.max(1, params.limit ?? 30));

  const rows = await query<{
    id: number;
    event_name: string;
    occurred_at: string;
    source: string | null;
    asset: string | null;
    value_usd: string | null;
    payload: Record<string, unknown>;
  }>(
    `
    SELECT id, event_name, occurred_at, source, asset, value_usd, payload
    FROM attribution_events
    WHERE profile_id = $1
      AND ($2::timestamptz IS NULL OR occurred_at < $2)
    ORDER BY occurred_at DESC
    LIMIT $3
    `,
    [profileId, params.before ?? null, limit],
  );

  return rows.map(r => ({
    id: r.id,
    eventName: r.event_name,
    occurredAt: r.occurred_at,
    source: r.source,
    asset: r.asset,
    valueUSD: r.value_usd !== null ? Number(r.value_usd) : null,
    payload: r.payload ?? {},
  }));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
// Internal helpers exported for use by sibling ops added in later tasks
export { normalizeIdentityValue, rowToProfile };
export type { ProfileRow };
export { rowToLink };
export type { IdentityLinkRow };
