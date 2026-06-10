// ============================================================
// SHIFT Airdrop — Shared Constants
// ============================================================

// Referral Code Validation
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;
export const REFERRAL_CODE_MIN = 4;
export const REFERRAL_CODE_MAX = 64;

/**
 * Validate referral code format
 * @param code - Code to validate
 * @returns true if valid, false otherwise
 */
export const validateReferralCode = (code: string): boolean => {
  const normalized = code?.trim().toUpperCase() || '';
  return REFERRAL_CODE_PATTERN.test(normalized);
};

/**
 * Normalize referral code (uppercase, trim)
 * @param code - Code to normalize
 * @returns Normalized code
 */
export const normalizeReferralCode = (code: string): string => {
  return code?.trim().toUpperCase() || '';
};

// Referral Code Error Messages
export const REFERRAL_CODE_ERRORS = {
  INVALID_FORMAT: `Code must be 4-${REFERRAL_CODE_MAX} characters (letters, numbers, hyphens only)`,
  TOO_SHORT: `Code must be at least ${REFERRAL_CODE_MIN} characters`,
  TOO_LONG: `Code must be no more than ${REFERRAL_CODE_MAX} characters`,
  INVALID_CHARACTERS: 'Only letters, numbers, and hyphens allowed',
  ALREADY_TAKEN: 'Code already taken. Choose another.',
  NOT_FOUND: 'Referral code not found.',
};

// Wallet Display
export const WALLET_DISPLAY_LENGTH = 6;
export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, WALLET_DISPLAY_LENGTH)}...${address.slice(-4)}`;
};

// URL Configuration
export const LOYALTY_PAGE_URL = () => process.env.NEXT_PUBLIC_SNAG_LOYALTY_URL || 'https://loyalty.shiftrwa.xyz';
export const AIRDROP_URL = () => process.env.NEXT_PUBLIC_AIRDROP_URL || 'https://airdrop.shiftrwa.xyz';
export const API_URL = () => process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

// Social Share URLs
export const SOCIAL_SHARE = {
  twitter: (url: string, text: string) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  telegram: (url: string, text: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  whatsapp: (url: string, text: string) =>
    `https://wa.me/?text=${encodeURIComponent(text + ': ' + url)}`,
};

// Multiplier Configuration
export const LAUNCH_MULTIPLIERS = {
  WEEK_1: 3, // 3x for first week
  WEEK_2: 2, // 2x for second week
  WEEK_3_PLUS: 1, // 1x after that
};

// XP Rewards
export const REFERRAL_REWARDS = {
  FLAT_BONUS: 100, // 100 XP flat bonus per referral
  PERCENTAGE_BONUS: 0.05, // 5% of referred user's XP
};

// Toast Duration
export const TOAST_DURATION = {
  SHORT: 2000, // 2 seconds
  NORMAL: 4000, // 4 seconds
  LONG: 6000, // 6 seconds
};

// API Timeouts
export const API_TIMEOUT = {
  SHORT: 5000, // 5 seconds
  NORMAL: 10000, // 10 seconds
  LONG: 30000, // 30 seconds
};

// Validation Messages
export const VALIDATION_MESSAGES = {
  WALLET_REQUIRED: 'Please connect your wallet first',
  REFERRAL_CODE_INVALID: 'Invalid referral code format',
  CUSTOM_CODE_TAKEN: 'This code is already taken',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  API_ERROR: 'Something went wrong. Please try again later.',
};
