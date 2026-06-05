// src/services/identityService.ts
import { query, queryOne, execute, pool } from '../db/pool';
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
  SortKey,
  SortDir,
} from '../types/identity';
import { IdentityConflictError, ProfileNotFoundError, MergeWithoutEvidenceError } from '../types/identity';

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

// Safelist: maps SortKey values to their SQL expressions.
// NEVER concatenate user-supplied sortBy directly — always index through this map.
const SORT_EXPR: Record<SortKey, string> = {
  last_seen: 'p.last_seen_at',
  volume: 'COALESCE(SUM(pos.position_size_usd), 0)',
  holdings: "COUNT(DISTINCT pos.id) FILTER (WHERE pos.status = 'open')",
  holdings_value: "COALESCE(SUM(pos.position_size_usd) FILTER (WHERE pos.status = 'open'), 0)",
  x: 'COUNT(DISTINCT ilx.id)',
  discord: 'COUNT(DISTINCT ild.id)',
  referral_source: `CASE
    WHEN NULLIF(NULLIF(LOWER(p.first_utm_source), ''), 'unknown_legacy') ~ '^[a-zA-Z0-9]{6}$' THEN 'snag_referrals'
    ELSE COALESCE(NULLIF(NULLIF(LOWER(p.first_utm_source), ''), 'unknown_legacy'), 'zzz_direct')
  END`,
};

const VALID_SORT_KEYS = new Set<SortKey>(['last_seen', 'volume', 'holdings', 'holdings_value', 'x', 'discord', 'referral_source']);

