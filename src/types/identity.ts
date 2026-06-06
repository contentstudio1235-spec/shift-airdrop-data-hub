// src/types/identity.ts
// Types for the universal identity layer. Used by identityService, route handlers, and webhook handlers.

export type IdentityType =
  | 'wallet'
  | 'ga_client_id'
  | 'snag_user_id'
  | 'x_handle'
  | 'discord_id'
  | 'telegram_id'
  | 'email';

export type Confidence = 'deterministic' | 'probabilistic' | 'manual';

export interface IdentitySeed {
  type: IdentityType;
  value: string;
}

export interface Profile {
  profileId: string;                  // UUID
  displayName: string | null;
  primaryWallet: string;
  firstSeenAt: string;                // ISO
  lastSeenAt: string;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  firstUtmContent: string | null;
  firstUtmTerm: string | null;
  firstReferrer: string | null;
  firstLandingPath: string | null;
  attributionLockedAt: string | null;
  lastUtmSource: string | null;
  lastUtmMedium: string | null;
  lastUtmCampaign: string | null;
  walletType: string | null;
  countryCode: string | null;
  mergedIntoProfileId: string | null;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityLink {
  id: number;
  profileId: string;
  identityType: IdentityType;
  identityValue: string;
  confidence: Confidence;
  evidenceEventId: number | null;
  linkedAt: string;
  linkedBy: string | null;
  unlinkedAt: string | null;
  unlinkedBy: string | null;
  unlinkReason: string | null;
}

export interface LifetimeStats {
  xp: number;
  volumeUSD: number;
  positions: number;
  badges: number;
}

export interface ProfileWithLinks extends Profile {
  links: IdentityLink[];
  lifetimeStats?: LifetimeStats;
}

export type SortKey = 'last_seen' | 'volume' | 'holdings' | 'holdings_value' | 'x' | 'discord' | 'referral_source';
export type SortDir = 'asc' | 'desc';

export interface ProfileSummary {
  profileId: string;
  primaryWallet: string;
  displayName: string | null;
  firstSeenAt: string;                // ISO timestamp from user_profiles.first_seen_at
  lastSeenAt: string;
  firstUtmSource: string | null;
  stitchedPct: number;                // 0-100 — derived from links count vs ideal-coverage
  lifetimeVolumeUSD: number;          // pre-aggregated for list display
  holdingsValueUSD: number;           // sum of position_size_usd where status='open' — current capital at risk
  holdings: number;                   // count of open positions
  hasX: boolean;                      // has linked x_handle identity
  hasDiscord: boolean;                // has linked discord_id identity
}

export interface ProfileFilters {
  page?: number;                      // 1-indexed
  pageSize?: number;
  source?: string;                    // filter by first_utm_source
  stitchPctMin?: number;              // 0-100
  walletSizeMin?: number;             // USD
  activitySince?: string;             // ISO date — last_seen_at >= this
  q?: string;                         // free-text: wallet prefix, display_name, identity_value
  hasSocial?: 'x' | 'discord' | 'both' | 'none'; // social connection filter
  sortBy?: SortKey;
  sortDir?: SortDir;
  // KOL drill-down contract: an unambiguous pair that selects which column the
  // referrer string matches against. `referrerType='snag'` filters on
  // users.referred_by_code via EXISTS; `referrerType='utm'` filters on
  // user_profiles.first_utm_source. Both must be supplied together.
  referrer?: string;
  referrerType?: 'snag' | 'utm';
}

export interface RecordEventInput {
  event_name: string;
  event_id?: string;
  profile_id?: string;
  wallet?: string;
  ga_client_id?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_path?: string;
  session_id?: string;
  asset?: string;
  value_usd?: number;
  occurred_at?: string;
  payload?: Record<string, unknown>;
}

export interface TimelineEntry {
  id: number;                         // attribution_events.id
  eventName: string;
  occurredAt: string;
  source: string | null;
  asset: string | null;
  valueUSD: number | null;
  payload: Record<string, unknown>;
}

export class IdentityConflictError extends Error {
  constructor(
    public existingProfileId: string,
    public identityType: IdentityType,
    public identityValue: string,
  ) {
    super(`identity ${identityType}=${identityValue} already linked to profile ${existingProfileId}`);
    this.name = 'IdentityConflictError';
  }
}

export class MergeWithoutEvidenceError extends Error {
  constructor() {
    super('mergeProfiles requires explicit evidence reason when profiles share no identity link');
    this.name = 'MergeWithoutEvidenceError';
  }
}

export class ProfileNotFoundError extends Error {
  constructor(public profileId: string) {
    super(`profile ${profileId} not found`);
    this.name = 'ProfileNotFoundError';
  }
}
