import type { Profile, IdentitySeed, IdentityType, IdentityLink, Confidence, ProfileWithLinks, RecordEventInput, ProfileSummary, ProfileFilters, TimelineEntry } from '../types/identity';
declare function normalizeIdentityValue(type: IdentityType, value: string): string;
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
declare function rowToProfile(r: ProfileRow): Profile;
export declare function findOrCreateProfile(seed: IdentitySeed, byActor: string): Promise<Profile>;
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
declare function rowToLink(r: IdentityLinkRow): IdentityLink;
export declare function linkIdentity(profileId: string, type: IdentityType, value: string, confidence: Confidence, evidence: {
    eventId?: number;
    byActor: string;
}): Promise<IdentityLink>;
export declare function unlinkIdentity(linkId: number, reason: string, byActor: string): Promise<void>;
export declare function recordEvent(input: RecordEventInput): Promise<{
    eventId: number;
}>;
export declare function getProfile(profileId: string): Promise<ProfileWithLinks | null>;
export declare function searchProfiles(filters: ProfileFilters): Promise<{
    rows: ProfileSummary[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function getTimeline(profileId: string, params?: {
    limit?: number;
    before?: string;
}): Promise<TimelineEntry[]>;
export declare function mergeProfiles(winnerId: string, loserId: string, evidence: {
    byActor: string;
    reason: string;
}): Promise<Profile>;
export { normalizeIdentityValue, rowToProfile };
export type { ProfileRow };
export { rowToLink };
export type { IdentityLinkRow };
//# sourceMappingURL=identityService.d.ts.map