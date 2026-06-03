// ============================================================
// Referral Constants — Validation rules and configuration
// ============================================================

export const REFERRAL_CODE_RULES = {
  // Alphanumeric + hyphens, 4-32 chars (matching backend validation)
  PATTERN: /^[A-Z0-9-]{4,32}$/,
  MIN_LENGTH: 4,
  MAX_LENGTH: 32,

  // Validation error messages
  ERRORS: {
    INVALID_FORMAT: 'Code must contain only uppercase letters, numbers, and hyphens',
    TOO_SHORT: `Code must be at least ${4} characters`,
    TOO_LONG: `Code must be at most ${32} characters`,
    ALREADY_EXISTS: 'This code is already in use',
    INVALID_WALLET: 'Invalid wallet address',
    SELF_REFERRAL: 'You cannot refer yourself',
    DUPLICATE_REFERRAL: 'You have already been referred',
  },
} as const;

export const REFERRAL_BONUS_TIERS = {
  KOL_DYNAMIC: 1.5,      // 50% bonus on new XP
  KOL_PERMANENT: 2.0,    // 100% retroactive bonus
  STANDARD: 1.0,         // No bonus
} as const;

export const INVITE_BONUS_XP = {
  STANDARD: 250,  // XP given to referrer for each standard referral
  KOL: 500,       // XP given to referrer for each KOL referral
} as const;

/**
 * Validate a referral code format.
 * Returns { valid: boolean; error?: string }
 */
export function validateReferralCode(code: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!code) {
    return { valid: false, error: 'Code is required' };
  }

  const normalized = code.trim().toUpperCase();

  if (normalized.length < REFERRAL_CODE_RULES.MIN_LENGTH) {
    return { valid: false, error: REFERRAL_CODE_RULES.ERRORS.TOO_SHORT };
  }

  if (normalized.length > REFERRAL_CODE_RULES.MAX_LENGTH) {
    return { valid: false, error: REFERRAL_CODE_RULES.ERRORS.TOO_LONG };
  }

  if (!REFERRAL_CODE_RULES.PATTERN.test(normalized)) {
    return { valid: false, error: REFERRAL_CODE_RULES.ERRORS.INVALID_FORMAT };
  }

  return { valid: true };
}

/**
 * Normalize a referral code (trim + uppercase)
 */
export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}
