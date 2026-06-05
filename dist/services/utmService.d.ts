export interface RawUtm {
    source?: string | string[] | null | undefined;
    medium?: string | string[] | null | undefined;
    campaign?: string | string[] | null | undefined;
    content?: string | string[] | null | undefined;
    term?: string | string[] | null | undefined;
}
export interface UtmEvidence {
    rawUrl: string;
    referrer?: string | null;
    userAgent?: string | null;
}
export interface UtmViolation {
    field: 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term';
    rejectedValue: string;
    reason: string;
}
export interface NormalizedUtm {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
    violations: UtmViolation[];
}
/** Canonical rollup destination for Snag referral codes. Must exist in utm_approved_sources. */
export declare const SNAG_ROLLUP_SOURCE = "snag-referrals";
/**
 * Reset both caches. Intended for tests only.
 */
export declare function _resetUtmCaches(): void;
export declare function getApprovedSources(): Promise<string[]>;
export declare function getApprovedMediums(): Promise<string[]>;
/**
 * Apply the full Phase-A normalization + validation pipeline.
 *
 * Order:
 *   1. Coerce + trim each field.
 *   2. utm_source: lowercase → Snag-code rollup (no violation) → UA reject
 *      (violation + null) → allow-list check (violation + null if not).
 *   3. utm_medium: lowercase → allow-list check (violation + null if not).
 *   4. utm_campaign: lowercase pre-applied → flag format violation but keep
 *      value (Phase A is lenient on campaigns).
 *   5. utm_content / utm_term: lowercase pre-applied; pass through unchanged.
 */
export declare function normalizeUtm(raw: RawUtm, _evidence: UtmEvidence): Promise<NormalizedUtm>;
/**
 * Persist a batch of violations to utm_violations as a SINGLE multi-row
 * INSERT — one round-trip instead of N, which matters on noisy landing URLs
 * that emit 3+ violations per request.
 *
 * Best-effort: failures are logged to console but never thrown — UTM logging
 * must never break the user-facing landing flow.
 */
export declare function logViolations(violations: UtmViolation[], evidence: UtmEvidence, profileId?: string | null): Promise<void>;
//# sourceMappingURL=utmService.d.ts.map