export async function searchProfiles(
  filters: ProfileFilters,
): Promise<{ rows: ProfileSummary[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  // Safelist sortBy — fall back to last_seen if unknown value supplied
  const sortKey: SortKey = (filters.sortBy && VALID_SORT_KEYS.has(filters.sortBy))
    ? filters.sortBy
    : 'last_seen';
  const sortDir: SortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';
  const orderBySql = `ORDER BY ${SORT_EXPR[sortKey]} ${sortDir.toUpperCase()} NULLS LAST`;

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

  // hasSocial filter — gated by enum, SQL is static (no user input interpolation)
  // Same clause applied to both rowsQuery and countQuery via shared whereSql so
  // `total` stays consistent with the returned rows.
  if (filters.hasSocial === 'x' || filters.hasSocial === 'both') {
    where.push(`EXISTS (
      SELECT 1 FROM identity_links ilx_f
      WHERE ilx_f.profile_id = p.profile_id
        AND ilx_f.identity_type = 'x_handle'
        AND ilx_f.unlinked_at IS NULL
    )`);
  }
  if (filters.hasSocial === 'discord' || filters.hasSocial === 'both') {
    where.push(`EXISTS (
      SELECT 1 FROM identity_links ild_f
      WHERE ild_f.profile_id = p.profile_id
        AND ild_f.identity_type = 'discord_id'
        AND ild_f.unlinked_at IS NULL
    )`);
  }
  if (filters.hasSocial === 'none') {
    where.push(`NOT EXISTS (
      SELECT 1 FROM identity_links ilx_n
      WHERE ilx_n.profile_id = p.profile_id
        AND ilx_n.identity_type = 'x_handle'
        AND ilx_n.unlinked_at IS NULL
    )`);
    where.push(`NOT EXISTS (
      SELECT 1 FROM identity_links ild_n
      WHERE ild_n.profile_id = p.profile_id
        AND ild_n.identity_type = 'discord_id'
        AND ild_n.unlinked_at IS NULL
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
      p.first_seen_at,
      p.last_seen_at,
      p.first_utm_source,
      (COUNT(DISTINCT il.identity_type) * 100.0 / 7.0) AS stitched_pct,
      COALESCE(SUM(pos.position_size_usd), 0) AS lifetime_volume_usd,
      COALESCE(SUM(pos.position_size_usd) FILTER (WHERE pos.status = 'open'), 0) AS holdings_value_usd,
      (COUNT(DISTINCT pos.id) FILTER (WHERE pos.status = 'open'))::int AS holdings,
      (COUNT(DISTINCT ilx.id) > 0) AS has_x,
      (COUNT(DISTINCT ild.id) > 0) AS has_discord
    FROM user_profiles p
    LEFT JOIN identity_links il ON il.profile_id = p.profile_id AND il.unlinked_at IS NULL
    LEFT JOIN identity_links wl ON wl.profile_id = p.profile_id AND wl.identity_type = 'wallet' AND wl.unlinked_at IS NULL
    LEFT JOIN positions pos ON pos.wallet = wl.identity_value
    LEFT JOIN identity_links ilx ON ilx.profile_id = p.profile_id AND ilx.identity_type = 'x_handle' AND ilx.unlinked_at IS NULL
    LEFT JOIN identity_links ild ON ild.profile_id = p.profile_id AND ild.identity_type = 'discord_id' AND ild.unlinked_at IS NULL
    ${whereSql}
    GROUP BY p.profile_id
    ${havingSql}
    ${orderBySql}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const rows = await query<{
    profile_id: string;
    primary_wallet: string;
    display_name: string | null;
    first_seen_at: string;
    last_seen_at: string;
    first_utm_source: string | null;
    stitched_pct: string;
    lifetime_volume_usd: string;
    holdings_value_usd: string;
    holdings: string;
    has_x: boolean;
    has_discord: boolean;
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
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      firstUtmSource: r.first_utm_source,
      stitchedPct: Math.round(Number(r.stitched_pct) * 10) / 10,
      lifetimeVolumeUSD: Number(r.lifetime_volume_usd),
      holdingsValueUSD: Number(r.holdings_value_usd),
      holdings: Number(r.holdings),
      hasX: r.has_x,
      hasDiscord: r.has_discord,
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

// ─── mergeProfiles ────────────────────────────────────────────────────────────
// TXN-wrapped merge: locks both rows in deterministic order, moves all child
// records from loser → winner, marks loser as merged, recomputes winner's
// attribution fields, and writes an audit log entry.
export async function mergeProfiles(
  winnerId: string,
  loserId: string,
  evidence: { byActor: string; reason: string },
): Promise<Profile> {
  if (winnerId === loserId) {
    throw new Error('cannot merge profile into itself');
  }

  if (!evidence.reason || evidence.reason.trim().length === 0) {
    throw new MergeWithoutEvidenceError();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock both rows with consistent lock order (ORDER BY profile_id) to prevent deadlocks
    const lockResult = await client.query<ProfileRow>(
      `
      SELECT * FROM user_profiles
      WHERE profile_id = ANY($1::uuid[]) AND merged_into_profile_id IS NULL
      ORDER BY profile_id
      FOR UPDATE
      `,
      [[winnerId, loserId]],
    );

    if (lockResult.rows.length !== 2) {
      // Determine which one is missing — outer catch will ROLLBACK
      const foundIds = new Set(lockResult.rows.map(r => r.profile_id));
      const missing = [winnerId, loserId].find(id => !foundIds.has(id)) ?? 'unknown';
      throw new ProfileNotFoundError(missing);
    }

    const winnerRow = lockResult.rows.find(r => r.profile_id === winnerId)!;
    const loserRow = lockResult.rows.find(r => r.profile_id === loserId)!;

    // Move identity_links from loser to winner, skipping (type, value) pairs that already exist on winner
    // The unique index idx_links_unique_active enforces one active link per (type, value) — we filter via NOT EXISTS
    await client.query(
      `
      UPDATE identity_links SET profile_id = $1
      WHERE profile_id = $2 AND unlinked_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM identity_links il2
          WHERE il2.profile_id = $1
            AND il2.identity_type = identity_links.identity_type
            AND il2.identity_value = identity_links.identity_value
            AND il2.unlinked_at IS NULL
        )
      `,
      [winnerId, loserId],
    );

    // Soft-unlink any loser links that couldn't move (conflicted with winner's existing links).
    // This keeps audit timelines clean — orphaned active links would otherwise persist on the merged loser.
    await client.query(
      `
      UPDATE identity_links
      SET unlinked_at = NOW(), unlinked_by = 'system', unlink_reason = 'merged_duplicate'
      WHERE profile_id = $1 AND unlinked_at IS NULL
      `,
      [loserId],
    );

    // Move attribution_events
    await client.query(
      `UPDATE attribution_events SET profile_id = $1 WHERE profile_id = $2`,
      [winnerId, loserId],
    );

    // Move attribution_touches
    await client.query(
      `UPDATE attribution_touches SET profile_id = $1 WHERE profile_id = $2`,
      [winnerId, loserId],
    );

    // Move users.user_profile_id
    await client.query(
      `UPDATE users SET user_profile_id = $1 WHERE user_profile_id = $2`,
      [winnerId, loserId],
    );

    // Mark loser as merged
    await client.query(
      `
      UPDATE user_profiles
      SET merged_into_profile_id = $1, merged_at = NOW(), updated_at = NOW()
      WHERE profile_id = $2
      `,
      [winnerId, loserId],
    );

    // Recompute winner: first_seen_at MIN, last_seen_at MAX, first_utm_* COALESCE(winner, loser)
    await client.query(
      `
      UPDATE user_profiles winner
      SET
        first_seen_at      = LEAST(winner.first_seen_at, loser.first_seen_at),
        last_seen_at       = GREATEST(winner.last_seen_at, loser.last_seen_at),
        first_utm_source   = COALESCE(winner.first_utm_source, loser.first_utm_source),
        first_utm_medium   = COALESCE(winner.first_utm_medium, loser.first_utm_medium),
        first_utm_campaign = COALESCE(winner.first_utm_campaign, loser.first_utm_campaign),
        first_utm_content  = COALESCE(winner.first_utm_content, loser.first_utm_content),
        first_utm_term     = COALESCE(winner.first_utm_term, loser.first_utm_term),
        first_referrer     = COALESCE(winner.first_referrer, loser.first_referrer),
        first_landing_path = COALESCE(winner.first_landing_path, loser.first_landing_path),
        updated_at         = NOW()
      FROM user_profiles loser
      WHERE winner.profile_id = $1 AND loser.profile_id = $2
      `,
      [winnerId, loserId],
    );

    // Write to admin_logs — actual schema uses old_value/new_value/reason (NOT metadata as plan suggested)
    await client.query(
      `
      INSERT INTO admin_logs (action, resource_type, resource_id, admin_wallet, reason, old_value, new_value)
      VALUES ('merge_profiles', 'user_profile', $1, $2, $3, $4::jsonb, $5::jsonb)
      `,
      [
        winnerId,
        evidence.byActor,
        evidence.reason,
        JSON.stringify({ loserId, loserSnapshot: loserRow }),
        JSON.stringify({ winnerId, winnerSnapshotPreMerge: winnerRow }),
      ],
    );

    // Return updated winner row
    const winnerResult = await client.query<ProfileRow>(
      `SELECT * FROM user_profiles WHERE profile_id = $1`,
      [winnerId],
    );

    await client.query('COMMIT');
    return rowToProfile(winnerResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { /* ignore — preserve original error */ });
    throw err;
  } finally {
    client.release();
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
// Internal helpers exported for use by sibling ops added in later tasks
export { normalizeIdentityValue, rowToProfile };
export type { ProfileRow };
export { rowToLink };
export type { IdentityLinkRow };
