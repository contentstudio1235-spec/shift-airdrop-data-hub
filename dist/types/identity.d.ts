export type IdentityType = 'wallet' | 'ga_client_id' | 'snag_user_id' | 'x_handle' | 'discord_id' | 'telegram_id' | 'email';
export type Confidence = 'deterministic' | 'probabilistic' | 'manual';
export interface IdentitySeed {
    type: IdentityType;
    value: string;
}
export interface Profile {
    profileId: string;
    displayName: string | null;
    primaryWallet: string;
    firstSeenAt: string;
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
    firstSeenAt: string;
    lastSeenAt: string;
    firstUtmSource: string | null;
    stitchedPct: number;
    lifetimeVolumeUSD: number;
    holdingsValueUSD: number;
    holdings: number;
    hasX: boolean;
    hasDiscord: boolean;
}
export interface ProfileFilters {
    page?: number;
    pageSize?: number;
    source?: string;
    stitchPctMin?: number;
    walletSizeMin?: number;
    activitySince?: string;
    q?: string;
    hasSocial?: 'x' | 'discord' | 'both' | 'none';
    sortBy?: SortKey;
    sortDir?: SortDir;
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
    id: number;
    eventName: string;
    occurredAt: string;
    source: string | null;
    asset: string | null;
    valueUSD: number | null;
    payload: Record<string, unknown>;
}
export declare class IdentityConflictError extends Error {
    existingProfileId: string;
    identityType: IdentityType;
    identityValue: string;
    constructor(existingProfileId: string, identityType: IdentityType, identityValue: string);
}
export declare class MergeWithoutEvidenceError extends Error {
    constructor();
}
export declare class ProfileNotFoundError extends Error {
    profileId: string;
    constructor(profileId: string);
}
//# sourceMappingURL=identity.d.ts.map