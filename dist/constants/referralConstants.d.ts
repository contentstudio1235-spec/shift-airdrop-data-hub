export declare const REFERRAL_CODE_RULES: {
    readonly PATTERN: RegExp;
    readonly MIN_LENGTH: 4;
    readonly MAX_LENGTH: 32;
    readonly ERRORS: {
        readonly INVALID_FORMAT: "Code must contain only uppercase letters, numbers, and hyphens";
        readonly TOO_SHORT: "Code must be at least 4 characters";
        readonly TOO_LONG: "Code must be at most 32 characters";
        readonly ALREADY_EXISTS: "This code is already in use";
        readonly INVALID_WALLET: "Invalid wallet address";
        readonly SELF_REFERRAL: "You cannot refer yourself";
        readonly DUPLICATE_REFERRAL: "You have already been referred";
    };
};
export declare const REFERRAL_BONUS_TIERS: {
    readonly KOL_DYNAMIC: 1.5;
    readonly KOL_PERMANENT: 2;
    readonly STANDARD: 1;
};
export declare const INVITE_BONUS_XP: {
    readonly STANDARD: 250;
    readonly KOL: 500;
};
/**
 * Validate a referral code format.
 * Returns { valid: boolean; error?: string }
 */
export declare function validateReferralCode(code: string | null | undefined): {
    valid: boolean;
    error?: string;
};
/**
 * Normalize a referral code (trim + uppercase)
 */
export declare function normalizeReferralCode(code: string): string;
//# sourceMappingURL=referralConstants.d.ts.map