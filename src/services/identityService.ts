// src/services/identityService.ts
import { query, queryOne, execute } from '../db/pool';
import type {
  Profile,
  IdentitySeed,
  IdentityType,
} from '../types/identity';

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

// Internal helpers exported for use by sibling ops added in later tasks
export { normalizeIdentityValue, rowToProfile };
export type { ProfileRow };
